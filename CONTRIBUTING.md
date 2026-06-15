# Contributing

Thanks for your interest in improving the UAE Open Intelligence Platform.

## Principles
- **Arabic-first, RTL-native.** Every UI string ships in Arabic; data carries `_ar`/`_en` fields where available.
- **No build step, no client framework.** Server-rendered Hono + HTML template strings. No React/Vue/Angular. HTMX + Alpine for interactivity.
- **Information-first.** Dense, operational, Bloomberg/Grafana-style — not marketing pages.
- **Honest data.** Every figure is source-labelled and confidence-scored. Never present an estimate as a fact.

## Dev setup
```bash
npm install
npm run seed        # rebuild data/uae.db from sources
npm run dev         # http://localhost:3000
npm run typecheck   # must pass with zero errors
npm test            # route smoke test
```

## Project layout
- `src/lib/db.ts` — the **single data contract**. Add query functions here, not ad-hoc SQL in pages.
- `src/pages/<name>.ts` — one module per page; each exports a function returning `LayoutOpts`.
- `src/routes/api.ts` — JSON API; keep the `{ok,data,error,meta}` envelope.
- `public/static/app.css` — the design system. Reuse existing classes; add new ones thoughtfully.
- `scripts/seed.ts` — data normalization. New datasets are wired in here.

## Adding a page
1. Create/extend `src/pages/<name>.ts` exporting `fooPage(query): LayoutOpts`.
2. Register the route in `src/server.ts` and add a `NAV` entry in `src/lib/ui.ts`.
3. Escape all dynamic strings with `esc()`. Put page CSS in `head`, page JS in `bodyEnd` (wrapped in `DOMContentLoaded`).

## Adding/updating data
1. Add the source under `data/` (or read a sibling source in `scripts/seed.ts`).
2. Normalize into a table + JSON export, with `source`, vintage and `confidence`.
3. Register a dataset descriptor in the catalogue array and re-run `npm run seed`.

## Conventions
- TypeScript strict mode; imports use `.js` extensions.
- Keep files focused (target 200–400 lines).
- Commit messages: imperative mood, scope prefix (`feat:`, `fix:`, `data:`, `docs:`).
- Run `npm run typecheck` and `npm test` before opening a PR.

## Reporting data corrections
Open an issue with the field, the current value, the corrected value, and a citation to an official source.
