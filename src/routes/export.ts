/** routes/export.ts — CSV / JSON downloads under /api/v1/export/:resource.(csv|json). */
import { Hono } from 'hono';
import * as q from '../lib/db.js';

const exp = new Hono();

const BIG = 100000;
const intp = (v: string | undefined) => (v != null && v !== '' ? Number(v) : undefined);

/** Resource → rows resolver (applies query filters) + ordered CSV columns. */
const RESOURCES: Record<string, { rows: (query: Record<string, string | undefined>) => any[]; cols: string[] }> = {
  projects: {
    rows: (qy) => q.getProjects({ q: qy.q, sector: qy.sector, emirate: qy.emirate, minImpact: intp(qy.minImpact), sort: qy.sort, page: 1, limit: BIG }).rows,
    cols: ['id', 'name', 'sector_key', 'sector_ar', 'emirate', 'impact_score', 'innovation_score', 'golden_visa_relevance', 'sovereignty_score', 'regulation_score', 'emiratization_score', 'sustainability_score', 'avg_score', 'mission', 'tech_stack', 'ai_opportunities', 'monetization'],
  },
  'free-zones': {
    rows: (qy) => q.getFreeZones({ q: qy.q, emirate: qy.emirate, costBand: qy.costBand, sector: qy.sector, sort: qy.sort, page: 1, limit: BIG }).rows,
    cols: ['id', 'name_en', 'name_ar', 'emirate', 'established', 'type', 'cost_band', 'indicative_min_first_year_aed', 'visas_with_base_package', 'office_min', 'sectors', 'website', 'confidence'],
  },
  skills: {
    rows: (qy) => q.getSkills({ category: qy.category, level: qy.level, q: qy.q }),
    cols: ['skill_id', 'skill_en', 'skill_ar', 'category', 'level', 'example_use_case'],
  },
  culture: {
    rows: (qy) => q.getCulture({ theme: qy.theme, q: qy.q }),
    cols: ['id', 'theme', 'title_ar', 'title_en', 'summary_ar', 'summary_en', 'era', 'lat', 'lng', 'tags', 'source', 'confidence'],
  },
  datasets: {
    rows: (qy) => q.getDatasets({ category: qy.category, q: qy.q }),
    cols: ['id', 'title_ar', 'title_en', 'categories', 'records', 'format', 'source', 'license', 'confidence', 'updated', 'endpoint'],
  },
  macro: {
    rows: () => q.getMacro().macro as any[],
    cols: ['key', 'value', 'label_ar', 'label_en', 'source', 'year'],
  },
};

function csvCell(v: any): string {
  if (v == null) return '';
  let s = Array.isArray(v) ? v.join('; ') : typeof v === 'object' ? JSON.stringify(v) : String(v);
  if (/[",\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}
function toCSV(rows: any[], cols: string[]): string {
  const head = cols.join(',');
  const body = rows.map((r) => cols.map((c) => csvCell(r[c])).join(',')).join('\r\n');
  return '﻿' + head + '\r\n' + body; // BOM so Excel reads UTF-8 (Arabic) correctly
}

exp.get('/:file', (c) => {
  const file = c.req.param('file');
  const m = file.match(/^([a-z-]+)\.(csv|json)$/);
  if (!m) return c.json({ ok: false, data: null, error: 'صيغة التصدير غير صحيحة. استخدم <resource>.csv أو <resource>.json', code: 'BAD_FORMAT' }, 400);
  const [, resource, format] = m;
  const def = RESOURCES[resource!];
  if (!def) return c.json({ ok: false, data: null, error: 'مورد غير معروف', code: 'NOT_FOUND' }, 404);
  const rows = def.rows(c.req.query());
  const stamp = new Date().toISOString().slice(0, 10);
  if (format === 'json') {
    c.header('Content-Type', 'application/json; charset=utf-8');
    c.header('Content-Disposition', `attachment; filename="uae-${resource}-${stamp}.json"`);
    return c.body(JSON.stringify({ resource, exported_at: stamp, count: rows.length, license: 'CC BY 4.0', data: rows }, null, 2));
  }
  c.header('Content-Type', 'text/csv; charset=utf-8');
  c.header('Content-Disposition', `attachment; filename="uae-${resource}-${stamp}.csv"`);
  return c.body(toCSV(rows, def.cols));
});

export default exp;
