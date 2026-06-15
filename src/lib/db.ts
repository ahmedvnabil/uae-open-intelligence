/**
 * db.ts — Read-only data-access layer over the seeded SQLite database.
 * This is the single contract used by every page and API route.
 * Run `npm run seed` to (re)build data/uae.db before starting the server.
 */
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, '..', '..', 'data');
const DB_PATH = join(DATA, 'uae.db');

if (!existsSync(DB_PATH)) {
  throw new Error(`Database not found at ${DB_PATH}. Run \`npm run seed\` first.`);
}
const db = new DatabaseSync(DB_PATH, { readOnly: true });

// Nested/config-shaped data lives in the JSON export (not tabular).
const observatory = JSON.parse(readFileSync(join(DATA, 'export', 'observatory.json'), 'utf-8'));
const cultureMeta = JSON.parse(readFileSync(join(DATA, 'export', 'culture.json'), 'utf-8')).meta;
const statsMeta = JSON.parse(readFileSync(join(DATA, 'export', 'stats.json'), 'utf-8')).meta;

const J = (s: any) => { try { return s == null ? null : JSON.parse(s); } catch { return s; } };
const clampInt = (v: any, def: number, min: number, max: number) => {
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
};

// ---- Types ---------------------------------------------------------------
export type Paged<T> = { rows: T[]; page: number; limit: number; total: number; has_more: boolean };
export interface ProjectQuery { q?: string; sector?: string; emirate?: string; minImpact?: number; sort?: string; page?: number; limit?: number }
export interface FreeZoneQuery { q?: string; emirate?: string; costBand?: string; sector?: string; sort?: string; page?: number; limit?: number }

function paginate<T>(rows: T[], page: number, limit: number, total: number): Paged<T> {
  return { rows, page, limit, total, has_more: page * limit < total };
}

// ---- Platform-wide ------------------------------------------------------
export function platformStats() {
  const g = (sql: string) => (db.prepare(sql).get() as any).c as number;
  const projectsCount = g('SELECT COUNT(*) c FROM projects');
  const freezonesCount = g('SELECT COUNT(*) c FROM freezones');
  const skillsCount = g('SELECT COUNT(*) c FROM skills');
  const cultureCount = g('SELECT COUNT(*) c FROM culture');
  const datasetsCount = g('SELECT COUNT(*) c FROM datasets');
  const macroCount = g('SELECT COUNT(*) c FROM macro');
  const sectorsCount = g('SELECT COUNT(DISTINCT sector_key) c FROM projects');
  const emiratesCount = g('SELECT COUNT(DISTINCT emirate) c FROM freezones');
  const avgImpact = (db.prepare('SELECT ROUND(AVG(impact_score),1) v FROM projects').get() as any).v as number;
  const graphNodes = g('SELECT COUNT(*) c FROM graph_nodes');
  const graphEdges = g('SELECT COUNT(*) c FROM graph_edges');
  const totalRecords = projectsCount + freezonesCount + skillsCount + cultureCount + macroCount;
  return {
    projects: projectsCount, freezones: freezonesCount, skills: skillsCount, culture: cultureCount,
    datasets: datasetsCount, macro: macroCount, sectors: sectorsCount, emirates: emiratesCount,
    avgImpact, graphNodes, graphEdges, totalRecords,
    updated: statsMeta?.updated ?? '2026-06',
  };
}

// ---- Projects -----------------------------------------------------------
const PROJECT_SORTS: Record<string, string> = {
  impact: 'impact_score DESC, innovation_score DESC',
  innovation: 'innovation_score DESC, impact_score DESC',
  sustainability: 'sustainability_score DESC',
  emiratization: 'emiratization_score DESC',
  golden_visa: 'golden_visa_relevance DESC',
  avg: 'avg_score DESC',
  name: 'name ASC',
};
export function getProjects(query: ProjectQuery = {}): Paged<any> {
  const page = clampInt(query.page, 1, 1, 100000);
  const limit = clampInt(query.limit, 24, 1, 200);
  const where: string[] = [];
  const params: any[] = [];
  if (query.q) { where.push('(name LIKE ? OR mission LIKE ? OR problem LIKE ? OR tech_stack LIKE ?)'); const t = `%${query.q}%`; params.push(t, t, t, t); }
  if (query.sector) { where.push('sector_key = ?'); params.push(query.sector); }
  if (query.emirate) { where.push('emirate = ?'); params.push(query.emirate); }
  if (query.minImpact != null) { where.push('impact_score >= ?'); params.push(Number(query.minImpact)); }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const order = PROJECT_SORTS[query.sort ?? 'impact'] ?? PROJECT_SORTS.impact;
  const total = (db.prepare(`SELECT COUNT(*) c FROM projects ${w}`).get(...params) as any).c as number;
  const rows = db.prepare(`SELECT * FROM projects ${w} ORDER BY ${order} LIMIT ? OFFSET ?`).all(...params, limit, (page - 1) * limit);
  return paginate(rows, page, limit, total);
}
export function getProject(id: string) {
  return db.prepare('SELECT * FROM projects WHERE id = ?').get(id) ?? null;
}
export function getProjectFacets() {
  const sectors = db.prepare('SELECT sector_key, sector_ar, COUNT(*) count, ROUND(AVG(impact_score),1) avg_impact FROM projects GROUP BY sector_key ORDER BY count DESC').all();
  const emirates = db.prepare("SELECT emirate, COUNT(*) count FROM projects GROUP BY emirate ORDER BY count DESC").all();
  return { sectors, emirates };
}
export function getProjectScoreAverages() {
  const cols = ['impact_score', 'innovation_score', 'golden_visa_relevance', 'sovereignty_score', 'regulation_score', 'emiratization_score', 'sustainability_score'];
  const sel = cols.map((c) => `ROUND(AVG(${c}),2) ${c}`).join(', ');
  return db.prepare(`SELECT ${sel} FROM projects`).get() as Record<string, number>;
}
export function getTopProjects(by = 'impact_score', n = 8) {
  const col = ['impact_score', 'innovation_score', 'sustainability_score', 'avg_score', 'emiratization_score'].includes(by) ? by : 'impact_score';
  return db.prepare(`SELECT id,name,sector_ar,sector_key,impact_score,innovation_score,sustainability_score,avg_score FROM projects ORDER BY ${col} DESC, innovation_score DESC LIMIT ?`).all(n);
}

// ---- Free Zones ---------------------------------------------------------
const FZ_SORTS: Record<string, string> = {
  cost_asc: 'indicative_min_first_year_aed ASC',
  cost_desc: 'indicative_min_first_year_aed DESC',
  established: 'established DESC',
  visas: 'visas_with_base_package DESC',
  confidence: 'confidence DESC',
  name: 'name_en ASC',
};
export function getFreeZones(query: FreeZoneQuery = {}): Paged<any> {
  const page = clampInt(query.page, 1, 1, 100000);
  const limit = clampInt(query.limit, 36, 1, 200);
  const where: string[] = [];
  const params: any[] = [];
  if (query.q) { where.push('(name_en LIKE ? OR name_ar LIKE ? OR highlights_en LIKE ? OR highlights_ar LIKE ?)'); const t = `%${query.q}%`; params.push(t, t, t, t); }
  if (query.emirate) { where.push('emirate = ?'); params.push(query.emirate); }
  if (query.costBand) { where.push('cost_band = ?'); params.push(query.costBand); }
  if (query.sector) { where.push('sectors LIKE ?'); params.push(`%"${query.sector}"%`); }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const order = FZ_SORTS[query.sort ?? 'cost_asc'] ?? FZ_SORTS.cost_asc;
  const total = (db.prepare(`SELECT COUNT(*) c FROM freezones ${w}`).get(...params) as any).c as number;
  const rows = (db.prepare(`SELECT * FROM freezones ${w} ORDER BY ${order} LIMIT ? OFFSET ?`).all(...params, limit, (page - 1) * limit) as any[])
    .map((r) => ({ ...r, sectors: J(r.sectors) }));
  return paginate(rows, page, limit, total);
}
export function getFreeZone(id: string) {
  const r = db.prepare('SELECT * FROM freezones WHERE id = ?').get(id) as any;
  return r ? { ...r, sectors: J(r.sectors) } : null;
}
export function getFreeZoneFacets() {
  const emirates = db.prepare('SELECT emirate, COUNT(*) count, ROUND(AVG(indicative_min_first_year_aed)) avg_cost FROM freezones GROUP BY emirate ORDER BY count DESC').all();
  const costBands = db.prepare('SELECT cost_band, COUNT(*) count FROM freezones GROUP BY cost_band').all();
  const sectorCounts = new Map<string, number>();
  for (const r of db.prepare('SELECT sectors FROM freezones').all() as any[]) {
    for (const s of J(r.sectors) ?? []) sectorCounts.set(s, (sectorCounts.get(s) ?? 0) + 1);
  }
  const sectors = [...sectorCounts.entries()].map(([sector, count]) => ({ sector, count })).sort((a, b) => b.count - a.count);
  return { emirates, costBands, sectors };
}

// ---- Stats / Macro ------------------------------------------------------
export function getMacro() { return { meta: statsMeta, macro: db.prepare('SELECT * FROM macro').all() }; }

// ---- Skills + Observatory ----------------------------------------------
export function getSkills(query: { category?: string; level?: string; q?: string } = {}) {
  const where: string[] = []; const params: any[] = [];
  if (query.category) { where.push('category = ?'); params.push(query.category); }
  if (query.level) { where.push('level = ?'); params.push(query.level); }
  if (query.q) { where.push('(skill_en LIKE ? OR skill_ar LIKE ? OR example_use_case LIKE ?)'); const t = `%${query.q}%`; params.push(t, t, t); }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  return db.prepare(`SELECT * FROM skills ${w} ORDER BY skill_id`).all(...params);
}
export function getSkillFacets() {
  return {
    categories: db.prepare('SELECT category, COUNT(*) count FROM skills GROUP BY category ORDER BY count DESC').all(),
    levels: db.prepare('SELECT level, COUNT(*) count FROM skills GROUP BY level').all(),
  };
}
export function getObservatory() { return observatory; }

// ---- Culture ------------------------------------------------------------
export function getCulture(query: { theme?: string; q?: string } = {}) {
  const where: string[] = []; const params: any[] = [];
  if (query.theme) { where.push('theme = ?'); params.push(query.theme); }
  if (query.q) { where.push('(title_ar LIKE ? OR title_en LIKE ? OR summary_ar LIKE ?)'); const t = `%${query.q}%`; params.push(t, t, t); }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  return (db.prepare(`SELECT * FROM culture ${w} ORDER BY confidence DESC`).all(...params) as any[]).map((r) => ({ ...r, tags: J(r.tags) }));
}
export function getCultureThemes() {
  const counts = db.prepare('SELECT theme, COUNT(*) count FROM culture GROUP BY theme').all() as any[];
  const cmap = new Map(counts.map((c) => [c.theme, c.count]));
  return (cultureMeta.themes as any[]).map((t) => ({ ...t, count: cmap.get(t.key) ?? 0 }));
}

// ---- Datasets catalog ---------------------------------------------------
export function getDatasets(query: { category?: string; q?: string } = {}) {
  let rows = (db.prepare('SELECT * FROM datasets ORDER BY records DESC').all() as any[]).map((r) => ({
    ...r, categories: J(r.categories), fields: J(r.fields),
  }));
  if (query.category) rows = rows.filter((r) => (r.categories ?? []).includes(query.category));
  if (query.q) { const t = query.q.toLowerCase(); rows = rows.filter((r) => (r.title_ar + r.title_en + r.description_ar + r.description_en).toLowerCase().includes(t)); }
  return rows;
}
export function getDataset(id: string) {
  const r = db.prepare('SELECT * FROM datasets WHERE id = ?').get(id) as any;
  return r ? { ...r, categories: J(r.categories), fields: J(r.fields) } : null;
}
export function getCategoryCounts() {
  const counts = new Map<string, number>();
  for (const d of getDatasets()) for (const c of d.categories ?? []) counts.set(c, (counts.get(c) ?? 0) + 1);
  return [...counts.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);
}

// ---- Knowledge Graph ----------------------------------------------------
export function getGraph(opts: { types?: string[]; limit?: number } = {}) {
  let nodes = (db.prepare('SELECT * FROM graph_nodes').all() as any[]).map((n) => ({ ...n, meta: J(n.meta) }));
  let edges = db.prepare('SELECT * FROM graph_edges').all() as any[];
  if (opts.types?.length) {
    const set = new Set(opts.types);
    nodes = nodes.filter((n) => set.has(n.type));
    const ids = new Set(nodes.map((n) => n.id));
    edges = edges.filter((e) => ids.has(e.source) && ids.has(e.target));
  }
  return { nodes, edges, stats: { nodes: nodes.length, edges: edges.length } };
}
export function getGraphTypes() {
  return db.prepare('SELECT type, COUNT(*) count FROM graph_nodes GROUP BY type ORDER BY count DESC').all();
}

// ---- Global search ------------------------------------------------------
export function globalSearch(q: string, limit = 8) {
  if (!q || !q.trim()) return [];
  const t = `%${q}%`;
  const out: Array<{ type: string; id: string; title: string; subtitle: string; url: string }> = [];
  for (const r of db.prepare('SELECT id,name,sector_ar FROM projects WHERE name LIKE ? OR mission LIKE ? LIMIT ?').all(t, t, limit) as any[])
    out.push({ type: 'project', id: r.id, title: r.name, subtitle: `مشروع · ${r.sector_ar}`, url: `/innovation/${r.id}` });
  for (const r of db.prepare('SELECT id,name_ar,emirate FROM freezones WHERE name_ar LIKE ? OR name_en LIKE ? LIMIT ?').all(t, t, limit) as any[])
    out.push({ type: 'freezone', id: r.id, title: r.name_ar, subtitle: `منطقة حرة · ${r.emirate}`, url: `/free-zones/${r.id}` });
  for (const r of db.prepare('SELECT id,title_ar,theme FROM culture WHERE title_ar LIKE ? OR title_en LIKE ? LIMIT ?').all(t, t, limit) as any[])
    out.push({ type: 'culture', id: r.id, title: r.title_ar, subtitle: `تراث · ${r.theme}`, url: `/culture?theme=${r.theme}` });
  for (const r of db.prepare('SELECT skill_id,skill_ar,category FROM skills WHERE skill_ar LIKE ? OR skill_en LIKE ? LIMIT ?').all(t, t, limit) as any[])
    out.push({ type: 'skill', id: r.skill_id, title: r.skill_ar, subtitle: `مهارة · ${r.category}`, url: `/skills?q=${encodeURIComponent(r.skill_ar)}` });
  for (const r of getDatasets({ q }).slice(0, limit))
    out.push({ type: 'dataset', id: r.id, title: r.title_ar, subtitle: `مجموعة بيانات · ${r.records} سجل`, url: `/datasets/${r.id}` });
  return out.slice(0, limit * 2);
}

export default db;
