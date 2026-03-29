from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
RESEARCH_ROOT = REPO_ROOT / "research"
if str(RESEARCH_ROOT) not in sys.path:
    sys.path.insert(0, str(RESEARCH_ROOT))

from orbital_vulnerability.io import (
    load_story_records,
    load_story_seed_map,
    write_json,
    write_source_manifest,
)
from orbital_vulnerability.sources import build_local_story_sources, fetch_active_satcat


def main() -> None:
    repo_root = REPO_ROOT
    satcat_records, satcat_source = fetch_active_satcat()
    story_records = load_story_records(repo_root)
    story_seed_map = load_story_seed_map(repo_root)

    raw_satcat_path = repo_root / "research" / "data" / "raw" / "celestrak_active_satcat.json"
    source_manifest_path = repo_root / "research" / "data" / "raw" / "source_manifest.json"

    write_json(raw_satcat_path, satcat_records)
    write_source_manifest(
        source_manifest_path,
        [
            satcat_source,
            *build_local_story_sources(len(story_records), len(story_seed_map)),
        ],
    )

    print(f"wrote {raw_satcat_path}")
    print(f"wrote {source_manifest_path}")
    print(f"broad population rows: {len(satcat_records)}")


if __name__ == "__main__":
    main()
