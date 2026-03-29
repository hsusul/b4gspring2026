from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
RESEARCH_ROOT = REPO_ROOT / "research"
if str(RESEARCH_ROOT) not in sys.path:
    sys.path.insert(0, str(RESEARCH_ROOT))

from orbital_vulnerability.io import get_repo_root, load_json
from orbital_vulnerability.training import (
    prepare_feature_matrix,
    train_autoencoder,
    write_training_outputs,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Train the first-pass PyTorch autoencoder on the satellite feature matrix.",
    )
    parser.add_argument(
        "--config",
        default="research/configs/autoencoder.default.json",
        help="Path to the autoencoder config file, relative to the repo root.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    repo_root = get_repo_root(__file__)
    feature_matrix_path = repo_root / "research" / "data" / "processed" / "feature_matrix.json"
    config_path = repo_root / args.config

    feature_payload = load_json(feature_matrix_path)
    config = json.loads(config_path.read_text(encoding="utf8"))

    prepared = prepare_feature_matrix(
        feature_payload,
        min_category_frequency=int(config.get("min_category_frequency", 10)),
    )
    training_payload = train_autoencoder(prepared, config=config)
    output_dir = repo_root / "research" / "artifacts" / "autoencoder" / "latest"
    write_training_outputs(output_dir, training_payload)

    print(f"wrote {output_dir / 'training-results.json'}")
    print(f"best validation loss: {training_payload['best_validation_loss']:.6f}")


if __name__ == "__main__":
    main()
