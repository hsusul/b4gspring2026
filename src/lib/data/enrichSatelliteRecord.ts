import type {
  EnrichedSatelliteRecord,
  OrbitClass,
  SatelliteDataQuality,
  SatelliteScoreFactor,
} from "../../types/satellite.ts";
import type { NasaSatelliteRecord } from "../nasa/types.ts";
import { getFactorAssessment } from "./factorAssessment.ts";

interface SatelliteScoringInputs {
  operatorDiscipline: number;
  missionComplexity: number;
  congestionPenalty: number;
  debrisPenalty: number;
  sustainabilityCommitment: number;
}

export interface SatelliteEnrichmentSeed {
  satelliteId: string;
  noradId: number;
  displayName: string;
  operatorName: string;
  companyName: string;
  countryCode: string;
  missionClass: string;
  serviceRegion: string;
  tags: string[];
  summary: string;
  highlightColor: string;
  scoringInputs: SatelliteScoringInputs;
}

const MAX_FACTOR_SCORE = 25;
const MAX_TOTAL_SCORE = MAX_FACTOR_SCORE * 4;

const ORBITAL_SAFETY_BASE: Record<OrbitClass, number> = {
  GEO: 22,
  HEO: 13,
  LEO: 16,
  MEO: 19,
  SSO: 18,
};

const CONGESTION_BASE: Record<OrbitClass, number> = {
  GEO: 21,
  HEO: 14,
  LEO: 15,
  MEO: 19,
  SSO: 17,
};

const DEBRIS_BASE: Record<OrbitClass, number> = {
  GEO: 19,
  HEO: 12,
  LEO: 15,
  MEO: 18,
  SSO: 16,
};

// These tier thresholds stay intentionally simple so the model is easy to walk
// through live. The demo story is "four factors, each worth 25 points" rather
// than "trust the black box."
function getRating(totalScore: number) {
  if (totalScore >= 86) {
    return "A" as const;
  }

  if (totalScore >= 74) {
    return "B" as const;
  }

  if (totalScore >= 62) {
    return "C" as const;
  }

  return "Watch" as const;
}

function getRiskLabel(totalScore: number) {
  if (totalScore >= 82) {
    return "Low" as const;
  }

  if (totalScore >= 70) {
    return "Moderate" as const;
  }

  if (totalScore >= 58) {
    return "Elevated" as const;
  }

  return "Critical" as const;
}

export function enrichSatelliteRecord(
  nasaSatellite: NasaSatelliteRecord,
  seed: SatelliteEnrichmentSeed,
): EnrichedSatelliteRecord {
  const factors = buildScoreFactors(nasaSatellite, seed);
  const total = factors.reduce((sum, factor) => sum + factor.score, 0);
  const rating = getRating(total);
  const riskLabel = getRiskLabel(total);
  const strongestFactor = [...factors].sort((left, right) => right.score - left.score)[0];
  const weakestFactor = [...factors].sort((left, right) => left.score - right.score)[0];
  const factorByKey = new Map(factors.map((factor) => [factor.key, factor]));

  return {
    satelliteId: nasaSatellite.satelliteId,
    noradId: seed.noradId,
    displayName: seed.displayName || nasaSatellite.displayName,
    operatorName: seed.operatorName,
    companyName: seed.companyName,
    rating,
    riskLabel,
    riskSummary: buildRiskSummary(seed.displayName, strongestFactor, weakestFactor),
    orbitClass: nasaSatellite.orbitClass,
    countryCode: seed.countryCode,
    missionClass: seed.missionClass,
    serviceRegion: seed.serviceRegion,
    tags: seed.tags,
    summary: seed.summary,
    demoExplanation: buildDemoExplanation(nasaSatellite, factorByKey),
    scoreBreakdown: {
      total,
      maxScore: MAX_TOTAL_SCORE,
      explanation: buildScoreNarrative(seed.displayName, strongestFactor, weakestFactor),
      factors,
    },
    dataQuality: buildDataQuality(nasaSatellite),
    highlightColor: seed.highlightColor,
    latestPosition: nasaSatellite.latestPosition,
    trajectory: nasaSatellite.trajectory,
  };
}

function buildScoreFactors(
  nasaSatellite: NasaSatelliteRecord,
  seed: SatelliteEnrichmentSeed,
): SatelliteScoreFactor[] {
  const { metrics, orbitClass } = nasaSatellite;
  const profile = seed.scoringInputs;
  const stabilityBonus = getStabilityBonus(metrics.altitudeSpanKm);
  const polarPenalty = getPolarPenalty(metrics.latitudeSpanDeg);
  const lowAltitudePenalty = metrics.meanAltitudeKm < 450 ? 1 : 0;
  const complexityPenalty = Math.ceil(profile.missionComplexity / 2);
  const endOfLifeOrbitBonus = getEndOfLifeOrbitBonus(orbitClass);

  // Each factor starts from an orbit-regime baseline, then we nudge it with a
  // small local stewardship profile. That keeps the score deterministic while
  // making every point of the demo explainable in one sentence.
  const orbitalSafetyScore = clampScore(
    ORBITAL_SAFETY_BASE[orbitClass] +
      profile.operatorDiscipline +
      stabilityBonus -
      complexityPenalty,
  );
  const congestionScore = clampScore(
    CONGESTION_BASE[orbitClass] +
      Math.floor(profile.operatorDiscipline / 2) -
      profile.congestionPenalty -
      polarPenalty -
      lowAltitudePenalty,
  );
  const debrisScore = clampScore(
    DEBRIS_BASE[orbitClass] +
      Math.floor(profile.operatorDiscipline / 2) -
      profile.debrisPenalty -
      getDebrisShellPenalty(orbitClass, metrics.meanAltitudeKm) +
      getGeoBufferBonus(orbitClass),
  );
  const sustainabilityScore = clampScore(
    12 +
      profile.operatorDiscipline +
      profile.sustainabilityCommitment +
      endOfLifeOrbitBonus -
      complexityPenalty,
  );

  return [
    buildFactor(
      "orbital-safety",
      "Orbital safety",
      orbitalSafetyScore,
      `${describeOrbitLane(orbitClass)} ` +
        `${describeAltitudeStability(metrics.altitudeSpanKm)} ` +
        `${describeMissionComplexity(profile.missionComplexity)}`,
    ),
    buildFactor(
      "congestion-impact",
      "Congestion impact",
      congestionScore,
      `${describeCongestionLane(orbitClass)} ` +
        `${polarPenalty > 0 ? "High-latitude coverage adds more lane crossings. " : ""}` +
        `${metrics.meanAltitudeKm < 450 ? "Very low altitude keeps the craft inside the busiest shells." : ""}`,
    ),
    buildFactor(
      "debris-exposure",
      "Debris exposure",
      debrisScore,
      `${describeDebrisShell(orbitClass)} ` +
        `${profile.debrisPenalty >= 2 ? "The local model applies an extra debris penalty for this lane. " : ""}` +
        `${orbitClass === "GEO" ? "The geostationary shell is persistent, but it is not the most collision-saturated regime." : ""}`,
    ),
    buildFactor(
      "sustainability",
      "Sustainability / end-of-life",
      sustainabilityScore,
      `${seed.operatorName} gets a local stewardship assumption of ${profile.operatorDiscipline}/5. ` +
        `${describeEndOfLife(orbitClass, endOfLifeOrbitBonus)} ` +
        `Mission complexity is scored at ${profile.missionComplexity}/5, which changes how much operational slack the model assumes.`,
    ),
  ];
}

function buildFactor(
  key: string,
  label: string,
  score: number,
  explanation: string,
): SatelliteScoreFactor {
  const assessment = getFactorAssessment(score, MAX_FACTOR_SCORE);

  return {
    key,
    label,
    score,
    maxScore: MAX_FACTOR_SCORE,
    assessmentLabel: assessment.label,
    assessmentTone: assessment.tone,
    explanation: explanation.trim(),
  };
}

function buildDemoExplanation(
  nasaSatellite: NasaSatelliteRecord,
  factorByKey: Map<string, SatelliteScoreFactor>,
) {
  const congestionFactor = factorByKey.get("congestion-impact");

  return (
    `${describeOrbitHeadline(nasaSatellite.orbitClass)} with ` +
    `${describeCongestionExposure(congestionFactor?.assessmentLabel)} and ` +
    `${describeTrajectoryStability(nasaSatellite.metrics.altitudeSpanKm)}.`
  );
}

function buildRiskSummary(
  displayName: string,
  strongestFactor: SatelliteScoreFactor,
  weakestFactor: SatelliteScoreFactor,
) {
  return (
    `${displayName} stays most credible on ${strongestFactor.label.toLowerCase()}, ` +
    `but ${weakestFactor.label.toLowerCase()} is the clearest drag on the final score.`
  );
}

function buildScoreNarrative(
  displayName: string,
  strongestFactor: SatelliteScoreFactor,
  weakestFactor: SatelliteScoreFactor,
) {
  return (
    "Each factor contributes up to 25 points. " +
    `${displayName} is carried by ${strongestFactor.label.toLowerCase()}, ` +
    `while ${weakestFactor.label.toLowerCase()} is the main reason it does not rank higher.`
  );
}

function buildDataQuality(nasaSatellite: NasaSatelliteRecord): SatelliteDataQuality {
  const sourceSampleCount = nasaSatellite.sourceSampleCount;
  const trajectoryPointCount = nasaSatellite.trajectory.length;
  let label: SatelliteDataQuality["label"] = "Limited";
  let confidenceScore = 0.68;

  if (sourceSampleCount >= 180) {
    label = "High";
    confidenceScore = 0.96;
  } else if (sourceSampleCount >= 120) {
    label = "Moderate";
    confidenceScore = 0.84;
  }

  return {
    label,
    confidenceScore,
    summary:
      `NASA SSC returned ${sourceSampleCount} source samples from ` +
      `${nasaSatellite.sourceWindowStartIso} to ${nasaSatellite.sourceWindowEndIso}. ` +
      `${trajectoryPointCount} points are kept in the demo trajectory snapshot.`,
    sourceSampleCount,
    trajectoryPointCount,
    windowStartIso: nasaSatellite.sourceWindowStartIso,
    windowEndIso: nasaSatellite.sourceWindowEndIso,
  };
}

function getStabilityBonus(altitudeSpanKm: number) {
  if (altitudeSpanKm <= 1) {
    return 3;
  }

  if (altitudeSpanKm <= 10) {
    return 2;
  }

  if (altitudeSpanKm <= 25) {
    return 1;
  }

  return -2;
}

function getPolarPenalty(latitudeSpanDeg: number) {
  if (latitudeSpanDeg >= 160) {
    return 2;
  }

  if (latitudeSpanDeg >= 120) {
    return 1;
  }

  return 0;
}

function getDebrisShellPenalty(orbitClass: OrbitClass, meanAltitudeKm: number) {
  if (orbitClass === "SSO") {
    return 1;
  }

  if (meanAltitudeKm < 450) {
    return 1;
  }

  return 0;
}

function getGeoBufferBonus(orbitClass: OrbitClass) {
  return orbitClass === "GEO" ? 1 : 0;
}

function getEndOfLifeOrbitBonus(orbitClass: OrbitClass) {
  switch (orbitClass) {
    case "LEO":
      return 2;
    case "SSO":
      return 1;
    case "MEO":
      return -1;
    case "HEO":
      return -2;
    case "GEO":
    default:
      return 0;
  }
}

function describeOrbitLane(orbitClass: OrbitClass) {
  switch (orbitClass) {
    case "GEO":
      return "The orbit sits in a geostationary lane that is operationally steady.";
    case "HEO":
      return "The orbit spans a broad altitude envelope, which makes the operating geometry less calm.";
    case "MEO":
      return "The orbit runs in a comparatively stable medium-altitude lane.";
    case "SSO":
      return "The craft flies in a sun-synchronous lane with repeatable geometry and heavy reuse.";
    case "LEO":
    default:
      return "The craft remains in low Earth orbit, where maneuver timing matters most.";
  }
}

function describeCongestionLane(orbitClass: OrbitClass) {
  switch (orbitClass) {
    case "GEO":
      return "Geostationary spacing is comparatively orderly in the local model.";
    case "HEO":
      return "Highly elliptical traffic is lighter, but geometry changes make coordination less trivial.";
    case "MEO":
      return "MEO remains calmer than the most crowded LEO shells.";
    case "SSO":
      return "Sun-synchronous shells are structurally busy because many imaging and weather missions reuse them.";
    case "LEO":
    default:
      return "Low Earth orbit carries the highest raw traffic volume in this scorecard.";
  }
}

function describeDebrisShell(orbitClass: OrbitClass) {
  switch (orbitClass) {
    case "GEO":
      return "Debris in GEO is long-lived, but conjunction density is still lower than the busiest LEO corridors.";
    case "HEO":
      return "Elliptical transfers cross multiple regions, which broadens the debris picture.";
    case "MEO":
      return "MEO avoids the densest LEO clutter, improving the exposure picture.";
    case "SSO":
      return "Sun-synchronous debris remains persistent because the shell is heavily reused and slowly clears.";
    case "LEO":
    default:
      return "LEO debris exposure is driven by dense traffic and frequent conjunction management.";
  }
}

function describeAltitudeStability(altitudeSpanKm: number) {
  if (altitudeSpanKm <= 1) {
    return "NASA's sampled arc shows an almost perfectly stable altitude profile.";
  }

  if (altitudeSpanKm <= 10) {
    return "NASA's sampled arc stays tightly clustered in altitude.";
  }

  if (altitudeSpanKm <= 25) {
    return "NASA's sampled arc is stable enough for a hackathon-scale scorecard.";
  }

  return "NASA's sampled arc swings enough in altitude to reduce the safety margin in the local model.";
}

function describeMissionComplexity(missionComplexity: number) {
  if (missionComplexity >= 5) {
    return "Mission complexity is high, so the model assumes less operational slack.";
  }

  if (missionComplexity >= 3) {
    return "Mission complexity is moderate, which trims some of the safety headroom.";
  }

  return "Mission complexity is comparatively contained.";
}

function describeEndOfLife(orbitClass: OrbitClass, orbitBonus: number) {
  if (orbitBonus > 0) {
    return `The ${orbitClass} regime has a comparatively explainable disposal path in this heuristic.`;
  }

  if (orbitBonus < 0) {
    return `The ${orbitClass} regime needs more deliberate end-of-life handling, so the model is stricter.`;
  }

  return `The ${orbitClass} regime earns a neutral end-of-life adjustment in this heuristic.`;
}

function describeOrbitHeadline(orbitClass: OrbitClass) {
  switch (orbitClass) {
    case "GEO":
      return "Geostationary orbit";
    case "HEO":
      return "High-elliptical orbit";
    case "MEO":
      return "Medium orbit";
    case "SSO":
      return "Sun-synchronous orbit";
    case "LEO":
    default:
      return "Low orbit";
  }
}

function describeCongestionExposure(
  assessmentLabel: SatelliteScoreFactor["assessmentLabel"] | undefined,
) {
  if (assessmentLabel === "Good") {
    return "low congestion exposure";
  }

  if (assessmentLabel === "High Risk") {
    return "high congestion exposure";
  }

  return "moderate congestion exposure";
}

function describeTrajectoryStability(altitudeSpanKm: number) {
  if (altitudeSpanKm <= 1) {
    return "a very stable trajectory";
  }

  if (altitudeSpanKm <= 10) {
    return "a stable trajectory";
  }

  if (altitudeSpanKm <= 25) {
    return "a mostly stable trajectory";
  }

  return "a visibly varying trajectory";
}

function clampScore(value: number) {
  return Math.max(0, Math.min(MAX_FACTOR_SCORE, value));
}
