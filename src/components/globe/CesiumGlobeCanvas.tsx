"use client";

import { useEffect, useRef, useState } from "react";

import type {
  GlobeCameraMode,
  EnrichedSatelliteRecord,
  GlobeNarrativeMode,
  OrbitClass,
  SatelliteRiskLabel,
} from "../../types";
import { loadCesium } from "./loadCesium";
import {
  buildSampleOrbitTracks,
  getTrackCameraRangeMeters,
  getTrackCameraDurationSeconds,
  getTrackOrbitPath,
  getTrackPosition,
  getTrackTrailTrajectory,
  type GlobeSatelliteTrack,
} from "./sampleOrbitData";

interface CesiumGlobeCanvasProps {
  cameraCommandKey: number;
  cameraMode: GlobeCameraMode;
  cameraTargetSatelliteId: string | null;
  narrativeMode: GlobeNarrativeMode;
  satellites: EnrichedSatelliteRecord[];
  selectedSatelliteId: string | null;
  onSelectSatellite?: (satelliteId: string) => void;
}

interface CesiumColorValue {
  withAlpha(alpha: number): unknown;
}

interface CesiumRuntime {
  CallbackProperty: new (
    callback: (time: unknown, result?: unknown) => unknown,
    isConstant: boolean,
  ) => unknown;
  Cartesian2: new (x: number, y: number) => unknown;
  Cartesian3: {
    fromDegrees: (
      longitude: number,
      latitude: number,
      height?: number,
    ) => unknown;
  };
  Color: {
    WHITE: unknown;
    fromCssColorString: (value: string) => CesiumColorValue;
  };
  EllipsoidTerrainProvider: new () => unknown;
  HeadingPitchRange: new (
    heading: number,
    pitch: number,
    range: number,
  ) => unknown;
  Matrix4: {
    IDENTITY: unknown;
  };
  HorizontalOrigin: {
    LEFT: unknown;
  };
  Ion: {
    defaultAccessToken: string;
  };
  JulianDate: {
    toDate: (value: unknown) => Date;
  };
  NearFarScalar: new (
    nearDistance: number,
    nearValue: number,
    farDistance: number,
    farValue: number,
  ) => unknown;
  Property?: {
    getValueOrUndefined?: (
      property: unknown,
      time: unknown,
      result?: unknown,
    ) => unknown;
  };
  ScreenSpaceEventHandler: new (canvas: unknown) => {
    destroy?: () => void;
    setInputAction: (
      callback: (event: { position?: unknown; endPosition?: unknown }) => void,
      type: unknown,
    ) => void;
  };
  ScreenSpaceEventType: {
    LEFT_CLICK: unknown;
    MOUSE_MOVE: unknown;
  };
  Viewer: new (element: Element, options: Record<string, unknown>) => {
    camera: {
      flyTo: (options: Record<string, unknown>) => void;
      lookAt: (target: unknown, offset: unknown) => void;
      lookAtTransform: (transform: unknown) => void;
      setView: (options: Record<string, unknown>) => void;
    };
    cesiumWidget: {
      creditContainer?: HTMLElement;
    };
    clock: {
      currentTime: unknown;
      multiplier: number;
      shouldAnimate: boolean;
    };
    destroy?: () => void;
    entities: {
      add: (entity: Record<string, unknown>) => unknown;
      getById: (id: string) => unknown;
      removeAll: () => void;
    };
    flyTo: (target: unknown, options?: Record<string, unknown>) => void;
    scene: {
      backgroundColor: unknown;
      canvas: HTMLCanvasElement;
      fog: {
        enabled: boolean;
      };
      globe: {
        baseColor: unknown;
        depthTestAgainstTerrain: boolean;
        enableLighting: boolean;
        showGroundAtmosphere: boolean;
      };
      moon?: {
        show: boolean;
      };
      pick: (position: unknown) => { id?: CesiumPickedEntity } | undefined;
      postProcessStages?: {
        fxaa?: {
          enabled: boolean;
        };
      };
      screenSpaceCameraController?: {
        inertiaSpin: number;
        inertiaTranslate: number;
        inertiaZoom: number;
        maximumZoomDistance: number;
        minimumZoomDistance: number;
      };
      skyAtmosphere: {
        show: boolean;
      };
      sun?: {
        show: boolean;
      };
    };
    selectedEntity?: unknown;
  };
  defined: (value: unknown) => boolean;
}

type GlobeLoadState = "loading" | "ready" | "error";
type TrackEmphasis = "idle" | "hovered" | "selected";
type CesiumViewer = InstanceType<CesiumRuntime["Viewer"]>;
type CesiumHandler = InstanceType<CesiumRuntime["ScreenSpaceEventHandler"]>;

interface CesiumPickedEntity {
  id?: string;
  properties?: {
    satelliteId?: unknown;
  };
}

const DEFAULT_CURSOR = "grab";
const POINTER_CURSOR = "pointer";
const FOLLOW_CAMERA_HEADING_RAD = 0.42;
const FOLLOW_CAMERA_PITCH_RAD = -1.12;
const GLOBE_DEBUG_PREFIX = "[AstraRank Globe]";
const NEUTRAL_TRACK_COLOR = "#8ca0b2";
const ORBIT_LANE_COLORS: Record<OrbitClass, string> = {
  LEO: "#7ec3ff",
  SSO: "#7fd6a8",
  MEO: "#89a1c2",
  GEO: "#f0bf77",
  HEO: "#c8b1ff",
};
const PRESSURE_COLORS: Record<SatelliteRiskLabel, string> = {
  Low: "#7d98b3",
  Moderate: "#f2a443",
  Elevated: "#ff7558",
  Critical: "#ff4d4d",
};

export function CesiumGlobeCanvas({
  cameraCommandKey,
  cameraMode,
  cameraTargetSatelliteId,
  narrativeMode,
  satellites,
  selectedSatelliteId,
  onSelectSatellite,
}: CesiumGlobeCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cesiumRef = useRef<CesiumRuntime | null>(null);
  const viewerRef = useRef<CesiumViewer | null>(null);
  const handlerRef = useRef<CesiumHandler | null>(null);
  const lastFocusedSatelliteIdRef = useRef<string | null>(null);
  const lastCameraCommandKeyRef = useRef<number>(-1);
  const followModeSatelliteIdRef = useRef<string | null>(null);
  const followModeActiveRef = useRef(false);
  const followAnimationFrameRef = useRef<number | null>(null);
  const orbitPathCacheRef = useRef(new Map<string, ReturnType<typeof getTrackOrbitPath>>());
  const trackMapRef = useRef(new Map<string, GlobeSatelliteTrack>());
  const trackOrderRef = useRef<string[]>([]);
  const onSelectSatelliteRef = useRef(onSelectSatellite);
  const [loadState, setLoadState] = useState<GlobeLoadState>("loading");
  const [loadMessage, setLoadMessage] = useState("Booting Cesium orbital theatre...");
  const [hoveredSatelliteId, setHoveredSatelliteId] = useState<string | null>(null);

  onSelectSatelliteRef.current = onSelectSatellite;

  useEffect(() => {
    let cancelled = false;

    async function initializeViewer() {
      debugGlobeLog("initialize:start", {
        hasContainer: Boolean(containerRef.current),
      });

      if (!containerRef.current || viewerRef.current) {
        return;
      }

      debugGlobeLog("container:mounted", {
        height: containerRef.current.clientHeight,
        width: containerRef.current.clientWidth,
      });

      if (
        containerRef.current.clientWidth < 24 ||
        containerRef.current.clientHeight < 24
      ) {
        debugGlobeLog("container:waiting-for-size", {
          height: containerRef.current.clientHeight,
          width: containerRef.current.clientWidth,
        });
        requestAnimationFrame(initializeViewer);
        return;
      }

      setLoadState("loading");
      setLoadMessage("Booting Cesium orbital theatre...");

      try {
        const Cesium = (await loadCesium()) as CesiumRuntime;

        if (cancelled || !containerRef.current) {
          return;
        }

        const accessToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN?.trim();

        if (accessToken) {
          Cesium.Ion.defaultAccessToken = accessToken;
        }

        debugGlobeLog("viewer:create", {
          accessTokenConfigured: Boolean(accessToken),
          containerHeight: containerRef.current.clientHeight,
          containerWidth: containerRef.current.clientWidth,
        });

        const viewer = new Cesium.Viewer(containerRef.current, {
          animation: false,
          baseLayerPicker: false,
          fullscreenButton: false,
          geocoder: false,
          homeButton: false,
          infoBox: false,
          navigationHelpButton: false,
          sceneModePicker: false,
          selectionIndicator: false,
          terrainProvider: new Cesium.EllipsoidTerrainProvider(),
          timeline: false,
        });

        debugGlobeLog("viewer:created", {
          canvasHeight: viewer.scene.canvas.clientHeight,
          canvasWidth: viewer.scene.canvas.clientWidth,
        });

        viewer.clock.shouldAnimate = true;
        viewer.clock.multiplier = 42;
        viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString("#08243c");
        viewer.scene.globe.depthTestAgainstTerrain = false;
        viewer.scene.globe.enableLighting = true;
        viewer.scene.globe.showGroundAtmosphere = true;
        viewer.scene.backgroundColor =
          Cesium.Color.fromCssColorString("#020814");
        viewer.scene.fog.enabled = false;
        viewer.scene.skyAtmosphere.show = true;

        debugGlobeLog("scene:configured", {
          canvasHeight: viewer.scene.canvas.clientHeight,
          canvasWidth: viewer.scene.canvas.clientWidth,
          terrainProvider:
            viewer.scene.globe?.constructor?.name ?? "EllipsoidTerrainProvider",
        });

        if (viewer.scene.postProcessStages?.fxaa) {
          viewer.scene.postProcessStages.fxaa.enabled = true;
        }

        if (viewer.scene.screenSpaceCameraController) {
          viewer.scene.screenSpaceCameraController.inertiaSpin = 0.92;
          viewer.scene.screenSpaceCameraController.inertiaTranslate = 0.9;
          viewer.scene.screenSpaceCameraController.inertiaZoom = 0.82;
          viewer.scene.screenSpaceCameraController.minimumZoomDistance = 90_000;
          viewer.scene.screenSpaceCameraController.maximumZoomDistance = 95_000_000;
        }

        if (viewer.scene.moon) {
          viewer.scene.moon.show = false;
        }

        if (viewer.scene.sun) {
          viewer.scene.sun.show = true;
        }

        const internalCreditWidget = (
          viewer as unknown as {
            _cesiumWidget?: {
              _creditContainer?: HTMLElement;
              _creditViewport?: HTMLElement;
            };
          }
        )._cesiumWidget;

        if (viewer.cesiumWidget.creditContainer) {
          viewer.cesiumWidget.creditContainer.style.display = "none";
          viewer.cesiumWidget.creditContainer.setAttribute("aria-hidden", "true");
        }

        if (internalCreditWidget?._creditContainer) {
          internalCreditWidget._creditContainer.style.display = "none";
          internalCreditWidget._creditContainer.setAttribute("aria-hidden", "true");
        }

        debugGlobeLog("credits:suppressed", {
          hiddenCreditContainer: Boolean(internalCreditWidget?._creditContainer),
          hiddenViewerCreditContainer: Boolean(viewer.cesiumWidget.creditContainer),
          skippedCreditViewportHide: Boolean(internalCreditWidget?._creditViewport),
        });

        viewer.scene.canvas.style.cursor = DEFAULT_CURSOR;
        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(-24, 18, 23_500_000),
        });

        requestAnimationFrame(() => {
          debugGlobeLog("scene:first-frame", {
            canvasHeight: viewer.scene.canvas.clientHeight,
            canvasWidth: viewer.scene.canvas.clientWidth,
          });
        });

        const disengageFollowMode = () => {
          followModeActiveRef.current = false;
          followModeSatelliteIdRef.current = null;
          viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
        };

        viewer.scene.canvas.addEventListener("pointerdown", disengageFollowMode);
        viewer.scene.canvas.addEventListener("wheel", disengageFollowMode, {
          passive: true,
        });
        viewer.scene.canvas.addEventListener("touchstart", disengageFollowMode, {
          passive: true,
        });

        const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

        handler.setInputAction((event) => {
          const satelliteId = getPickedSatelliteId(
            Cesium,
            viewer,
            event.position,
          );

          if (!satelliteId) {
            return;
          }

          onSelectSatelliteRef.current?.(satelliteId);
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        handler.setInputAction((event) => {
          const satelliteId = getPickedSatelliteId(
            Cesium,
            viewer,
            event.endPosition,
          );

          viewer.scene.canvas.style.cursor = satelliteId
            ? POINTER_CURSOR
            : DEFAULT_CURSOR;

          setHoveredSatelliteId((currentValue) =>
            currentValue === satelliteId ? currentValue : satelliteId,
          );
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

        cesiumRef.current = Cesium;
        viewerRef.current = viewer;
        handlerRef.current = handler;
        setLoadState("ready");
        setLoadMessage("Orbital theatre live");
      } catch (error) {
        console.error(`${GLOBE_DEBUG_PREFIX} init:error`, error);
        if (!cancelled) {
          setLoadState("error");
          setLoadMessage("Cesium failed to load from the CDN.");
        }
      }
    }

    initializeViewer();

    return () => {
      cancelled = true;
      if (followAnimationFrameRef.current !== null) {
        cancelAnimationFrame(followAnimationFrameRef.current);
        followAnimationFrameRef.current = null;
      }
      followModeActiveRef.current = false;
      followModeSatelliteIdRef.current = null;
      handlerRef.current?.destroy?.();
      handlerRef.current = null;

      if (viewerRef.current?.scene?.canvas) {
        viewerRef.current.scene.canvas.style.cursor = "";
      }

      viewerRef.current?.destroy?.();
      viewerRef.current = null;
      cesiumRef.current = null;
    };
  }, []);

  useEffect(() => {
    const tracks = buildSampleOrbitTracks(satellites);
    const nextTrackMap = new Map<string, GlobeSatelliteTrack>();
    const nextTrackOrder: string[] = [];
    const nextOrbitPathCache = new Map<
      string,
      ReturnType<typeof getTrackOrbitPath>
    >();

    tracks.forEach((track) => {
      const satelliteId = track.satellite.satelliteId;
      nextTrackMap.set(satelliteId, track);
      nextTrackOrder.push(satelliteId);
      nextOrbitPathCache.set(satelliteId, getTrackOrbitPath(track));
    });

    trackMapRef.current = nextTrackMap;
    trackOrderRef.current = nextTrackOrder;
    orbitPathCacheRef.current = nextOrbitPathCache;
  }, [satellites]);

  useEffect(() => {
    const Cesium = cesiumRef.current;
    const viewer = viewerRef.current;

    if (!Cesium || !viewer) {
      return;
    }

    if (satellites.length === 0) {
      viewer.entities.removeAll();
      viewer.selectedEntity = undefined;
      return;
    }

    const tracks = trackOrderRef.current
      .map((satelliteId) => trackMapRef.current.get(satelliteId))
      .filter((track): track is GlobeSatelliteTrack => Boolean(track));

    viewer.entities.removeAll();

    tracks.forEach((track) => {
      const emphasis = getTrackEmphasis(
        track.satellite.satelliteId,
        selectedSatelliteId,
        hoveredSatelliteId,
      );
      const cachedOrbitPath =
        orbitPathCacheRef.current.get(track.satellite.satelliteId) ??
        getTrackOrbitPath(track);

      viewer.entities.add(
        createOrbitBaseEntity(
          Cesium,
          track,
          emphasis,
          cachedOrbitPath,
          narrativeMode,
        ),
      );

      const shouldRenderNarrativeTrail =
        emphasis !== "idle" || narrativeMode === "pressure";
      const shouldRenderNarrativeAura =
        emphasis !== "idle" || narrativeMode === "pressure";

      if (shouldRenderNarrativeTrail) {
        viewer.entities.add(
          createOrbitTrailEntity(Cesium, track, emphasis, narrativeMode),
        );
      }

      if (shouldRenderNarrativeAura) {
        viewer.entities.add(
          createSatelliteAuraEntity(Cesium, track, emphasis, narrativeMode),
        );
      }

      viewer.entities.add(
        createSatelliteEntity(Cesium, track, emphasis, narrativeMode),
      );
    });

    viewer.selectedEntity = selectedSatelliteId
      ? viewer.entities.getById(selectedSatelliteId)
      : undefined;
  }, [satellites, selectedSatelliteId, hoveredSatelliteId, narrativeMode]);

  useEffect(() => {
    const Cesium = cesiumRef.current;
    const viewer = viewerRef.current;

    if (!Cesium || !viewer || loadState !== "ready") {
      return;
    }

    if (cameraMode === "overview") {
      lastFocusedSatelliteIdRef.current = null;
      lastCameraCommandKeyRef.current = cameraCommandKey;
      followModeActiveRef.current = false;
      followModeSatelliteIdRef.current = null;
      viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
      viewer.camera.flyTo({
        destination: getOverviewDestination(Cesium, narrativeMode),
        duration: 1.35,
      });
      return;
    }

    if (!cameraTargetSatelliteId) {
      lastFocusedSatelliteIdRef.current = null;
      return;
    }

    if (
      lastFocusedSatelliteIdRef.current === cameraTargetSatelliteId &&
      lastCameraCommandKeyRef.current === cameraCommandKey
    ) {
      return;
    }

    const track = trackMapRef.current.get(cameraTargetSatelliteId);
    const satelliteEntity = viewer.entities.getById(cameraTargetSatelliteId);

    if (!track || !satelliteEntity) {
      return;
    }

    const followOffset = new Cesium.HeadingPitchRange(
      FOLLOW_CAMERA_HEADING_RAD,
      FOLLOW_CAMERA_PITCH_RAD,
      getTrackCameraRangeMeters(track) * 0.72,
    );

    followModeSatelliteIdRef.current = cameraTargetSatelliteId;
    followModeActiveRef.current = false;
    viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
    viewer.camera.flyTo({
      destination: getSatelliteCartesianPosition(
        Cesium,
        track,
        viewer.clock.currentTime,
      ),
      duration: getTrackCameraDurationSeconds(track),
      complete: () => {
        if (followModeSatelliteIdRef.current !== cameraTargetSatelliteId) {
          return;
        }

        followModeActiveRef.current = true;
        viewer.camera.lookAt(
          getSatelliteCartesianPosition(Cesium, track, viewer.clock.currentTime),
          followOffset,
        );
      },
    });

    lastFocusedSatelliteIdRef.current = cameraTargetSatelliteId;
    lastCameraCommandKeyRef.current = cameraCommandKey;
  }, [
    cameraCommandKey,
    cameraMode,
    cameraTargetSatelliteId,
    loadState,
    narrativeMode,
    satellites,
  ]);

  useEffect(() => {
    const Cesium = cesiumRef.current;
    const viewer = viewerRef.current;

    if (!Cesium || !viewer || loadState !== "ready") {
      return;
    }

    let cancelled = false;

    const updateFollowView = () => {
      if (cancelled) {
        return;
      }

      const followSatelliteId = followModeSatelliteIdRef.current;

      if (followModeActiveRef.current && followSatelliteId) {
        const track = trackMapRef.current.get(followSatelliteId);

        if (track) {
          viewer.camera.lookAt(
            getSatelliteCartesianPosition(Cesium, track, viewer.clock.currentTime),
            new Cesium.HeadingPitchRange(
              FOLLOW_CAMERA_HEADING_RAD,
              FOLLOW_CAMERA_PITCH_RAD,
              getTrackCameraRangeMeters(track) * 0.72,
            ),
          );
        }
      }

      followAnimationFrameRef.current = requestAnimationFrame(updateFollowView);
    };

    followAnimationFrameRef.current = requestAnimationFrame(updateFollowView);

    return () => {
      cancelled = true;
      if (followAnimationFrameRef.current !== null) {
        cancelAnimationFrame(followAnimationFrameRef.current);
        followAnimationFrameRef.current = null;
      }
      viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
    };
  }, [loadState, satellites]);

  const showCenterStatus = loadState !== "ready" || satellites.length === 0;

  return (
    <div className="globe-stage globe-stage-live">
      <div
        ref={containerRef}
        className={[
          "globe-canvas",
          loadState === "ready" ? "globe-canvas-ready" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label="Interactive 3D globe showing satellite tracks"
      />

      {showCenterStatus ? (
        <div
          className={[
            "globe-center-status",
            loadState === "error" ? "globe-center-status-error" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <span
            className="globe-status-dot"
            data-state={loadState === "error" ? "error" : "loading"}
          />
          <div>
            <p className="value-label">Scene status</p>
            <p className="value-copy">
              {satellites.length === 0
                ? "No orbital records are available yet."
                : loadMessage}
            </p>
          </div>
        </div>
      ) : null}

    </div>
  );
}

function debugGlobeLog(label: string, payload?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  if (payload) {
    console.info(`${GLOBE_DEBUG_PREFIX} ${label}`, payload);
    return;
  }

  console.info(`${GLOBE_DEBUG_PREFIX} ${label}`);
}

function getPickedSatelliteId(
  Cesium: CesiumRuntime,
  viewer: CesiumViewer,
  position: unknown,
) {
  if (!position) {
    return null;
  }

  const picked = viewer.scene.pick(position);

  if (!Cesium.defined(picked)) {
    return null;
  }

  const pickedEntity = picked?.id;

  if (!pickedEntity) {
    return null;
  }

  const propertySatelliteId = resolveCesiumPropertyValue(
    Cesium,
    pickedEntity.properties?.satelliteId,
    viewer.clock.currentTime,
  );
  const normalizedPropertySatelliteId = normalizePickedSatelliteId(
    propertySatelliteId,
  );

  if (normalizedPropertySatelliteId) {
    return normalizedPropertySatelliteId;
  }

  const normalizedEntityId = normalizePickedSatelliteId(pickedEntity.id);

  if (normalizedEntityId) {
    return normalizedEntityId;
  }

  return null;
}

function resolveCesiumPropertyValue(
  Cesium: CesiumRuntime,
  property: unknown,
  time: unknown,
) {
  if (!property) {
    return undefined;
  }

  const resolvedWithHelper = Cesium.Property?.getValueOrUndefined?.(
    property,
    time,
  );

  if (typeof resolvedWithHelper !== "undefined") {
    return resolvedWithHelper;
  }

  if (
    typeof property === "object" &&
    property !== null &&
    "getValue" in property &&
    typeof property.getValue === "function"
  ) {
    return property.getValue(time);
  }

  return property;
}

function normalizePickedSatelliteId(value: unknown) {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  for (const helperPrefix of ["orbit-", "trail-", "aura-"]) {
    if (value.startsWith(helperPrefix) && value.length > helperPrefix.length) {
      return value.slice(helperPrefix.length);
    }
  }

  return value;
}

function getSatelliteCartesianPosition(
  Cesium: CesiumRuntime,
  track: GlobeSatelliteTrack,
  currentTime: unknown,
) {
  const position = getTrackPosition(track, Cesium.JulianDate.toDate(currentTime));

  return Cesium.Cartesian3.fromDegrees(
    position.longitudeDeg,
    position.latitudeDeg,
    position.altitudeKm * 1_000,
  );
}

function createOrbitBaseEntity(
  Cesium: CesiumRuntime,
  track: GlobeSatelliteTrack,
  emphasis: TrackEmphasis,
  orbitPath: ReturnType<typeof getTrackOrbitPath>,
  narrativeMode: GlobeNarrativeMode,
) {
  const orbitColor = Cesium.Color.fromCssColorString(
    getTrackSignalColor(track.satellite, narrativeMode),
  );
  const pressureSeverity = getPressureSeverity(track.satellite.riskLabel);

  return {
    id: `orbit-${track.satellite.satelliteId}`,
    name: `${track.satellite.displayName} orbit`,
    polyline: {
      material: orbitColor.withAlpha(
        getOrbitAlpha(narrativeMode, emphasis, pressureSeverity),
      ),
      positions: toCartesianPositions(Cesium, orbitPath),
      width: getOrbitWidth(narrativeMode, emphasis, pressureSeverity),
    },
    properties: {
      entityKind: "orbit",
      satelliteId: track.satellite.satelliteId,
    },
  };
}

function createOrbitTrailEntity(
  Cesium: CesiumRuntime,
  track: GlobeSatelliteTrack,
  emphasis: TrackEmphasis,
  narrativeMode: GlobeNarrativeMode,
) {
  const orbitColor = Cesium.Color.fromCssColorString(
    getTrackSignalColor(track.satellite, narrativeMode),
  );
  const pressureSeverity = getPressureSeverity(track.satellite.riskLabel);
  const isSelected = emphasis === "selected";
  const isHovered = emphasis === "hovered";
  const trailPointCount =
    narrativeMode === "pressure"
      ? isSelected
        ? 44
        : 26 + Math.round(pressureSeverity * 12)
      : isSelected
        ? 46
        : 28;
  const trailingOrbitFraction =
    narrativeMode === "pressure"
      ? isSelected
        ? 0.12
        : 0.04 + pressureSeverity * 0.03
      : isSelected
        ? 0.1
        : 0.05;
  const leadingOrbitFraction =
    narrativeMode === "pressure"
      ? isSelected
        ? 0.24
        : 0.08 + pressureSeverity * 0.05
      : isSelected
        ? 0.2
        : 0.11;

  return {
    id: `trail-${track.satellite.satelliteId}`,
    name: `${track.satellite.displayName} active trail`,
    polyline: {
      material: orbitColor.withAlpha(
        getTrailAlpha(narrativeMode, emphasis, pressureSeverity),
      ),
      positions: new Cesium.CallbackProperty((time) => {
        const trajectory = getTrackTrailTrajectory(
          track,
          Cesium.JulianDate.toDate(time),
          trailPointCount,
          trailingOrbitFraction,
          leadingOrbitFraction,
        );

        return toCartesianPositions(Cesium, trajectory);
      }, false),
      width: getTrailWidth(narrativeMode, emphasis, pressureSeverity),
    },
    properties: {
      entityKind: "trail",
      satelliteId: track.satellite.satelliteId,
    },
  };
}

function createSatelliteEntity(
  Cesium: CesiumRuntime,
  track: GlobeSatelliteTrack,
  emphasis: TrackEmphasis,
  narrativeMode: GlobeNarrativeMode,
) {
  const fillColor = Cesium.Color.fromCssColorString(
    getTrackFillColor(track.satellite, narrativeMode),
  );
  const isSelected = emphasis === "selected";
  const isHovered = emphasis === "hovered";
  const pressureSeverity = getPressureSeverity(track.satellite.riskLabel);

  return {
    id: track.satellite.satelliteId,
    label:
      isSelected || isHovered
        ? {
            backgroundColor: Cesium.Color.fromCssColorString("#0b0f14").withAlpha(
              isSelected ? 0.46 : 0.32,
            ),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            fillColor: Cesium.Color.WHITE,
            font: isSelected
              ? "600 11px Inter, sans-serif"
              : "500 10px Inter, sans-serif",
            horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
            outlineColor: Cesium.Color.fromCssColorString("#07111a").withAlpha(0.18),
            outlineWidth: 0,
            pixelOffset: new Cesium.Cartesian2(12, isSelected ? -14 : -8),
            showBackground: true,
            text: getSatelliteLabelText(track, narrativeMode, isSelected),
          }
        : undefined,
    name: track.satellite.displayName,
    point: {
      color: fillColor,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      outlineColor: Cesium.Color.fromCssColorString(
        isSelected
          ? "#f4fbff"
          : isHovered
            ? getTrackSignalColor(track.satellite, narrativeMode)
            : "#04121b",
      ),
      outlineWidth: isSelected ? 2.8 : isHovered ? 2 : 1.3,
      pixelSize: getPointSize(narrativeMode, emphasis, pressureSeverity),
      scaleByDistance: new Cesium.NearFarScalar(
        1_400_000,
        narrativeMode === "pressure" ? 1.36 : 1.32,
        58_000_000,
        narrativeMode === "all" ? 0.44 : 0.48,
      ),
    },
    position: new Cesium.CallbackProperty((time) => {
      const position = getTrackPosition(track, Cesium.JulianDate.toDate(time));

      return Cesium.Cartesian3.fromDegrees(
        position.longitudeDeg,
        position.latitudeDeg,
        position.altitudeKm * 1_000,
      );
    }, false),
    properties: {
      entityKind: "satellite",
      satelliteId: track.satellite.satelliteId,
    },
  };
}

function createSatelliteAuraEntity(
  Cesium: CesiumRuntime,
  track: GlobeSatelliteTrack,
  emphasis: TrackEmphasis,
  narrativeMode: GlobeNarrativeMode,
) {
  const glowColor = Cesium.Color.fromCssColorString(
    getTrackSignalColor(track.satellite, narrativeMode),
  );
  const pressureSeverity = getPressureSeverity(track.satellite.riskLabel);
  const isSelected = emphasis === "selected";
  const isHovered = emphasis === "hovered";
  const pulsePeriodMs =
    narrativeMode === "pressure"
      ? isSelected
        ? 1_750
        : 1_900 - Math.round(pressureSeverity * 350)
      : isSelected
        ? 1_800
        : 1_250;
  const minSize =
    narrativeMode === "pressure"
      ? isSelected
        ? 18
        : 10 + pressureSeverity * 5
      : isSelected
        ? 18
        : 11;
  const maxSize =
    narrativeMode === "pressure"
      ? isSelected
        ? 28
        : minSize + 6 + pressureSeverity * 4
      : isSelected
        ? 28
        : 17;
  const minAlpha =
    narrativeMode === "pressure"
      ? isSelected
        ? 0.14
        : 0.03 + pressureSeverity * 0.035
      : isSelected
        ? 0.14
        : isHovered
          ? 0.05
          : 0.03;
  const maxAlpha =
    narrativeMode === "pressure"
      ? isSelected
        ? 0.22
        : minAlpha + 0.08 + pressureSeverity * 0.03
      : isSelected
        ? 0.22
        : isHovered
          ? 0.11
          : 0.06;

  return {
    id: `aura-${track.satellite.satelliteId}`,
    point: {
      color: new Cesium.CallbackProperty((time) => {
        const pulse = getPulse(Cesium.JulianDate.toDate(time), pulsePeriodMs);
        return glowColor.withAlpha(minAlpha + (maxAlpha - minAlpha) * pulse);
      }, false),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      outlineColor: glowColor.withAlpha(emphasis === "selected" ? 0.18 : 0.1),
      outlineWidth: emphasis === "selected" ? 1.4 : 0.8,
      pixelSize: new Cesium.CallbackProperty((time) => {
        const pulse = getPulse(Cesium.JulianDate.toDate(time), pulsePeriodMs);
        return minSize + (maxSize - minSize) * pulse;
      }, false),
      scaleByDistance: new Cesium.NearFarScalar(1_400_000, 1.26, 58_000_000, 0.5),
    },
    position: new Cesium.CallbackProperty((time) => {
      const position = getTrackPosition(track, Cesium.JulianDate.toDate(time));

      return Cesium.Cartesian3.fromDegrees(
        position.longitudeDeg,
        position.latitudeDeg,
        position.altitudeKm * 1_000,
      );
    }, false),
    properties: {
      entityKind: "aura",
      satelliteId: track.satellite.satelliteId,
    },
  };
}

function getTrackSignalColor(
  satellite: EnrichedSatelliteRecord,
  narrativeMode: GlobeNarrativeMode,
) {
  if (narrativeMode === "lanes") {
    return ORBIT_LANE_COLORS[satellite.orbitClass] ?? satellite.highlightColor;
  }

  if (narrativeMode === "pressure") {
    return PRESSURE_COLORS[satellite.riskLabel] ?? satellite.highlightColor;
  }

  return NEUTRAL_TRACK_COLOR;
}

function getTrackFillColor(
  satellite: EnrichedSatelliteRecord,
  narrativeMode: GlobeNarrativeMode,
) {
  if (narrativeMode === "all") {
    return NEUTRAL_TRACK_COLOR;
  }

  return getTrackSignalColor(satellite, narrativeMode);
}

function getPressureSeverity(riskLabel: SatelliteRiskLabel) {
  if (riskLabel === "Critical") {
    return 1;
  }

  if (riskLabel === "Elevated") {
    return 0.88;
  }

  if (riskLabel === "Moderate") {
    return 0.58;
  }

  return 0.26;
}

function getOrbitAlpha(
  narrativeMode: GlobeNarrativeMode,
  emphasis: TrackEmphasis,
  pressureSeverity: number,
) {
  if (emphasis === "selected") {
    return narrativeMode === "all" ? 0.22 : 0.34;
  }

  if (emphasis === "hovered") {
    return narrativeMode === "all" ? 0.14 : 0.22;
  }

  if (narrativeMode === "lanes") {
    return 0.14;
  }

  if (narrativeMode === "pressure") {
    return 0.05 + pressureSeverity * 0.12;
  }

  return 0.05;
}

function getOrbitWidth(
  narrativeMode: GlobeNarrativeMode,
  emphasis: TrackEmphasis,
  pressureSeverity: number,
) {
  if (emphasis === "selected") {
    return narrativeMode === "all" ? 1.55 : 2;
  }

  if (emphasis === "hovered") {
    return narrativeMode === "all" ? 1.15 : 1.55;
  }

  if (narrativeMode === "lanes") {
    return 1.4;
  }

  if (narrativeMode === "pressure") {
    return 0.95 + pressureSeverity * 0.7;
  }

  return 0.9;
}

function getTrailAlpha(
  narrativeMode: GlobeNarrativeMode,
  emphasis: TrackEmphasis,
  pressureSeverity: number,
) {
  if (emphasis === "selected") {
    return 0.7;
  }

  if (emphasis === "hovered") {
    return 0.46;
  }

  if (narrativeMode === "pressure") {
    return 0.16 + pressureSeverity * 0.18;
  }

  return 0.42;
}

function getTrailWidth(
  narrativeMode: GlobeNarrativeMode,
  emphasis: TrackEmphasis,
  pressureSeverity: number,
) {
  if (emphasis === "selected") {
    return 2.35;
  }

  if (emphasis === "hovered") {
    return 1.7;
  }

  if (narrativeMode === "pressure") {
    return 1.1 + pressureSeverity * 0.8;
  }

  return 1.55;
}

function getPointSize(
  narrativeMode: GlobeNarrativeMode,
  emphasis: TrackEmphasis,
  pressureSeverity: number,
) {
  if (emphasis === "selected") {
    return 12.8;
  }

  if (emphasis === "hovered") {
    return 10.1;
  }

  if (narrativeMode === "lanes") {
    return 9.2;
  }

  if (narrativeMode === "pressure") {
    return 8.2 + pressureSeverity * 2.4;
  }

  return 7.8;
}

function getSatelliteLabelText(
  track: GlobeSatelliteTrack,
  narrativeMode: GlobeNarrativeMode,
  isSelected: boolean,
) {
  if (!isSelected) {
    return track.satellite.displayName;
  }

  if (narrativeMode === "lanes") {
    return `${track.satellite.displayName} · ${track.satellite.orbitClass}`;
  }

  if (narrativeMode === "pressure") {
    return `${track.satellite.displayName} · ${normalizePressureLabel(
      track.satellite.riskLabel,
    )}`;
  }

  return track.satellite.displayName;
}

function normalizePressureLabel(riskLabel: SatelliteRiskLabel) {
  if (riskLabel === "Critical" || riskLabel === "Elevated") {
    return "high pressure";
  }

  if (riskLabel === "Moderate") {
    return "moderate pressure";
  }

  return "low pressure";
}

function getOverviewDestination(
  Cesium: CesiumRuntime,
  narrativeMode: GlobeNarrativeMode,
) {
  if (narrativeMode === "lanes") {
    return Cesium.Cartesian3.fromDegrees(-16, 22, 24_500_000);
  }

  if (narrativeMode === "pressure") {
    return Cesium.Cartesian3.fromDegrees(-10, 18, 24_000_000);
  }

  return Cesium.Cartesian3.fromDegrees(-24, 18, 23_500_000);
}

function getTrackEmphasis(
  satelliteId: string,
  selectedSatelliteId: string | null,
  hoveredSatelliteId: string | null,
): TrackEmphasis {
  if (satelliteId === selectedSatelliteId) {
    return "selected";
  }

  if (satelliteId === hoveredSatelliteId) {
    return "hovered";
  }

  return "idle";
}

function toCartesianPositions(
  Cesium: CesiumRuntime,
  trajectory: Array<{
    latitudeDeg: number;
    longitudeDeg: number;
    altitudeKm: number;
  }>,
) {
  return trajectory.map((point) =>
    Cesium.Cartesian3.fromDegrees(
      point.longitudeDeg,
      point.latitudeDeg,
      point.altitudeKm * 1_000,
    ),
  );
}

function getPulse(timestamp: Date, periodMs: number) {
  return (Math.sin((timestamp.getTime() / periodMs) * Math.PI * 2) + 1) / 2;
}
