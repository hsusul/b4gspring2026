"use client";

import type { CSSProperties } from "react";
import { useRef, useState } from "react";

import { GlobeViewport } from "../components/globe";
import { ScoreBreakdownList } from "../components/panels";
import { getSatelliteComparisonSnapshot } from "../lib/data";
import { resolveSelectedSatellite } from "../lib/data/selection";
import type {
  EnrichedSatelliteRecord,
  GlobeCameraMode,
  GlobeNarrativeMode,
  OrbitClass,
  ResearchAppSummary,
  ResearchRegimeSummary,
  SatelliteRiskLabel,
} from "../types";
import styles from "./space-highways.module.css";

interface SpaceHighwaysExperienceProps {
  researchSummary: ResearchAppSummary | null;
  satellites: EnrichedSatelliteRecord[];
}

type NarrativeOrbit = Extract<OrbitClass, "LEO" | "SSO" | "GEO">;

interface OrbitStorySummary {
  orbit: NarrativeOrbit;
  count: number;
  averageScore: number;
  pressureLabel: string;
  pressureTone: "low" | "moderate" | "high";
  representative: EnrichedSatelliteRecord;
  scoreRatio: number;
}

const STORY_MODE_COPY: Record<
  GlobeNarrativeMode,
  {
    label: string;
    title: string;
    body: string;
  }
> = {
  all: {
    label: "All Satellites",
    title: "The visible fleet collapses into just a few recurring corridors.",
    body:
      "At first glance, space looks borderless. Once you track real positions, the pattern changes. The satellites in this sample are not spread evenly around Earth. They stack into only a handful of repeatable lanes.",
  },
  lanes: {
    label: "Orbit Lanes",
    title: "Each lane exists because it solves a different job.",
    body:
      "Low orbit moves close to Earth, sun-synchronous orbit repeats local daylight conditions, and geostationary orbit lingers over one region. The lane tells you what kind of mission the satellite is trying to do.",
  },
  pressure: {
    label: "Pressure View",
    title: "A lane does not just locate a satellite. It changes the conditions it lives in.",
    body:
      "Our stewardship score turns orbital traffic, congestion, and operating complexity into a readable pressure signal. The lane becomes a shorthand for how calm or crowded the satellite's operating environment feels.",
  },
};

const ORBIT_COPY: Record<
  NarrativeOrbit,
  {
    eyebrow: string;
    title: string;
    description: string;
    why: string;
    difference: string;
  }
> = {
  LEO: {
    eyebrow: "Closest lane",
    title: "Low Earth orbit keeps satellites near the planet.",
    description:
      "LEO is the nearest traffic lane to Earth. Missions use it when they need proximity, fast revisit times, or human access.",
    why: "Crewed stations, rapid imaging, and science missions use it because it is close and responsive.",
    difference:
      "It is also the busiest lane in this sample. Things move quickly, traffic is denser, and operating pressure rises faster.",
  },
  SSO: {
    eyebrow: "Repeat-pass lane",
    title: "Sun-synchronous orbit is built for consistency.",
    description:
      "SSO is a special polar lane that crosses the same places at nearly the same local time each day.",
    why: "Earth imaging and weather missions use it because lighting conditions stay comparable from pass to pass.",
    difference:
      "That predictability makes it extremely useful, which is why so many observation missions cluster there together.",
  },
  GEO: {
    eyebrow: "Fixed watchtower",
    title: "Geostationary orbit holds a constant view.",
    description:
      "GEO sits far above Earth and circles at the same speed Earth rotates, so the satellite appears to hover over one region.",
    why: "Weather and communications missions use it when they need continuous regional coverage instead of repeat passes.",
    difference:
      "It is high, stable, and comparatively calm in this sample, but every slot has to be used carefully because the lane is narrow.",
  },
};

const STORY_ORBIT_ORDER: NarrativeOrbit[] = ["LEO", "SSO", "GEO"];
const REPRESENTATIVE_IDS: Record<NarrativeOrbit, string> = {
  LEO: "iss",
  SSO: "landsat8",
  GEO: "goes18",
};
const MODE_DEFAULT_SELECTIONS: Record<GlobeNarrativeMode, string> = {
  all: "iss",
  lanes: "landsat8",
  pressure: "iss",
};
const RISK_SEVERITY: Record<SatelliteRiskLabel, number> = {
  Low: 1,
  Moderate: 2,
  Elevated: 3,
  Critical: 4,
};

function getLeadSentence(text: string): string {
  const normalizedText = text.replace(/\s+/g, " ").trim();
  const firstSentenceMatch = normalizedText.match(/^.*?[.!?](?=\s|$)/);

  return (firstSentenceMatch?.[0] ?? normalizedText).trim();
}

function getRegimeCardCopy(
  regime: ResearchRegimeSummary,
  featuredNotes: Map<string, string>,
): string {
  return getLeadSentence(featuredNotes.get(regime.id) ?? regime.description);
}

function getRegimeCardLabel(
  regime: ResearchRegimeSummary,
  variant: "robust" | "qualified",
): string {
  if (variant === "robust") {
    return "Robust regime";
  }

  return regime.cutsAcrossOrbitLabels ? "Qualified cross-orbit" : "Qualified regime";
}

export function SpaceHighwaysExperience({
  researchSummary,
  satellites,
}: SpaceHighwaysExperienceProps) {
  const globeSectionRef = useRef<HTMLElement | null>(null);
  const [mode, setMode] = useState<GlobeNarrativeMode>("all");
  const [cameraMode, setCameraMode] = useState<GlobeCameraMode>("overview");
  const [cameraTargetSatelliteId, setCameraTargetSatelliteId] = useState<string | null>(
    null,
  );
  const [cameraCommandKey, setCameraCommandKey] = useState(0);
  const [selectedSatelliteId, setSelectedSatelliteId] = useState<string | null>(
    getPreferredSelectionId(MODE_DEFAULT_SELECTIONS.all, satellites),
  );

  const operatorCount = new Set(satellites.map((satellite) => satellite.operatorName))
    .size;
  const orbitSummaries = getOrbitSummaries(satellites);
  const selectedSatellite = resolveSelectedSatellite(satellites, selectedSatelliteId);
  const comparisonSnapshot = getSatelliteComparisonSnapshot(
    satellites,
    selectedSatellite?.satelliteId ?? null,
  );
  const dominantLane = [...orbitSummaries].sort(
    (left, right) => right.count - left.count,
  )[0] ?? null;
  const calmestLane = [...orbitSummaries].sort(
    (left, right) => right.averageScore - left.averageScore,
  )[0] ?? null;
  const mostPressuredLane = [...orbitSummaries].sort(
    (left, right) => left.averageScore - right.averageScore,
  )[0] ?? null;
  const visibleLaneCount = orbitSummaries.length;
  const modeCopy = STORY_MODE_COPY[mode];
  const finalResearchSummary = researchSummary?.finalSummary ?? null;
  const featuredRegimeNotes = new Map(
    [
      ...(finalResearchSummary?.robustRegimes ?? []),
      ...(finalResearchSummary?.qualifiedRegimes ?? []),
    ].map((regime) => [regime.regimeId, regime.whyItMatters]),
  );
  const robustFindingCopy =
    finalResearchSummary?.validatedFindings.stronglySupported.slice(0, 3) ?? [];
  const qualifiedFindingCopy = [
    ...(finalResearchSummary?.validatedFindings.moderatelySupported ?? []).slice(0, 2),
    ...(finalResearchSummary?.validatedFindings.tentative ?? []).slice(0, 1),
  ];
  const robustRegimeIds = new Set(
    (finalResearchSummary?.robustRegimes ?? []).map((regime) => regime.regimeId),
  );
  const qualifiedRegimeIds = new Set(
    (finalResearchSummary?.qualifiedRegimes ?? []).map((regime) => regime.regimeId),
  );
  const robustRegimes =
    researchSummary?.regimes.filter((regime) => robustRegimeIds.has(regime.id)) ?? [];
  const qualifiedRegimes =
    researchSummary?.regimes.filter((regime) => qualifiedRegimeIds.has(regime.id)) ?? [];
  const regimeGroups = [
    {
      id: "robust" as const,
      title: "Robust regimes",
      copy: "These patterns remain clearest across seeded reruns.",
      regimes: robustRegimes,
    },
    {
      id: "qualified" as const,
      title: "Qualified regimes",
      copy:
        "These patterns still matter, but they carry more uncertainty or lean more heavily on proxy-sensitive interpretation.",
      regimes: qualifiedRegimes,
    },
  ].filter((group) => group.regimes.length > 0);
  const keyFindings = buildKeyFindings(
    satellites.length,
    operatorCount,
    visibleLaneCount,
    dominantLane,
    calmestLane,
    mostPressuredLane,
  );

  const handleModeChange = (nextMode: GlobeNarrativeMode) => {
    setMode(nextMode);
    setCameraMode("overview");
    setCameraTargetSatelliteId(null);
    setCameraCommandKey((currentValue) => currentValue + 1);
  };

  const handleGlobeSelectSatellite = (satelliteId: string) => {
    setSelectedSatelliteId(satelliteId);
    setCameraMode("follow");
    setCameraTargetSatelliteId(satelliteId);
    setCameraCommandKey((currentValue) => currentValue + 1);
  };

  const handleInspectSatellite = (satelliteId: string) => {
    setSelectedSatelliteId(satelliteId);
    setCameraMode("follow");
    setCameraTargetSatelliteId(satelliteId);
    setCameraCommandKey((currentValue) => currentValue + 1);
    globeSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <main className={styles.page}>
      <section className={`${styles.section} ${styles.heroSection}`}>
        <div className={styles.heroStack}>
          <p className={styles.kicker}>A guided visual essay about orbital traffic</p>
          <h1 className={styles.heroTitle}>Space Has Highways</h1>
          <p className={styles.heroSubtitle}>
            Satellites do not spread evenly around Earth. They cluster into a few
            invisible traffic lanes.
          </p>

          <div className={styles.heroMeta} aria-label="Story overview">
            <span>{satellites.length} visible assets</span>
            <span>{operatorCount} operators</span>
            <span>{visibleLaneCount} recurring lanes</span>
          </div>

        </div>
      </section>

      <section
        ref={globeSectionRef}
        className={`${styles.section} ${styles.globeSection}`}
      >
        <div className={styles.sectionIntro}>
          <p className={styles.sectionLabel}>1. The empty sky is an illusion</p>
          <h2 className={styles.sectionTitle}>Earth is ringed by repeat traffic, not open emptiness.</h2>
          <p className={styles.sectionCopy}>
            Use the globe to move between the full field, the shared lanes, and the
            pressure reading those lanes create.
          </p>
        </div>

        <div className={styles.modeRail} role="tablist" aria-label="Globe reveal modes">
          {(Object.keys(STORY_MODE_COPY) as GlobeNarrativeMode[]).map((storyMode) => (
            <button
              key={storyMode}
              type="button"
              role="tab"
              aria-selected={mode === storyMode}
              className={[
                styles.modeButton,
                mode === storyMode ? styles.modeButtonActive : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => handleModeChange(storyMode)}
            >
              {STORY_MODE_COPY[storyMode].label}
            </button>
          ))}
        </div>

        <div className={styles.globeWell}>
          <GlobeViewport
            cameraCommandKey={cameraCommandKey}
            cameraMode={cameraMode}
            cameraTargetSatelliteId={cameraTargetSatelliteId}
            narrativeMode={mode}
            satellites={satellites}
            selectedSatelliteId={selectedSatellite?.satelliteId ?? null}
            onSelectSatellite={handleGlobeSelectSatellite}
          />
        </div>

        <div className={styles.globeNarrativeGrid}>
          <div className={styles.globeNarrativeCopy}>
            <p className={styles.modeLabel}>{modeCopy.label}</p>
            <h3 className={styles.modeTitle}>{modeCopy.title}</h3>
            <p className={styles.modeCopy}>{modeCopy.body}</p>
            {selectedSatellite ? (
              <div className={styles.selectedContext}>
                <p className={styles.selectedContextLabel}>Current example</p>
                <p className={styles.selectedContextTitle}>
                  {selectedSatellite.displayName} in {selectedSatellite.orbitClass}
                </p>
                <p className={styles.selectedContextCopy}>
                  {selectedSatellite.demoExplanation}
                </p>
              </div>
            ) : null}
          </div>

          <div className={styles.modeDetails} aria-live="polite">
            {mode === "all"
              ? renderAllModeDetails(orbitSummaries, dominantLane, satellites.length)
              : null}
            {mode === "lanes" ? renderLaneModeDetails(orbitSummaries) : null}
            {mode === "pressure" ? renderPressureModeDetails(orbitSummaries) : null}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionIntro}>
          <p className={styles.sectionLabel}>2. Why do these lanes exist?</p>
          <h2 className={styles.sectionTitle}>
            The highways are invisible, but each one solves a very specific problem.
          </h2>
          <p className={styles.sectionCopy}>
            These are not arbitrary rings. They are the repeat routes missions choose
            because each lane offers a different tradeoff between coverage, timing,
            and operating pressure.
          </p>
        </div>

        <div className={styles.laneGrid}>
          {orbitSummaries.map((summary) => {
            const orbitCopy = ORBIT_COPY[summary.orbit];
            return (
              <article className={styles.laneCard} key={summary.orbit}>
                <div className={styles.laneHeader}>
                  <p className={styles.laneEyebrow}>{orbitCopy.eyebrow}</p>
                </div>
                <h3 className={styles.laneTitle}>{summary.orbit}</h3>
                <p className={styles.laneLead}>{orbitCopy.title}</p>
                <p className={styles.laneText}>{orbitCopy.description}</p>
                <dl className={styles.laneFacts}>
                  <div>
                    <dt>Why missions use it</dt>
                    <dd>{orbitCopy.why}</dd>
                  </div>
                  <div>
                    <dt>What makes it different</dt>
                    <dd>{orbitCopy.difference}</dd>
                  </div>
                </dl>
                <button
                  type="button"
                  className={styles.laneButton}
                  onClick={() => handleInspectSatellite(summary.representative.satelliteId)}
                >
                  Inspect {summary.representative.displayName}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.section} id="interpretation">
        <div className={styles.sectionIntro}>
          <p className={styles.sectionLabel}>3. Why does the lane matter?</p>
          <h2 className={styles.sectionTitle}>
            The score is not the story. It is the translation layer.
          </h2>
          <p className={styles.sectionCopy}>
            The live card turns one selected satellite into four readable signals. Use
            the left side as the key, and the right side as the example in motion.
          </p>
        </div>

        <div className={styles.interpretationGrid}>
          <div className={styles.interpretationNarrative}>
            <p className={styles.interpretationLead}>
              Four signals, same order as the bars on the right.
            </p>

            <div className={styles.exampleRail} role="tablist" aria-label="Representative satellites">
              {orbitSummaries.map((summary) => (
                <button
                  key={summary.orbit}
                  type="button"
                  role="tab"
                  aria-selected={
                    selectedSatellite?.satelliteId === summary.representative.satelliteId
                  }
                  className={[
                    styles.exampleButton,
                    selectedSatellite?.satelliteId === summary.representative.satelliteId
                      ? styles.exampleButtonActive
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => setSelectedSatelliteId(summary.representative.satelliteId)}
                >
                  <span className={styles.exampleButtonOrbit}>{summary.orbit}</span>
                  <span className={styles.exampleButtonName}>
                    {summary.representative.displayName}
                  </span>
                </button>
              ))}
            </div>

            <div className={styles.signalDecoder}>
              {SIGNAL_DECODER.map((signal, index) => (
                <article className={styles.signalDecoderRow} key={signal.label}>
                  <p className={styles.signalIndex}>0{index + 1}</p>
                  <div className={styles.signalBody}>
                    <p className={styles.signalTerm}>{signal.label}</p>
                    <p className={styles.signalDescription}>{signal.summary}</p>
                    <div className={styles.signalEdges}>
                      <p className={styles.signalEdge}>
                        <span className={styles.signalEdgeLabel}>Higher</span>
                        <span className={styles.signalEdgeCopy}>{signal.higher}</span>
                      </p>
                      <p className={styles.signalEdge}>
                        <span className={styles.signalEdgeLabel}>Lower</span>
                        <span className={styles.signalEdgeCopy}>{signal.lower}</span>
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          {selectedSatellite ? (
            <StoryScoreCard
              comparisonSnapshot={comparisonSnapshot}
              satellite={selectedSatellite}
            />
          ) : null}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionIntro}>
          <p className={styles.sectionLabel}>4. What did we learn?</p>
          <h2 className={styles.sectionTitle}>
            The lane shapes the conditions almost as much as the satellite itself.
          </h2>
          <p className={styles.sectionCopy}>
            Once the highways become visible, a few patterns stand out immediately.
          </p>
        </div>

        <div className={styles.findingsGrid}>
          <div className={styles.findingList}>
            {keyFindings.map((finding, index) => (
              <article className={styles.finding} key={finding}>
                <p className={styles.findingIndex}>0{index + 1}</p>
                <p className={styles.findingCopy}>{finding}</p>
              </article>
            ))}
          </div>

          <div className={styles.comparisonPanel}>
            <div className={styles.comparisonHeader}>
              <p className={styles.comparisonLabel}>Visible lane comparison</p>
              <p className={styles.comparisonCopy}>
                Bar length shows average stewardship score. Color shows lane pressure.
              </p>
            </div>

            <div className={styles.comparisonRows}>
              {orbitSummaries.map((summary) => (
                <div className={styles.comparisonRow} key={summary.orbit}>
                  <div>
                    <p className={styles.comparisonOrbit}>{summary.orbit}</p>
                    <p className={styles.comparisonMeta}>
                      {summary.count} assets · {summary.pressureLabel}
                    </p>
                  </div>

                  <div className={styles.comparisonBar} aria-hidden="true">
                    <span
                      className={styles.comparisonBarFill}
                      style={{ width: `${summary.scoreRatio * 100}%` }}
                      data-tone={summary.pressureTone}
                    />
                  </div>

                  <p className={styles.comparisonScore}>{summary.averageScore}/100</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {researchSummary?.analysisStatus === "trained" ? (
        <>
          <section className={styles.section}>
            <div className={styles.sectionIntro}>
              <p className={styles.sectionLabel}>5. What the validated model adds</p>
              <h2 className={styles.sectionTitle}>
                The clearest result is crowded low-orbit traffic, not a single magic cluster.
              </h2>
              <p className={styles.sectionCopy}>
                {finalResearchSummary?.projectSummary.answer ??
                  `Across ${researchSummary.datasetSummary.populationSize.toLocaleString()} active payloads, the validated pass finds recurring vulnerability structure that goes beyond a simple orbit label.`}
              </p>
              {finalResearchSummary ? (
                <p className={styles.researchValidationLine}>
                  {finalResearchSummary.validationNote}
                </p>
              ) : null}
            </div>

            <div className={styles.researchConclusionGrid}>
              <article className={styles.researchBeatCard}>
                <p className={styles.researchHighlightTitle}>Strongest supported findings</p>
                <div className={styles.researchClaimList}>
                  {robustFindingCopy.map((finding) => (
                    <p className={styles.researchClaimItem} key={finding}>
                      {finding}
                    </p>
                  ))}
                </div>
              </article>

              <article className={styles.researchBeatCard}>
                <p className={styles.researchHighlightTitle}>What stays qualified</p>
                <div className={styles.researchClaimList}>
                  {qualifiedFindingCopy.map((finding) => (
                    <p className={styles.researchClaimItem} key={finding}>
                      {finding}
                    </p>
                  ))}
                </div>
                {finalResearchSummary?.projectSummary.modelValueAdd ? (
                  <p className={styles.researchModelLine}>
                    {finalResearchSummary.projectSummary.modelValueAdd}
                  </p>
                ) : null}
              </article>
            </div>
          </section>

          <section className={`${styles.section} ${styles.researchRegimeSection}`}>
            <div className={styles.researchRegimeLead}>
              <p className={styles.sectionLabel}>6. The regimes it found</p>
              <h2 className={styles.researchRegimeLeadTitle}>
                A few recurring operating regimes emerge once the full population is compressed.
              </h2>
              <p className={styles.researchRegimeLeadCopy}>
                Start with the stable patterns first. The gallery then moves into the regimes
                that remain useful but less certain.
              </p>
            </div>

            <div className={styles.researchRegimeChapter}>
              {regimeGroups.map((group, groupIndex) => (
                <div className={styles.researchRegimeGroup} key={group.id}>
                  <div className={styles.researchGroupIntro}>
                    <h3 className={styles.researchGroupHeading}>{group.title}</h3>
                    <p className={styles.researchGroupCopy}>{group.copy}</p>
                  </div>

                  <div className={styles.researchRegimeGrid}>
                    {group.regimes.map((regime) => (
                      <article
                        className={styles.researchRegimeCard}
                        data-variant={group.id}
                        key={regime.id}
                      >
                        <div className={styles.researchRegimeMeta}>
                          <p className={styles.researchRegimeLabel}>
                            {getRegimeCardLabel(regime, group.id)}
                          </p>
                          <p className={styles.researchRegimeCount}>
                            {regime.satelliteCount.toLocaleString()} assets
                          </p>
                        </div>

                        <h4 className={styles.researchRegimeTitle}>{regime.label}</h4>

                        <p className={styles.researchRegimeCopy}>
                          {getRegimeCardCopy(regime, featuredRegimeNotes)}
                        </p>

                        <dl className={styles.researchRegimeStats}>
                          <div className={styles.researchRegimeMetric}>
                            <dt>Score</dt>
                            <dd>{regime.profile.averageScore}/100</dd>
                          </div>
                          <div className={styles.researchRegimeMetric}>
                            <dt>Congestion</dt>
                            <dd>{regime.profile.averageCongestionImpact}/25</dd>
                          </div>
                          <div className={styles.researchRegimeMetric}>
                            <dt>Debris</dt>
                            <dd>{regime.profile.averageDebrisExposure}/25</dd>
                          </div>
                          <div className={styles.researchRegimeMetric}>
                            <dt>Sustainability</dt>
                            <dd>{regime.profile.averageSustainability}/25</dd>
                          </div>
                        </dl>

                        {regime.representativeSatellites?.length ? (
                          <p className={styles.researchRegimeReps}>
                            Examples:{" "}
                            {regime.representativeSatellites
                              .map((satellite) => satellite.displayName)
                              .join(", ")}
                          </p>
                        ) : null}
                      </article>
                    ))}
                  </div>

                  {group.id === "robust" && groupIndex < regimeGroups.length - 1 ? (
                    <div aria-hidden="true" className={styles.researchRegimeDivider} />
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionIntro}>
              <p className={styles.sectionLabel}>7. Outliers worth inspecting</p>
              <h2 className={styles.sectionTitle}>
                A few satellites sit far from their peers and deserve a closer look.
              </h2>
              <p className={styles.sectionCopy}>
                {finalResearchSummary?.anomalySummary.headline ??
                  "These are inspection prompts, not a standalone vulnerability ranking."}
              </p>
            </div>

            <div className={styles.outlierStrip}>
              <p className={styles.outlierIntro}>
                {finalResearchSummary?.anomalySummary.body}
              </p>
              <div className={styles.outlierStripRows}>
                {researchSummary.topOutliers.slice(0, 4).map((outlier) => (
                  <article className={styles.outlierCard} key={outlier.satelliteId}>
                    <p className={styles.outlierName}>{outlier.displayName}</p>
                    <p className={styles.outlierMeta}>
                      {outlier.orbitClass} · anomaly {outlier.anomalyScore?.toFixed(3)}
                    </p>
                    <p className={styles.outlierReason}>{outlier.reason}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </>
      ) : null}

      <section className={`${styles.section} ${styles.closingSection}`}>
        <div className={styles.closingCard}>
          <p className={styles.sectionLabel}>8. Final takeaway</p>
          <h2 className={styles.closingTitle}>
            Space only looks empty until you see the highways.
          </h2>
          <p className={styles.closingCopy}>
            Once the pattern comes into focus, space stops looking random. Satellites
            return to a small set of repeat corridors, and those lane choices shape
            congestion, pressure, stewardship, and the operating conditions each
            mission inherits.
          </p>
          <p className={styles.closingCopy}>
            That is why the score matters here. It turns invisible orbital conditions
            into something a non-expert can read, so a satellite becomes more than a
            point above Earth. It becomes a resident of a traffic system.
          </p>
          <p className={styles.footerNote}>
            Position and trajectory data from NASA SSC. Local enriched metadata and
            stewardship scoring are used here as the interpretive layer.
          </p>
        </div>
      </section>
    </main>
  );
}

interface StoryScoreCardProps {
  satellite: EnrichedSatelliteRecord;
  comparisonSnapshot: ReturnType<typeof getSatelliteComparisonSnapshot>;
}

function StoryScoreCard({
  satellite,
  comparisonSnapshot,
}: StoryScoreCardProps) {
  const normalizedRiskLabel = normalizeRiskLabel(satellite.riskLabel);
  const orbitClassContext = comparisonSnapshot
    ? `Rank #${comparisonSnapshot.scoreRank} of ${comparisonSnapshot.totalCompared} in this visible fleet`
    : `Representative ${satellite.orbitClass} example`;

  return (
    <article
      className={styles.storyScoreCard}
      style={
        {
          "--story-accent": getRiskAccentColor(normalizedRiskLabel),
        } as CSSProperties
      }
    >
      <div className={styles.storyScoreHeader}>
        <p className={styles.storyScoreLabel}>Stewardship translation</p>
        <h3 className={styles.storyScoreName}>{satellite.displayName}</h3>
        <p className={styles.storyScoreMeta}>
          {satellite.operatorName} · {satellite.orbitClass} · {satellite.missionClass}
        </p>
      </div>

      <div className={styles.storyScoreHero}>
        <p className={styles.storyScoreValue}>
          {satellite.scoreBreakdown.total}
          <span>/{satellite.scoreBreakdown.maxScore}</span>
        </p>
        <div className={styles.storyScoreHeroCopy}>
          <p className={styles.storyScoreRisk}>{normalizedRiskLabel}</p>
          <p className={styles.storyScoreRank}>{orbitClassContext}</p>
        </div>
      </div>

      <p className={styles.storyScoreSummary}>
        {satellite.demoExplanation}
      </p>

      <div className={styles.storyScoreBreakdown}>
        <ScoreBreakdownList
          accentColor={getRiskAccentColor(normalizedRiskLabel)}
          factors={satellite.scoreBreakdown.factors}
          summary={getInterpretationSummary(
            comparisonSnapshot,
            satellite.orbitClass,
            satellite.riskSummary,
          )}
        />
      </div>
    </article>
  );
}

function renderAllModeDetails(
  orbitSummaries: OrbitStorySummary[],
  dominantLane: OrbitStorySummary | null,
  totalAssets: number,
) {
  return (
    <>
      <article className={styles.modeCard}>
        <p className={styles.modeCardValue}>{orbitSummaries.length}</p>
        <p className={styles.modeCardLabel}>recurring lanes visible here</p>
      </article>

      {dominantLane ? (
        <article className={styles.modeCard}>
          <p className={styles.modeCardValue}>
            {dominantLane.count}/{totalAssets}
          </p>
          <p className={styles.modeCardLabel}>
            assets share the {dominantLane.orbit} corridor
          </p>
        </article>
      ) : null}

      {orbitSummaries.map((summary) => (
        <article className={styles.modeDetail} key={summary.orbit}>
          <div>
            <p className={styles.modeDetailTitle}>{summary.orbit}</p>
            <p className={styles.modeDetailCopy}>
              Satellites in this lane repeat a common route around Earth.
            </p>
          </div>
          <p className={styles.modeDetailMeta}>{summary.averageScore}/100 average</p>
        </article>
      ))}
    </>
  );
}

function renderLaneModeDetails(orbitSummaries: OrbitStorySummary[]) {
  return orbitSummaries.map((summary) => (
    <article className={styles.modeDetail} key={summary.orbit}>
      <div>
        <p className={styles.modeDetailTitle}>{summary.orbit}</p>
        <p className={styles.modeDetailCopy}>{ORBIT_COPY[summary.orbit].why}</p>
      </div>
      <p className={styles.modeDetailMeta}>{summary.count} assets</p>
    </article>
  ));
}

function renderPressureModeDetails(orbitSummaries: OrbitStorySummary[]) {
  return orbitSummaries.map((summary) => (
    <article className={styles.modeDetail} key={summary.orbit}>
      <div>
        <p className={styles.modeDetailTitle}>{summary.orbit}</p>
        <p className={styles.modeDetailCopy}>
          {summary.pressureLabel} with an average stewardship score of{" "}
          {summary.averageScore}/100.
        </p>
      </div>
      <p className={styles.modeDetailMeta}>{summary.count} assets</p>
    </article>
  ));
}

function getOrbitSummaries(records: EnrichedSatelliteRecord[]): OrbitStorySummary[] {
  return STORY_ORBIT_ORDER.map((orbit) => {
    const matchingRecords = records.filter((record) => record.orbitClass === orbit);

    if (matchingRecords.length === 0) {
      return null;
    }

    const totalScore = matchingRecords.reduce(
      (sum, record) => sum + record.scoreBreakdown.total,
      0,
    );
    const averageScore = Math.round(totalScore / matchingRecords.length);
    const averageRisk =
      matchingRecords.reduce(
        (sum, record) => sum + RISK_SEVERITY[record.riskLabel],
        0,
      ) / matchingRecords.length;

    return {
      orbit,
      count: matchingRecords.length,
      averageScore,
      pressureLabel: getPressureLabel(averageRisk),
      pressureTone: getPressureTone(averageRisk),
      representative: getRepresentativeSatellite(matchingRecords, orbit),
      scoreRatio: averageScore / 100,
    };
  }).filter((summary): summary is OrbitStorySummary => Boolean(summary));
}

function buildKeyFindings(
  totalAssets: number,
  operatorCount: number,
  visibleLaneCount: number,
  dominantLane: OrbitStorySummary | null,
  calmestLane: OrbitStorySummary | null,
  mostPressuredLane: OrbitStorySummary | null,
) {
  return [
    `${totalAssets} visible assets from ${operatorCount} operators still collapse into only ${visibleLaneCount} recurring orbital lanes.`,
    dominantLane
      ? `${dominantLane.orbit} is the busiest corridor here, carrying ${dominantLane.count} of ${totalAssets} visible assets.`
      : null,
    calmestLane
      ? `${calmestLane.orbit} reads as the calmest lane in this sample, averaging ${calmestLane.averageScore}/100.`
      : null,
    mostPressuredLane
      ? `${mostPressuredLane.orbit} carries the roughest conditions here, where pressure is ${mostPressuredLane.pressureLabel.toLowerCase()}.`
      : null,
  ].filter((finding): finding is string => Boolean(finding));
}

function getPressureLabel(averageRisk: number) {
  if (averageRisk >= 3) {
    return "Higher pressure";
  }

  if (averageRisk >= 2) {
    return "Working pressure";
  }

  return "Calmer pressure";
}

function getPressureTone(averageRisk: number) {
  if (averageRisk >= 3) {
    return "high";
  }

  if (averageRisk >= 2) {
    return "moderate";
  }

  return "low";
}

function getRepresentativeSatellite(
  records: EnrichedSatelliteRecord[],
  orbit: NarrativeOrbit,
) {
  const preferredId = REPRESENTATIVE_IDS[orbit];

  return (
    records.find((record) => record.satelliteId === preferredId) ??
    [...records].sort(
      (left, right) => right.scoreBreakdown.total - left.scoreBreakdown.total,
    )[0]
  );
}

function getPreferredSelectionId(
  preferredId: string,
  records: EnrichedSatelliteRecord[],
) {
  return (
    records.find((record) => record.satelliteId === preferredId)?.satelliteId ??
    records[0]?.satelliteId ??
    null
  );
}

function getInterpretationSummary(
  comparisonSnapshot: ReturnType<typeof getSatelliteComparisonSnapshot>,
  orbitClass: OrbitClass,
  riskSummary: string,
) {
  if (
    comparisonSnapshot &&
    comparisonSnapshot.orbitClassPopulation > 1 &&
    comparisonSnapshot.orbitClassScoreRank === comparisonSnapshot.orbitClassPopulation
  ) {
    return `Lowest-performing asset in current ${orbitClass} cohort`;
  }

  return riskSummary;
}

function normalizeRiskLabel(riskLabel: SatelliteRiskLabel) {
  if (riskLabel === "Critical" || riskLabel === "Elevated") {
    return "High pressure";
  }

  if (riskLabel === "Moderate") {
    return "Moderate pressure";
  }

  return "Low pressure";
}

function getRiskAccentColor(riskLabel: string) {
  if (riskLabel === "High pressure") {
    return "#ff7558";
  }

  if (riskLabel === "Moderate pressure") {
    return "#f2a443";
  }

  return "#7d98b3";
}

const SIGNAL_DECODER = [
  {
    label: "Orbital safety",
    summary:
      "Reads how calm and manageable the orbit looks once lane geometry, sampled altitude stability, and mission complexity are taken together.",
    higher:
      "stable arcs, steadier lanes, and missions with more operational slack",
    lower:
      "less calm geometry, tighter maneuver timing, and more complex operations",
  },
  {
    label: "Congestion impact",
    summary:
      "Reads how much traffic the satellite has to share its route with, especially in heavily reused shells.",
    higher:
      "orderly spacing and lanes that are not being reused as aggressively",
    lower:
      "crowded shells, polar crossings, and very low altitudes inside busy corridors",
  },
  {
    label: "Debris exposure",
    summary:
      "Reads how much clutter and conjunction management the satellite is likely to live with over time.",
    higher:
      "lanes that avoid the densest debris shells and collision-saturated regions",
    lower:
      "persistent debris environments and routes that demand more conjunction management",
  },
  {
    label: "Sustainability / end-of-life",
    summary:
      "Reads how credible the stewardship story looks once the mission is finished, combining operator discipline with the orbit's disposal conditions.",
    higher:
      "clearer end-of-life paths and stronger local stewardship assumptions",
    lower:
      "stricter disposal conditions and missions that leave less operational slack",
  },
] as const;
