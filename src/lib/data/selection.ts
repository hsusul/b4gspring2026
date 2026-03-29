import type { EnrichedSatelliteRecord } from "../../types";

export function getSatelliteById(
  records: EnrichedSatelliteRecord[],
  satelliteId: string | null,
) {
  if (!satelliteId) {
    return null;
  }

  return (
    records.find((record) => record.satelliteId === satelliteId) ?? null
  );
}

export function resolveSelectedSatellite(
  records: EnrichedSatelliteRecord[],
  satelliteId: string | null,
) {
  return getSatelliteById(records, satelliteId) ?? records[0] ?? null;
}
