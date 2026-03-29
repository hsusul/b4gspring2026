import type { CSSProperties } from "react";

import { getScorePercentage } from "../../lib/data/sidebar";
import type { EnrichedSatelliteRecord } from "../../types";
import styles from "./sidebar.module.css";

interface SatelliteListItemProps {
  satellite: EnrichedSatelliteRecord;
  rank: number;
  selected: boolean;
  onSelect: (satelliteId: string) => void;
}

export function SatelliteListItem({
  satellite,
  rank,
  selected,
  onSelect,
}: SatelliteListItemProps) {
  const scorePercent = getScorePercentage(
    satellite.scoreBreakdown.total,
    satellite.scoreBreakdown.maxScore,
  );

  return (
    <button
      type="button"
      className={[styles.rowButton, selected ? styles.rowSelected : ""]
        .filter(Boolean)
        .join(" ")}
      style={
        {
          "--signal-color": satellite.highlightColor,
        } as CSSProperties
      }
      onClick={() => onSelect(satellite.satelliteId)}
      aria-pressed={selected}
    >
      <div className={styles.rowTop}>
        <div className={styles.rowIdentity}>
          <span className={styles.rowRank}>{rank}</span>
          <p className={styles.rowName}>{satellite.displayName}</p>
        </div>

        <div className={styles.rowRight}>
          <span className={styles.scoreValue}>{scorePercent}</span>
        </div>
      </div>

      <p className={styles.rowMeta}>
        <span className={styles.rowMetaValue}>{satellite.riskLabel}</span>
        <span className={styles.rowMetaValue}>{satellite.orbitClass}</span>
      </p>
    </button>
  );
}
