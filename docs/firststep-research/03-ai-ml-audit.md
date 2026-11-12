# Deliverable 3 - AI/ML Audit

## Model integrity correction (2026-10-24)

The current table records a corrected synthetic-data run. Its metrics are **not** validated student outcomes and must not be presented as production accuracy. All four artifacts are now trained and used by runtime inference. Retention uses a stratified holdout, learning-mode labels are generated from the telemetry features supplied to the style model, and difficulty uses a separate persona-derived synthetic target rather than labels computed from its predictor features.

The training script evaluates mastery and style with held-out synthetic personas, evaluates retention and difficulty with stratified holdouts, reports majority/mean baselines and balanced classification metrics, rejects non-synthetic data passed to this synthetic-only script, and saves all four artifacts with a provenance report. This improves the integrity of the experiment; it still does **not** make the synthetic model validated for real learners. No real, consented student outcome dataset or prospective evaluation is present in the repository, so the ML estimates remain experimental and recommendations must prioritize each student's saved assessment and activity evidence.

Runtime inference no longer trains substitute models from 150 random examples at service startup. Missing/corrupt artifacts use an explicitly labeled rule fallback. Mastery inputs use measured quiz results, lesson completion, observed study time, revisions, and active days; missing values are zero/unknown observations rather than invented defaults. Profile storage maps difficulty values to its declared enum and preserves explicit learning preferences.

The Learning Twin now passes a bounded, de-identified evidence summary and only its existing published-lesson recommendation candidates to an internal AI analysis endpoint. The AI can reorder those candidate IDs and explain them, but cannot invent lessons or change student records; IDs are allow-listed again by the backend. If the provider is unavailable or returns invalid output, the existing evidence-rule recommendations remain available. A saved model difficulty can select a matching available lesson, but is labeled experimental and cannot override recorded quiz gaps or prerequisite checks.

The local AI-service virtual environment was used to regenerate the dataset, retrain all four models, and produce the provenance report. The results remain synthetic-only and have not been validated against real learner outcomes.

## Evidence boundary

The repository contains four serialized scikit-learn artifacts, a synthetic data generator, and a training script. The measured values below were reproduced locally on 2026-10-24 by running the generator and training script. No real student dataset, cross-validation report, calibration analysis, or model registry was available.

## Independently trained models

| Model artifact           | Algorithm                | Inputs used in training                                                                      | Target                                        | Hyperparameters                                             | Split                                 | Measured result                                   |
| ------------------------ | ------------------------ | -------------------------------------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------- | ------------------------------------- | ------------------------------------------------- |
| `mastery_model.joblib`   | `ExtraTreesRegressor`    | `average_quiz_score`, `lesson_completion_rate`, `average_session_time`, `revision_frequency` | `overall_mastery_score * 100`                 | `n_estimators=500`, `min_samples_leaf=1`, `random_state=42` | Group holdout by persona; 7,537/2,463 | $R^2=0.5809$, MAE $=2.0017$                       |
| `retention_model.joblib` | `LogisticRegression`     | `average_session_time`, `revision_frequency`, `days_active`, `quiz_accuracy`                 | `retention_score >= 0.65`                     | `random_state=42`, `max_iter=2000`, balanced classes        | Stratified holdout; 8,000/2,000       | Accuracy $=94.10\%$, balanced accuracy $=93.74\%$ |
| `style_model.joblib`     | `RandomForestClassifier` | `average_watch_percentage`, `pause_frequency`, `video_watch_rate`, `average_answer_time`     | `preferred_learning_mode`                     | `n_estimators=250`, `min_samples_leaf=3`, `random_state=42` | Group holdout by persona; 7,537/2,463 | Accuracy $=86.89\%$, balanced accuracy $=87.79\%$ |
| `diff_model.joblib`      | `RandomForestClassifier` | derived `mastery_100`, `average_quiz_score`, `confidence_5`                                  | synthetic `recommended_difficulty` by persona | `n_estimators=200`, `min_samples_leaf=3`, `random_state=42` | Stratified holdout; 8,000/2,000       | Accuracy $=91.35\%$, balanced accuracy $=91.43\%$ |

These results are internal synthetic-data checks only. The difficulty target is no longer computed from the model's own prediction formula, but it is still a persona-derived synthetic label rather than an observed instructional outcome.

## Dataset and preprocessing

`student_learning_dataset.csv` contains 10,000 synthetic records generated with seed 42 by `generate_dataset.py`. The generator creates eight hand-authored learner personas and samples academic, interest, behavior, quiz, retention, programming, mastery, and difficulty-target fields from distributions conditioned on persona. The data dictionary identifies the dataset as synthetic and documents the variables. Mastery and style use grouped persona holdouts; retention and difficulty use stratified random holdouts. No categorical encoding, scaling, cross-validation, held-out external set, or fairness analysis is implemented.

The target variables are synthetic combinations of generated features plus noise. Consequently, high scores can partly reflect the generator's construction rather than predictive validity in educational settings.

## Runtime inference

`LearningEnginePipeline` loads the four joblib files only when the versioned synthetic provenance report and feature schemas are valid. If an artifact is missing or invalid, that prediction uses an explicitly labeled fallback. It exposes a profile prediction containing mastery score, retention probability, learning style, and recommended difficulty. Gemini is separately used for personalized notes, flashcards, and quizzes when an API key is configured; local spaCy/template fallbacks are used otherwise.

## Feature schema and runtime mapping

The artifact-backed runtime maps inputs into the same feature order used by `training/train_model.py`:

- Mastery: quiz score, lesson completion, session time, revision frequency.
- Retention: session time, revision frequency, days active, quiz accuracy. `daysSinceLastRevision` remains a compatibility fallback when `daysActive` is absent, so callers should provide `daysActive` for the trained model's intended meaning.
- Style: average watch percentage, pause frequency, video watch rate, average answer time.
- Difficulty: predicted mastery, quiz score, confidence on a 1–5 scale.

The runtime validates the persisted training version and each artifact's `feature_names_in_` before loading. Fallback outputs are labeled separately and should not be described using the artifact training metrics.

## AI components that are not custom-trained models

- Gemini and Groq: external large language model APIs for generation/evaluation.
- Sentence Transformers `all-MiniLM-L6-v2`: pretrained embedding model.
- spaCy `en_core_web_sm`: pretrained NLP pipeline.
- KeyBERT: keyword extraction using embeddings.
- NetworkX: graph computation library, not a learned graph model.
- Chroma: vector storage/retrieval infrastructure.
- Local extractive summaries, difficulty estimates, fallback questions, and recommendations: heuristic/template logic.
- FastAPI Twin/Academy/Forest/Thinking state: application logic and in-memory structures, not learned models.

## Limitations and bias risks

Synthetic persona distributions may encode designer assumptions about learner types. The style and difficulty labels are synthetic and should not be used as evidence of reliable learning-style identification or instructional effectiveness. The retention label threshold is designer-defined. Grouped and stratified splits reduce, but do not eliminate, generator-structure leakage. No demographic fairness evaluation is possible from the available evidence. External LLM outputs may be inaccurate, biased, non-deterministic, or privacy-sensitive.
