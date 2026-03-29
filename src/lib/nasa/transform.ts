import type {
  OrbitClass,
  SatellitePositionSnapshot,
  SatelliteTrajectoryPoint,
} from "../../types/satellite.ts";
import type {
  NasaLocationSeries,
  NasaOrbitMetrics,
  NasaSatelliteRecord,
} from "./types.ts";

const EARTH_RADIUS_KM = 6_378.137;

interface BuildNasaSatelliteRecordOptions {
  displayName: string;
  sampleStride?: number;
  series: NasaLocationSeries;
}

export function buildNasaSatelliteRecord({
  displayName,
  sampleStride = 1,
  series,
}: BuildNasaSatelliteRecordOptions): NasaSatelliteRecord {
  const metrics = summarizeNasaLocationSeries(series);

  return {
    satelliteId: series.satelliteId,
    displayName,
    orbitClass: inferOrbitClass(metrics),
    metrics,
    sourceSampleCount: series.timestampsIso.length,
    sourceWindowStartIso: series.timestampsIso[0],
    sourceWindowEndIso: series.timestampsIso[series.timestampsIso.length - 1],
    latestPosition: buildLatestPosition(series),
    trajectory: buildNasaTrajectory(series, sampleStride),
  };
}

export function buildNasaTrajectory(
  series: NasaLocationSeries,
  sampleStride = 1,
): SatelliteTrajectoryPoint[] {
  return collectSampledIndices(series.timestampsIso.length, sampleStride).map((index) => ({
    satelliteId: series.satelliteId,
    timestampIso: series.timestampsIso[index],
    latitudeDeg: roundNumber(series.latitudeDeg[index], 6),
    longitudeDeg: roundNumber(normalizeLongitude(series.longitudeDeg[index]), 6),
    altitudeKm: roundNumber(series.radialLengthKm[index] - EARTH_RADIUS_KM, 3),
  }));
}

export function summarizeNasaLocationSeries(series: NasaLocationSeries): NasaOrbitMetrics {
  const altitudesKm = series.radialLengthKm.map((value) => value - EARTH_RADIUS_KM);
  const meanAltitudeKm =
    altitudesKm.reduce((sum, value) => sum + value, 0) / altitudesKm.length;
  const minAltitudeKm = Math.min(...altitudesKm);
  const maxAltitudeKm = Math.max(...altitudesKm);
  const minLatitude = Math.min(...series.latitudeDeg);
  const maxLatitude = Math.max(...series.latitudeDeg);

  return {
    meanAltitudeKm: roundNumber(meanAltitudeKm, 1),
    minAltitudeKm: roundNumber(minAltitudeKm, 1),
    maxAltitudeKm: roundNumber(maxAltitudeKm, 1),
    altitudeSpanKm: roundNumber(maxAltitudeKm - minAltitudeKm, 1),
    latitudeSpanDeg: roundNumber(maxLatitude - minLatitude, 1),
  };
}

export function inferOrbitClass(metrics: NasaOrbitMetrics): OrbitClass {
  if (metrics.meanAltitudeKm >= 30_000) {
    return "GEO";
  }

  if (metrics.altitudeSpanKm >= 1_000) {
    return "HEO";
  }

  if (metrics.meanAltitudeKm >= 10_000) {
    return "MEO";
  }

  if (metrics.meanAltitudeKm >= 550 && metrics.latitudeSpanDeg >= 140) {
    return "SSO";
  }

  return "LEO";
}

function buildLatestPosition(series: NasaLocationSeries): SatellitePositionSnapshot {
  const latestIndex = series.timestampsIso.length - 1;

  return {
    satelliteId: series.satelliteId,
    timestampIso: series.timestampsIso[latestIndex],
    latitudeDeg: roundNumber(series.latitudeDeg[latestIndex], 6),
    longitudeDeg: roundNumber(normalizeLongitude(series.longitudeDeg[latestIndex]), 6),
    altitudeKm: roundNumber(series.radialLengthKm[latestIndex] - EARTH_RADIUS_KM, 3),
  };
}

function collectSampledIndices(length: number, sampleStride: number) {
  const indices: number[] = [];

  for (let index = 0; index < length; index += Math.max(1, sampleStride)) {
    indices.push(index);
  }

  if (indices.length === 0 || indices[indices.length - 1] !== length - 1) {
    indices.push(length - 1);
  }

  return indices;
}

function roundNumber(value: number, digits: number) {
  return Number(value.toFixed(digits));
}

function normalizeLongitude(value: number) {
  const normalized = ((value + 180) % 360 + 360) % 360 - 180;
  return normalized === -180 ? 180 : normalized;
}
