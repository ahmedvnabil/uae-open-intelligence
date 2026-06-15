/**
 * build-db.ts — Build data/uae.db purely from the committed data/export/*.json.
 * Self-contained: needs NO sibling source folders (unlike seed.ts). Use this on a
 * fresh clone / in Docker:  `npm run build-db`.
 * (seed.ts is the full pipeline that regenerates the export from raw sources.)
 */
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, existsSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const DATA = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');
const EXPORT = join(DATA, 'export');
const DB_PATH = join(DATA, 'uae.db');
const rd = (name: string) => JSON.parse(readFileSync(join(EXPORT, `${name}.json`), 'utf-8'));

if (!existsSync(EXPORT)) throw new Error(`Missing ${EXPORT}. Run \`npm run seed\` once (with source folders present) to generate the export.`);

const projects = rd('projects');
const freezones = rd('freezones');
const stats = rd('stats');           // { meta, macro }
const skills = rd('skills');
const culture = rd('culture');       // { meta, items }
const datasets = rd('datasets');
const graph = rd('graph');           // { nodes, edges }

if (existsSync(DB_PATH)) rmSync(DB_PATH);
const db = new DatabaseSync(DB_PATH);
db.exec(`
  CREATE TABLE projects (
    id TEXT PRIMARY KEY, name TEXT, mission TEXT, problem TEXT, target_users TEXT, public_benefit TEXT,
    tech_stack TEXT, ai_opportunities TEXT, data_opportunities TEXT, open_source_opportunities TEXT, monetization TEXT,
    sector_key TEXT, sector_ar TEXT, emirate TEXT,
    impact_score INT, innovation_score INT, golden_visa_relevance INT, sovereignty_score INT,
    regulation_score INT, emiratization_score INT, sustainability_score INT, avg_score REAL );
  CREATE TABLE freezones (
    id TEXT PRIMARY KEY, name_en TEXT, name_ar TEXT, emirate TEXT, established INT, type TEXT,
    sectors TEXT, cost_band TEXT, indicative_min_first_year_aed INT, visas_with_base_package INT,
    office_min TEXT, website TEXT, highlights_en TEXT, highlights_ar TEXT, confidence REAL );
  CREATE TABLE macro (key TEXT PRIMARY KEY, value TEXT, label_en TEXT, label_ar TEXT, source TEXT, year INT);
  CREATE TABLE skills (skill_id TEXT PRIMARY KEY, skill_en TEXT, skill_ar TEXT, category TEXT, level TEXT, example_use_case TEXT);
  CREATE TABLE culture (
    id TEXT PRIMARY KEY, theme TEXT, title_ar TEXT, title_en TEXT, summary_ar TEXT, summary_en TEXT,
    era TEXT, lat REAL, lng REAL, tags TEXT, source TEXT, confidence REAL );
  CREATE TABLE datasets (
    id TEXT PRIMARY KEY, title_ar TEXT, title_en TEXT, description_ar TEXT, description_en TEXT,
    categories TEXT, records INT, format TEXT, source TEXT, license TEXT, confidence REAL, updated TEXT, endpoint TEXT, fields TEXT );
  CREATE TABLE graph_nodes (id TEXT PRIMARY KEY, label TEXT, type TEXT, weight INT, meta TEXT);
  CREATE TABLE graph_edges (source TEXT, target TEXT, type TEXT);
  CREATE INDEX idx_proj_sector ON projects(sector_key);
  CREATE INDEX idx_proj_impact ON projects(impact_score);
  CREATE INDEX idx_fz_emirate ON freezones(emirate);
  CREATE INDEX idx_fz_cost ON freezones(cost_band);
  CREATE INDEX idx_skill_cat ON skills(category);
  CREATE INDEX idx_culture_theme ON culture(theme);
`);

const S = (v: any) => (v == null ? null : typeof v === 'object' ? JSON.stringify(v) : v);
const insProj = db.prepare(`INSERT INTO projects VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
for (const p of projects) insProj.run(p.id, p.name, p.mission, p.problem, p.target_users, p.public_benefit, p.tech_stack, p.ai_opportunities, p.data_opportunities, p.open_source_opportunities, p.monetization, p.sector_key, p.sector_ar, p.emirate, p.impact_score, p.innovation_score, p.golden_visa_relevance, p.sovereignty_score, p.regulation_score, p.emiratization_score, p.sustainability_score, p.avg_score);
const insFz = db.prepare(`INSERT INTO freezones VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
for (const z of freezones) insFz.run(z.id, z.name_en, z.name_ar, z.emirate, z.established, z.type, S(z.sectors), z.cost_band, z.indicative_min_first_year_aed, z.visas_with_base_package, z.office_min, z.website, z.highlights_en, z.highlights_ar, z.confidence);
const insMacro = db.prepare(`INSERT INTO macro VALUES (?,?,?,?,?,?)`);
for (const m of stats.macro) insMacro.run(m.key, m.value, m.label_en ?? '', m.label_ar ?? '', m.source ?? '', m.year ?? null);
const insSkill = db.prepare(`INSERT INTO skills VALUES (?,?,?,?,?,?)`);
for (const s of skills) insSkill.run(s.skill_id, s.skill_en, s.skill_ar, s.category, s.level, s.example_use_case);
const insCul = db.prepare(`INSERT INTO culture VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
for (const c of culture.items) insCul.run(c.id, c.theme, c.title_ar, c.title_en, c.summary_ar, c.summary_en ?? '', c.era ?? '', c.lat ?? null, c.lng ?? null, S(c.tags), c.source ?? '', c.confidence ?? 0.5);
const insDs = db.prepare(`INSERT INTO datasets VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
for (const d of datasets) insDs.run(d.id, d.title_ar, d.title_en, d.description_ar, d.description_en, S(d.categories), d.records, d.format, d.source, d.license, d.confidence, d.updated, d.endpoint, S(d.fields));
const insGN = db.prepare(`INSERT INTO graph_nodes VALUES (?,?,?,?,?)`);
for (const n of graph.nodes) insGN.run(n.id, n.label, n.type, n.weight, S(n.meta ?? null));
const insGE = db.prepare(`INSERT INTO graph_edges VALUES (?,?,?)`);
for (const e of graph.edges) insGE.run(e.source, e.target, e.type);

db.close();
console.log(`✓ Built ${DB_PATH} from export — ${projects.length} projects, ${freezones.length} freezones, ${skills.length} skills, ${culture.items.length} culture, ${graph.nodes.length} nodes.`);
