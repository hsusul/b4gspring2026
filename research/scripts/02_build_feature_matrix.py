from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
RESEARCH_ROOT = REPO_ROOT / "research"
if str(RESEARCH_ROOT) not in sys.path:
    sys.path.insert(0, str(RESEARCH_ROOT))

from orbital_vulnerability.io import get_repo_root, load_canonical_records, write_json
from orbital_vulnerability.matrix import (
    build_feature_matrix,
    build_feature_matrix_payload,
    write_feature_matrix_csv,
)


def main() -> None:
    repo_root = get_repo_root(__file__)
    canonical_path = repo_root / "research" / "data" / "processed" / "canonical_satellite_records.json"
    records = load_canonical_records(canonical_path)
    payload = build_feature_matrix_payload(records)
    rows = build_feature_matrix(records)

    json_path = repo_root / "research" / "data" / "processed" / "feature_matrix.json"
    csv_path = repo_root / "research" / "data" / "processed" / "feature_matrix.csv"

    write_json(json_path, payload)
    write_feature_matrix_csv(csv_path, rows)

    print(f"wrote {json_path}")
    print(f"wrote {csv_path}")
    print(f"feature rows: {len(rows)}")
    print(f"feature count: {payload['feature_count']}")


if __name__ == "__main__":
    main()
