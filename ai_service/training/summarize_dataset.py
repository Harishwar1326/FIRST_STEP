"""
FirstStep Digital Edu Platform - Adaptive Learning ML System
STEP 2: Dataset Summary Generator

Prints a comprehensive summary report of the synthetic student learning dataset.
"""

import sys
import pandas as pd
from pathlib import Path

# Ensure UTF-8 output encoding for Windows terminals
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

def summarize_dataset(dataset_path: str = None):
    base_dir = Path(__file__).resolve().parent.parent
    if dataset_path is None:
        dataset_path = base_dir / "data" / "student_learning_dataset.csv"
    else:
        dataset_path = Path(dataset_path)
        
    if not dataset_path.exists():
        print(f"[ERROR] Dataset file not found at: {dataset_path}")
        sys.exit(1)
        
    df = pd.read_csv(dataset_path)
    num_students = len(df)
    
    print("=" * 60)
    print("                 FIRSTSTEP DATASET SUMMARY")
    print("=" * 60)
    print(f"Dataset File      : {dataset_path.name}")
    print(f"Total Students    : {num_students:,}")
    print(f"Total Columns     : {len(df.columns)}")
    print(f"Dataset Type Tag  : {df['dataset_type'].iloc[0] if 'dataset_type' in df.columns else 'N/A'}")
    print("-" * 60)
    
    # Feature Statistics Summary
    key_features = {
        "Average marks": "average_marks",
        "Study hours per day": "study_hours_per_day",
        "Quiz accuracy": "quiz_accuracy",
        "Consistency": "study_consistency",
        "Retention score": "retention_score",
        "Problem success rate": "problem_success_rate",
        "Overall mastery (target)": "overall_mastery_score",
        "Java mastery (target)": "java_mastery",
        "Python mastery (target)": "python_mastery",
        "DSA mastery (target)": "dsa_mastery",
        "Math mastery (target)": "mathematics_mastery"
    }
    
    print("KEY FEATURE STATISTICS:")
    for label, col in key_features.items():
        if col in df.columns:
            mean_val = df[col].mean()
            std_val = df[col].std()
            min_val = df[col].min()
            max_val = df[col].max()
            print(f"  {label:<26} : Mean = {mean_val:6.2f} | Std = {std_val:6.2f} | Range = [{min_val:.2f} - {max_val:.2f}]")
            
    print("-" * 60)
    print("STUDENT TYPE DISTRIBUTION:")
    if "student_profile_type" in df.columns:
        counts = df["student_profile_type"].value_counts()
        pcts = df["student_profile_type"].value_counts(normalize=True) * 100
        for stype, count in counts.items():
            pct = pcts[stype]
            print(f"  {stype:<36} : {count:5,} ({pct:5.2f}%)")
            
    print("-" * 60)
    print("EDUCATION LEVEL DISTRIBUTION:")
    if "education_level" in df.columns:
        counts = df["education_level"].value_counts()
        pcts = df["education_level"].value_counts(normalize=True) * 100
        for elevel, count in counts.items():
            pct = pcts[elevel]
            print(f"  {elevel:<25} : {count:5,} ({pct:5.2f}%)")
            
    print("=" * 60 + "\n")

if __name__ == "__main__":
    summarize_dataset()
