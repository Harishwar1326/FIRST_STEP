"""
FirstStep Digital Edu Platform - Adaptive Learning ML System
STEP 2: Visual Analysis Generator

Generates key analysis plots using matplotlib and saves them in ai_service/data/analysis/
"""

import sys
import pandas as pd
import matplotlib.pyplot as plt
from pathlib import Path

# Ensure UTF-8 output encoding for Windows terminals
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

def generate_visual_analysis(dataset_path: str = None):
    base_dir = Path(__file__).resolve().parent.parent
    if dataset_path is None:
        dataset_path = base_dir / "data" / "student_learning_dataset.csv"
    else:
        dataset_path = Path(dataset_path)

    if not dataset_path.exists():
        print(f"[ERROR] Dataset file not found at: {dataset_path}")
        sys.exit(1)

    analysis_dir = base_dir / "data" / "analysis"
    analysis_dir.mkdir(parents=True, exist_ok=True)

    df = pd.read_csv(dataset_path)
    print(f"[VISUAL ANALYSIS] Generating plots for {len(df):,} samples...")

    # Set common plot style
    plt.style.use("default")
    plt.rcParams["font.sans-serif"] = "DejaVu Sans"
    plt.rcParams["axes.edgecolor"] = "#cccccc"
    plt.rcParams["axes.linewidth"] = 0.8

    # 1. Mastery Score Distribution Plot
    fig, ax = plt.subplots(figsize=(8, 5))
    ax.hist(df["overall_mastery_score"], bins=40, color="#4F46E5", edgecolor="#3730A3", alpha=0.85)
    ax.set_title("FirstStep ML Dataset: Overall Mastery Score Distribution", fontsize=14, fontweight="bold", pad=12)
    ax.set_xlabel("Overall Mastery Score (Target)", fontsize=11)
    ax.set_ylabel("Student Count", fontsize=11)
    ax.grid(True, linestyle="--", alpha=0.5)
    mean_val = df["overall_mastery_score"].mean()
    ax.axvline(mean_val, color="#EF4444", linestyle="--", linewidth=2, label=f"Mean = {mean_val:.2f}")
    ax.legend(loc="upper left")
    plt.tight_layout()
    plot1_path = analysis_dir / "mastery_distribution.png"
    fig.savefig(plot1_path, dpi=200)
    plt.close(fig)
    print(f"  Saved: {plot1_path.name}")

    # 2. Quiz Accuracy vs Mastery Scatter Plot
    fig, ax = plt.subplots(figsize=(8, 5))
    scatter = ax.scatter(
        df["quiz_accuracy"],
        df["overall_mastery_score"],
        c=df["study_consistency"],
        cmap="viridis",
        alpha=0.4,
        s=15
    )
    cbar = fig.colorbar(scatter, ax=ax)
    cbar.set_label("Study Consistency", fontsize=10)
    ax.set_title("Quiz Accuracy vs Overall Mastery Score", fontsize=14, fontweight="bold", pad=12)
    ax.set_xlabel("Quiz Accuracy (0.0 - 1.0)", fontsize=11)
    ax.set_ylabel("Overall Mastery Score (Target)", fontsize=11)
    ax.grid(True, linestyle="--", alpha=0.5)
    plt.tight_layout()
    plot2_path = analysis_dir / "quiz_accuracy_vs_mastery.png"
    fig.savefig(plot2_path, dpi=200)
    plt.close(fig)
    print(f"  Saved: {plot2_path.name}")

    # 3. Consistency vs Mastery Plot (Boxplot by profile type)
    fig, ax = plt.subplots(figsize=(8, 5))
    ax.scatter(df["study_consistency"], df["overall_mastery_score"], color="#10B981", alpha=0.3, s=12)
    ax.set_title("Study Consistency vs Overall Mastery Score", fontsize=14, fontweight="bold", pad=12)
    ax.set_xlabel("Study Consistency Score (0.0 - 1.0)", fontsize=11)
    ax.set_ylabel("Overall Mastery Score (Target)", fontsize=11)
    ax.grid(True, linestyle="--", alpha=0.5)
    plt.tight_layout()
    plot3_path = analysis_dir / "consistency_vs_mastery.png"
    fig.savefig(plot3_path, dpi=200)
    plt.close(fig)
    print(f"  Saved: {plot3_path.name}")

    # 4. Study Hours vs Mastery Plot
    fig, ax = plt.subplots(figsize=(8, 5))
    ax.scatter(df["study_hours_per_day"], df["overall_mastery_score"], color="#F59E0B", alpha=0.3, s=12)
    ax.set_title("Daily Study Hours vs Overall Mastery Score", fontsize=14, fontweight="bold", pad=12)
    ax.set_xlabel("Study Hours per Day", fontsize=11)
    ax.set_ylabel("Overall Mastery Score (Target)", fontsize=11)
    ax.grid(True, linestyle="--", alpha=0.5)
    plt.tight_layout()
    plot4_path = analysis_dir / "study_hours_vs_mastery.png"
    fig.savefig(plot4_path, dpi=200)
    plt.close(fig)
    print(f"  Saved: {plot4_path.name}")

    print(f"[SUCCESS] All 4 analysis plots generated under: {analysis_dir}")

if __name__ == "__main__":
    generate_visual_analysis()
