---
name: b4g-sidebar-thread
description: Use when implementing sidebar-specific features in b4gspring2026, including the satellite list, filters, rating UI, selected satellite detail panel, and mock or enriched metadata only.
---

# b4gspring2026 Sidebar Thread

## Purpose
Use this skill for the sidebar and metadata experience in `b4gspring2026`.

## Scope
Own only:
- satellite list and row presentation
- search, sort, and filter controls
- rating UI and rating legends
- selected satellite detail panel
- merge and display of enriched local JSON metadata
- mock data shaping used for sidebar-only development

Local enriched JSON is the source of truth for ratings, company metadata, tags, and similar annotations.
NASA SSC REST API data may be consumed for identifiers, names, timestamps, and trajectory-derived facts already fetched elsewhere, but this thread does not own orbital rendering.

## Edit Boundaries
May edit:
- `src/components/sidebar/**`
- `src/data/enriched/**`
- sidebar-focused merge helpers under `src/lib/data/**`
- shared types in `src/types/**` only when required for sidebar integration
- page wiring in `src/app/**` or `app/**` only when connecting list selection and filters to shared state

May not edit:
- `src/components/globe/**`
- globe camera, rendering, orbit motion, or highlight code
- NASA trajectory transform logic except for lightweight typing needs

## Implementation Rules
- Optimize for fast scanning, filtering, and detail lookup.
- Keep ratings and company metadata in local JSON, not hardcoded inside components.
- Build sidebar components around stable satellite IDs so selection stays synchronized with the globe.
- Treat mock data as a development fallback that mirrors the enriched JSON schema.
- Do not add globe-specific behavior beyond emitting selection or hover intents through shared state.

## Success Criteria
- the list is easy to scan
- filters and ratings feel coherent
- the selected satellite panel is information-dense without clutter
- sidebar state can drive or reflect shared selected-satellite state without owning globe rendering
