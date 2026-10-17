import sys
import json
import warnings
from pathlib import Path

warnings.filterwarnings("ignore")

# Add project root to path
base_dir = Path(__file__).resolve().parent.parent.parent
if str(base_dir) not in sys.path:
    sys.path.insert(0, str(base_dir))

from app.pipelines.learning_engine_pipeline import LearningEnginePipeline

def main():
    pipeline = LearningEnginePipeline()
    if len(sys.argv) > 1:
        raw = sys.argv[1]
    else:
        raw = sys.stdin.read()
    try:
        data = json.loads(raw) if raw and raw.strip() else {}
    except Exception:
        data = {}
    result = pipeline.predict_profile(data)
    print(json.dumps(result))

if __name__ == "__main__":
    main()
