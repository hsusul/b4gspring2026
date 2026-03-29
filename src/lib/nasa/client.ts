import type {
  SatellitePositionSnapshot,
  SatelliteTrajectoryPoint,
} from "../../types/satellite.ts";
import type {
  NasaLocationSeries,
  NasaObservatoryRecord,
  NasaSatellitePositionQuery,
  NasaSatelliteTrajectoryQuery,
} from "./types.ts";

const NASA_SSC_BASE_URL = "https://sscweb.gsfc.nasa.gov/WS/sscr/2";
const EARTH_RADIUS_KM = 6_378.137;
const DEFAULT_COORDINATE_SYSTEM = "geo";
const POSITION_LOOKBACK_MINUTES = 5;

interface FetchNasaLocationSeriesOptions {
  satelliteIds: string[];
  startIso: string;
  endIso: string;
  coordinateSystem?: string;
}

export async function fetchNasaObservatories(): Promise<NasaObservatoryRecord[]> {
  const raw = await fetchNasaJson(`${NASA_SSC_BASE_URL}/observatories`);
  return parseNasaObservatoriesResponse(raw);
}

export async function fetchNasaLocationSeries(
  options: FetchNasaLocationSeriesOptions,
): Promise<NasaLocationSeries[]> {
  const satelliteIds = Array.from(new Set(options.satelliteIds.map((id) => id.trim()))).filter(
    Boolean,
  );

  if (satelliteIds.length === 0) {
    return [];
  }

  const url =
    `${NASA_SSC_BASE_URL}/locations/` +
    `${satelliteIds.join(",")}/` +
    `${toSscBasicIso(options.startIso)},${toSscBasicIso(options.endIso)}/` +
    `${(options.coordinateSystem ?? DEFAULT_COORDINATE_SYSTEM).toLowerCase()}/`;

  const raw = await fetchNasaJson(url);
  return parseNasaLocationSeriesResponse(raw);
}

export async function fetchNasaSatellitePositions(
  query: NasaSatellitePositionQuery,
): Promise<SatellitePositionSnapshot[]> {
  const endIso = normalizeIso(query.timestampIso ?? new Date().toISOString());
  const startIso = new Date(
    new Date(endIso).getTime() - POSITION_LOOKBACK_MINUTES * 60 * 1_000,
  ).toISOString();

  const series = await fetchNasaLocationSeries({
    satelliteIds: query.satelliteIds,
    startIso,
    endIso,
  });

  return series.map((entry) => buildLatestPosition(entry));
}

export async function fetchNasaSatelliteTrajectory(
  query: NasaSatelliteTrajectoryQuery,
): Promise<SatelliteTrajectoryPoint[]> {
  const [series] = await fetchNasaLocationSeries({
    satelliteIds: [query.satelliteId],
    startIso: query.startIso,
    endIso: query.endIso,
  });

  if (!series) {
    return [];
  }

  return buildTrajectory(series, Math.max(1, query.sampleStride ?? 1));
}

async function fetchNasaJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`NASA SSC request failed with ${response.status} ${response.statusText}`);
  }

  return response.json();
}

function parseNasaObservatoriesResponse(raw: unknown): NasaObservatoryRecord[] {
  const responseBody = unwrapTaggedObject(raw);
  const observatoryEntries = unwrapTaggedArray(responseBody?.Observatory);

  return observatoryEntries
    .map((entry) => unwrapTaggedObject(entry))
    .filter((entry): entry is Record<string, unknown> => entry !== null)
    .map((entry) => {
      const satelliteId = typeof entry.Id === "string" ? entry.Id : "";
      const displayName = typeof entry.Name === "string" ? entry.Name : satelliteId;

      return {
        satelliteId,
        displayName,
        resolutionSeconds: typeof entry.Resolution === "number" ? entry.Resolution : 60,
        startTimeIso: unwrapXmlDate(entry.StartTime),
        endTimeIso: unwrapXmlDate(entry.EndTime),
      };
    })
    .filter((observatory) => observatory.satelliteId.length > 0);
}

function parseNasaLocationSeriesResponse(raw: unknown): NasaLocationSeries[] {
  const responseBody = unwrapTaggedObject(raw);
  const resultBody = unwrapTaggedObject(responseBody?.Result);

  if (!resultBody) {
    throw new Error("NASA SSC returned an unexpected response envelope.");
  }

  const statusCode =
    typeof resultBody.StatusCode === "string" ? resultBody.StatusCode : "UNKNOWN";

  if (statusCode !== "SUCCESS") {
    const statusSubCode =
      typeof resultBody.StatusSubCode === "string" ? resultBody.StatusSubCode : "UNKNOWN";
    throw new Error(`NASA SSC returned ${statusCode}/${statusSubCode}.`);
  }

  return unwrapTaggedArray(resultBody.Data)
    .map((entry) => unwrapTaggedObject(entry))
    .filter((entry): entry is Record<string, unknown> => entry !== null)
    .map((entry) => parseSatelliteSeries(entry))
    .filter((series): series is NasaLocationSeries => series !== null);
}

function parseSatelliteSeries(entry: Record<string, unknown>): NasaLocationSeries | null {
  const satelliteId = typeof entry.Id === "string" ? entry.Id : null;
  const timestampsIso = unwrapTaggedArray(entry.Time)
    .map((value) => unwrapXmlDate(value))
    .filter((value): value is string => value !== null);
  const radialLengthKm = unwrapNumericArray(entry.RadialLength);

  const coordinateEntries = unwrapTaggedArray(entry.Coordinates)
    .map((value) => unwrapTaggedObject(value))
    .filter((value): value is Record<string, unknown> => value !== null);

  const coordinateBody =
    coordinateEntries.find(
      (value) =>
        typeof value.CoordinateSystem === "string" &&
        value.CoordinateSystem.toUpperCase() === "GEO",
    ) ?? coordinateEntries[0];

  if (!satelliteId || !coordinateBody) {
    return null;
  }

  const latitudeDeg = unwrapNumericArray(coordinateBody.Latitude);
  const longitudeDeg = unwrapNumericArray(coordinateBody.Longitude);
  const pointCount = Math.min(
    timestampsIso.length,
    latitudeDeg.length,
    longitudeDeg.length,
    radialLengthKm.length,
  );

  if (pointCount === 0) {
    return null;
  }

  const coordinateSystem =
    typeof coordinateBody.CoordinateSystem === "string"
      ? coordinateBody.CoordinateSystem.toUpperCase()
      : "GEO";

  return {
    satelliteId,
    coordinateSystem,
    timestampsIso: timestampsIso.slice(0, pointCount),
    latitudeDeg: latitudeDeg.slice(0, pointCount),
    longitudeDeg: longitudeDeg.slice(0, pointCount),
    radialLengthKm: radialLengthKm.slice(0, pointCount),
  };
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

function buildTrajectory(
  series: NasaLocationSeries,
  sampleStride: number,
): SatelliteTrajectoryPoint[] {
  return collectSampledIndices(series.timestampsIso.length, sampleStride).map((index) => ({
    satelliteId: series.satelliteId,
    timestampIso: series.timestampsIso[index],
    latitudeDeg: roundNumber(series.latitudeDeg[index], 6),
    longitudeDeg: roundNumber(normalizeLongitude(series.longitudeDeg[index]), 6),
    altitudeKm: roundNumber(series.radialLengthKm[index] - EARTH_RADIUS_KM, 3),
  }));
}

function collectSampledIndices(length: number, sampleStride: number) {
  const indices: number[] = [];

  for (let index = 0; index < length; index += sampleStride) {
    indices.push(index);
  }

  if (indices.length === 0 || indices[indices.length - 1] !== length - 1) {
    indices.push(length - 1);
  }

  return indices;
}

function unwrapTaggedObject(value: unknown): Record<string, unknown> | null {
  if (!Array.isArray(value) || value.length < 2) {
    return null;
  }

  const unwrapped = value[1];
  return typeof unwrapped === "object" && unwrapped !== null && !Array.isArray(unwrapped)
    ? (unwrapped as Record<string, unknown>)
    : null;
}

function unwrapTaggedArray(value: unknown): unknown[] {
  if (!Array.isArray(value) || value.length < 2 || !Array.isArray(value[1])) {
    return [];
  }

  return value[1] as unknown[];
}

function unwrapNumericArray(value: unknown): number[] {
  return unwrapTaggedArray(value).flatMap((entry) =>
    typeof entry === "number" ? [entry] : [],
  );
}

function unwrapXmlDate(value: unknown): string | null {
  if (!Array.isArray(value) || value.length < 2 || typeof value[1] !== "string") {
    return null;
  }

  return normalizeIso(value[1]);
}

function normalizeIso(value: string) {
  return new Date(value).toISOString();
}

function toSscBasicIso(value: string) {
  return normalizeIso(value).replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function roundNumber(value: number, digits: number) {
  return Number(value.toFixed(digits));
}

function normalizeLongitude(value: number) {
  const normalized = ((value + 180) % 360 + 360) % 360 - 180;
  return normalized === -180 ? 180 : normalized;
}
