# Space Highways Research Pipeline

This folder holds the analysis-side pipeline for `b4gspring2026`. The narrative app should consume exported research summaries, not training code or feature engineering logic inline.

For the finished findings and interpretation, see [FINDINGS.md](./FINDINGS.md).

## Boundary

- `src/data/narrative/**`: curated story subset used by the scrolling experience and kept in the public repo
- `src/data/research/**`: app-facing summaries exported from the research pipeline and kept in the public repo
- `research/data/raw/**`: local raw catalog pulls and broad-coverage source snapshots, excluded from the public repo
- `research/data/processed/**`: local canonical records, feature matrices, and intermediate analysis tables, excluded from the public repo
- `research/artifacts/**`: local model checkpoints, embeddings, clustering results, and anomaly outputs, excluded from the public repo

The public repository is intentionally trimmed to the code, docs, curated narrative data, and the small exported summary the app consumes. Large raw pulls and generated research outputs should be regenerated locally when needed.

## Stages

0. `00_fetch_broad_catalog.py`
   - downloads the broad active-payload research population from CelesTrak SATCAT
   - writes a raw source manifest so the pipeline can audit NASA vs public catalog vs local-seed coverage
1. `01_build_canonical_records.py`
   - merges the broad CelesTrak population with the current story dataset and narrative seed into one canonical research record per satellite
   - keeps direct, derived, and proxy signals explicit
2. `02_build_feature_matrix.py`
   - flattens canonical records into a feature matrix plus feature catalog
3. `03_export_analysis_contract.py`
   - exports the stable app-facing contract the UI can consume later
4. `04_train_autoencoder.py`
   - trains the first-pass PyTorch autoencoder on the expanded feature matrix
5. `05_export_trained_findings.py`
   - converts embeddings, clusters, and anomaly scores into regime summaries, outlier lists, and app-facing research findings
   - also writes a reusable final findings summary for README / portfolio use
6. `06_run_validation_suite.py`
   - reruns the model across multiple seeds
   - compares against raw-feature and PCA baselines
   - runs feature-group ablations
   - exports stability, anomaly, and regime-interpretation summaries

Final summary artifacts:

- `research/data/processed/analysis_export.json`
- `research/data/processed/final_findings_summary.json`
- `src/data/research/vulnerability-regimes.json`

## Current Status

- canonical record model: implemented
- feature catalog with provenance, groups, and model-inclusion flags: implemented
- broad active-payload ingest: implemented
- app-facing ML export contract: implemented
- PyTorch autoencoder stage: implemented and runnable
- validation suite for stability, baselines, ablations, and anomaly interpretation: implemented and runnable

## Run

```bash
python3 research/scripts/00_fetch_broad_catalog.py
python3 research/scripts/01_build_canonical_records.py
python3 research/scripts/02_build_feature_matrix.py
python3 research/scripts/03_export_analysis_contract.py
```

When the ML dependencies are installed:

```bash
python3 research/scripts/04_train_autoencoder.py
python3 research/scripts/06_run_validation_suite.py
python3 research/scripts/05_export_trained_findings.py
```
