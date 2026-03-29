import type { OrbitClass, SatelliteRiskLabel, SatelliteRating } from "./satellite";

export type ResearchAnalysisStatus = "pending" | "trained";

export interface ResearchEmbeddingPoint {
  x: number;
  y: number;
}

export interface ResearchSatelliteFinding {
  satelliteId: string;
  displayName: string;
  orbitClass: OrbitClass | null;
  missionClass: string | null;
  scoreTotal: number | null;
  riskLabel: SatelliteRiskLabel | null;
  rating: SatelliteRating | null;
  vulnerabilityRegimeId: string | null;
  vulnerabilityRegimeLabel: string | null;
  anomalyScore: number | null;
  reconstructionLoss: number | null;
  embedding2d: ResearchEmbeddingPoint | null;
}

export interface ResearchCompositionSlice {
  key: string;
  label: string;
  count: number;
  share: number;
}

export interface ResearchRegimeProfile {
  averageScore: number | null;
  averageAnomalyScore: number | null;
  averageCongestionImpact: number | null;
  averageDebrisExposure: number | null;
  averageSustainability: number | null;
}

export interface ResearchRegimeStability {
  occurrences: number;
  trialFrequency: number;
  assessment: "robust" | "moderate" | "tentative";
}

export interface ResearchFeatureDeviation {
  feature: string;
  label: string;
  group: string;
  provenance: string;
  direction: "higher" | "lower";
  deltaStd: number;
  targetMean: number;
  peerMean: number;
}

export interface ResearchProxyRobustness {
  persistsInOrbitalTrafficDebris: boolean;
  persistsWithoutMissionOperatorContext: boolean;
  persistsWithoutStewardshipProxies: boolean;
  persistsInDirectDerivedOnly: boolean;
}

export interface ResearchCompactSatellite {
  satelliteId: string;
  displayName: string;
  orbitClass: OrbitClass | null;
  missionClass: string | null;
  scoreTotal: number | null;
  riskLabel: SatelliteRiskLabel | null;
}

export interface ResearchRegimeSummary {
  id: string;
  label: string;
  description: string;
  satelliteCount: number;
  cutsAcrossOrbitLabels: boolean;
  dominantOrbit?: string;
  dominantOrbitShare?: number;
  dominantMission?: string;
  dominantMissionShare?: number;
  weakestFactorKey?: string;
  scoreBand?: string;
  representativeSatelliteIds: string[];
  representativeSatellites?: ResearchCompactSatellite[];
  orbitComposition: ResearchCompositionSlice[];
  missionComposition: ResearchCompositionSlice[];
  profile: ResearchRegimeProfile;
  stability?: ResearchRegimeStability;
  topDifferentiatingFeatures?: ResearchFeatureDeviation[];
  comparisonToPopulation?: {
    averageScoreDelta: number;
    dominantOrbit: string;
    dominantMission: string;
  };
  proxyRobustness?: ResearchProxyRobustness;
}

export interface ResearchOutlierSummary {
  satelliteId: string;
  displayName: string;
  orbitClass: OrbitClass | null;
  vulnerabilityRegimeId?: string | null;
  reason: string;
  anomalyScore: number | null;
  withinPeerGroup: string | null;
  dominantFeatureDeviations?: ResearchFeatureDeviation[];
}

export interface ResearchFindingHighlight {
  title: string;
  body: string;
}

export interface ResearchDatasetSummary {
  populationSize: number;
  narrativeSubsetSize: number;
  featureCount: number | null;
  orbitBreakdown: ResearchCompositionSlice[];
  provenanceBreakdown: Record<string, number>;
  nasaWindowCount: number;
  regimeCount: number;
  crossOrbitRegimeCount: number;
  regimesCutAcrossOrbitLabels: boolean;
}

export interface ResearchValidationSummary {
  stability: {
    trialCount: number | null;
    meanClusterCount: number | null;
    pairwiseAriMean: number | null;
    crossOrbitPresenceRate: number | null;
  };
  baselineTakeaways: string[];
  proxyTakeaways: string[];
}

export interface ResearchFinalRegimeSummary {
  regimeId: string;
  label: string;
  whyItMatters: string;
}

export interface ResearchFinalSummary {
  oneSentenceSummary: string;
  projectSummary: {
    question: string;
    answer: string;
    modelValueAdd: string;
  };
  sourceSummary: {
    broadCoverage: string;
    nasaScope: string;
    featureScope: string;
  };
  validatedFindings: {
    stronglySupported: string[];
    moderatelySupported: string[];
    tentative: string[];
    modelValueAdd: string[];
  };
  robustRegimes: ResearchFinalRegimeSummary[];
  qualifiedRegimes: ResearchFinalRegimeSummary[];
  anomalySummary: {
    headline: string;
    body: string;
  };
  limitations: string[];
  validationNote: string;
  featuredRegimeIds: string[];
  crossOrbitStatus: "supported_but_qualified" | "not_detected";
  geoStewardshipStatus: "moderately_supported" | "not_detected";
}

export interface ResearchAnalysisExport {
  exportVersion: string;
  analysisStatus: ResearchAnalysisStatus;
  generatedAtIso: string;
  datasetLabel: string;
  datasetSummary: ResearchDatasetSummary;
  finalSummary: ResearchFinalSummary;
  findingHighlights: ResearchFindingHighlight[];
  narrativeSubsetIds: string[];
  notes: string[];
  regimes: ResearchRegimeSummary[];
  satellites: ResearchSatelliteFinding[];
  topOutliers: ResearchOutlierSummary[];
  validation?: {
    stability?: unknown;
    baselineComparison?: unknown;
    ablationSummary?: unknown;
    proxySensitivity?: unknown;
    anomalySummary?: unknown;
    regimeInterpretations?: unknown;
  };
}

export interface ResearchAppSummary {
  exportVersion: string;
  analysisStatus: ResearchAnalysisStatus;
  generatedAtIso: string;
  datasetSummary: ResearchDatasetSummary;
  finalSummary: ResearchFinalSummary;
  findingHighlights: ResearchFindingHighlight[];
  regimes: ResearchRegimeSummary[];
  topOutliers: ResearchOutlierSummary[];
  validation?: ResearchValidationSummary;
}
