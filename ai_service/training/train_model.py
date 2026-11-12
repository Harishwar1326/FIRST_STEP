"""Train baseline models and report synthetic holdout performance.

The bundled dataset is generated from hand-authored formulas, not observed
students. Scores from this script are pipeline checks only and must not be
presented as real-world model validation.
"""

import json
import hashlib
import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import ExtraTreesRegressor, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    classification_report,
    mean_absolute_error,
    r2_score,
)
from sklearn.model_selection import GroupShuffleSplit, train_test_split

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

RANDOM_STATE = 42
TEST_SIZE = 0.2
MASTERY_FEATURES = [
    "average_quiz_score", "lesson_completion_rate",
    "average_session_time", "revision_frequency",
]
RETENTION_FEATURES = [
    "average_session_time", "revision_frequency", "days_active", "quiz_accuracy",
]
STYLE_FEATURES = [
    "average_watch_percentage", "pause_frequency", "video_watch_rate", "average_answer_time",
]
DIFFICULTY_FEATURES = ["mastery_100", "average_quiz_score", "confidence_5"]
STYLE_LABELS = ["Visual", "Text/Reading", "Practical/Hands-on", "Interactive Quiz"]
DIFFICULTY_LABELS = ["Beginner", "Intermediate", "Advanced"]


def train_and_save_models(dataset_path: str | None = None):
    base_dir = Path(__file__).resolve().parent.parent
    source = Path(dataset_path) if dataset_path else base_dir / "data" / "student_learning_dataset.csv"
    if not source.exists():
        raise FileNotFoundError(f"Dataset not found: {source}. Generate it with training/generate_dataset.py first.")

    df = pd.read_csv(source)
    required = set(MASTERY_FEATURES + RETENTION_FEATURES + STYLE_FEATURES + [
        "overall_mastery_score", "retention_score", "student_profile_type", "dataset_type",
        "preferred_learning_mode", "recommended_difficulty",
    ])
    missing = sorted(required - set(df.columns))
    if missing:
        raise ValueError(f"Dataset is missing required columns: {', '.join(missing)}")
    if df.empty or df[list(required)].isnull().any().any():
        raise ValueError("Dataset must contain rows and have no missing training values")
    if "student_id" in df and df["student_id"].duplicated().any():
        raise ValueError("Dataset contains duplicate student IDs; records could leak across train/test")
    if set(df["dataset_type"].unique()) != {"SYNTHETIC_DATA"}:
        raise ValueError("This training script only accepts datasets explicitly marked SYNTHETIC_DATA")

    indices = np.arange(len(df))
    profile_groups = df["student_profile_type"].astype(str)
    if profile_groups.nunique() >= 4:
        split = GroupShuffleSplit(n_splits=1, test_size=TEST_SIZE, random_state=RANDOM_STATE)
        train_idx, test_idx = next(split.split(indices, groups=profile_groups))
        split_description = "group holdout by synthetic persona"
        held_out_personas = sorted(profile_groups.iloc[test_idx].unique().tolist())
    else:
        stratify = profile_groups if profile_groups.value_counts().min() >= 2 else None
        train_idx, test_idx = train_test_split(indices, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=stratify)
        split_description = "stratified random holdout (fewer than four personas)"
        held_out_personas = []
    train, test = df.iloc[train_idx], df.iloc[test_idx]
    retention_target = (df["retention_score"] >= 0.65).astype(int).to_numpy()
    retention_train_idx, retention_test_idx = train_test_split(
        indices, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=retention_target,
    )
    difficulty_target = pd.Categorical(df["recommended_difficulty"], categories=DIFFICULTY_LABELS).codes
    difficulty_train_idx, difficulty_test_idx = train_test_split(
        indices, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=difficulty_target,
    )
    report = {
        "trainingVersion": 3,
        "datasetType": "SYNTHETIC_DATA",
        "datasetSha256": hashlib.sha256(source.read_bytes()).hexdigest(),
        "validationMeaning": "Synthetic holdout only; not evidence of real-student performance.",
        "rows": int(len(df)),
        "trainRows": int(len(train)),
        "testRows": int(len(test)),
        "split": {
            "method": split_description, "testSize": TEST_SIZE, "seed": RANDOM_STATE,
            "heldOutPersonas": held_out_personas,
            "retentionEvaluation": "stratified random holdout",
            "difficultyEvaluation": "stratified random holdout",
        },
        "models": {},
        "labelDefinitions": {
            "learningStyle": STYLE_LABELS,
            "difficulty": ["Beginner", "Intermediate", "Advanced"],
        },
    }

    X_train, X_test = train[MASTERY_FEATURES], test[MASTERY_FEATURES]
    y_train = train["overall_mastery_score"] * 100.0
    y_test = test["overall_mastery_score"] * 100.0
    mastery = ExtraTreesRegressor(n_estimators=500, min_samples_leaf=1, max_features=1.0, random_state=RANDOM_STATE, n_jobs=-1)
    mastery.fit(X_train, y_train)
    predictions = mastery.predict(X_test)
    baseline = np.full(len(y_test), y_train.mean())
    report["models"]["mastery"] = {
        "algorithm": "ExtraTreesRegressor",
        "features": MASTERY_FEATURES,
        "target": "synthetic overall_mastery_score scaled 0-100",
        "r2": round(float(r2_score(y_test, predictions)), 4),
        "mae": round(float(mean_absolute_error(y_test, predictions)), 4),
        "baselineMeanPredictorMae": round(float(mean_absolute_error(y_test, baseline)), 4),
    }

    X_train, X_test = df.iloc[retention_train_idx][RETENTION_FEATURES], df.iloc[retention_test_idx][RETENTION_FEATURES]
    y_train = retention_target[retention_train_idx]
    y_test = retention_target[retention_test_idx]
    if len(np.unique(y_train)) < 2:
        raise ValueError("Training split has only one retention class; more representative data is required")
    retention = LogisticRegression(random_state=RANDOM_STATE, max_iter=2000, class_weight="balanced")
    retention.fit(X_train, y_train)
    predictions = retention.predict(X_test)
    majority_predictions = np.full(len(y_test), np.bincount(y_train).argmax())
    report["models"]["retention"] = {
        "algorithm": "LogisticRegression",
        "features": RETENTION_FEATURES,
        "target": "synthetic retention_score >= 0.65",
        "accuracy": round(float(accuracy_score(y_test, predictions)), 4),
        "balancedAccuracy": round(float(balanced_accuracy_score(y_test, predictions)), 4),
        "majorityClassBaselineAccuracy": round(float(accuracy_score(y_test, majority_predictions)), 4),
        "majorityClassBaselineBalancedAccuracy": round(float(balanced_accuracy_score(y_test, majority_predictions)), 4),
        "classReport": classification_report(y_test, predictions, output_dict=True, zero_division=0),
    }

    X_train, X_test = train[STYLE_FEATURES], test[STYLE_FEATURES]
    style_labels = pd.Categorical(train["preferred_learning_mode"], categories=STYLE_LABELS).codes
    style_test_labels = pd.Categorical(test["preferred_learning_mode"], categories=STYLE_LABELS).codes
    style = RandomForestClassifier(n_estimators=250, min_samples_leaf=3, max_features=0.8, random_state=RANDOM_STATE, n_jobs=-1)
    style.fit(X_train, style_labels)
    style_predictions = style.predict(X_test)
    report["models"]["style"] = {
        "algorithm": "RandomForestClassifier",
        "features": STYLE_FEATURES,
        "target": "synthetic preferred_learning_mode",
        "accuracy": round(float(accuracy_score(style_test_labels, style_predictions)), 4),
        "balancedAccuracy": round(float(balanced_accuracy_score(style_test_labels, style_predictions)), 4),
        "classReport": classification_report(style_test_labels, style_predictions, output_dict=True, zero_division=0),
    }

    difficulty_features = pd.DataFrame({
        "mastery_100": df["overall_mastery_score"] * 100,
        "average_quiz_score": df["average_quiz_score"],
        "confidence_5": df["confidence_score"] * 5,
    })
    difficulty = RandomForestClassifier(n_estimators=200, min_samples_leaf=3, random_state=RANDOM_STATE, n_jobs=-1)
    difficulty.fit(difficulty_features.iloc[difficulty_train_idx][DIFFICULTY_FEATURES], difficulty_target[difficulty_train_idx])
    difficulty_predictions = difficulty.predict(difficulty_features.iloc[difficulty_test_idx][DIFFICULTY_FEATURES])
    report["models"]["difficulty"] = {
        "algorithm": "RandomForestClassifier",
        "features": DIFFICULTY_FEATURES,
        "target": "synthetic recommended_difficulty by student persona",
        "accuracy": round(float(accuracy_score(difficulty_target[difficulty_test_idx], difficulty_predictions)), 4),
        "balancedAccuracy": round(float(balanced_accuracy_score(difficulty_target[difficulty_test_idx], difficulty_predictions)), 4),
        "classReport": classification_report(difficulty_target[difficulty_test_idx], difficulty_predictions, output_dict=True, zero_division=0),
    }

    models_dir = base_dir / "data" / "models"
    models_dir.mkdir(parents=True, exist_ok=True)
    # Evaluate on a holdout first, then refit deployment artifacts on all
    # available synthetic rows. Keep the data provenance beside the artifacts.
    mastery.fit(df[MASTERY_FEATURES], df["overall_mastery_score"] * 100.0)
    retention.fit(df[RETENTION_FEATURES], retention_target)
    style.fit(df[STYLE_FEATURES], pd.Categorical(df["preferred_learning_mode"], categories=STYLE_LABELS).codes)
    difficulty.fit(difficulty_features[DIFFICULTY_FEATURES], difficulty_target)
    joblib.dump(mastery, models_dir / "mastery_model.joblib")
    joblib.dump(retention, models_dir / "retention_model.joblib")
    joblib.dump(style, models_dir / "style_model.joblib")
    joblib.dump(difficulty, models_dir / "diff_model.joblib")
    report["trainedAt"] = datetime.now(timezone.utc).isoformat()
    (models_dir / "training_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")

    print("SYNTHETIC DATASET BASELINE TRAINING")
    print("WARNING: holdout metrics below do not validate performance on real students.")
    print(json.dumps(report, indent=2))
    print(f"Saved mastery and retention artifacts to {models_dir}")
    return report


if __name__ == "__main__":
    train_and_save_models(sys.argv[1] if len(sys.argv) > 1 else None)
