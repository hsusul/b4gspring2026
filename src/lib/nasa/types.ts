import type {
  OrbitClass,
  SatellitePositionSnapshot,
  SatelliteTrajectoryPoint,
} from "../../types/satellite.ts";

export interface NasaSatellitePositionQuery {
  satelliteIds: string[];
  timestampIso?: string;
}

export interface NasaSatelliteTrajectoryQuery {
  satelliteId: string;
  startIso: string;
  endIso: string;
  sampleStride?: number;
}

export interface NasaObservatoryRecord {
  satelliteId: string;
  displayName: string;
  resolutionSeconds: number;
  startTimeIso: string | null;
  endTimeIso: string | null;
}

export interface NasaLocationSeries {
  satelliteId: string;
  coordinateSystem: string;
  timestampsIso: string[];
  latitudeDeg: number[];
  longitudeDeg: number[];
  radialLengthKm: number[];
}

export interface NasaOrbitMetrics {
  meanAltitudeKm: number;
  minAltitudeKm: number;
  maxAltitudeKm: number;
  altitudeSpanKm: number;
  latitudeSpanDeg: number;
}

export interface NasaSatelliteRecord {
  satelliteId: string;
  displayName: string;
  orbitClass: OrbitClass;
  metrics: NasaOrbitMetrics;
  sourceSampleCount: number;
  sourceWindowStartIso: string;
  sourceWindowEndIso: string;
  latestPosition: SatellitePositionSnapshot;
  trajectory: SatelliteTrajectoryPoint[];
}
