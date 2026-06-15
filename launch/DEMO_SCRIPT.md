# UAE Open Intelligence Platform — Demo Script Package

**Product:** UAE Open Intelligence Platform · منصة الإمارات للذكاء المفتوح
**Tagline:** *"All of the UAE's open data, as one intelligence."* — «كل بيانات الإمارات المفتوحة، ذكاءً واحدًا.»
**Repo:** `https://github.com/<your-org>/uae-open-intelligence`
**Capture target:** dark theme · 1440-wide · 30/60 fps

> Use only the verified facts below: 106 innovation projects · 36 free zones (all 7 emirates) · 10 AI skills + adoption KPIs · 28 heritage items · 12 macro indicators · a 6-dataset catalogue · a 209-node / 306-edge knowledge graph · 192 total records · 16 REST endpoints under `/api/v1` · 240 req/min rate limiter.

---

## 🎬 60-second demo

Shot-by-shot. Each beat lists what's **ON SCREEN** (route/action), the **EN voiceover**, and a one-line **AR caption** alternative for the key beats.

| Time | On screen (route / action) | EN voiceover | AR caption |
|------|-----------------------------|--------------|------------|
| **0:00–0:06** | `/` landing fades in, hero + tagline | "All of the UAE's open data — as one intelligence." | كل بيانات الإمارات المفتوحة، ذكاءً واحدًا. |
| **0:06–0:13** | Press **⌘K**, command palette opens, type "free zones", jump to result | "Open-source, Arabic-first. Find anything with one shortcut." | مفتوح المصدر، عربيٌّ أولًا — اعثر على أي شيء باختصارٍ واحد. |
| **0:13–0:21** | `/dashboard` — KPI tiles and Chart.js charts animate in | "A unified observatory: innovation, skills, economy, culture — live." | مرصدٌ موحّد: الابتكار والمهارات والاقتصاد والثقافة في لوحةٍ واحدة. |
| **0:21–0:30** | `/knowledge-graph` — force-directed graph settles; zoom + pan | "209 nodes, 306 edges — every dataset, connected." | 209 عقدة و306 روابط — كل البيانات متّصلة. |
| **0:30–0:39** | `/free-zones` — select two zones, comparison view renders | "Compare 36 free zones across all seven emirates, side by side." | قارن بين 36 منطقة حرة في الإمارات السبع جنبًا إلى جنب. |
| **0:39–0:47** | `/api-hub` — pick a `/api/v1` endpoint, click **Run**, JSON `{ok,data,error,meta}` returns | "Everything ships as an open API — 16 endpoints, live." | كل شيء متاحٌ كواجهة برمجية مفتوحة — 16 نقطة وصول. |
| **0:47–0:53** | Click **Export → CSV** on a dataset; file downloads | "Export any dataset — CSV or JSON, source-labelled and confidence-scored." | صدّر أي مجموعة بيانات — CSV أو JSON، موسومة بمصدرها ودرجة ثقتها. |
| **0:53–0:60** | Cut to repo card + install one-liner `npm run demo` | "Clone it, run it, build on it. MIT code, CC BY 4.0 data." | استنسخها وشغّلها وابنِ عليها — كود MIT وبيانات CC BY 4.0. |

**End card:** `github.com/<your-org>/uae-open-intelligence` · *All of the UAE's open data, as one intelligence.*

---

## 🎥 3-minute walkthrough

Fuller script. Each section: **on-screen action** then **VO**.

### 0:00–0:18 — Intro / the problem
- **On screen:** Cold open on `/` landing (`docs/screenshots/landing.png`), slow scroll past the hero.
- **VO:** "The UAE publishes a wealth of open data — innovation, free zones, skills, heritage, the economy. But it's scattered across portals, formats, and languages. The UAE Open Intelligence Platform brings it together into one observatory — Arabic-first, open-source, and built to be used, not just browsed."

### 0:18–0:34 — The landing
- **On screen:** `/` — highlight the tagline, the bilingual toggle, and the dark/light theme switch. Toggle to Arabic so the layout flips to RTL, then back.
- **VO:** "It's bilingual to the core — every data field carries Arabic and English, and the whole interface is RTL-native. Dark and light themes ship in. And it's a no-build, server-rendered app — no React, no Vue. Hono and TypeScript on the server, HTMX and Alpine on the page."

### 0:34–0:54 — Dashboard
- **On screen:** `/dashboard` (`docs/screenshots/dashboard.png`) — let KPI tiles and Chart.js charts animate in. Hover a chart to show tooltips.
- **VO:** "The dashboard is the control room: 192 records across six datasets, surfaced as live KPIs and charts. Innovation activity, the AI-skills adoption observatory, twelve macro economic indicators, and heritage — all in one operational view."

### 0:54–1:14 — Datasets / observatory, filters, confidence
- **On screen:** `/datasets`, open one record (`/datasets/:id`). Apply a filter. Zoom in on the **source label** and the **confidence score (0–1)**; point at a clearly-marked "estimate/prototype" figure.
- **VO:** "A six-dataset catalogue you can filter and drill into. What makes it trustworthy: every dataset is source-labelled — UNESCO, DCT, u.ae, the IMF, the Ministry of Economy — and confidence-scored from zero to one. Prototype and estimate figures are marked as such. No silent guesses."

### 1:14–1:32 — Innovation explorer + project radar
- **On screen:** `/innovation`, then open a project detail (`/innovation/:id`, `docs/screenshots/innovation-detail.png`) and let the **score radar** draw in.
- **VO:** "106 innovation projects, each with its own profile. The radar breaks a project down across its scoring dimensions at a glance — built for comparison, not just reading."

### 1:32–1:48 — Free-zones comparator
- **On screen:** `/free-zones` — select two or three zones; comparison panel renders.
- **VO:** "36 free zones spanning all seven emirates. Pick any of them and compare side by side — the kind of view an analyst or an investor actually needs."

### 1:48–2:02 — Skills heatmap
- **On screen:** `/skills` — skills heatmap renders; hover cells.
- **VO:** "Ten AI skills, tracked through an adoption observatory and visualized as a heatmap — where capability is concentrating, and where it isn't."

### 2:02–2:16 — Culture map
- **On screen:** `/culture` (`docs/screenshots/culture.png`) — Leaflet heritage map; pan and click a marker.
- **VO:** "28 curated heritage items on an interactive Leaflet map — drawn from UNESCO and cultural sources, each point a place you can explore."

### 2:16–2:36 — Knowledge graph (zoom / pan)
- **On screen:** `/knowledge-graph` (`docs/screenshots/knowledge-graph.png`) — force-directed graph settles; zoom, pan, then apply a node-type filter.
- **VO:** "And this is what ties it together: a generated knowledge graph — 209 nodes, 306 edges — linking projects, zones, skills, and indicators. Zoom, pan, and filter to trace how one part of the data connects to another."

### 2:36–2:48 — Reports + print / export
- **On screen:** `/reports` — open a report; trigger **Print/PDF** preview to show the clean print layout.
- **VO:** "Reports are print- and PDF-ready out of the box — and CSV, JSON, and print export are available on every dataset, everywhere."

### 2:48–3:00... — API hub live tester *(carry into the close)*
- **On screen:** `/api-hub` (`docs/screenshots/api-hub.png`) — choose a `/api/v1` endpoint, click **Run**, show the `{ok, data, error, meta}` envelope with pagination. Briefly note the 240 req/min limiter.
- **VO:** "Everything you just saw is also an open API — 16 REST endpoints under `/api/v1`, a standard ok-data-error-meta envelope, pagination, filtering, and a built-in rate limiter."

### Close (last ~6s)
- **On screen:** Cut to `/about` methodology note, then the repo card with the install one-liner `npm run demo`.
- **VO:** "Arabic-first. Open-source — MIT code, CC BY 4.0 data. Clone it, run it, and build on it." → **End card:** `github.com/<your-org>/uae-open-intelligence`

---

## ⭐ Top 5 must-show shots

1. **⌘K command palette → instant jump** *(0:06 beat).* In two seconds it proves the app is a fast operational tool, not a brochure — and that search-first navigation is real.
2. **Knowledge graph settling, then zoom/pan/filter** *(`docs/screenshots/knowledge-graph.png`).* The single most visually arresting moment, and the one that conveys "one intelligence" — 209 nodes / 306 edges, literally connected.
3. **Dashboard charts animating in** *(`docs/screenshots/dashboard.png`).* Communicates breadth — six datasets, 192 records — and credibility in one frame.
4. **API hub live `Run` → `{ok,data,error,meta}` JSON** *(`docs/screenshots/api-hub.png`).* Turns "open data" from a claim into a demonstrated fact: 16 endpoints, real response, for developers in the audience.
5. **Confidence score + source label close-up** *(datasets detail).* The trust differentiator — every figure is sourced and scored 0–1, with estimates marked. This is what separates it from a dashboard demo.

*(Honorable mention: the Arabic RTL toggle flipping the whole layout — show it if the cut allows, since "Arabic-first" is a headline claim.)*

---

## 🎙️ Recording tips

- **Use the dark theme** for capture — denser contrast reads better on video and matches the operational aesthetic.
- **Move the cursor slowly and deliberately.** Pause briefly before each click so viewers can follow the action; never yank the mouse.
- **Let things animate.** Hold on charts as they draw in and on the knowledge graph as it settles into place — these are the moments that sell the product. Don't cut early.
- **Capture at 1440-wide** (16:9, dark theme), 30 or 60 fps. Hide bookmarks bar and any personal browser chrome.
- **Show the ⌘K palette on screen** — make the keystroke visible (use a keycast overlay if you have one) so the shortcut registers.
- **Do one genuinely live API call** in `/api-hub`: click Run and let the real `{ok,data,error,meta}` JSON appear — don't fake it with a static frame.
- **Demonstrate bilingual / RTL by toggling to Arabic** on one screen (the landing or dashboard works well) so the layout visibly flips right-to-left, then toggle back. Even a two-second flip earns the "Arabic-first, RTL-native" claim.
- **Pre-warm the app** (`npm run demo`) and pre-load each route once before recording so charts and the graph render without first-load lag.
