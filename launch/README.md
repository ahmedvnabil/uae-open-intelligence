# 🚀 Launch Package — v0.1.0

Everything you need to launch the **UAE Open Intelligence Platform** (منصة الإمارات للذكاء المفتوح) publicly. Copy/paste-ready.

> Tagline — EN: *"All of the UAE's open data, as one intelligence."* · AR: *«كل بيانات الإمارات المفتوحة، ذكاءً واحدًا.»*

## 📁 Contents
| File | Use it for |
|---|---|
| [RELEASE_NOTES_v0.1.0.md](RELEASE_NOTES_v0.1.0.md) | The GitHub Release body (tag `v0.1.0`) — highlights, screenshots, install, limitations, roadmap. |
| [PRODUCT_HUNT.md](PRODUCT_HUNT.md) | Product Hunt submission — name, tagline, short/long description, maker's first comment, 5 gallery images, 10 tags. |
| [SOCIAL_KIT.md](SOCIAL_KIT.md) | LinkedIn + X/Twitter + Arabic posts, a 5-tweet thread, and a tech-community message. |
| [DEMO_SCRIPT.md](DEMO_SCRIPT.md) | 60-second and 3-minute video scripts + the top-5 must-show shots + recording tips. |

Screenshots referenced throughout live in [`../docs/screenshots/`](../docs/screenshots/): `landing.png`, `dashboard.png`, `knowledge-graph.png`, `innovation-detail.png`, `culture.png`, `api-hub.png`.

## ✅ Pre-launch checklist
- [ ] Create the GitHub repo and push (replace every `<your-org>` placeholder with the real org/user).
- [ ] Tag the release: `git tag v0.1.0 && git push --tags`.
- [ ] Create the GitHub Release using [RELEASE_NOTES_v0.1.0.md](RELEASE_NOTES_v0.1.0.md) as the body.
- [ ] Verify the live demo runs: `npm install && npm run build-db && npm start` → http://localhost:3000 (or `docker build -t uae-oi . && docker run -p 3000:3000 uae-oi`).
- [ ] (Optional) Deploy a public demo and swap the localhost links in the social copy for the live URL.
- [ ] Record the demo video from [DEMO_SCRIPT.md](DEMO_SCRIPT.md).
- [ ] Schedule the Product Hunt launch (12:01 AM PT) and queue the [SOCIAL_KIT.md](SOCIAL_KIT.md) posts.

## 🔑 Canonical facts (keep consistent everywhere)
- **Data:** 106 projects · 36 free zones (7 emirates) · 10 AI skills + observatory · 28 heritage items · 12 macro indicators · 6-dataset catalogue · 209-node / 306-edge knowledge graph · **192 records**.
- **API:** 16 REST endpoints (`/api/v1`, standard envelope) + CSV/JSON exports.
- **Stack:** Hono · TypeScript · HTMX · Alpine.js · Chart.js · Leaflet · `node:sqlite` — no React, no build step.
- **Quality:** landing **100/100/100/100** Lighthouse; app pages ~93 perf / 100 a11y/best/SEO.
- **License:** MIT (code) · CC BY 4.0 (data).
- **Repo placeholder:** `https://github.com/<your-org>/uae-open-intelligence`
