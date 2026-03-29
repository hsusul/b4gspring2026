"use client";

import { useEffect, useState } from "react";

import { GlobeViewport } from "../components/globe";
import { SatelliteDetailPanel } from "../components/panels";
import { SatelliteSidebar } from "../components/sidebar";
import {
  filterSatellites,
  getSatelliteComparisonSnapshot,
  getSatelliteFilterOptions,
  type SidebarFilters,
} from "../lib/data/sidebar";
import { resolveSelectedSatellite } from "../lib/data/selection";
import type { EnrichedSatelliteRecord } from "../types";

interface SatelliteWorkspaceProps {
  satellites: EnrichedSatelliteRecord[];
}

const DEFAULT_FILTERS: SidebarFilters = {
  rating: "All",
  risk: "All",
  orbit: "All",
};

export function SatelliteWorkspace({ satellites }: SatelliteWorkspaceProps) {
  const [filters, setFilters] = useState<SidebarFilters>(DEFAULT_FILTERS);
  const [selectedSatelliteId, setSelectedSatelliteId] = useState<string | null>(
    satellites[0]?.satelliteId ?? null,
  );

  const filteredSatellites = filterSatellites(satellites, "", filters);
  const filterOptions = getSatelliteFilterOptions(satellites);

  const selectedSatellite = resolveSelectedSatellite(
    filteredSatellites,
    selectedSatelliteId,
  );
  const activeSelectedSatelliteId = selectedSatellite?.satelliteId ?? null;
  const comparisonSnapshot = getSatelliteComparisonSnapshot(
    filteredSatellites,
    activeSelectedSatelliteId,
  );

  useEffect(() => {
    if (filteredSatellites.length === 0) {
      if (selectedSatelliteId !== null) {
        setSelectedSatelliteId(null);
      }
      return;
    }

    const selectedSatelliteStillVisible = filteredSatellites.some(
      (satellite) => satellite.satelliteId === selectedSatelliteId,
    );

    if (!selectedSatelliteStillVisible) {
      setSelectedSatelliteId(filteredSatellites[0].satelliteId);
    }
  }, [filteredSatellites, selectedSatelliteId]);

  return (
    <section className="workspace-grid" aria-label="Satellite workspace layout">
      <aside className="workspace-column">
        <SatelliteSidebar
          satellites={filteredSatellites}
          filters={filters}
          filterOptions={filterOptions}
          selectedSatelliteId={activeSelectedSatelliteId}
          onFiltersChange={setFilters}
          onSelectSatellite={setSelectedSatelliteId}
        />
      </aside>

      <section className="workspace-column workspace-column-center">
        <GlobeViewport
          cameraCommandKey={0}
          cameraMode="follow"
          cameraTargetSatelliteId={activeSelectedSatelliteId}
          narrativeMode="all"
          satellites={filteredSatellites}
          selectedSatelliteId={activeSelectedSatelliteId}
          onSelectSatellite={setSelectedSatelliteId}
        />
      </section>

      <aside className="workspace-column">
        <SatelliteDetailPanel
          satellite={selectedSatellite}
          comparisonSnapshot={comparisonSnapshot}
        />
      </aside>
    </section>
  );
}
