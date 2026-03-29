import type { EnrichedSatelliteRecord } from "../../types";
import {
  ALL_FILTER_VALUE,
  getActiveFilterCount,
  type SatelliteFilterOptions,
  type SidebarFilters,
} from "../../lib/data";
import { PanelFrame } from "../ui";
import { SatelliteFilterGroup } from "./SatelliteFilterGroup";
import { SatelliteListItem } from "./SatelliteListItem";
import styles from "./sidebar.module.css";

interface SatelliteSidebarProps {
  satellites: EnrichedSatelliteRecord[];
  filters: SidebarFilters;
  filterOptions: SatelliteFilterOptions;
  selectedSatelliteId: string | null;
  onFiltersChange: (filters: SidebarFilters) => void;
  onSelectSatellite: (satelliteId: string) => void;
}

export function SatelliteSidebar({
  satellites,
  filters,
  filterOptions,
  selectedSatelliteId,
  onFiltersChange,
  onSelectSatellite,
}: SatelliteSidebarProps) {
  const activeFilterCount = getActiveFilterCount(filters);
  const hasScopedView = activeFilterCount > 0;
  const activeContext = [
    filters.rating !== ALL_FILTER_VALUE ? `Rating ${filters.rating}` : null,
    filters.risk !== ALL_FILTER_VALUE ? `Risk ${filters.risk}` : null,
    filters.orbit !== ALL_FILTER_VALUE ? `Orbit ${filters.orbit}` : null,
  ].filter(Boolean) as string[];

  return (
    <PanelFrame
      title="Fleet Queue"
      description={undefined}
      className={styles.frame}
    >
      <section className={styles.controlCard}>
        <div className={styles.filterStack}>
          {hasScopedView ? (
            <div className={styles.filterHeader}>
              <button
                type="button"
                className={styles.clearButton}
                onClick={() => {
                  onFiltersChange({
                    rating: ALL_FILTER_VALUE,
                    risk: ALL_FILTER_VALUE,
                    orbit: ALL_FILTER_VALUE,
                  });
                }}
              >
                Clear filters
              </button>
            </div>
          ) : null}

          <div className={styles.filterGrid} aria-label="Fleet comparison filters">
            <SatelliteFilterGroup
              label="Rating"
              options={filterOptions.ratings}
              selectedValue={filters.rating}
              onChange={(rating) => onFiltersChange({ ...filters, rating })}
            />
            <SatelliteFilterGroup
              label="Risk"
              options={filterOptions.risks}
              selectedValue={filters.risk}
              onChange={(risk) => onFiltersChange({ ...filters, risk })}
            />
            <SatelliteFilterGroup
              label="Orbit"
              options={filterOptions.orbits}
              selectedValue={filters.orbit}
              onChange={(orbit) => onFiltersChange({ ...filters, orbit })}
            />
          </div>
        </div>
      </section>

      {activeContext.length > 0 ? (
        <div className={styles.contextRow} aria-label="Active search and filters">
          {activeContext.map((context) => (
            <span className={styles.contextText} key={context}>
              {context}
            </span>
          ))}
        </div>
      ) : null}

      <div className={styles.list} role="list" aria-label="Satellite list">
        {satellites.length > 0 ? (
          satellites.map((satellite, index) => (
            <SatelliteListItem
              key={satellite.satelliteId}
              satellite={satellite}
              rank={index + 1}
              selected={satellite.satelliteId === selectedSatelliteId}
              onSelect={onSelectSatellite}
            />
          ))
        ) : (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>No satellites match this view.</p>
            <p className={styles.emptyCopy}>
              The current search and filter combination removes every record from
              the queue.
            </p>
            {activeContext.length > 0 ? (
              <div className={styles.contextRow}>
                {activeContext.map((context) => (
                  <span className={styles.contextText} key={context}>
                    {context}
                  </span>
                ))}
              </div>
            ) : null}
            {hasScopedView ? (
              <button
                type="button"
                className={styles.emptyResetButton}
                onClick={() => {
                  onFiltersChange({
                    rating: ALL_FILTER_VALUE,
                    risk: ALL_FILTER_VALUE,
                    orbit: ALL_FILTER_VALUE,
                  });
                }}
              >
                Restore full fleet
              </button>
            ) : null}
          </div>
        )}
      </div>
    </PanelFrame>
  );
}
