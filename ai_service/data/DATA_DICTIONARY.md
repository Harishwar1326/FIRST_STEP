# FIRSTSTEP ML SYSTEM - DATA DICTIONARY

**Dataset Version**: 1.0.0 (Synthetic ML Training Dataset)  
**Dataset Path**: `ai_service/data/student_learning_dataset.csv`  
**Dataset Tag**: `SYNTHETIC_DATA`  
**Default Sample Size**: 10,000 Students  

---

## 1. Metadata & Student Context Features

| Feature Name | Data Type | Range / Options | Role | Description & Generation Logic |
| :--- | :--- | :--- | :--- | :--- |
| `student_id` | String | `STU_000001` - `STU_010000` | Identifier | Unique synthetic student identifier. |
| `student_profile_type` | Categorical | 8 Profile Types (Type A to H) | Metadata / Segment | Assigned profile persona dictating base feature distributions. |
| `dataset_type` | String | `SYNTHETIC_DATA` | Metadata | Constant marker distinguishing synthetic training data from real telemetry. |
| `education_level` | Categorical | `High School`, `Undergraduate`, `Postgraduate`, `Diploma`, `Self-Learner` | Input Feature | Highest current or completed education tier. |
| `age_group` | Categorical | `15-18`, `19-22`, `23-26`, `27+` | Input Feature | Age demographic bracket. |

---

## 2. Academic Features

| Feature Name | Data Type | Range | Role | Description & Generation Logic |
| :--- | :--- | :--- | :--- | :--- |
| `average_marks` | Numeric (Float) | 30.00 – 100.00 | Input Feature | Historical academic GPA / percentage marks background. |
| `strongest_subject_score` | Numeric (Float) | 40.00 – 100.00 | Input Feature | Score in student's highest-performing academic domain. |
| `weakest_subject_score` | Numeric (Float) | 20.00 – 100.00 | Input Feature | Score in student's lowest-performing academic domain. |

---

## 3. Student Interest Features

| Feature Name | Data Type | Range | Role | Description & Generation Logic |
| :--- | :--- | :--- | :--- | :--- |
| `programming_interest` | Numeric (Float) | 0.000 – 1.000 | Input Feature | Self-reported or behavioral interest in general software programming. |
| `ai_interest` | Numeric (Float) | 0.000 – 1.000 | Input Feature | Interest score for Artificial Intelligence & ML concepts. |
| `web_development_interest`| Numeric (Float) | 0.000 – 1.000 | Input Feature | Interest score for frontend & backend web development. |
| `data_science_interest` | Numeric (Float) | 0.000 – 1.000 | Input Feature | Interest score for Data Analytics, SQL, and Machine Learning. |
| `mathematics_interest` | Numeric (Float) | 0.000 – 1.000 | Input Feature | Interest score for foundational and applied mathematics. |

---

## 4. Learning Behavior Features

| Feature Name | Data Type | Range | Role | Description & Generation Logic |
| :--- | :--- | :--- | :--- | :--- |
| `study_hours_per_day` | Numeric (Float) | 0.50 – 10.00 | Input Feature | Self-reported or logged daily study commitment (hours). |
| `study_consistency` | Numeric (Float) | 0.150 – 1.000 | Input Feature | Regularity of active daily/weekly learning sessions. |
| `preferred_learning_mode` | Categorical | `Visual`, `Text/Reading`, `Practical/Hands-on`, `Interactive Quiz` | Input Feature | Primary cognitive learning mode preference. |
| `session_duration` | Numeric (Float) | 15.0 – 180.0 | Input Feature | Average duration of an active learning session (minutes). |
| `revision_frequency` | Numeric (Float) | 0.00 – 7.00 | Input Feature | Weekly frequency of review / active recall sessions. |

---

## 5. Psychological / Self-Assessment Features

| Feature Name | Data Type | Range | Role | Description & Generation Logic |
| :--- | :--- | :--- | :--- | :--- |
| `confidence_score` | Numeric (Float) | 0.000 – 1.000 | Input Feature | Overall self-confidence in mastering new technical subjects. |
| `motivation_score` | Numeric (Float) | 0.000 – 1.000 | Input Feature | Self-rated or behaviorally derived learning drive. |
| `problem_solving_confidence`| Numeric (Float) | 0.000 – 1.000 | Input Feature | Self-confidence when tackling unsolved algorithmic problems. |
| `goal_orientation` | Categorical | `Career Transition`, `Exam Success`, `Skill Enhancement`, `Academic Growth` | Input Feature | Main objective driving the student's learning journey. |

---

## 6. Initial Knowledge Assessment Features

| Feature Name | Data Type | Range | Role | Description & Generation Logic |
| :--- | :--- | :--- | :--- | :--- |
| `java_knowledge` | Numeric (Float) | 0.000 – 1.000 | Input Feature | Initial diagnostic score in Java programming fundamentals. |
| `python_knowledge` | Numeric (Float) | 0.000 – 1.000 | Input Feature | Initial diagnostic score in Python syntax & scripting. |
| `mathematics_knowledge` | Numeric (Float) | 0.000 – 1.000 | Input Feature | Initial diagnostic score in foundational mathematics. |
| `dsa_knowledge` | Numeric (Float) | 0.000 – 1.000 | Input Feature | Initial diagnostic score in Data Structures & Algorithms. |

---

## 7. Learning Activity Telemetry Features

| Feature Name | Data Type | Range | Role | Description & Generation Logic |
| :--- | :--- | :--- | :--- | :--- |
| `lessons_attempted` | Numeric (Int) | 5 – 150 | Input Feature | Cumulative total number of platform lessons opened/started. |
| `lessons_completed` | Numeric (Int) | 1 – 150 | Input Feature | Lessons successfully finished (`<= lessons_attempted`). |
| `lesson_completion_rate` | Numeric (Float) | 0.000 – 1.000 | Input Feature | Ratio of completed lessons (`lessons_completed / lessons_attempted`). |
| `video_watch_rate` | Numeric (Float) | 0.000 – 1.000 | Input Feature | Proportion of video-based lessons opened and watched. |
| `average_watch_percentage`| Numeric (Float) | 0.000 – 1.000 | Input Feature | Average video playback percentage per lesson video. |
| `pause_frequency` | Numeric (Float) | 0.00 – 10.00 | Input Feature | Average number of video pauses per lesson session. |
| `rewatch_frequency` | Numeric (Float) | 0.00 – 5.00 | Input Feature | Average count of video section rewinds per lesson session. |
| `average_session_time` | Numeric (Float) | 10.0 – 120.0 | Input Feature | Effective active learning time spent per session (minutes). |

---

## 8. Quiz Performance Features

| Feature Name | Data Type | Range | Role | Description & Generation Logic |
| :--- | :--- | :--- | :--- | :--- |
| `quizzes_attempted` | Numeric (Int) | 2 – 80 | Input Feature | Total count of diagnostic and topic quizzes submitted. |
| `average_quiz_score` | Numeric (Float) | 0.00 – 100.00 | Input Feature | Mean score obtained across all completed quizzes (0-100%). |
| `quiz_accuracy` | Numeric (Float) | 0.000 – 1.000 | Input Feature | Overall ratio of correct quiz answers (`average_quiz_score / 100`). |
| `quiz_attempt_rate` | Numeric (Float) | 0.000 – 1.000 | Input Feature | Ratio of recommended quizzes actually attempted by student. |
| `average_attempts_per_question`| Numeric (Float)| 1.00 – 4.00 | Input Feature | Average submission attempts required per quiz question. |
| `average_answer_time` | Numeric (Float) | 10.0 – 120.0 | Input Feature | Mean time spent answering a quiz question (seconds). |

---

## 9. Knowledge Retention Features

| Feature Name | Data Type | Range | Role | Description & Generation Logic |
| :--- | :--- | :--- | :--- | :--- |
| `retention_score` | Numeric (Float) | 0.000 – 1.000 | Input Feature | Estimated knowledge retention derived from spaced review. |
| `days_active` | Numeric (Int) | 5 – 180 | Input Feature | Total unique active platform days recorded for student. |

---

## 10. Problem Solving Features

| Feature Name | Data Type | Range | Role | Description & Generation Logic |
| :--- | :--- | :--- | :--- | :--- |
| `problems_attempted` | Numeric (Int) | 0 – 200 | Input Feature | Number of practical coding/algorithmic problems attempted. |
| `problems_solved` | Numeric (Int) | 0 – 200 | Input Feature | Coding/algorithmic problems successfully solved (`<= attempted`). |
| `problem_success_rate` | Numeric (Float) | 0.000 – 1.000 | Input Feature | Ratio of solved problems (`problems_solved / problems_attempted`). |
| `average_problem_time` | Numeric (Float) | 2.0 – 45.0 | Input Feature | Mean time spent solving a coding problem (minutes). |

---

## 11. Target Variables (Model Ground Truth)

| Target Name | Data Type | Range | Description & Calculation Logic |
| :--- | :--- | :--- | :--- |
| `overall_mastery_score` | Numeric (Float) | 0.0000 – 1.0000 | **Main Target Variable**: Comprehensive student learning capability and subject mastery level. Derived from a realistic weighted combination of academic marks, initial knowledge, quiz accuracy, problem success rate, consistency, retention, and lesson completion + controlled random noise ($\sigma = 0.035$). |
| `java_mastery` | Numeric (Float) | 0.0000 – 1.0000 | **Topic Target**: Specific capability in Java programming, influenced by `java_knowledge`, `quiz_accuracy`, `programming_interest`, and problem success rate. |
| `python_mastery` | Numeric (Float) | 0.0000 – 1.0000 | **Topic Target**: Specific capability in Python programming & scripting, influenced by `python_knowledge`, interest, and problem success rate. |
| `dsa_mastery` | Numeric (Float) | 0.0000 – 1.0000 | **Topic Target**: Specific capability in Data Structures & Algorithms, influenced by `dsa_knowledge`, problem success rate, and retention. |
| `mathematics_mastery` | Numeric (Float) | 0.0000 – 1.0000 | **Topic Target**: Specific capability in Mathematics, influenced by `mathematics_knowledge`, academic marks, and quiz accuracy. |

---

## 12. Student Persona / Profile Definitions

1. **Type A — High Performer**: High initial knowledge, top consistency, high study hours, top quiz accuracy, high retention & mastery.
2. **Type B — Hard Worker**: Medium initial knowledge, high study effort, high consistency, high revision frequency, steady growth.
3. **Type C — Fast Learner**: High initial knowledge, fewer study hours, fast answer time, top quiz and problem solving performance.
4. **Type D — Inconsistent Student**: Moderate-to-high potential, low consistency, irregular study patterns, variable quiz scores.
5. **Type E — Beginner**: Low initial knowledge, low confidence, needs foundational learning, high rewatch and pause frequencies.
6. **Type F — Exam-Focused Student**: High academic marks, strong theoretical quiz accuracy, high revision, moderate practical problem solving.
7. **Type G — Practical Learner**: Moderate academic marks, high coding interest, high problem solving success, high session duration.
8. **Type H — Struggling but Consistent**: Low initial knowledge, high consistency, high study hours, steady retention, moderate gradual mastery.
