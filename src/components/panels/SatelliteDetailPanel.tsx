import type { CSSProperties } from "react";

import { type SatelliteComparisonSnapshot } from "../../lib/data";
import type { EnrichedSatelliteRecord } from "../../types";
import { PanelFrame } from "../ui";
import { ScoreBreakdownList } from "./ScoreBreakdownList";
import styles from "./panels.module.css";

interface SatelliteDetailPanelProps {
  satellite: EnrichedSatelliteRecord | null;
  comparisonSnapshot: SatelliteComparisonSnapshot | null;
}

export function SatelliteDetailPanel({
  satellite,
  comparisonSnapshot,
}: SatelliteDetailPanelProps) {
  if (!satellite) {
    return (
      <PanelFrame
        title={undefined}
        eyebrow={undefined}
        description={undefined}
        className={styles.frame}
      >
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>No target in the current view.</p>
          <p className={styles.emptyCopy}>
            The filtered fleet is empty, so there is no score readout to inspect yet.
          </p>
        </div>
      </PanelFrame>
    );
  }

  const normalizedRiskLabel =
    satellite.riskLabel === "Critical" || satellite.riskLabel === "Elevated"
      ? "High risk"
      : satellite.riskLabel === "Moderate"
        ? "Moderate risk"
        : "Low risk";
  const rankSummary = comparisonSnapshot
    ? `Rank #${comparisonSnapshot.scoreRank}`
    : null;
  const takeaway = getTakeaway(
    comparisonSnapshot,
    satellite.orbitClass,
    satellite.summary,
  );

  return (
    <PanelFrame
      eyebrow={undefined}
      title={undefined}
      description={undefined}
      className={styles.frame}
    >
      <div
        className={styles.hero}
        style={
          {
            "--detail-accent": getRiskAccentColor(normalizedRiskLabel),
          } as CSSProperties
        }
      >
        <p className={styles.heroAssetName}>{satellite.displayName}</p>
        <p className={styles.heroScoreValue}>{satellite.scoreBreakdown.total}</p>
        <p className={styles.heroRiskLabel}>{normalizedRiskLabel}</p>
        {rankSummary ? <p className={styles.heroValue}>{rankSummary}</p> : null}
      </div>

      <section className={styles.breakdownSection}>
        <ScoreBreakdownList
          accentColor={getRiskAccentColor(normalizedRiskLabel)}
          factors={satellite.scoreBreakdown.factors}
          summary={takeaway}
        />
      </section>
    </PanelFrame>
  );
}

function getTakeaway(
  comparisonSnapshot: SatelliteComparisonSnapshot | null,
  orbitClass: string,
  summary: string,
) {
  if (
    comparisonSnapshot &&
    comparisonSnapshot.orbitClassPopulation > 1 &&
    comparisonSnapshot.orbitClassScoreRank === comparisonSnapshot.orbitClassPopulation
  ) {
    return `Lowest-performing asset in current ${orbitClass} cohort`;
  }

  const trimmed = summary.trim();

  if (!trimmed) {
    return "No current analysis available.";
  }

  const [firstSentence] = trimmed.split(/(?<=[.!?])\s+/);

  return firstSentence ?? trimmed;
}

function getRiskAccentColor(riskLabel: string) {
  if (riskLabel === "High risk") {
    return "#ff5e52";
  }

  if (riskLabel === "Moderate risk") {
    return "#f29b38";
  }

  return "#7d98b3";
}
