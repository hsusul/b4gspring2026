import type { CSSProperties } from "react";

import {
  getFactorAssessment,
} from "../../lib/data/sidebar";
import type { SatelliteScoreFactor } from "../../types";
import styles from "./panels.module.css";

interface ScoreBreakdownListProps {
  accentColor: string;
  factors: SatelliteScoreFactor[];
  summary: string;
}

export function ScoreBreakdownList({
  accentColor,
  factors,
  summary,
}: ScoreBreakdownListProps) {
  if (factors.length === 0) {
    return null;
  }

  return (
    <div className={styles.scoreList}>
      {factors.map((factor) => {
        const factorAssessment = getFactorAssessment(
          factor.score,
          factor.maxScore,
        );
        const normalizedStatus =
          factorAssessment.label === "High Risk"
            ? "High risk"
            : factorAssessment.label;
        return (
          <article
            className={styles.scoreRow}
            data-tone={factorAssessment.tone}
            key={factor.key}
          >
            <div
              className={styles.scoreRowGrid}
              style={
                {
                  "--factor-progress": `${(factor.score / factor.maxScore) * 100}%`,
                  "--score-accent": accentColor,
                } as CSSProperties
              }
            >
              <p className={styles.scoreRowTitle}>{factor.label}</p>
              <div className={styles.scoreRowMetaLine}>
                <strong className={styles.scoreRowValue}>
                  {factor.score}/{factor.maxScore}
                </strong>
                <span className={styles.scoreRowDot}>·</span>
                <span className={styles.scoreRowStatus}>{normalizedStatus}</span>
              </div>
              <div className={styles.scoreRowBar} aria-hidden="true">
                <span className={styles.scoreRowBarFill} />
              </div>
            </div>
          </article>
        );
      })}

      <details className={styles.analysisDisclosure}>
        <summary className={styles.analysisSummary}>View full analysis →</summary>
        <div className={styles.analysisContent}>
          <p className={styles.analysisLead}>{summary}</p>
          {factors.map((factor) => (
            <div className={styles.analysisItem} key={`${factor.key}-analysis`}>
              <p className={styles.analysisItemTitle}>{factor.label}</p>
              <p className={styles.analysisItemCopy}>{factor.explanation}</p>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
