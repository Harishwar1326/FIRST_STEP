"""
FirstStep Digital Edu Platform - Adaptive Learning ML System
STEP 2: ML Training Dataset Pipeline Generator

This script generates a realistic synthetic dataset of student features and
learning capability/mastery target variables.

Dataset Type: SYNTHETIC DATA
Random Seed: 42 (reproducible)
"""

import argparse
import os
import sys
import random
import numpy as np
import pandas as pd
from pathlib import Path

# Ensure UTF-8 output encoding for Windows terminals
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

def parse_args():
    parser = argparse.ArgumentParser(
        description="Generate synthetic student learning dataset for FirstStep ML training."
    )
    parser.add_argument(
        "--samples",
        type=int,
        default=10000,
        help="Number of synthetic student profiles to generate (default: 10000)."
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed for reproducibility (default: 42)."
    )
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="Output path for the generated CSV dataset."
    )
    return parser.parse_args()

def set_seed(seed: int):
    random.seed(seed)
    np.random.seed(seed)

def generate_synthetic_dataset(num_samples: int = 10000, seed: int = 42) -> pd.DataFrame:
    set_seed(seed)
    
    # ----------------------------------------------------
    # STUDENT PROFILE DEFINITIONS & DISTRIBUTIONS
    # ----------------------------------------------------
    profiles = [
        "Type A - High Performer",
        "Type B - Hard Worker",
        "Type C - Fast Learner",
        "Type D - Inconsistent Student",
        "Type E - Beginner",
        "Type F - Exam-Focused Student",
        "Type G - Practical Learner",
        "Type H - Struggling but Consistent"
    ]
    profile_weights = [0.12, 0.15, 0.12, 0.14, 0.15, 0.10, 0.12, 0.10]
    
    selected_profiles = np.random.choice(profiles, size=num_samples, p=profile_weights)
    
    # Education levels and age groups
    education_levels = ["High School", "Undergraduate", "Postgraduate", "Diploma", "Self-Learner"]
    edu_weights = [0.25, 0.45, 0.15, 0.10, 0.05]
    
    age_groups = ["15-18", "19-22", "23-26", "27+"]
    age_weights = [0.25, 0.50, 0.18, 0.07]
    
    learning_modes = ["Visual", "Text/Reading", "Practical/Hands-on", "Interactive Quiz"]
    goal_orientations = ["Career Transition", "Exam Success", "Skill Enhancement", "Academic Growth"]

    records = []
    
    for i in range(num_samples):
        p_type = selected_profiles[i]
        student_id = f"STU_{i+1:06d}"
        edu_level = np.random.choice(education_levels, p=edu_weights)
        age_grp = np.random.choice(age_groups, p=age_weights)
        
        # ----------------------------------------------------
        # FEATURE GENERATION BASED ON STUDENT TYPE (WITH NOISE)
        # ----------------------------------------------------
        if p_type == "Type A - High Performer":
            avg_marks = np.random.normal(88, 5)
            study_hours = np.random.uniform(4.5, 9.0)
            consistency = np.random.beta(8, 2)  # High consistency
            prog_interest = np.random.uniform(0.7, 1.0)
            ai_interest = np.random.uniform(0.7, 1.0)
            web_interest = np.random.uniform(0.6, 1.0)
            ds_interest = np.random.uniform(0.65, 1.0)
            math_interest = np.random.uniform(0.7, 1.0)
            confidence = np.random.uniform(0.75, 1.0)
            motivation = np.random.uniform(0.8, 1.0)
            prob_solv_conf = np.random.uniform(0.75, 1.0)
            
            java_know = np.random.uniform(0.65, 0.95)
            py_know = np.random.uniform(0.70, 0.98)
            math_know = np.random.uniform(0.75, 0.98)
            dsa_know = np.random.uniform(0.65, 0.95)
            
            completion_rate = np.random.uniform(0.85, 1.0)
            watch_rate = np.random.uniform(0.80, 1.0)
            avg_watch_pct = np.random.uniform(0.82, 0.98)
            pause_freq = np.random.uniform(0.5, 2.5)
            rewatch_freq = np.random.uniform(0.2, 1.2)
            
            quiz_accuracy = np.random.uniform(0.82, 0.98)
            quiz_attempt_rate = np.random.uniform(0.85, 1.0)
            attempts_per_q = np.random.uniform(1.0, 1.3)
            ans_time_sec = np.random.uniform(15, 35)
            
            retention = np.random.uniform(0.80, 0.98)
            rev_freq = np.random.uniform(4.0, 7.0)
            
            prob_success = np.random.uniform(0.75, 0.96)
            prob_time_min = np.random.uniform(4.0, 12.0)
            
        elif p_type == "Type B - Hard Worker":
            avg_marks = np.random.normal(74, 7)
            study_hours = np.random.uniform(5.0, 10.0)
            consistency = np.random.beta(7, 2)  # High consistency
            prog_interest = np.random.uniform(0.5, 0.85)
            ai_interest = np.random.uniform(0.5, 0.85)
            web_interest = np.random.uniform(0.5, 0.9)
            ds_interest = np.random.uniform(0.5, 0.85)
            math_interest = np.random.uniform(0.6, 0.9)
            confidence = np.random.uniform(0.6, 0.85)
            motivation = np.random.uniform(0.75, 1.0)
            prob_solv_conf = np.random.uniform(0.6, 0.85)
            
            java_know = np.random.uniform(0.35, 0.65)
            py_know = np.random.uniform(0.40, 0.70)
            math_know = np.random.uniform(0.50, 0.80)
            dsa_know = np.random.uniform(0.35, 0.65)
            
            completion_rate = np.random.uniform(0.75, 0.95)
            watch_rate = np.random.uniform(0.75, 0.95)
            avg_watch_pct = np.random.uniform(0.78, 0.95)
            pause_freq = np.random.uniform(2.0, 5.0)
            rewatch_freq = np.random.uniform(1.0, 3.0)
            
            quiz_accuracy = np.random.uniform(0.68, 0.88)
            quiz_attempt_rate = np.random.uniform(0.80, 0.98)
            attempts_per_q = np.random.uniform(1.2, 1.8)
            ans_time_sec = np.random.uniform(25, 55)
            
            retention = np.random.uniform(0.72, 0.92)
            rev_freq = np.random.uniform(4.5, 7.0)
            
            prob_success = np.random.uniform(0.60, 0.82)
            prob_time_min = np.random.uniform(8.0, 20.0)
            
        elif p_type == "Type C - Fast Learner":
            avg_marks = np.random.normal(85, 6)
            study_hours = np.random.uniform(1.5, 4.0)
            consistency = np.random.uniform(0.5, 0.8)
            prog_interest = np.random.uniform(0.75, 1.0)
            ai_interest = np.random.uniform(0.75, 1.0)
            web_interest = np.random.uniform(0.6, 0.95)
            ds_interest = np.random.uniform(0.7, 0.98)
            math_interest = np.random.uniform(0.75, 0.98)
            confidence = np.random.uniform(0.8, 1.0)
            motivation = np.random.uniform(0.6, 0.9)
            prob_solv_conf = np.random.uniform(0.8, 1.0)
            
            java_know = np.random.uniform(0.70, 0.95)
            py_know = np.random.uniform(0.75, 0.98)
            math_know = np.random.uniform(0.75, 0.98)
            dsa_know = np.random.uniform(0.70, 0.95)
            
            completion_rate = np.random.uniform(0.65, 0.88)
            watch_rate = np.random.uniform(0.60, 0.85)
            avg_watch_pct = np.random.uniform(0.65, 0.88)
            pause_freq = np.random.uniform(0.2, 1.5)
            rewatch_freq = np.random.uniform(0.1, 0.8)
            
            quiz_accuracy = np.random.uniform(0.80, 0.96)
            quiz_attempt_rate = np.random.uniform(0.70, 0.92)
            attempts_per_q = np.random.uniform(1.0, 1.2)
            ans_time_sec = np.random.uniform(12, 28)
            
            retention = np.random.uniform(0.75, 0.94)
            rev_freq = np.random.uniform(1.5, 4.0)
            
            prob_success = np.random.uniform(0.78, 0.96)
            prob_time_min = np.random.uniform(3.0, 10.0)

        elif p_type == "Type D - Inconsistent Student":
            avg_marks = np.random.normal(68, 10)
            study_hours = np.random.uniform(0.5, 5.0)
            consistency = np.random.uniform(0.15, 0.45)
            prog_interest = np.random.uniform(0.4, 0.8)
            ai_interest = np.random.uniform(0.4, 0.8)
            web_interest = np.random.uniform(0.4, 0.8)
            ds_interest = np.random.uniform(0.3, 0.75)
            math_interest = np.random.uniform(0.3, 0.7)
            confidence = np.random.uniform(0.4, 0.75)
            motivation = np.random.uniform(0.3, 0.65)
            prob_solv_conf = np.random.uniform(0.4, 0.75)
            
            java_know = np.random.uniform(0.3, 0.65)
            py_know = np.random.uniform(0.35, 0.70)
            math_know = np.random.uniform(0.35, 0.70)
            dsa_know = np.random.uniform(0.25, 0.60)
            
            completion_rate = np.random.uniform(0.35, 0.65)
            watch_rate = np.random.uniform(0.35, 0.65)
            avg_watch_pct = np.random.uniform(0.40, 0.70)
            pause_freq = np.random.uniform(1.0, 4.0)
            rewatch_freq = np.random.uniform(0.5, 2.0)
            
            quiz_accuracy = np.random.uniform(0.42, 0.75)
            quiz_attempt_rate = np.random.uniform(0.40, 0.70)
            attempts_per_q = np.random.uniform(1.4, 2.3)
            ans_time_sec = np.random.uniform(25, 65)
            
            retention = np.random.uniform(0.32, 0.62)
            rev_freq = np.random.uniform(0.5, 2.5)
            
            prob_success = np.random.uniform(0.40, 0.70)
            prob_time_min = np.random.uniform(8.0, 25.0)

        elif p_type == "Type E - Beginner":
            avg_marks = np.random.normal(55, 9)
            study_hours = np.random.uniform(1.0, 4.0)
            consistency = np.random.uniform(0.3, 0.75)
            prog_interest = np.random.uniform(0.5, 0.9)
            ai_interest = np.random.uniform(0.5, 0.9)
            web_interest = np.random.uniform(0.5, 0.9)
            ds_interest = np.random.uniform(0.4, 0.8)
            math_interest = np.random.uniform(0.2, 0.6)
            confidence = np.random.uniform(0.15, 0.45)
            motivation = np.random.uniform(0.5, 0.85)
            prob_solv_conf = np.random.uniform(0.15, 0.45)
            
            java_know = np.random.uniform(0.05, 0.30)
            py_know = np.random.uniform(0.08, 0.35)
            math_know = np.random.uniform(0.15, 0.45)
            dsa_know = np.random.uniform(0.02, 0.25)
            
            completion_rate = np.random.uniform(0.40, 0.75)
            watch_rate = np.random.uniform(0.50, 0.85)
            avg_watch_pct = np.random.uniform(0.50, 0.85)
            pause_freq = np.random.uniform(3.0, 7.0)
            rewatch_freq = np.random.uniform(1.5, 4.5)
            
            quiz_accuracy = np.random.uniform(0.30, 0.60)
            quiz_attempt_rate = np.random.uniform(0.50, 0.85)
            attempts_per_q = np.random.uniform(1.8, 3.2)
            ans_time_sec = np.random.uniform(45, 95)
            
            retention = np.random.uniform(0.25, 0.55)
            rev_freq = np.random.uniform(1.0, 3.5)
            
            prob_success = np.random.uniform(0.20, 0.50)
            prob_time_min = np.random.uniform(15.0, 35.0)

        elif p_type == "Type F - Exam-Focused Student":
            avg_marks = np.random.normal(86, 5)
            study_hours = np.random.uniform(3.5, 7.5)
            consistency = np.random.uniform(0.7, 0.95)
            prog_interest = np.random.uniform(0.35, 0.65)
            ai_interest = np.random.uniform(0.35, 0.65)
            web_interest = np.random.uniform(0.35, 0.7)
            ds_interest = np.random.uniform(0.4, 0.7)
            math_interest = np.random.uniform(0.7, 0.95)
            confidence = np.random.uniform(0.7, 0.9)
            motivation = np.random.uniform(0.7, 0.95)
            prob_solv_conf = np.random.uniform(0.5, 0.75)
            
            java_know = np.random.uniform(0.50, 0.75)
            py_know = np.random.uniform(0.55, 0.80)
            math_know = np.random.uniform(0.80, 0.98)
            dsa_know = np.random.uniform(0.45, 0.70)
            
            completion_rate = np.random.uniform(0.75, 0.95)
            watch_rate = np.random.uniform(0.65, 0.88)
            avg_watch_pct = np.random.uniform(0.70, 0.90)
            pause_freq = np.random.uniform(1.5, 3.5)
            rewatch_freq = np.random.uniform(0.8, 2.2)
            
            quiz_accuracy = np.random.uniform(0.78, 0.94)
            quiz_attempt_rate = np.random.uniform(0.85, 0.98)
            attempts_per_q = np.random.uniform(1.1, 1.4)
            ans_time_sec = np.random.uniform(20, 45)
            
            retention = np.random.uniform(0.75, 0.92)
            rev_freq = np.random.uniform(4.0, 6.5)
            
            prob_success = np.random.uniform(0.50, 0.75)
            prob_time_min = np.random.uniform(10.0, 25.0)

        elif p_type == "Type G - Practical Learner":
            avg_marks = np.random.normal(68, 7)
            study_hours = np.random.uniform(3.0, 7.0)
            consistency = np.random.uniform(0.6, 0.9)
            prog_interest = np.random.uniform(0.85, 1.0)
            ai_interest = np.random.uniform(0.8, 1.0)
            web_interest = np.random.uniform(0.85, 1.0)
            ds_interest = np.random.uniform(0.75, 0.98)
            math_interest = np.random.uniform(0.4, 0.75)
            confidence = np.random.uniform(0.65, 0.9)
            motivation = np.random.uniform(0.75, 0.98)
            prob_solv_conf = np.random.uniform(0.8, 1.0)
            
            java_know = np.random.uniform(0.60, 0.90)
            py_know = np.random.uniform(0.70, 0.98)
            math_know = np.random.uniform(0.45, 0.75)
            dsa_know = np.random.uniform(0.65, 0.92)
            
            completion_rate = np.random.uniform(0.70, 0.92)
            watch_rate = np.random.uniform(0.55, 0.82)
            avg_watch_pct = np.random.uniform(0.60, 0.85)
            pause_freq = np.random.uniform(1.0, 3.0)
            rewatch_freq = np.random.uniform(0.3, 1.2)
            
            quiz_accuracy = np.random.uniform(0.65, 0.85)
            quiz_attempt_rate = np.random.uniform(0.65, 0.88)
            attempts_per_q = np.random.uniform(1.2, 1.6)
            ans_time_sec = np.random.uniform(18, 40)
            
            retention = np.random.uniform(0.68, 0.88)
            rev_freq = np.random.uniform(2.0, 4.5)
            
            prob_success = np.random.uniform(0.75, 0.95)
            prob_time_min = np.random.uniform(4.0, 14.0)

        else:  # Type H - Struggling but Consistent
            avg_marks = np.random.normal(54, 8)
            study_hours = np.random.uniform(3.5, 7.5)
            consistency = np.random.uniform(0.75, 0.95)
            prog_interest = np.random.uniform(0.5, 0.85)
            ai_interest = np.random.uniform(0.5, 0.85)
            web_interest = np.random.uniform(0.5, 0.85)
            ds_interest = np.random.uniform(0.4, 0.75)
            math_interest = np.random.uniform(0.3, 0.65)
            confidence = np.random.uniform(0.3, 0.6)
            motivation = np.random.uniform(0.7, 0.95)
            prob_solv_conf = np.random.uniform(0.3, 0.6)
            
            java_know = np.random.uniform(0.15, 0.45)
            py_know = np.random.uniform(0.20, 0.50)
            math_know = np.random.uniform(0.25, 0.55)
            dsa_know = np.random.uniform(0.15, 0.40)
            
            completion_rate = np.random.uniform(0.65, 0.90)
            watch_rate = np.random.uniform(0.70, 0.92)
            avg_watch_pct = np.random.uniform(0.70, 0.92)
            pause_freq = np.random.uniform(3.0, 6.5)
            rewatch_freq = np.random.uniform(1.8, 4.0)
            
            quiz_accuracy = np.random.uniform(0.45, 0.70)
            quiz_attempt_rate = np.random.uniform(0.75, 0.95)
            attempts_per_q = np.random.uniform(1.5, 2.5)
            ans_time_sec = np.random.uniform(35, 75)
            
            retention = np.random.uniform(0.50, 0.75)
            rev_freq = np.random.uniform(3.5, 6.0)
            
            prob_success = np.random.uniform(0.40, 0.65)
            prob_time_min = np.random.uniform(12.0, 28.0)

        # Ensure academic bounds
        avg_marks = np.clip(avg_marks, 30.0, 100.0)
        strongest_sub = np.clip(avg_marks + np.random.uniform(4, 15), 40.0, 100.0)
        weakest_sub = np.clip(avg_marks - np.random.uniform(4, 18), 20.0, strongest_sub)
        
        # Categorical choices
        pref_mode = np.random.choice(learning_modes)
        goal_orient = np.random.choice(goal_orientations)
        
        # Activity volume variables
        days_active = int(np.clip(np.random.normal(consistency * 120 + 10, 15), 5, 180))
        lessons_attempted = int(np.clip(days_active * np.random.uniform(0.4, 1.2), 5, 150))
        lessons_completed = int(np.clip(lessons_attempted * completion_rate, 1, lessons_attempted))
        actual_completion_rate = round(lessons_completed / lessons_attempted, 4)
        
        session_duration = round(float(np.clip(study_hours * 25 + np.random.uniform(10, 30), 15.0, 180.0)), 1)
        avg_session_time = round(float(np.clip(session_duration * 0.75 + np.random.uniform(-5, 10), 10.0, 120.0)), 1)
        
        quizzes_attempted = int(np.clip(lessons_completed * np.random.uniform(0.3, 0.8), 2, 80))
        avg_quiz_score = round(float(quiz_accuracy * 100.0), 2)
        
        problems_attempted = int(np.clip(lessons_completed * np.random.uniform(0.4, 1.5), 0, 200))
        problems_solved = int(np.clip(problems_attempted * prob_success, 0, problems_attempted))
        actual_prob_success_rate = round(problems_solved / problems_attempted, 4) if problems_attempted > 0 else 0.0
        
        # ----------------------------------------------------
        # TARGET VARIABLE GENERATION (REALISTIC WEIGHTED BLEND + NOISE)
        # ----------------------------------------------------
        # Overall Mastery Target
        mastery_base = (
            0.18 * (avg_marks / 100.0) +
            0.18 * ((java_know + py_know + math_know + dsa_know) / 4.0) +
            0.20 * quiz_accuracy +
            0.15 * actual_prob_success_rate +
            0.12 * consistency +
            0.10 * retention +
            0.07 * actual_completion_rate
        )
        # Controlled random noise so relationship is strong but not deterministic
        noise_mastery = np.random.normal(0, 0.035)
        overall_mastery = round(float(np.clip(mastery_base + noise_mastery, 0.0, 1.0)), 4)
        
        # Topic-Level Mastery Targets
        java_mastery_base = (
            0.35 * java_know +
            0.25 * quiz_accuracy +
            0.15 * prog_interest +
            0.15 * actual_prob_success_rate +
            0.10 * consistency
        )
        java_mastery = round(float(np.clip(java_mastery_base + np.random.normal(0, 0.035), 0.0, 1.0)), 4)

        py_mastery_base = (
            0.35 * py_know +
            0.25 * quiz_accuracy +
            0.15 * (0.5 * prog_interest + 0.5 * py_know) +
            0.15 * actual_prob_success_rate +
            0.10 * consistency
        )
        python_mastery = round(float(np.clip(py_mastery_base + np.random.normal(0, 0.035), 0.0, 1.0)), 4)

        dsa_mastery_base = (
            0.35 * dsa_know +
            0.25 * actual_prob_success_rate +
            0.15 * quiz_accuracy +
            0.15 * prob_solv_conf +
            0.10 * retention
        )
        dsa_mastery = round(float(np.clip(dsa_mastery_base + np.random.normal(0, 0.035), 0.0, 1.0)), 4)

        math_mastery_base = (
            0.40 * math_know +
            0.25 * (avg_marks / 100.0) +
            0.15 * quiz_accuracy +
            0.10 * math_interest +
            0.10 * retention
        )
        math_mastery = round(float(np.clip(math_mastery_base + np.random.normal(0, 0.035), 0.0, 1.0)), 4)

        record = {
            # Metadata & Context
            "student_id": student_id,
            "student_profile_type": p_type,
            "dataset_type": "SYNTHETIC_DATA",
            "education_level": edu_level,
            "age_group": age_grp,
            
            # Academic
            "average_marks": round(float(avg_marks), 2),
            "strongest_subject_score": round(float(strongest_sub), 2),
            "weakest_subject_score": round(float(weakest_sub), 2),
            
            # Interest (0.0 - 1.0)
            "programming_interest": round(float(prog_interest), 3),
            "ai_interest": round(float(ai_interest), 3),
            "web_development_interest": round(float(web_interest), 3),
            "data_science_interest": round(float(ds_interest), 3),
            "mathematics_interest": round(float(math_interest), 3),
            
            # Learning Behavior
            "study_hours_per_day": round(float(study_hours), 2),
            "study_consistency": round(float(consistency), 3),
            "preferred_learning_mode": pref_mode,
            "session_duration": session_duration,
            "revision_frequency": round(float(rev_freq), 2),
            
            # Psychological / Self-Assessment
            "confidence_score": round(float(confidence), 3),
            "motivation_score": round(float(motivation), 3),
            "problem_solving_confidence": round(float(prob_solv_conf), 3),
            "goal_orientation": goal_orient,
            
            # Initial Knowledge
            "java_knowledge": round(float(java_know), 3),
            "python_knowledge": round(float(py_know), 3),
            "mathematics_knowledge": round(float(math_know), 3),
            "dsa_knowledge": round(float(dsa_know), 3),
            
            # Learning Activity
            "lessons_attempted": lessons_attempted,
            "lessons_completed": lessons_completed,
            "lesson_completion_rate": actual_completion_rate,
            "video_watch_rate": round(float(watch_rate), 3),
            "average_watch_percentage": round(float(avg_watch_pct), 3),
            "pause_frequency": round(float(pause_freq), 2),
            "rewatch_frequency": round(float(rewatch_freq), 2),
            "average_session_time": avg_session_time,
            
            # Quiz Performance
            "quizzes_attempted": quizzes_attempted,
            "average_quiz_score": avg_quiz_score,
            "quiz_accuracy": round(float(quiz_accuracy), 3),
            "quiz_attempt_rate": round(float(quiz_attempt_rate), 3),
            "average_attempts_per_question": round(float(attempts_per_q), 2),
            "average_answer_time": round(float(ans_time_sec), 1),
            
            # Retention & Revision
            "retention_score": round(float(retention), 3),
            "days_active": days_active,
            
            # Problem Solving
            "problems_attempted": problems_attempted,
            "problems_solved": problems_solved,
            "problem_success_rate": actual_prob_success_rate,
            "average_problem_time": round(float(prob_time_min), 1),
            
            # Target Variables
            "overall_mastery_score": overall_mastery,
            "java_mastery": java_mastery,
            "python_mastery": python_mastery,
            "dsa_mastery": dsa_mastery,
            "mathematics_mastery": math_mastery
        }
        records.append(record)
        
    df = pd.DataFrame(records)
    return df

def validate_dataset(df: pd.DataFrame, expected_samples: int) -> bool:
    print("\n" + "=" * 60)
    print("      FIRSTSTEP ML DATASET VALIDATION REPORT")
    print("=" * 60)
    
    passed = True
    errors = []
    
    # Check row count
    rows, cols = df.shape
    print(f"Samples (Rows)   : {rows:,} (Expected: {expected_samples:,})")
    print(f"Features (Cols)  : {cols}")
    if rows != expected_samples:
        passed = False
        errors.append(f"Row count mismatch: expected {expected_samples}, got {rows}")
        
    # Check missing values
    missing_count = df.isnull().sum().sum()
    print(f"Missing Values   : {missing_count}")
    if missing_count > 0:
        passed = False
        errors.append(f"Found {missing_count} missing values")
        
    # Check duplicate student IDs
    duplicate_ids = df["student_id"].duplicated().sum()
    print(f"Duplicate IDs    : {duplicate_ids}")
    if duplicate_ids > 0:
        passed = False
        errors.append(f"Found {duplicate_ids} duplicate student IDs")
        
    # Check numeric bounds
    target_col = "overall_mastery_score"
    min_m = df[target_col].min()
    max_m = df[target_col].max()
    mean_m = df[target_col].mean()
    std_m = df[target_col].std()
    
    print("-" * 60)
    print(f"Target Variable: {target_col}")
    print(f"  Min            : {min_m:.4f}")
    print(f"  Max            : {max_m:.4f}")
    print(f"  Mean           : {mean_m:.4f}")
    print(f"  Std Dev        : {std_m:.4f}")
    print("-" * 60)
    
    if min_m < 0.0 or max_m > 1.0:
        passed = False
        errors.append(f"Target variable {target_col} out of range [0.0, 1.0]: [{min_m}, {max_m}]")
        
    # Check Topic Masteries
    topic_cols = ["java_mastery", "python_mastery", "dsa_mastery", "mathematics_mastery"]
    for tcol in topic_cols:
        tmin, tmax = df[tcol].min(), df[tcol].max()
        if tmin < 0.0 or tmax > 1.0:
            passed = False
            errors.append(f"Topic target {tcol} out of range [0.0, 1.0]: [{tmin}, {tmax}]")
            
    # Check NaN or Inf
    numeric_df = df.select_dtypes(include=[np.number])
    inf_count = np.isinf(numeric_df).sum().sum()
    if inf_count > 0:
        passed = False
        errors.append(f"Found {inf_count} infinite values")
        
    print(f"Dataset validation: {'PASSED' if passed else 'FAILED'}")
    if not passed:
        print("Validation Errors:")
        for err in errors:
            print(f"  - {err}")
    print("=" * 60 + "\n")
    return passed

def main():
    args = parse_args()
    samples = args.samples
    seed = args.seed
    
    base_dir = Path(__file__).resolve().parent.parent
    output_dir = base_dir / "data"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    output_path = Path(args.output) if args.output else output_dir / "student_learning_dataset.csv"
    
    print(f"[FIRSTSTEP ML] Generating synthetic student dataset ({samples:,} samples, seed={seed})...")
    df = generate_synthetic_dataset(num_samples=samples, seed=seed)
    
    validation_passed = validate_dataset(df, expected_samples=samples)
    if not validation_passed:
        print("[ERROR] Validation failed! Please check dataset parameters.")
        sys.exit(1)
        
    df.to_csv(output_path, index=False)
    print(f"[SUCCESS] Synthetic dataset successfully saved to: {output_path}")

if __name__ == "__main__":
    main()
