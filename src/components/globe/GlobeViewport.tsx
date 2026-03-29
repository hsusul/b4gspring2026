"use client";

import type {
  EnrichedSatelliteRecord,
  GlobeCameraMode,
  GlobeNarrativeMode,
} from "../../types";
import { CesiumGlobeCanvas } from "./CesiumGlobeCanvas";

interface GlobeViewportProps {
  cameraCommandKey: number;
  cameraMode: GlobeCameraMode;
  cameraTargetSatelliteId: string | null;
  narrativeMode: GlobeNarrativeMode;
  satellites: EnrichedSatelliteRecord[];
  selectedSatelliteId: string | null;
  onSelectSatellite: (satelliteId: string) => void;
}

export function GlobeViewport({
  cameraCommandKey,
  cameraMode,
  cameraTargetSatelliteId,
  narrativeMode,
  satellites,
  selectedSatelliteId,
  onSelectSatellite,
}: GlobeViewportProps) {
  return (
    <section className="globe-dashboard-panel" aria-label="Orbital theatre">
      <CesiumGlobeCanvas
        cameraCommandKey={cameraCommandKey}
        cameraMode={cameraMode}
        cameraTargetSatelliteId={cameraTargetSatelliteId}
        narrativeMode={narrativeMode}
        satellites={satellites}
        selectedSatelliteId={selectedSatelliteId}
        onSelectSatellite={onSelectSatellite}
      />
      <div className="globe-attribution-corner" aria-label="Map and data attribution">
        <span className="globe-attribution-text">Data © Cesium ion</span>
      </div>
    </section>
  );
}
