# UAE Open Intelligence Platform — v0.1.0 (Public Preview)

> **EN:** _All of the UAE's open data, as one intelligence._
> **AR:** _كل بيانات الإمارات المفتوحة، ذكاءً واحدًا._

An Arabic-first, open-source platform that turns the UAE's open data into a unified observatory, analytics, an interactive knowledge graph, and ready-to-use APIs. This is the first public preview — server-rendered, no-build, MIT-licensed.

---

## ✨ Highlights

- **One unified observatory** across **192 records**: **106** innovation projects · **36** free zones (all 7 emirates) · **10** AI skills + adoption-observatory KPIs · **28** curated heritage items · **12** macro economic indicators · a **6-dataset** catalogue.
- **Arabic-first, RTL-native** with bilingual `ar`/`en` data fields, dark + light themes, and a `⌘K` command palette.
- **Interactive force-directed knowledge graph** — **209 nodes / 306 edges**, with zoom, pan, and filter.
- **16 REST endpoints** under `/api/v1` with a standard `{ ok, data, error, meta }` envelope, pagination, filtering, a 240 req/min rate limiter, and CSV/JSON exports per dataset.
- **No-build, server-rendered** stack — **no React/Vue/Angular**: Hono + TypeScript, HTMX, Alpine.js, Chart.js, Leaflet, `node:sqlite` (built-in, zero native deps).
- **Source-labelled & confidence-scored (0–1)** datasets — prototype/estimate figures are clearly marked.
- **Verified quality** (Lighthouse headless): public landing **100/100/100/100** (Performance / Accessibility / Best-Practices / SEO); chart-heavy pages ≈ **93** Performance / 100 / 100 / 100. Type-checked (0 errors), **33/33** route + export smoke tests pass.
- **Open source** — MIT (code) / CC BY 4.0 (data).

---

## 📸 Screenshots

<sub>📌 The relative paths below render when viewing this file in the repo. In the **GitHub Release editor**, drag-and-drop the PNGs from `docs/screenshots/` (GitHub uploads them and rewrites the URLs), or swap in `https://raw.githubusercontent.com/<your-org>/uae-open-intelligence/main/docs/screenshots/<file>.png`.</sub>

| | | |
|---|---|---|
| ![Landing](../docs/screenshots/landing.png) | ![Dashboard](../docs/screenshots/dashboard.png) | ![Knowledge graph](../docs/screenshots/knowledge-graph.png) |
| **Public landing** | **Executive dashboard** | **Knowledge graph** |
| ![Innovation detail](../docs/screenshots/innovation-detail.png) | ![Culture](../docs/screenshots/culture.png) | ![API hub](../docs/screenshots/api-hub.png) |
| **Innovation detail** | **Culture & heritage** | **API hub** |

---

## 📦 What's inside

**Observatories**
- Innovation projects, free zones, AI skills + adoption KPIs, culture & heritage, and macro economic indicators — unified under one platform.
- A 6-dataset catalogue, each entry source-labelled and confidence-scored (0–1).
- 14 routes: `/` (public landing), `/home`, `/about`, `/dashboard`, `/datasets` (+ `/:id`), `/free-zones` (+ `/:id`), `/innovation` (+ `/:id`), `/skills`, `/culture`, `/knowledge-graph`, `/reports`, `/api-hub`, `/settings`.

**Analytics & visualization**
- Interactive force-directed knowledge graph (209 nodes / 306 edges) with zoom, pan, and filter.
- Leaflet heritage map, score radars, and a skills heatmap.
- Executive dashboard and print/PDF-ready reports.

**API & exports**
- 16 REST endpoints under `/api/v1` with the standard `{ ok, data, error, meta }` envelope.
- Pagination, filtering, and a 240 req/min rate limiter.
- CSV / JSON / Print export available everywhere — everything in the platform is reachable via the open API.

**Platform**
- Arabic-first, RTL-native with bilingual `ar`/`en` data fields.
- Dark + light themes and a `⌘K` command palette.
- No-build, server-rendered: Hono + TypeScript, HTMX, Alpine.js, Chart.js, Leaflet, `node:sqlite` (built-in, zero native deps).
- Self-contained `build-db` (rebuilds the DB from a committed JSON export) and a Dockerfile.

---

## 🚀 Install

Requires **Node ≥ 20** (recommended ≥ 22.5). No compiler or native build step.

```bash
git clone https://github.com/<your-org>/uae-open-intelligence
cd uae-open-intelligence
npm install
npm run build-db      # rebuilds data/uae.db from the committed JSON export (self-contained)
npm start             # → http://localhost:3000
# one-liner: npm run demo   (build-db + start)
```

**Docker**

```bash
docker build -t uae-oi .
docker run -d -p 3000:3000 uae-oi
```

---

## 🔌 API

The platform exposes **16 REST endpoints** under `/api/v1`, each returning the standard `{ ok, data, error, meta }` envelope with pagination, filtering, and per-dataset CSV/JSON exports.

```bash
curl "http://localhost:3000/api/v1/free-zones?page=1&limit=50"
```

```json
{
  "ok": true,
  "data": [],
  "error": null,
  "meta": { "page": 1, "limit": 50, "total": 36, "has_more": false }
}
```

A 240 req/min rate limiter applies per instance. See the in-app **API hub** (`/api-hub`) to explore every endpoint.

---

## ⚠️ Known limitations

This is a public preview. We mark what's indicative so you don't have to guess:

- **AI-observatory indicators are prototype figures** — clearly labelled, not yet verified against published sources.
- **Free-zone costs are indicative**, not quotes — verify pricing with the relevant authority before relying on it.
- **Heritage is a curated 28-item sample**, not an exhaustive catalogue.
- **Sector classification is automatic** (keyword-based) and may misclassify edge cases.
- **The rate limiter is in-memory and per-instance** — it does not coordinate across multiple instances.
- **No Sankey / treemap visualizations yet** (planned — needs a dedicated viz library).
- **Point-in-time snapshot, no time-series** — data reflects a single point in time; trend deltas arrive once historical snapshots accumulate.

Always verify critical figures with official sources.

---

## 🗺️ What's next (roadmap)

- **v0.2.0 — Depth & coverage:** expanded free-zone pricing with per-activity packages and last-verified dates, de-prototyped AI indicators verified against sources, project ⇄ free-zone ⇄ skill cross-links on detail pages, shareable filtered URLs, and per-emirate slices.
- **v0.3.0 — Intelligence layer:** a context-aware AI assistant (route/entity/filter-aware) backed by a server-side tool registry, natural-language → API query translation, and trend deltas once snapshots accumulate.
- **Later:** a public data-contribution & correction workflow, OpenAPI 3 spec generation from the route catalogue, Sankey/treemap visualizations, an English UI toggle, and a scheduled re-seed pipeline with provenance/version history.

Full details in [ROADMAP.md](../ROADMAP.md).

---

## 📜 License

- **Code:** MIT.
- **Data:** CC BY 4.0 — aggregated/curated from public sources (UNESCO ICH/WHS, DCT, u.ae, IMF, UNCTAD, Ministry of Economy, FCSC) for research and education.

**Attribution note:** when reusing the data, credit the original public sources above. The platform's curation, scoring, and structuring are provided under CC BY 4.0 — please verify critical figures with official sources.
