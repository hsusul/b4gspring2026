from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
RESEARCH_ROOT = REPO_ROOT / "research"
if str(RESEARCH_ROOT) not in sys.path:
    sys.path.insert(0, str(RESEARCH_ROOT))

from orbital_vulnerability.analysis import build_app_summary, build_trained_analysis_export
from orbital_vulnerability.io import (
    get_repo_root,
    load_canonical_records,
    load_json,
    write_json,
)


def main() -> None:
    repo_root = get_repo_root(__file__)
    canonical_path = repo_root / "research" / "data" / "processed" / "canonical_satellite_records.json"
    feature_matrix_path = repo_root / "research" / "data" / "processed" / "feature_matrix.json"
    training_results_path = (
        repo_root / "research" / "artifacts" / "autoencoder" / "latest" / "training-results.json"
    )
    validation_summary_path = repo_root / "research" / "data" / "processed" / "validation_summary.json"

    records = load_canonical_records(canonical_path)
    feature_payload = load_json(feature_matrix_path)
    training_results = load_json(training_results_path)
    validation_summary = (
        load_json(validation_summary_path)
        if validation_summary_path.exists()
        else None
    )

    full_export = build_trained_analysis_export(
        records=records,
        training_results=training_results,
        feature_payload=feature_payload,
        validation_summary=validation_summary,
    )
    app_summary = build_app_summary(full_export)

    research_output_path = repo_root / "research" / "data" / "processed" / "analysis_export.json"
    final_summary_output_path = (
        repo_root / "research" / "data" / "processed" / "final_findings_summary.json"
    )
    app_output_path = repo_root / "src" / "data" / "research" / "vulnerability-regimes.json"

    write_json(research_output_path, full_export)
    write_json(final_summary_output_path, full_export["finalSummary"])
    write_json(app_output_path, app_summary)

    print(f"wrote {research_output_path}")
    print(f"wrote {final_summary_output_path}")
    print(f"wrote {app_output_path}")
    print(f"regimes: {full_export['datasetSummary']['regimeCount']}")
    print(
        "cross-orbit regimes:",
        full_export["datasetSummary"]["crossOrbitRegimeCount"],
    )


if __name__ == "__main__":
    main()
