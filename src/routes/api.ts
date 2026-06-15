/** routes/api.ts — JSON API under /api/v1. Standard {ok,data,error,meta} envelope. */
import { Hono } from 'hono';
import { ok, fail, pageMeta } from '../lib/api.js';
import * as q from '../lib/db.js';
import exportRoutes from './export.js';

const api = new Hono();

/* CSV / JSON downloads: /api/v1/export/<resource>.(csv|json) */
api.route('/export', exportRoutes);

const intParam = (v: string | undefined) => (v != null && v !== '' ? Number(v) : undefined);

api.get('/', (c) => ok(c, {
  name: 'UAE Open Intelligence API',
  version: 'v1',
  endpoints: [
    '/api/v1/stats', '/api/v1/projects', '/api/v1/projects/:id', '/api/v1/projects/facets',
    '/api/v1/free-zones', '/api/v1/free-zones/:id', '/api/v1/free-zones/facets',
    '/api/v1/skills', '/api/v1/observatory', '/api/v1/culture', '/api/v1/culture/themes',
    '/api/v1/datasets', '/api/v1/datasets/:id', '/api/v1/categories', '/api/v1/graph', '/api/v1/search',
  ],
}, { docs: '/api-hub' }));

api.get('/stats', (c) => ok(c, { platform: q.platformStats(), ...q.getMacro() }));

/* Projects */
api.get('/projects/facets', (c) => ok(c, q.getProjectFacets()));
api.get('/projects/:id', (c) => {
  const p = q.getProject(c.req.param('id'));
  return p ? ok(c, p) : fail(c, 'لم يتم العثور على المشروع', 'NOT_FOUND', 404);
});
api.get('/projects', (c) => {
  const r = q.getProjects({
    q: c.req.query('q'), sector: c.req.query('sector'), emirate: c.req.query('emirate'),
    minImpact: intParam(c.req.query('minImpact')), sort: c.req.query('sort'),
    page: intParam(c.req.query('page')), limit: intParam(c.req.query('limit')),
  });
  return ok(c, r.rows, pageMeta(r));
});

/* Free zones */
api.get('/free-zones/facets', (c) => ok(c, q.getFreeZoneFacets()));
api.get('/free-zones/:id', (c) => {
  const z = q.getFreeZone(c.req.param('id'));
  return z ? ok(c, z) : fail(c, 'لم يتم العثور على المنطقة الحرة', 'NOT_FOUND', 404);
});
api.get('/free-zones', (c) => {
  const r = q.getFreeZones({
    q: c.req.query('q'), emirate: c.req.query('emirate'), costBand: c.req.query('costBand'),
    sector: c.req.query('sector'), sort: c.req.query('sort'),
    page: intParam(c.req.query('page')), limit: intParam(c.req.query('limit')),
  });
  return ok(c, r.rows, pageMeta(r));
});

/* Skills + observatory */
api.get('/skills', (c) => ok(c, q.getSkills({ category: c.req.query('category'), level: c.req.query('level'), q: c.req.query('q') }), { facets: q.getSkillFacets() }));
api.get('/observatory', (c) => ok(c, q.getObservatory()));

/* Culture */
api.get('/culture/themes', (c) => ok(c, q.getCultureThemes()));
api.get('/culture', (c) => ok(c, q.getCulture({ theme: c.req.query('theme'), q: c.req.query('q') })));

/* Datasets catalog */
api.get('/datasets/:id', (c) => {
  const d = q.getDataset(c.req.param('id'));
  return d ? ok(c, d) : fail(c, 'لم يتم العثور على مجموعة البيانات', 'NOT_FOUND', 404);
});
api.get('/datasets', (c) => ok(c, q.getDatasets({ category: c.req.query('category'), q: c.req.query('q') })));
api.get('/categories', (c) => ok(c, q.getCategoryCounts()));

/* Knowledge graph */
api.get('/graph', (c) => {
  const types = c.req.query('types');
  return ok(c, q.getGraph({ types: types ? types.split(',') : undefined }));
});

/* Global search */
api.get('/search', (c) => ok(c, q.globalSearch(c.req.query('q') ?? '', intParam(c.req.query('limit')) ?? 8)));

export default api;
