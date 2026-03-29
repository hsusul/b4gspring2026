export type SatelliteRating = "A" | "B" | "C" | "Watch";

export type SatelliteRiskLabel = "Low" | "Moderate" | "Elevated" | "Critical";

export type OrbitClass = "LEO" | "MEO" | "GEO" | "HEO" | "SSO";

export type GlobeNarrativeMode = "all" | "lanes" | "pressure";
export type GlobeCameraMode = "overview" | "follow";

export type SatelliteFactorAssessmentLabel = "Good" | "Moderate" | "High Risk";

export type SatelliteFactorTone = "leading" | "strong" | "mixed" | "watch";

export interface SatelliteScoreFactor {
  key: string;
  label: string;
  score: number;
  maxScore: number;
  assessmentLabel: SatelliteFactorAssessmentLabel;
  assessmentTone: SatelliteFactorTone;
  explanation: string;
}

export interface SatelliteScoreBreakdown {
  total: number;
  maxScore: number;
  explanation: string;
  factors: SatelliteScoreFactor[];
}

export interface SatellitePositionSnapshot {
  satelliteId: string;
  timestampIso: string;
  latitudeDeg: number;
  longitudeDeg: number;
  altitudeKm: number;
}

export interface SatelliteTrajectoryPoint {
  satelliteId: string;
  timestampIso: string;
  latitudeDeg: number;
  longitudeDeg: number;
  altitudeKm: number;
}

export type SatelliteDataQualityLabel = "High" | "Moderate" | "Limited";

export interface SatelliteDataQuality {
  label: SatelliteDataQualityLabel;
  confidenceScore: number;
  summary: string;
  sourceSampleCount: number;
  trajectoryPointCount: number;
  windowStartIso: string;
  windowEndIso: string;
}

export interface EnrichedSatelliteRecord {
  satelliteId: string;
  noradId: number;
  displayName: string;
  operatorName: string;
  companyName: string;
  rating: SatelliteRating;
  riskLabel: SatelliteRiskLabel;
  riskSummary: string;
  orbitClass: OrbitClass;
  countryCode: string;
  missionClass: string;
  serviceRegion: string;
  tags: string[];
  summary: string;
  demoExplanation: string;
  scoreBreakdown: SatelliteScoreBreakdown;
  dataQuality: SatelliteDataQuality;
  highlightColor: string;
  latestPosition: SatellitePositionSnapshot;
  trajectory: SatelliteTrajectoryPoint[];
}

export interface Satellite {
  satelliteId: string;
  noradId: number;
  displayName: string;
  operatorName?: string;
  companyName?: string;
  rating?: SatelliteRating;
  riskLabel?: SatelliteRiskLabel;
  riskSummary?: string;
  orbitClass?: OrbitClass;
  countryCode?: string;
  missionClass?: string;
  serviceRegion?: string;
  tags?: string[];
  summary?: string;
  demoExplanation?: string;
  scoreBreakdown?: SatelliteScoreBreakdown;
  dataQuality?: SatelliteDataQuality;
  highlightColor?: string;
  latestPosition?: SatellitePositionSnapshot;
  trajectory?: SatelliteTrajectoryPoint[];
}
