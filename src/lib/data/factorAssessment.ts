import type {
  SatelliteFactorAssessmentLabel,
  SatelliteFactorTone,
} from "../../types/satellite.ts";

export interface FactorAssessment {
  tone: SatelliteFactorTone;
  label: SatelliteFactorAssessmentLabel;
}

export function getFactorAssessment(
  score: number,
  maxScore: number,
): FactorAssessment {
  const ratio = maxScore <= 0 ? 0 : score / maxScore;

  if (ratio >= 0.9) {
    return {
      tone: "leading",
      label: "Good",
    };
  }

  if (ratio >= 0.78) {
    return {
      tone: "strong",
      label: "Good",
    };
  }

  if (ratio >= 0.62) {
    return {
      tone: "mixed",
      label: "Moderate",
    };
  }

  return {
    tone: "watch",
    label: "High Risk",
  };
}
