# APIs.md — UAE Open Intelligence Platform

> REST API for UAE open-data intelligence: innovation projects, free zones, AI skills, macro indicators, culture & heritage, datasets catalogue and a knowledge graph.

- **Base path:** `/api/v1`
- **Format:** JSON (UTF-8). All Arabic content is returned as native UTF-8.
- **Auth:** None (public, read-only).
- **CORS:** `Access-Control-Allow-Origin: *` on all API responses.
- **Rate limit:** 240 requests / minute / IP. Exceeding returns `429` with `Retry-After`.
- **Data licence:** CC BY 4.0. Verify critical figures against official sources.

## Response envelope

**Success**
```json
{
  "ok": true,
  "data": {},
  "error": null,
  "meta": {}
}
```

**Error**
```json
{
  "ok": false,
  "data": null,
  "error": "Human-readable message (Arabic)",
  "code": "ERROR_CODE"
}
```

**Pagination** (list endpoints) — `meta` block:
```json
{ "meta": { "page": 1, "limit": 24, "total": 106, "has_more": true } }
```
Query params: `?page=1&limit=24`.

Common error codes: `NOT_FOUND` (404), `RATE_LIMITED` (429), `ERROR` (400/500).

---

## Endpoints

### `GET /api/v1/`
API index — lists available endpoints.

### `GET /api/v1/stats`
Platform-wide statistics + macro indicators.
```bash
curl http://localhost:3000/api/v1/stats
```
```json
{ "ok": true, "data": {
  "platform": { "projects": 106, "freezones": 36, "skills": 10, "culture": 28,
                "datasets": 6, "macro": 12, "sectors": 11, "emirates": 7,
                "avgImpact": 9, "graphNodes": 209, "graphEdges": 306,
                "totalRecords": 192, "updated": "2026-06-11" },
  "meta": { "version": "2026.06", "updated": "2026-06-11" },
  "macro": [ { "key": "gdp", "value": "≈ USD 540B", "label_ar": "الناتج المحلي الإجمالي الاسمي",
               "label_en": "Nominal GDP", "source": "IMF estimate", "year": 2024 } ]
}, "error": null, "meta": {} }
```

### `GET /api/v1/projects`
List innovation projects (paged). **Query:** `q`, `sector` (sector_key), `emirate`, `minImpact` (0–10), `sort` (`impact`|`innovation`|`sustainability`|`emiratization`|`golden_visa`|`avg`|`name`), `page`, `limit` (max 200).
```bash
curl "http://localhost:3000/api/v1/projects?sector=health&sort=impact&limit=2"
```
```json
{ "ok": true, "data": [
  { "id": "...", "name": "…", "mission": "…", "sector_key": "health", "sector_ar": "الصحة",
    "emirate": "دبي", "impact_score": 10, "innovation_score": 8, "sustainability_score": 9,
    "avg_score": 8.4, "tech_stack": "…", "ai_opportunities": "…" }
], "error": null, "meta": { "page": 1, "limit": 2, "total": 18, "has_more": true } }
```

### `GET /api/v1/projects/:id`
Single project by slug id. `404 NOT_FOUND` if missing.

### `GET /api/v1/projects/facets`
Aggregations for filters: `{ sectors: [{sector_key, sector_ar, count, avg_impact}], emirates: [{emirate, count}] }`.

### `GET /api/v1/free-zones`
List free zones (paged). **Query:** `q`, `emirate`, `costBand` (`low`|`mid`|`high`), `sector`, `sort` (`cost_asc`|`cost_desc`|`established`|`visas`|`confidence`|`name`), `page`, `limit`.
```json
{ "ok": true, "data": [
  { "id": "dmcc", "name_en": "Dubai Multi Commodities Centre (DMCC)", "name_ar": "مركز دبي للسلع المتعددة",
    "emirate": "Dubai", "established": 2002, "sectors": ["commodities","trading","crypto"],
    "cost_band": "high", "indicative_min_first_year_aed": 34000, "visas_with_base_package": 1,
    "confidence": 0.7 }
], "error": null, "meta": { "page": 1, "limit": 36, "total": 36, "has_more": false } }
```

### `GET /api/v1/free-zones/:id`
Single free zone. `404 NOT_FOUND` if missing.

### `GET /api/v1/free-zones/facets`
`{ emirates: [{emirate, count, avg_cost}], costBands: [{cost_band, count}], sectors: [{sector, count}] }`.

### `GET /api/v1/skills`
AI skills taxonomy. **Query:** `category`, `level` (`Beginner`|`Intermediate`|`Advanced`), `q`. `meta.facets` includes category/level counts.
```json
{ "ok": true, "data": [
  { "skill_id": "S005", "skill_en": "Machine learning", "skill_ar": "تعلم الآلة",
    "category": "Technical", "level": "Advanced", "example_use_case": "…" }
], "error": null, "meta": { "facets": { "categories": [...], "levels": [...] } } }
```

### `GET /api/v1/observatory`
AI adoption observatory snapshot: `{ generated_on, status, kpis[], adoption_by_function[], skills_demand[], indicators[] }`.

### `GET /api/v1/culture`
Culture & heritage items. **Query:** `theme` (`turuq`|`mawasem`|`hikayat`|`thaqafah`|`lahja`|`maktabati`), `q`.
```json
{ "ok": true, "data": [
  { "id": "al-sadu", "theme": "thaqafah", "title_ar": "السدو (النسيج البدوي)", "title_en": "Al Sadu Weaving",
    "summary_ar": "…", "era": "تراث حي", "lat": 24.47, "lng": 54.37, "tags": ["craft","unesco"],
    "source": "UNESCO ICH 2011", "confidence": 0.95 }
], "error": null, "meta": {} }
```

### `GET /api/v1/culture/themes`
The six culture themes with counts.

### `GET /api/v1/datasets`
Dataset catalogue. **Query:** `category` (`Business`|`Culture`|`Tourism`|`Heritage`|`AI`|`SME`|`Real Estate`|…), `q`.

### `GET /api/v1/datasets/:id`
Single dataset descriptor (incl. `fields[]`, `endpoint`, `license`, `confidence`). `404 NOT_FOUND` if missing.

### `GET /api/v1/categories`
Open-data category coverage: `[{ category, count }]`.

### `GET /api/v1/graph`
Knowledge graph. **Query:** `types` (comma-separated subset of `emirate,sector,freezone,fzsector,project,skillcat`).
```json
{ "ok": true, "data": {
  "nodes": [ { "id": "em:Dubai", "label": "دبي", "type": "emirate", "weight": 22, "meta": null } ],
  "edges": [ { "source": "fz:dmcc", "target": "em:Dubai", "type": "LOCATED_IN" } ],
  "stats": { "nodes": 209, "edges": 306 }
}, "error": null, "meta": {} }
```

### `GET /api/v1/search`
Unified search across projects, free zones, culture, skills and datasets. **Query:** `q` (required), `limit` (default 8).
```json
{ "ok": true, "data": [
  { "type": "project", "id": "...", "title": "…", "subtitle": "مشروع · الصحة", "url": "/innovation/..." }
], "error": null, "meta": {} }
```

---

## Health & meta
- `GET /healthz` → `{ "ok": true, "status": "healthy" }`
- `GET /robots.txt` → allow-all.

## Notes
- All list endpoints are deterministic and cacheable.
- Numbers are returned as-is from source; confidence scores (0–1) indicate data reliability.
- The interactive explorer with a live "try it" console is at **`/api-hub`**.
