import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import type { ResearchAppSummary } from "../../types";

const RESEARCH_ANALYSIS_FILE = path.join(
  process.cwd(),
  "src",
  "data",
  "research",
  "vulnerability-regimes.json",
);

export async function getResearchAnalysisExport(): Promise<ResearchAppSummary> {
  const raw = await readFile(RESEARCH_ANALYSIS_FILE, "utf8");
  return JSON.parse(raw) as ResearchAppSummary;
}
