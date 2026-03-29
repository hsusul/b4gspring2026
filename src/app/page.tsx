import { getNarrativeSatelliteRecords } from "../lib/data/narrative";
import { getResearchAnalysisExport } from "../lib/data/research";
import { SpaceHighwaysExperience } from "./SpaceHighwaysExperience";

export default async function HomePage() {
  const satellites = await getNarrativeSatelliteRecords();
  let researchSummary = null;

  try {
    researchSummary = await getResearchAnalysisExport();
  } catch {
    researchSummary = null;
  }

  return (
    <SpaceHighwaysExperience
      researchSummary={researchSummary}
      satellites={satellites}
    />
  );
}
