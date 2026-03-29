from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
RESEARCH_ROOT = REPO_ROOT / "research"
if str(RESEARCH_ROOT) not in sys.path:
    sys.path.insert(0, str(RESEARCH_ROOT))

from orbital_vulnerability.canonical import build_canonical_records
from orbital_vulnerability.io import (
    get_repo_root,
    load_raw_satcat_records,
    load_story_records,
    load_story_seed_map,
    write_canonical_records,
)


def main() -> None:
    repo_root = get_repo_root(__file__)
    records = build_canonical_records(
        load_story_records(repo_root),
        load_story_seed_map(repo_root),
        load_raw_satcat_records(repo_root),
    )
    output_path = repo_root / "research" / "data" / "processed" / "canonical_satellite_records.json"
    write_canonical_records(output_path, records)
    print(f"wrote {output_path}")
    print(f"canonical records: {len(records)}")


if __name__ == "__main__":
    main()
