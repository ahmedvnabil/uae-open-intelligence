# Product Hunt Launch Package

> Launch copy for **UAE Open Intelligence Platform**. English-primary (international PH audience), with the native Arabic name noted. All facts are drawn from the canonical brand kit — no invented metrics, partnerships, or claims.

---

## 1. Product name

**UAE Open Intelligence Platform**

*Native title:* منصة الإمارات للذكاء المفتوح

---

## 2. Tagline

Product Hunt enforces a **60-character** tagline limit. All options below are counted.

**Recommended:**

> ✅ **All of the UAE's open data, as one intelligence.** *(48 chars)*

This is the canonical brand tagline and fits comfortably under the limit.

**Alternatives (each ≤ 60 chars):**

- The UAE's open data — one observatory, API & graph. *(51 chars)*
- Arabic-first, open-source observatory for UAE data. *(51 chars)*
- UAE open data: dashboards, knowledge graph & APIs. *(50 chars)*

---

## 3. Short description

Product Hunt's gallery/short description limit is **260 characters**. Counted below.

> Arabic-first, open-source platform that turns the UAE's open data into one observatory: dashboards, an interactive knowledge graph (209 nodes / 306 edges), a Leaflet heritage map, and 16 REST APIs. No-build, server-rendered, MIT-licensed. *(238 chars)*

---

## 4. Long description

**The UAE's open data is everywhere — and nowhere.** Innovation projects, free zones, AI-skill indicators, heritage records, and macro indicators live across separate portals, PDFs, and formats. Cross-referencing them — let alone querying them programmatically — means stitching sources together by hand, in English-first tools that rarely treat Arabic as a first-class citizen.

**UAE Open Intelligence Platform unifies it into a single observatory.** It brings together 106 innovation projects, 36 free zones across all 7 emirates, 10 AI skills plus adoption-observatory KPIs, 28 curated heritage items, 12 macro economic indicators, and a 6-dataset catalogue — 192 records in all — and links them through a generated knowledge graph of **209 nodes / 306 edges**. Explore it visually through an interactive force-directed graph (zoom/pan/filter), a Leaflet heritage map, score radars, and a skills heatmap — or pull everything through **16 REST endpoints under `/api/v1`** with a standard `{ok,data,error,meta}` envelope, pagination, filtering, a 240 req/min rate limiter, and CSV/JSON exports on every dataset. Every dataset is source-labelled and confidence-scored (0–1), with any prototype or estimate figures clearly marked.

**Built for researchers, NGOs, developers, analysts, and policy teams** who need reliable, citable, machine-readable access to UAE open data. It's **Arabic-first and RTL-native** (bilingual ar/en fields), with dark + light themes and a ⌘K command palette. And it's genuinely **no-build, server-rendered** — Hono + TypeScript, HTMX, Alpine.js, Chart.js, Leaflet, and the built-in `node:sqlite` (zero native deps). Open source under MIT (code) / CC BY 4.0 (data).

Get the whole thing running in one line:

```bash
npm run demo   # build-db + start → http://localhost:3000
```

---

## 5. First comment from the maker

> Hi Product Hunt 👋
>
> I built **UAE Open Intelligence Platform** because I kept hitting the same wall: the UAE publishes a lot of genuinely useful open data — innovation projects, free zones, AI-skill indicators, heritage records, macro indicators — but it's scattered across portals and formats, and almost always English-first. I wanted one place where you could *see* how it all connects and also pull it through a clean API.
>
> So this is that place. Under the hood it's 192 records across 6 datasets, tied together by a generated knowledge graph of 209 nodes / 306 edges, with an interactive force-directed graph, a Leaflet heritage map, score radars, a skills heatmap, and print/PDF-ready reports. Everything is also exposed through 16 REST endpoints under `/api/v1` (standard `{ok,data,error,meta}` envelope, pagination, filtering, rate limiting, CSV/JSON exports). Every dataset is source-labelled and confidence-scored, and prototype/estimate figures are clearly marked — I'd rather be honest about uncertainty than pretend everything is gospel.
>
> Two things I care about most: it's **Arabic-first and RTL-native** (bilingual ar/en throughout, dark + light themes, ⌘K palette), and it's **no-build and server-rendered** — Hono + TypeScript, HTMX, Alpine.js, Chart.js, Leaflet, and Node's built-in `node:sqlite`. No React, no native build step. Clone it and run `npm run demo` and you're on `localhost:3000`.
>
> It's open source — MIT for the code, CC BY 4.0 for the data. I'd genuinely love your feedback: missing datasets, API ergonomics, the knowledge-graph UX, Arabic typography, anything. Issues and PRs very welcome.
>
> 👉 https://github.com/&lt;your-org&gt;/uae-open-intelligence
>
> Thanks for taking a look 🙏

---

## 6. Five suggested gallery images

Ordered for the gallery. Each maps to an existing screenshot at `docs/screenshots/`. Caption = overlay text to burn onto the image.

1. **`docs/screenshots/landing.png`** — *Hero / first impression*
   Caption overlay: **"All of the UAE's open data, as one intelligence."** Sub-line: "Arabic-first · open-source · no-build." Lead with the canonical tagline so the gallery thumbnail sells the whole idea at a glance.

2. **`docs/screenshots/dashboard.png`** — *The observatory*
   Caption overlay: **"One observatory: 192 records, 6 datasets, 12 macro indicators."** Show the dense Chart.js dashboard to communicate "operational tool, not a landing page."

3. **`docs/screenshots/knowledge-graph.png`** — *The differentiator*
   Caption overlay: **"Interactive knowledge graph — 209 nodes, 306 edges. Zoom, pan, filter."** This is the most distinctive shot; it proves the "as one intelligence" promise visually.

4. **`docs/screenshots/innovation-detail.png`** — *Depth + trust*
   Caption overlay: **"Drill into 106 innovation projects — score radars, source-labelled, confidence-scored (0–1)."** Highlights both the radar visualization and the data-honesty angle.

5. **`docs/screenshots/culture.png`** — *Range + maps*
   Caption overlay: **"28 curated heritage items on an interactive Leaflet map — bilingual, RTL-native."** Shows the platform spans culture as well as economy, and showcases the map UI.

**Optional 6th — `docs/screenshots/api-hub.png`** — *For the developer audience*
   Caption overlay: **"Everything via 16 REST APIs under /api/v1 — `{ok,data,error,meta}`, pagination, CSV/JSON export."** Add this if the gallery has room; it converts the dev/analyst segment.

---

## 7. Ten tags / topics

Ten fitting Product Hunt topics for this launch:

1. Open Source
2. Data & Analytics
3. APIs
4. Developer Tools
5. GovTech
6. Data Visualization
7. Maps
8. SaaS *(self-hostable / platform)*
9. Productivity
10. Artificial Intelligence

> Note: "Arabic-first" and "RTL" aren't standalone PH topics — surface them in the tagline, description, and maker comment instead (done above).
