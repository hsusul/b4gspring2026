# Space Has Highways: Validated Findings

## Research Question

Can representation learning uncover recurring orbital vulnerability regimes beyond simple orbit labels, and show which combinations of traffic density, debris exposure, and mission context produce the most fragile operating conditions?

## Data Boundary

- Broad population coverage comes from the CelesTrak active SATCAT catalog.
- NASA-derived orbit windows are explicitly limited to the curated story subset and are not the source of the 15,260-satellite research population.
- The feature set mixes:
  - direct orbital/catalog inputs
  - derived shell, traffic, and debris-context features
  - proxy or heuristic mission and stewardship signals

That distinction matters. The strongest claims in this project are the ones that remain visible when the proxy-heavy features are reduced.

## Modeling Approach

- Canonical population: 15,260 active payloads
- Narrative subset: 8 curated satellites
- ML-ready features: 44
- Model: PyTorch tabular autoencoder with an 8-dimensional latent space
- Post-model analysis:
  - K-means clustering on the latent embeddings
  - reconstruction-error anomaly scoring
  - seeded rerun stability checks
  - raw-feature and PCA baselines
  - feature-group ablations

## What Is Strongly Supported

1. Crowded LEO traffic is the clearest and most repeatable vulnerability pattern.
   - The dominant LEO constellation regime appears in every seeded rerun.
   - A second crowded LEO regime appears in four of five reruns.

2. Traffic density and debris burden are the most reliable drivers of fragility structure.
   - The main crowded LEO and SSO patterns remain visible when stewardship proxy inputs are reduced.
   - Those patterns do not collapse when mission/operator context is reduced, although the labels become less sharp.

3. Vulnerability structure is not fully explained by orbit labels alone.
   - The strongest evidence comes from recurring traffic-heavy and debris-heavy regimes that reflect operating conditions, not just `LEO`, `SSO`, or `GEO` as category names.

## What Is Moderately Supported

1. A smaller cross-orbit regime exists beyond the main lane categories.
   - It persists across most seeded reruns.
   - It also appears in simpler baselines, which means it should be treated as shared structure in the data, not as a uniquely neural discovery.

2. GEO-like assets form a calmer regime with stewardship and end-of-life weakness.
   - This pattern is useful, but it is only moderately stable and depends more heavily on proxy-rich features than the crowded LEO regimes.

## What Remains Tentative

- Fine-grained stewardship interpretations depend partly on heuristic proxy inputs.
- Some mission-family and operator-context labels are helpful for interpretation, but they are not equally strong as research findings.
- Outlier rankings are useful prompts for inspection, but top outliers can reflect unusual orbital geometry as much as a clean vulnerability story.

## What the Model Adds

- The autoencoder gives the cleanest compressed view of the regime structure.
- It separates the 44-feature orbital context table into a smaller latent space that is easier to summarize in the narrative shell.
- It does **not** create entirely new structure absent from simpler baselines. Raw-feature clustering and PCA recover part of the same cross-orbit signal.

This means the model should be interpreted as a discovery aid and summarization layer, not as the sole source of truth.

## Validated Takeaway

The most defensible conclusion is:

> Recurring orbital vulnerability structure exists beyond simple orbit labels, but the clearest and most robust result is crowded low-orbit traffic. Traffic density and debris burden are the strongest drivers of fragility, mission and operator context sharpen interpretation, and stewardship-heavy conclusions should remain qualified.

## Why This Matters

The narrative shell shows that space has repeat traffic lanes.

The research layer adds a more precise claim:

- those lanes create recurring operating conditions
- those conditions can be grouped into vulnerability regimes
- and the strongest regime patterns are driven by congestion and debris more reliably than by orbit label alone

That is the bridge between the visual story and the ML layer.
