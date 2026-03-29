import type {
  EnrichedSatelliteRecord,
  OrbitClass,
  SatellitePositionSnapshot,
  SatelliteTrajectoryPoint,
} from "../../types";

const EARTH_RADIUS_KM = 6_378.137;

interface OrbitProfile {
  altitudeKm: number;
  inclinationDeg: number;
  periodMinutes: number;
}

interface OrbitDefinition extends OrbitProfile {
  phaseDeg: number;
  raanDeg: number;
}

export interface GlobeSatelliteTrack {
  satellite: EnrichedSatelliteRecord;
  orbit: OrbitDefinition;
}

const ORBIT_PROFILES: Record<OrbitClass, OrbitProfile> = {
  GEO: {
    altitudeKm: 35_786,
    inclinationDeg: 0.2,
    periodMinutes: 1_436,
  },
  HEO: {
    altitudeKm: 18_000,
    inclinationDeg: 63.4,
    periodMinutes: 720,
  },
  LEO: {
    altitudeKm: 420,
    inclinationDeg: 51.6,
    periodMinutes: 92,
  },
  MEO: {
    altitudeKm: 20_200,
    inclinationDeg: 55,
    periodMinutes: 717,
  },
  SSO: {
    altitudeKm: 705,
    inclinationDeg: 97.4,
    periodMinutes: 99,
  },
};

export function buildSampleOrbitTracks(
  satellites: EnrichedSatelliteRecord[],
): GlobeSatelliteTrack[] {
  return satellites.map((satellite, index) => {
    const seed = hashSatelliteKey(satellite.satelliteId) + satellite.noradId + index * 97;
    const profile = ORBIT_PROFILES[satellite.orbitClass];

    return {
      orbit: {
        altitudeKm: profile.altitudeKm + sampleRange(seed, 0, -35, 35),
        inclinationDeg: Math.max(
          0,
          profile.inclinationDeg + sampleRange(seed, 1, -2.4, 2.4),
        ),
        periodMinutes: profile.periodMinutes + sampleRange(seed, 2, -4, 4),
        phaseDeg: sampleRange(seed, 3, 0, 360),
        raanDeg: sampleRange(seed, 4, 0, 360),
      },
      satellite,
    };
  });
}

export function getTrackPosition(
  track: GlobeSatelliteTrack,
  timestamp: Date,
): SatellitePositionSnapshot {
  return getTrackPositionAtAngle(
    track,
    getTrackOrbitalAngleRad(track, timestamp),
    timestamp,
  );
}

export function getTrackOrbitPath(
  track: GlobeSatelliteTrack,
  pointCount = 180,
): SatelliteTrajectoryPoint[] {
  const pathTimestamp = new Date(0);
  const points = Math.max(48, pointCount);

  return Array.from({ length: points + 1 }, (_, index) => {
    const angle =
      degreesToRadians(track.orbit.phaseDeg) + (Math.PI * 2 * index) / points;

    return getTrackPositionAtAngle(track, angle, pathTimestamp);
  });
}

export function getTrackTrailTrajectory(
  track: GlobeSatelliteTrack,
  centerTimestamp: Date,
  pointCount = 40,
  trailingOrbitFraction = 0.08,
  leadingOrbitFraction = 0.16,
): SatelliteTrajectoryPoint[] {
  const centerAngle = getTrackOrbitalAngleRad(track, centerTimestamp);
  const startAngle = centerAngle - Math.PI * 2 * trailingOrbitFraction;
  const endAngle = centerAngle + Math.PI * 2 * leadingOrbitFraction;
  const points = Math.max(12, pointCount);

  return Array.from({ length: points + 1 }, (_, index) => {
    const ratio = index / points;
    const offsetOrbitFraction =
      -trailingOrbitFraction +
      ratio * (trailingOrbitFraction + leadingOrbitFraction);
    const pointTimestamp = new Date(
      centerTimestamp.getTime() +
        offsetOrbitFraction * track.orbit.periodMinutes * 60 * 1_000,
    );

    return getTrackPositionAtAngle(
      track,
      startAngle + (endAngle - startAngle) * ratio,
      pointTimestamp,
    );
  });
}

export function getTrackCameraRangeMeters(track: GlobeSatelliteTrack) {
  const rangeMeters = 1_850_000 + track.orbit.altitudeKm * 180;
  return clamp(rangeMeters, 1_850_000, 10_500_000);
}

export function getTrackCameraDurationSeconds(track: GlobeSatelliteTrack) {
  const durationSeconds = 1.35 + track.orbit.altitudeKm / 42_000;
  return clamp(durationSeconds, 1.35, 2.15);
}

function getTrackOrbitalAngleRad(
  track: GlobeSatelliteTrack,
  timestamp: Date,
) {
  return (
    degreesToRadians(track.orbit.phaseDeg) +
    (Math.PI * 2 * timestamp.getTime()) / (track.orbit.periodMinutes * 60 * 1_000)
  );
}

function getTrackPositionAtAngle(
  track: GlobeSatelliteTrack,
  orbitalAngleRad: number,
  timestamp: Date,
): SatellitePositionSnapshot {
  const { x, y, z } = getWorldPosition(track, orbitalAngleRad);
  const latitudeDeg = radiansToDegrees(Math.atan2(z, Math.sqrt(x * x + y * y)));
  const longitudeDeg = normalizeLongitude(radiansToDegrees(Math.atan2(y, x)));

  return {
    altitudeKm: track.orbit.altitudeKm,
    latitudeDeg,
    longitudeDeg,
    satelliteId: track.satellite.satelliteId,
    timestampIso: timestamp.toISOString(),
  };
}

function getWorldPosition(
  track: GlobeSatelliteTrack,
  orbitalAngleRad: number,
) {
  const orbitRadiusKm = EARTH_RADIUS_KM + track.orbit.altitudeKm;
  const inclinationRad = degreesToRadians(track.orbit.inclinationDeg);
  const raanRad = degreesToRadians(track.orbit.raanDeg);

  const xOrbital = orbitRadiusKm * Math.cos(orbitalAngleRad);
  const yOrbital = orbitRadiusKm * Math.sin(orbitalAngleRad);

  const xInclined = xOrbital;
  const yInclined = yOrbital * Math.cos(inclinationRad);
  const zInclined = yOrbital * Math.sin(inclinationRad);

  return {
    x: xInclined * Math.cos(raanRad) - yInclined * Math.sin(raanRad),
    y: xInclined * Math.sin(raanRad) + yInclined * Math.cos(raanRad),
    z: zInclined,
  };
}

function hashSatelliteKey(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

function sampleRange(seed: number, offset: number, min: number, max: number) {
  return min + (max - min) * seededUnit(seed, offset);
}

function seededUnit(seed: number, offset: number) {
  const sample = Math.sin(seed * 12.9898 + offset * 78.233) * 43_758.545_312_3;
  return sample - Math.floor(sample);
}

function degreesToRadians(value: number) {
  return (value * Math.PI) / 180;
}

function radiansToDegrees(value: number) {
  return (value * 180) / Math.PI;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeLongitude(value: number) {
  const normalized = ((value + 180) % 360 + 360) % 360 - 180;
  return normalized === -180 ? 180 : normalized;
}
