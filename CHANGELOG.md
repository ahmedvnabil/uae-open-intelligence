# Changelog

All notable changes to this project are documented here. Format based on
[Keep a Changelog](https://keepachangelog.com/); versioning is semantic.

## [0.1.0] — 2026-06-15 — Public preview

### Added (polish sprint)
- **Public marketing landing** at `/` (full-width chrome, hero, value props, observatories, how-it-works, data/methodology, CTA) and an **About / Methodology** page (`/about`) documenting sources, the 0–1 confidence scoring, and limitations.
- **Exports:** CSV / JSON downloads for every dataset via `/api/v1/export/<resource>.(csv|json)` (UTF-8 BOM, filter-aware), plus per-page CSV/JSON/Print export bars.
- **Three interaction states** everywhere: empty / loading (`spinner`) / error blocks; charts, map and the force-graph now fail gracefully into an error state.
- **Shared components:** `filterBar`, `exportButtons`, `loadingState`, `errorState`, `safeUrl`, `jsonScript`; unified filter/card/table styling; navigation progress bar.
- **Accessibility:** chart/canvas/graph ARIA, menu `aria-expanded`, `.reveal` no-JS fallback, AA contrast fixes.
- **Release docs:** README badges + screenshots + known limitations, ROADMAP.md, DEPLOYMENT.md, version `0.1.0`.

### Changed
- `/` is now the public landing; the in-app overview moved to `/home`. Navigation and the smoke test were updated accordingly.
- Fonts load via `<link>` (was render-blocking `@import`); API Hub live tester fixed for `:id` endpoints.

### Added (initial build)
- **Platform foundation:** Hono + TypeScript server (server-rendered, no build step), `node:sqlite` data layer, bespoke RTL-native design system, command palette (`⌘K`), dark/light themes.
- **Data layer:** seed pipeline normalizing 5 source domains into a single SQLite database + portable JSON exports — 106 innovation projects, 36 free zones, 12 macro indicators, 10 AI skills, 28 curated heritage items, a 6-dataset catalogue, and a generated knowledge graph (209 nodes / 306 edges).
- **Pages:** Home, Dashboard, Data Observatory (+ dataset detail), Free Zone Explorer (+ detail & comparator), Innovation Projects Explorer (+ detail with score radar), AI Skills Observatory (heatmap + gap analysis), Culture & Heritage Explorer (Leaflet map), Knowledge Graph (interactive force-directed canvas), Reports Center (print/PDF-ready), API Hub (live tester), Settings/About.
- **API:** 16 REST endpoints under `/api/v1` with a standard `{ok,data,error,meta}` envelope, pagination, filtering, unified search, security headers and a 240 req/min rate limiter.
- **Visualization:** Chart.js theming (line/bar/doughnut/radar), CSS heatmap, Leaflet geo map, custom force-directed knowledge graph.
- **Docs:** README, APIs.md, ARCHITECTURE.md, CONTRIBUTING, LICENSE (MIT code / CC BY 4.0 data).

### Data sources
Curated/aggregated from public references — every record is source-labelled and confidence-scored (0–1). Verify critical figures against official sources.

[1.0.0]: #
