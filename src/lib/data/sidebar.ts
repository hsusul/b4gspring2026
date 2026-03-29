import type {
  EnrichedSatelliteRecord,
  OrbitClass,
  SatelliteRating,
  SatelliteRiskLabel,
} from "../../types";
import {
  getFactorAssessment,
  type FactorAssessment,
} from "./factorAssessment";

export type { FactorAssessment } from "./factorAssessment";

export const ALL_FILTER_VALUE = "All";

export type SidebarFilterValue<T extends string> = T | typeof ALL_FILTER_VALUE;

export interface SidebarFilters {
  rating: SidebarFilterValue<SatelliteRating>;
  risk: SidebarFilterValue<SatelliteRiskLabel>;
  orbit: SidebarFilterValue<OrbitClass>;
}

export interface SatelliteFilterOptions {
  ratings: SatelliteRating[];
  risks: SatelliteRiskLabel[];
  orbits: OrbitClass[];
}

export interface SatelliteFleetSummary {
  totalRecords: number;
  averageScore: number;
  topTierCount: number;
  highRiskCount: number;
  moderateRiskCount: number;
  lowRiskCount: number;
}

export interface SatelliteComparisonSnapshot {
  orbitClassPopulation: number;
  orbitClassScoreRank: number;
  scoreRank: number;
  totalCompared: number;
  isHighestRiskInOrbitClass: boolean;
}

export interface RatingPresentation {
  label: string;
  title: string;
  summary: string;
}

export interface RiskPresentation {
  title: string;
  summary: string;
}

export type FactorAssessmentTone = FactorAssessment["tone"];

const RATING_ORDER: SatelliteRating[] = ["A", "B", "C", "Watch"];
const RISK_ORDER: SatelliteRiskLabel[] = [
  "Low",
  "Moderate",
  "Elevated",
  "Critical",
];
const ORBIT_ORDER: OrbitClass[] = ["LEO", "SSO", "MEO", "GEO", "HEO"];
const RISK_SEVERITY: Record<SatelliteRiskLabel, number> = {
  Critical: 0,
  Elevated: 1,
  Moderate: 2,
  Low: 3,
};

const RATING_PRESENTATION: Record<SatelliteRating, RatingPresentation> = {
  A: {
    label: "A rating",
    title: "High-confidence asset",
    summary:
      "The local model sees this satellite as operationally strong, with weaknesses that stay contained rather than defining the mission.",
  },
  B: {
    label: "B rating",
    title: "Stable with some drag",
    summary:
      "The mission reads as dependable overall, but one or more signals lag behind the strongest assets in the queue.",
  },
  C: {
    label: "C rating",
    title: "Usable with clear caution",
    summary:
      "The satellite still delivers value, though softer signals materially reduce confidence in its operating posture.",
  },
  Watch: {
    label: "Watch rating",
    title: "Needs active monitoring",
    summary:
      "At least one part of the score profile is weak enough that the mission belongs on an active watch list.",
  },
};

const RISK_PRESENTATION: Record<SatelliteRiskLabel, RiskPresentation> = {
  Low: {
    title: "Low operational pressure",
    summary:
      "Current conditions look controlled and comparatively quiet for this mission class.",
  },
  Moderate: {
    title: "Manageable operating pressure",
    summary:
      "The mission carries real complexity, but the local model still sees the exposure as controlled.",
  },
  Elevated: {
    title: "Meaningful watch pressure",
    summary:
      "Some operating conditions are soft enough that the asset deserves closer monitoring than the fleet baseline.",
  },
  Critical: {
    title: "High-pressure operating posture",
    summary:
      "The mission is in the highest-risk bucket of the local model and should be interpreted with caution.",
  },
};

function orderedUnique<T extends string>(
  records: EnrichedSatelliteRecord[],
  getValue: (record: EnrichedSatelliteRecord) => T,
  order: readonly T[],
): T[] {
  const seenValues = new Set(records.map(getValue));
  return order.filter((value) => seenValues.has(value));
}

export function getSatelliteFilterOptions(
  records: EnrichedSatelliteRecord[],
): SatelliteFilterOptions {
  return {
    ratings: orderedUnique(records, (record) => record.rating, RATING_ORDER),
    risks: orderedUnique(records, (record) => record.riskLabel, RISK_ORDER),
    orbits: orderedUnique(records, (record) => record.orbitClass, ORBIT_ORDER),
  };
}

export function getActiveFilterCount(filters: SidebarFilters) {
  return Object.values(filters).filter((value) => value !== ALL_FILTER_VALUE)
    .length;
}

export function getRatingPresentation(
  rating: SatelliteRating,
): RatingPresentation {
  return RATING_PRESENTATION[rating];
}

export function getRiskPresentation(
  riskLabel: SatelliteRiskLabel,
): RiskPresentation {
  return RISK_PRESENTATION[riskLabel];
}

export function getScorePercentage(total: number, maxScore: number) {
  if (maxScore <= 0) {
    return 0;
  }

  return Math.round((total / maxScore) * 100);
}

export { getFactorAssessment };

export function summarizeSatellites(
  records: EnrichedSatelliteRecord[],
): SatelliteFleetSummary {
  if (records.length === 0) {
    return {
      totalRecords: 0,
      averageScore: 0,
      topTierCount: 0,
      highRiskCount: 0,
      moderateRiskCount: 0,
      lowRiskCount: 0,
    };
  }

  const totalScore = records.reduce(
    (sum, record) => sum + record.scoreBreakdown.total,
    0,
  );
  const highRiskCount = records.filter(
    (record) =>
      record.riskLabel === "Elevated" || record.riskLabel === "Critical",
  ).length;
  const topTierCount = records.filter((record) => record.rating === "A").length;
  const moderateRiskCount = records.filter(
    (record) => record.riskLabel === "Moderate",
  ).length;
  const lowRiskCount = records.filter(
    (record) => record.riskLabel === "Low",
  ).length;

  return {
    totalRecords: records.length,
    averageScore: Math.round(totalScore / records.length),
    topTierCount,
    highRiskCount,
    moderateRiskCount,
    lowRiskCount,
  };
}

export function getSatelliteComparisonSnapshot(
  records: EnrichedSatelliteRecord[],
  satelliteId: string | null,
): SatelliteComparisonSnapshot | null {
  if (!satelliteId || records.length === 0) {
    return null;
  }

  const selectedSatellite =
    records.find((record) => record.satelliteId === satelliteId) ?? null;

  if (!selectedSatellite) {
    return null;
  }

  const scoreRank =
    [...records]
      .sort((left, right) => {
        if (RISK_SEVERITY[left.riskLabel] !== RISK_SEVERITY[right.riskLabel]) {
          return RISK_SEVERITY[left.riskLabel] - RISK_SEVERITY[right.riskLabel];
        }

        if (left.scoreBreakdown.total !== right.scoreBreakdown.total) {
          return left.scoreBreakdown.total - right.scoreBreakdown.total;
        }

        return left.displayName.localeCompare(right.displayName);
      })
      .findIndex((record) => record.satelliteId === satelliteId) + 1;

  const orbitClassPeers = records.filter(
    (record) => record.orbitClass === selectedSatellite.orbitClass,
  );
  const orbitClassScoreRank =
    [...orbitClassPeers]
      .sort((left, right) => {
        if (RISK_SEVERITY[left.riskLabel] !== RISK_SEVERITY[right.riskLabel]) {
          return RISK_SEVERITY[left.riskLabel] - RISK_SEVERITY[right.riskLabel];
        }

        if (left.scoreBreakdown.total !== right.scoreBreakdown.total) {
          return left.scoreBreakdown.total - right.scoreBreakdown.total;
        }

        return left.displayName.localeCompare(right.displayName);
      })
      .findIndex((record) => record.satelliteId === satelliteId) + 1;
  const highestRiskSeverityInOrbitClass = Math.min(
    ...orbitClassPeers.map((record) => RISK_SEVERITY[record.riskLabel]),
  );

  return {
    orbitClassPopulation: orbitClassPeers.length,
    orbitClassScoreRank,
    scoreRank,
    totalCompared: records.length,
    isHighestRiskInOrbitClass:
      RISK_SEVERITY[selectedSatellite.riskLabel] === highestRiskSeverityInOrbitClass,
  };
}

export function filterSatellites(
  records: EnrichedSatelliteRecord[],
  query: string,
  filters: SidebarFilters,
): EnrichedSatelliteRecord[] {
  const normalizedQuery = query.trim().toLowerCase();

  return records
    .filter((record) => {
      if (
        filters.rating !== ALL_FILTER_VALUE &&
        record.rating !== filters.rating
      ) {
        return false;
      }

      if (filters.risk !== ALL_FILTER_VALUE && record.riskLabel !== filters.risk) {
        return false;
      }

      if (
        filters.orbit !== ALL_FILTER_VALUE &&
        record.orbitClass !== filters.orbit
      ) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchableText = [
        record.displayName,
        record.operatorName,
        record.companyName,
        record.missionClass,
        record.serviceRegion,
        record.summary,
        record.riskSummary,
        record.tags.join(" "),
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedQuery);
    })
    .sort((left, right) => {
      if (RISK_SEVERITY[left.riskLabel] !== RISK_SEVERITY[right.riskLabel]) {
        return RISK_SEVERITY[left.riskLabel] - RISK_SEVERITY[right.riskLabel];
      }

      if (left.scoreBreakdown.total !== right.scoreBreakdown.total) {
        return left.scoreBreakdown.total - right.scoreBreakdown.total;
      }

      return left.displayName.localeCompare(right.displayName);
    });
}
