from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
RESEARCH_ROOT = REPO_ROOT / "research"
if str(RESEARCH_ROOT) not in sys.path:
    sys.path.insert(0, str(RESEARCH_ROOT))

from orbital_vulnerability.io import (
    get_repo_root,
    load_canonical_records,
    load_json,
    write_json,
)
from orbital_vulnerability.validation import build_validation_suite


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run stability, baseline, ablation, and anomaly validation for the orbital vulnerability model.",
    )
    parser.add_argument(
        "--config",
        default="research/configs/autoencoder.default.json",
        help="Path to the primary autoencoder config file, relative to the repo root.",
    )
    parser.add_argument(
        "--validation-config",
        default="research/configs/validation.default.json",
        help="Path to the validation-suite config file, relative to the repo root.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    repo_root = get_repo_root(__file__)

    canonical_path = repo_root / "research" / "data" / "processed" / "canonical_satellite_records.json"
    feature_matrix_path = repo_root / "research" / "data" / "processed" / "feature_matrix.json"
    training_results_path = (
        repo_root / "research" / "artifacts" / "autoencoder" / "latest" / "training-results.json"
    )
    config_path = repo_root / args.config
    validation_config_path = repo_root / args.validation_config

    records = load_canonical_records(canonical_path)
    feature_payload = load_json(feature_matrix_path)
    training_results = load_json(training_results_path)
    config = json.loads(config_path.read_text(encoding="utf8"))
    validation_config = json.loads(validation_config_path.read_text(encoding="utf8"))

    validation_summary = build_validation_suite(
        records=records,
        feature_payload=feature_payload,
        base_config=config,
        primary_training_results=training_results,
        seeds=list(validation_config.get("seeds", [config["seed"]])),
        ablation_seed=int(validation_config.get("ablation_seed", config["seed"])),
    )

    processed_root = repo_root / "research" / "data" / "processed"
    write_json(processed_root / "validation_summary.json", validation_summary)
    write_json(processed_root / "stability_summary.json", validation_summary["stability"])
    write_json(processed_root / "baseline_comparison.json", validation_summary["baselineComparison"])
    write_json(processed_root / "ablation_summary.json", validation_summary["ablationSummary"])
    write_json(processed_root / "anomaly_summary.json", validation_summary["anomalySummary"])
    write_json(processed_root / "regime_interpretations.json", validation_summary["regimeInterpretations"])

    print(f"wrote {processed_root / 'validation_summary.json'}")
    print(f"stability trials: {validation_summary['stability']['trialCount']}")
    print(
        "cross-orbit persistence:",
        validation_summary["stability"]["crossOrbitPresenceRate"],
    )
    print(
        "baseline methods:",
        ", ".join(
            method["method"]
            for method in validation_summary["baselineComparison"]["methods"]
        ),
    )


if __name__ == "__main__":
    main()
