# b4gspring2026

## Project Summary

`b4gspring2026` is a long-form interactive narrative called **Space Has Highways**. It combines a Cesium globe, a curated story subset, and a research pipeline to ask a specific question:

> Do recurring orbital vulnerability regimes exist beyond simple orbit labels, and what combinations of traffic, debris, and mission context make operating conditions most fragile?

The finished project now has two clean layers:

- a scrolling narrative shell for the public-facing story
- a research pipeline that ingests a broad satellite population, builds features, trains an embedding model, validates the findings, and exports selective summaries back into the app

Broad catalog coverage comes from CelesTrak. NASA-derived orbit windows are explicitly limited to the curated story subset, and some mission and stewardship signals remain heuristic proxies.

## Validated Findings

- Crowded LEO traffic is the clearest and most robust result.
- Traffic density and debris burden are the most reliable drivers of fragility structure.
- A smaller cross-orbit regime appears in most reruns, but it is not unique to the autoencoder and should be treated as a qualified finding.
- Mission and operator context sharpens interpretation.
- Stewardship-heavy conclusions remain more sensitive to proxy inputs and should stay explicitly qualified.

For the finished research writeup, see [research/FINDINGS.md](./research/FINDINGS.md).

## Run

Install dependencies and start the Next.js app locally:

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Notes

- Cesium is installed from npm and its static assets are synced into `public/cesium` automatically during `npm install`, `npm run dev`, and `npm run build`.
- If your package manager skips lifecycle scripts, run this once before starting the app:

```bash
node scripts/setup-cesium.mjs
```

- `NEXT_PUBLIC_CESIUM_ION_TOKEN` is optional. The current globe works without it using Cesium's ellipsoid terrain provider.

## Data Layers

- `src/data/narrative/**`: curated story subset used by the scrolling experience and kept in the repo
- `src/data/research/**`: small app-facing research summaries exported from the pipeline and kept in the repo
- `research/data/raw/**`: local raw source pulls for analysis, intentionally excluded from the public repo
- `research/data/processed/**`: local canonical records, feature matrices, and intermediate outputs, intentionally excluded from the public repo
- `research/artifacts/**`: local model checkpoints, embeddings, clustering, and anomaly outputs, intentionally excluded from the public repo

## Research Pipeline

The research architecture lives under [research/README.md](./research/README.md).
The finished findings summary lives under [research/FINDINGS.md](./research/FINDINGS.md).

The public repo keeps only the small JSON files the story needs to run:

- `src/data/narrative/story-satellites.json`
- `src/data/narrative/story-enrichment-seed.json`
- `src/data/research/vulnerability-regimes.json`

Everything else under `research/data/**` and `research/artifacts/**` is treated as local generated workspace data and should be rebuilt on demand.

Initial staged commands:

```bash
python3 research/scripts/00_fetch_broad_catalog.py
python3 research/scripts/01_build_canonical_records.py
python3 research/scripts/02_build_feature_matrix.py
python3 research/scripts/03_export_analysis_contract.py
```

The PyTorch training stage is scaffolded in:

```bash
python3 research/scripts/04_train_autoencoder.py
python3 research/scripts/06_run_validation_suite.py
python3 research/scripts/05_export_trained_findings.py
```

Install research dependencies first:

```bash
pip install -r research/requirements-research.txt
```
