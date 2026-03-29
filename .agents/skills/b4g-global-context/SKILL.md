---
name: b4g-global-context
description: Use when working anywhere in b4gspring2026. Defines the product concept, design goals, folder ownership, data-source assumptions, and cross-thread constraints for the globe and sidebar workstreams.
---

# b4gspring2026 Global Context

## Purpose
Use this skill as the shared context for all work in `b4gspring2026`.

## Project Concept
`b4gspring2026` is a satellite-tracking experience built around two coordinated surfaces:
- an interactive 3D Earth with orbiting satellites and trajectory emphasis
- a data-rich sidebar for filtering, rating, and inspecting satellites

NASA SSC REST API is the source of truth for satellite position and trajectory data.
Local enriched JSON is the source of truth for ratings, operator/company metadata, tags, and other UI-only annotations.

## Design Goals
- feel like a polished mission-control demo, not a generic dashboard
- keep globe motion smooth, readable, and visually trustworthy
- keep sidebar scanning fast, dense, and immediately useful
- make globe state and sidebar state stay in sync through shared IDs
- separate raw NASA data from enriched local metadata

## Default Folder Structure
Prefer this layout unless the repo already defines a stricter one:
- `src/app` or `app` for routes and page shells
- `src/components/globe` for Earth, satellites, orbits, highlights, and scene helpers
- `src/components/sidebar` for list, filters, ratings UI, and selected-satellite panels
- `src/lib/nasa` for NASA SSC REST API clients, transforms, and caching helpers
- `src/lib/data` for enriched JSON loading and merge helpers
- `src/data/enriched` for local JSON with ratings and company metadata
- `src/types` for shared satellite and enrichment types

## Data Rules
- Do not invent orbital math if NASA SSC REST API already provides usable position or trajectory data.
- Keep NASA response models separate from enriched local metadata models, then merge by stable satellite ID.
- Ratings, company metadata, and qualitative labels must come from local JSON, not NASA payloads.

## Thread Boundaries
- Globe work should be handled with `b4g-globe-thread`.
- Sidebar work should be handled with `b4g-sidebar-thread`.
- Shared types, merge helpers, and page-level state wiring may be edited by either thread only when necessary for integration.

## Shared Edit Surface
May edit:
- `src/app/**` or `app/**` for page composition and thread integration
- `src/lib/nasa/**`
- `src/lib/data/**`
- `src/types/**`

May not edit when a specialized thread owns the work:
- globe-specific scene and rendering files under `src/components/globe/**`
- sidebar-specific list and detail files under `src/components/sidebar/**`

## Coordination Rules
- Keep a single selected-satellite source of truth.
- Use stable IDs across NASA data, enriched JSON, globe highlights, and sidebar selection.
- Do not move globe-only logic into sidebar files or sidebar-only logic into globe files.
- When uncertain, keep shared logic in `src/lib` or `src/types`, not in UI components.
