---
name: b4g-globe-thread
description: Use when implementing globe-specific features in b4gspring2026, including the interactive 3D Earth, satellites, orbit motion, highlighting, and globe-related components only.
---

# b4gspring2026 Globe Thread

## Purpose
Use this skill for the interactive 3D Earth portion of `b4gspring2026`.

## Scope
Own only:
- 3D Earth rendering
- satellite markers or meshes
- orbit and trajectory rendering
- animation and motion timing
- hover, focus, and highlight behavior on the globe
- globe-specific camera, scene, material, and interaction components

NASA SSC REST API is the source for position and trajectory inputs.
This thread may read enriched local JSON only to consume display attributes already defined elsewhere, such as rating color or company badge text.

## Edit Boundaries
May edit:
- `src/components/globe/**`
- globe-specific utilities under `src/lib/nasa/**` when needed for position or trajectory transforms
- shared types in `src/types/**` only when required for globe integration
- page wiring in `src/app/**` or `app/**` only when connecting globe events to shared selection state

May not edit:
- `src/components/sidebar/**`
- `src/data/enriched/**`
- sidebar filtering, ratings logic, or selected-satellite detail composition outside minimal integration hooks

## Implementation Rules
- Optimize for smooth, legible motion over visual noise.
- Treat NASA SSC REST API data as authoritative for orbital position and pathing.
- Keep orbit rendering and highlight logic globe-local unless the data must be shared.
- Expose simple callbacks and typed props for selection and hover state instead of reaching into sidebar code.
- Do not introduce mock orbital behavior if NASA-backed trajectory data is available.

## Success Criteria
- the Earth is interactive and readable
- satellites move or animate consistently
- orbit paths and current focus are visually obvious
- globe selection can drive shared selected-satellite state without owning sidebar UI
