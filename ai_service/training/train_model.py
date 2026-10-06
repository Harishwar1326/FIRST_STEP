"""
FirstStep Digital Edu Platform - Adaptive Learning ML System
STEP 2/3: Model Training Script

Trains Scikit-Learn machine learning models on the generated synthetic student
dataset (student_learning_dataset.csv) and saves serialized model artifacts.
"""

import os
import sys
import joblib
import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import r2_score, mean_absolute_error, accuracy_score

# Ensure UTF-8 output encoding for Windows terminals
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

def train_and_save_models(dataset_path: str = None):
    base_dir = Path(__file__).resolve().parent.parent
    if dataset_path is None:
        dataset_path = base_dir / "data" / "student_learning_dataset.csv"
    else:
        dataset_path = Path(dataset_path)

    if not dataset_path.exists():
        print(f"[ERROR] Dataset file not found at: {dataset_path}")
        print("Please run `python training/generate_dataset.py` first.")
        sys.exit(1)

    models_dir = base_dir / "data" / "models"
    models_dir.mkdir(parents=True, exist_ok=True)

    print(f"[TRAINING] Loading dataset from: {dataset_path.name}...")
    df = pd.read_csv(dataset_path)
    num_samples = len(df)
    print(f"[TRAINING] Dataset loaded successfully with {num_samples:,} student records.\n")

    print("=" * 60)
    print("           FIRSTSTEP ML MODEL TRAINING PIPELINE")
    print("=" * 60)

    # ----------------------------------------------------
    # 1. Mastery Prediction Model (RandomForestRegressor)
    # ----------------------------------------------------
    print("1. Training Knowledge Mastery Model (RandomForestRegressor)...")
    # Features: quiz score, lesson completion rate, average session time, revision frequency
    X_mastery = df[['average_quiz_score', 'lesson_completion_rate', 'average_session_time', 'revision_frequency']]
    y_mastery = df['overall_mastery_score'] * 100.0  # Scale 0-100

    X_m_train, X_m_test, y_m_train, y_m_test = train_test_split(X_mastery, y_mastery, test_size=0.2, random_state=42)
    mastery_model = RandomForestRegressor(n_estimators=50, max_depth=10, random_state=42)
    mastery_model.fit(X_m_train, y_m_train)

    m_preds = mastery_model.predict(X_m_test)
    r2_m = r2_score(y_m_test, m_preds)
    mae_m = mean_absolute_error(y_m_test, m_preds)
    print(f"   - Train Samples: {len(X_m_train):,} | Test Samples: {len(X_m_test):,}")
    print(f"   - R2 Score     : {r2_m:.4f}")
    print(f"   - MAE          : {mae_m:.4f}")

    joblib.dump(mastery_model, models_dir / "mastery_model.joblib")
    print(f"   - Saved model  : {models_dir / 'mastery_model.joblib'}\n")

    # ----------------------------------------------------
    # 2. Retention Prediction Model (LogisticRegression)
    # ----------------------------------------------------
    print("2. Training Knowledge Retention Model (LogisticRegression)...")
    X_retention = df[['average_session_time', 'revision_frequency', 'days_active', 'quiz_accuracy']]
    # Target binary retention: retention_score >= 0.65
    y_retention = (df['retention_score'] >= 0.65).astype(int)

    X_r_train, X_r_test, y_r_train, y_r_test = train_test_split(X_retention, y_retention, test_size=0.2, random_state=42)
    retention_model = LogisticRegression(random_state=42, max_iter=1000)
    retention_model.fit(X_r_train, y_r_train)

    r_preds = retention_model.predict(X_r_test)
    acc_r = accuracy_score(y_r_test, r_preds)
    print(f"   - Train Samples: {len(X_r_train):,} | Test Samples: {len(X_r_test):,}")
    print(f"   - Accuracy     : {acc_r * 100:.2f}%")

    joblib.dump(retention_model, models_dir / "retention_model.joblib")
    print(f"   - Saved model  : {models_dir / 'retention_model.joblib'}\n")

    # ----------------------------------------------------
    # 3. Learning Style Classifier (RandomForestClassifier)
    # ----------------------------------------------------
    print("3. Training Learning Style Classifier (RandomForestClassifier)...")
    # Features: watch percentage, pause frequency, video watch rate, answer time
    X_style = df[['average_watch_percentage', 'pause_frequency', 'video_watch_rate', 'average_answer_time']]
    
    # Map preferred_learning_mode to integer classes
    style_map = {'Visual': 0, 'Text/Reading': 1, 'Practical/Hands-on': 2, 'Interactive Quiz': 3}
    y_style = df['preferred_learning_mode'].map(lambda x: style_map.get(x, 3))

    X_s_train, X_s_test, y_s_train, y_s_test = train_test_split(X_style, y_style, test_size=0.2, random_state=42)
    style_model = RandomForestClassifier(n_estimators=50, max_depth=8, random_state=42)
    style_model.fit(X_s_train, y_s_train)

    s_preds = style_model.predict(X_s_test)
    acc_s = accuracy_score(y_s_test, s_preds)
    print(f"   - Train Samples: {len(X_s_train):,} | Test Samples: {len(X_s_test):,}")
    print(f"   - Accuracy     : {acc_s * 100:.2f}%")

    joblib.dump(style_model, models_dir / "style_model.joblib")
    print(f"   - Saved model  : {models_dir / 'style_model.joblib'}\n")

    # ----------------------------------------------------
    # 4. Next Lesson Difficulty Classifier (DecisionTreeClassifier)
    # ----------------------------------------------------
    print("4. Training Difficulty Level Classifier (DecisionTreeClassifier)...")
    df['mastery_100'] = df['overall_mastery_score'] * 100.0
    df['confidence_5'] = np.clip(df['confidence_score'] * 5.0, 1.0, 5.0)

    X_diff = df[['mastery_100', 'average_quiz_score', 'confidence_5']]

    def get_diff(row):
        if row['mastery_100'] > 75 and row['average_quiz_score'] > 80:
            return 2
        elif row['mastery_100'] > 45:
            return 1
        return 0

    y_diff = df.apply(get_diff, axis=1)

    X_d_train, X_d_test, y_d_train, y_d_test = train_test_split(X_diff, y_diff, test_size=0.2, random_state=42)
    diff_model = DecisionTreeClassifier(max_depth=5, random_state=42)
    diff_model.fit(X_d_train, y_d_train)

    d_preds = diff_model.predict(X_d_test)
    acc_d = accuracy_score(y_d_test, d_preds)
    print(f"   - Train Samples: {len(X_d_train):,} | Test Samples: {len(X_d_test):,}")
    print(f"   - Accuracy     : {acc_d * 100:.2f}%")

    joblib.dump(diff_model, models_dir / "diff_model.joblib")
    print(f"   - Saved model  : {models_dir / 'diff_model.joblib'}\n")

    print("=" * 60)
    print(f"[SUCCESS] All 4 ML models trained and saved under: {models_dir}")
    print("=" * 60 + "\n")

if __name__ == "__main__":
    train_and_save_models()
