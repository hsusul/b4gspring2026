import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import type { EnrichedSatelliteRecord } from "../../types";

const NARRATIVE_SATELLITES_FILE = path.join(
  process.cwd(),
  "src",
  "data",
  "narrative",
  "story-satellites.json",
);

export async function getNarrativeSatelliteRecords(): Promise<
  EnrichedSatelliteRecord[]
> {
  const raw = await readFile(NARRATIVE_SATELLITES_FILE, "utf8");
  return JSON.parse(raw) as EnrichedSatelliteRecord[];
}
