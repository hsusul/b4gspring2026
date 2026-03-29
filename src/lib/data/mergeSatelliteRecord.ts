import type {
  EnrichedSatelliteRecord,
  Satellite,
  SatellitePositionSnapshot,
  SatelliteTrajectoryPoint,
} from "../../types";

export interface NasaSatelliteRecord {
  satelliteId: string;
  noradId: number;
  displayName: string;
  latestPosition?: SatellitePositionSnapshot;
  trajectory?: SatelliteTrajectoryPoint[];
}

export function mergeSatelliteRecord(
  nasaSatellite: NasaSatelliteRecord,
  enrichment?: EnrichedSatelliteRecord,
): Satellite {
  return {
    satelliteId: nasaSatellite.satelliteId,
    noradId: nasaSatellite.noradId,
    displayName: nasaSatellite.displayName,
    latestPosition: nasaSatellite.latestPosition,
    trajectory: nasaSatellite.trajectory,
    operatorName: enrichment?.operatorName,
    companyName: enrichment?.companyName,
    rating: enrichment?.rating,
    riskLabel: enrichment?.riskLabel,
    riskSummary: enrichment?.riskSummary,
    orbitClass: enrichment?.orbitClass,
    countryCode: enrichment?.countryCode,
    missionClass: enrichment?.missionClass,
    serviceRegion: enrichment?.serviceRegion,
    tags: enrichment?.tags,
    summary: enrichment?.summary,
    scoreBreakdown: enrichment?.scoreBreakdown,
    highlightColor: enrichment?.highlightColor,
  };
}
