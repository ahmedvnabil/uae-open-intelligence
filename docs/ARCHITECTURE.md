# Architecture

## Overview

The UAE Open Intelligence Platform is a **server-rendered monolith** built on Hono (TypeScript) running on Node via `@hono/node-server`. There is **no client framework and no build step**: pages are produced as HTML template strings, styled by one bespoke CSS design system, and progressively enhanced with vanilla JS, Alpine.js, HTMX, Chart.js and Leaflet (all vendored locally).

```
                ┌─────────────────────────────────────────────┐
   Browser ───► │  Hono app (src/server.ts)                   │
                │   • security headers (CSP, nosniff, …)      │
                │   • API rate limiter (240/min)              │
                │   • static assets (/static, /img)           │
                │                                             │
                │   ┌── pages (src/pages/*.ts) ──► layout()   │
   HTML ◄───────┤   │     return LayoutOpts {body,bodyEnd…}   │
                │   └── /api/v1/* (src/routes/api.ts)         │
   JSON ◄───────┤         {ok,data,error,meta} envelope       │
                │                                             │
                │   data layer (src/lib/db.ts) ──► node:sqlite│
                └────────────────────┬────────────────────────┘
                                     │ read-only
                              data/uae.db  ◄── scripts/seed.ts ◄── source datasets
```

## Layers

### 1. Data ingestion — `scripts/seed.ts`
Reads the five source domains (sibling app folders + a curated `culture.seed.json`), normalizes them (text coercion, sector classification via Arabic keyword rules, emirate detection, score aggregation), generates a knowledge graph (Emirates ⇄ Free Zones ⇄ Sectors ⇄ Projects + skill domains), and writes:
- `data/uae.db` — the runtime SQLite database (tables: `projects, freezones, macro, skills, culture, datasets, graph_nodes, graph_edges`, with indexes).
- `data/export/*.json` — portable normalized JSON (also the public data export).

Run with `npm run seed`. Idempotent — drops and rebuilds.

### 2. Data access — `src/lib/db.ts`
The **single contract** between data and presentation. Opens `data/uae.db` read-only and exposes typed query functions (`getProjects`, `getFreeZones`, `getSkills`, `getCulture`, `getGraph`, `globalSearch`, `platformStats`, facets, …). Nested/config-shaped data (observatory snapshot, culture/stats meta) is loaded from the JSON export. JSON columns (`sectors`, `tags`, `categories`, `fields`, `meta`) are parsed on read. All list queries support filtering + pagination.

### 3. Presentation — `src/lib/layout.ts` + `src/pages/*.ts`
- `layout(opts)` renders the page shell: `<html dir="rtl">`, head (fonts, CSS, meta/OG), sidebar (driven by `NAV` with live counts), glass topbar (command palette, theme), main content, footer, command-palette markup, and the deferred script chain (htmx → chart.js → leaflet → app.js → alpine).
- Each page module exports a function returning `LayoutOpts { title, active, body, bodyEnd?, head?, useCharts?, useLeaflet?, description? }`. `body` is the inner HTML; page-specific CSS goes in `head`, page JS in `bodyEnd`.
- Shared render helpers live in `src/lib/ui.ts` (KPI cards, badges, score bars, section/page headers, pagination, confidence meters) and `src/lib/icons.ts` (inline Lucide-style SVG).

### 4. API — `src/routes/api.ts`
16 endpoints under `/api/v1`, all using the `{ok,data,error,meta}` envelope from `src/lib/api.ts`. Read-only, CORS-open, rate-limited.

### 5. Client runtime — `public/static/app.js`
Vanilla, dependency-free. Provides: theme toggle + persistence, mobile nav, the command palette (debounced `/api/v1/search`), copy buttons, reveal-on-scroll, hero data-streams, count-up numbers, and the `window.UAE` Chart.js helper factory (`charts.line/bar/doughnut/radar`, palette, gradients) themed from CSS variables and re-themed on theme switch.

## Key decisions

| Decision | Rationale |
|---|---|
| `node:sqlite` (built-in) instead of `better-sqlite3` | Zero native build; works on Node ≥ 22.5 / 26 where prebuilt binaries lag. |
| HTML template strings, no JSX/React | Honors the "no React/Vue/Angular" constraint; no build step; full RTL control. |
| Bespoke CSS design system | The "UAE intelligence" aesthetic (glass, data-glow, gradient mesh) is custom; ships one optimized stylesheet → great Lighthouse, no runtime Tailwind. |
| SQLite seeded from JSON | Real SQL search/filter/pagination while keeping data portable + diffable. |
| Vendored front-end libs | Offline-capable, CSP-friendly, faster, no CDN dependency at runtime. |
| Custom canvas force-graph | Avoids a heavy graph library; ~209 nodes simulate fine in O(n²). |

## Security
- CSP, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`.
- API rate limiting (in-memory, per-IP, 240/min).
- All dynamic/data strings escaped via `esc()` before insertion (XSS).
- Read-only data layer; no mutations, no user input persisted.
- Inline scripts/styles require `'unsafe-inline'` in the CSP (tradeoff for the no-build, template-string approach) — documented and bounded; no third-party script origins are allowed.

## Performance
- One CSS file, deferred JS, vendored libs, system-font fallback.
- SQLite indexes on hot filter columns; queries are O(log n)/scan over ≤106 rows.
- Server-rendered HTML → fast first paint; charts/maps lazy-init on `DOMContentLoaded`.
