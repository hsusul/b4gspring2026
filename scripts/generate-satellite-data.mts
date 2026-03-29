import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  enrichSatelliteRecord,
  type SatelliteEnrichmentSeed,
} from "../src/lib/data/enrichSatelliteRecord.ts";
import {
  fetchNasaLocationSeries,
  fetchNasaObservatories,
} from "../src/lib/nasa/client.ts";
import { buildNasaSatelliteRecord } from "../src/lib/nasa/transform.ts";

const FETCH_START_ISO = "2026-03-20T12:00:00.000Z";
const FETCH_END_ISO = "2026-03-20T15:00:00.000Z";
const TRAJECTORY_SAMPLE_STRIDE = 3;

const ROOT_DIR = process.cwd();
const SEED_FILE = path.join(
  ROOT_DIR,
  "src",
  "data",
  "narrative",
  "story-enrichment-seed.json",
);
const OUTPUT_FILE = path.join(
  ROOT_DIR,
  "src",
  "data",
  "narrative",
  "story-satellites.json",
);

async function main() {
  const seeds = await loadEnrichmentSeeds();
  const observatories = await fetchNasaObservatories();
  const observatoryById = new Map(
    observatories.map((observatory) => [observatory.satelliteId, observatory]),
  );

  validateCoverage(seeds, observatoryById);

  const locationSeries = await fetchNasaLocationSeries({
    satelliteIds: seeds.map((seed) => seed.satelliteId),
    startIso: FETCH_START_ISO,
    endIso: FETCH_END_ISO,
  });
  const seriesById = new Map(
    locationSeries.map((series) => [series.satelliteId, series]),
  );

  const records = seeds
    .map((seed) => {
      const series = seriesById.get(seed.satelliteId);

      if (!series) {
        throw new Error(`NASA SSC did not return location data for ${seed.satelliteId}.`);
      }

      return enrichSatelliteRecord(
        buildNasaSatelliteRecord({
          displayName: seed.displayName,
          sampleStride: TRAJECTORY_SAMPLE_STRIDE,
          series,
        }),
        seed,
      );
    })
    .sort((left, right) => {
      if (left.scoreBreakdown.total !== right.scoreBreakdown.total) {
        return right.scoreBreakdown.total - left.scoreBreakdown.total;
      }

      return left.displayName.localeCompare(right.displayName);
    });

  await mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  await writeFile(OUTPUT_FILE, `${JSON.stringify(records, null, 2)}\n`, "utf8");

  console.log(
    `Wrote ${records.length} enriched satellite records to ${path.relative(ROOT_DIR, OUTPUT_FILE)}.`,
  );

  for (const record of records) {
    console.log(
      `${record.displayName}: ${record.scoreBreakdown.total}/100 ` +
        `(${record.rating}, ${record.riskLabel})`,
    );
  }
}

async function loadEnrichmentSeeds(): Promise<SatelliteEnrichmentSeed[]> {
  const raw = await readFile(SEED_FILE, "utf8");
  const parsed = JSON.parse(raw) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error("Satellite enrichment seed file must contain an array.");
  }

  return parsed as SatelliteEnrichmentSeed[];
}

function validateCoverage(
  seeds: SatelliteEnrichmentSeed[],
  observatoryById: Map<
    string,
    {
      startTimeIso: string | null;
      endTimeIso: string | null;
    }
  >,
) {
  const fetchStartTime = new Date(FETCH_START_ISO).getTime();
  const fetchEndTime = new Date(FETCH_END_ISO).getTime();

  for (const seed of seeds) {
    const observatory = observatoryById.get(seed.satelliteId);

    if (!observatory) {
      throw new Error(`Unknown NASA SSC observatory id: ${seed.satelliteId}.`);
    }

    if (
      observatory.startTimeIso &&
      new Date(observatory.startTimeIso).getTime() > fetchStartTime
    ) {
      throw new Error(
        `${seed.satelliteId} starts after the fixed demo window (${FETCH_START_ISO}).`,
      );
    }

    if (
      observatory.endTimeIso &&
      new Date(observatory.endTimeIso).getTime() < fetchEndTime
    ) {
      throw new Error(
        `${seed.satelliteId} ends before the fixed demo window (${FETCH_END_ISO}).`,
      );
    }
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
