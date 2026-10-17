# Deliverable 3 - AI/ML Audit

## Evidence boundary

The repository contains four serialized scikit-learn artifacts, a synthetic data generator, and a training script. The measured values below were reproduced locally on 2026-10-11 by running `Set-Location ai_service; python training/train_model.py`. No real student dataset, cross-validation report, calibration analysis, or model registry was available.

## Independently trained models

| Model artifact           | Algorithm                | Inputs used in training                                                                      | Target                              | Hyperparameters                                      | Split                                                           | Measured result             |
| ------------------------ | ------------------------ | -------------------------------------------------------------------------------------------- | ----------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------- | --------------------------- |
| `mastery_model.joblib`   | `RandomForestRegressor`  | `average_quiz_score`, `lesson_completion_rate`, `average_session_time`, `revision_frequency` | `overall_mastery_score * 100`       | `n_estimators=50`, `max_depth=10`, `random_state=42` | `train_test_split(test_size=0.2, random_state=42)`; 8,000/2,000 | $R^2=0.9066$, MAE $=3.8989$ |
| `retention_model.joblib` | `LogisticRegression`     | `average_session_time`, `revision_frequency`, `days_active`, `quiz_accuracy`                 | `retention_score >= 0.65`           | `random_state=42`, `max_iter=1000`                   | Same 8,000/2,000 split                                          | Accuracy $=94.10\%$         |
| `style_model.joblib`     | `RandomForestClassifier` | `average_watch_percentage`, `pause_frequency`, `video_watch_rate`, `average_answer_time`     | mapped `preferred_learning_mode`    | `n_estimators=50`, `max_depth=8`, `random_state=42`  | Same 8,000/2,000 split                                          | Accuracy $=25.70\%$         |
| `diff_model.joblib`      | `DecisionTreeClassifier` | derived `mastery_100`, `average_quiz_score`, `confidence_5`                                  | rule-derived 0/1/2 difficulty class | `max_depth=5`, `random_state=42`                     | Same 8,000/2,000 split                                          | Accuracy $=100.00\%$        |

The 100% difficulty score is expected to be inflated because the target is directly defined by threshold rules over closely related input variables. It is not evidence of generalization to real learners.

## Dataset and preprocessing

`student_learning_dataset.csv` contains 10,000 synthetic records generated with seed 42 by `generate_dataset.py`. The generator creates eight hand-authored learner personas and samples academic, interest, behavior, quiz, retention, programming, and mastery fields from distributions conditioned on persona. The data dictionary identifies the dataset as synthetic and documents the variables. Training uses pandas column selection and a single random 80/20 split. No categorical encoding, scaling, missing-value treatment, grouped split, cross-validation, held-out external set, or fairness analysis is implemented.

The target variables are synthetic combinations of generated features plus noise. Consequently, high scores can partly reflect the generator's construction rather than predictive validity in educational settings.

## Runtime inference

`LearningEnginePipeline` loads the four joblib files when all are present. If loading fails, it trains alternate models on 150 synthetic in-memory samples. It exposes a profile prediction containing mastery score, retention probability, learning style, and recommended difficulty. Gemini is separately used for personalized notes, flashcards, and quizzes when an API key is configured; local spaCy/template fallbacks are used otherwise.

## Critical feature-schema problem

The serialized models were trained with one set of feature names, but runtime inference sends semantically different values for at least two models:

- Training retention uses `days_active`; runtime supplies `daysSinceLastRevision` in the fourth-position-compatible vector.
- Training style uses watch percentage, pause frequency, video watch rate, and answer time; runtime supplies reading speed, drawing activity, video ratio, and notes length.

Because scikit-learn predicts positionally, inference may execute without an exception while representing a different feature distribution and meaning. This invalidates claims that the reported training metrics describe production predictions. A feature schema contract and retraining or transformation layer are required before deployment claims.

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

Synthetic persona distributions may encode designer assumptions about learner types. The style classifier's 25.70% accuracy is near the four-class chance baseline of 25%, so it should not be used as evidence of reliable learning-style identification. The retention label threshold is designer-defined. The random split can leak generator structure across train and test. No demographic fairness evaluation is possible from the available evidence. External LLM outputs may be inaccurate, biased, non-deterministic, or privacy-sensitive.
