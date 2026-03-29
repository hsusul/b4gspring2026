from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
RESEARCH_ROOT = REPO_ROOT / "research"
if str(RESEARCH_ROOT) not in sys.path:
    sys.path.insert(0, str(RESEARCH_ROOT))

from orbital_vulnerability.export_contract import build_pending_analysis_export
from orbital_vulnerability.io import get_repo_root, load_canonical_records, write_json


def main() -> None:
    repo_root = get_repo_root(__file__)
    canonical_path = repo_root / "research" / "data" / "processed" / "canonical_satellite_records.json"
    records = load_canonical_records(canonical_path)
    payload = build_pending_analysis_export(records)

    research_output_path = repo_root / "research" / "data" / "processed" / "analysis_export.json"
    app_output_path = repo_root / "src" / "data" / "research" / "vulnerability-regimes.json"

    write_json(research_output_path, payload)
    write_json(app_output_path, payload)

    print(f"wrote {research_output_path}")
    print(f"wrote {app_output_path}")
    print(f"analysis status: {payload['analysisStatus']}")


if __name__ == "__main__":
    main()
