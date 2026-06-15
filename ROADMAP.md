# Roadmap

Status of the UAE Open Intelligence Platform and what's planned. Community input welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).

## ✅ v0.1.0 — Public preview (current)
- Five unified data observatories (innovation, free zones, AI skills, culture, macro) + dataset catalogue.
- Public marketing landing, executive dashboard, About/Methodology page.
- Interactive knowledge graph (force-directed canvas), Leaflet heritage map, score radars, skills heatmap.
- 16 REST endpoints (`/api/v1`) with standard envelope, pagination, rate-limiting.
- CSV / JSON / Print export for every dataset.
- Arabic-first RTL, dark + light themes, command palette, bilingual data fields.
- Empty / loading / error states; accessibility & security passes; self-contained `build-db` + Dockerfile.

## 🔜 v0.2.0 — Depth & coverage
- [ ] Expand free-zone pricing with per-activity packages and last-verified dates.
- [ ] Verify and de-prototype the AI observatory indicators against published sources.
- [ ] Project ⇄ free-zone ⇄ skill cross-links surfaced on detail pages.
- [ ] Saved views / shareable filtered URLs with copy-link.
- [ ] Per-emirate landing slices.

## 🌅 v0.3.0 — Intelligence layer
- [ ] Context-aware AI assistant (route/entity/filter-aware) over the data, server-side tool registry.
- [ ] Natural-language → API query translation.
- [ ] Trend deltas over time once historical snapshots accumulate.

## 🧭 Later
- [ ] Public data-contribution & correction workflow (issue templates → review).
- [ ] OpenAPI 3 spec generation from the route catalogue.
- [ ] Sankey / treemap visualizations (needs a dedicated viz lib).
- [ ] i18n English UI toggle (data is already bilingual).
- [ ] Scheduled re-seed pipeline + provenance/version history per record.

## Non-goals
- No heavy SPA framework (React/Vue/Angular) — the platform stays server-rendered.
- No paywalled data — all datasets remain CC BY 4.0.
