/**
 * seed.ts — Normalize all source datasets into a single SQLite database + portable JSON exports.
 *
 * Sources (sibling app folders under data/apps):
 *   - ../uae2/projects_part{1..5}_ar.json        → 106 innovation projects (AR)
 *   - ../uae5/data/freezones.json                → 36 free zones
 *   - ../uae5/data/stats.json                    → 12 macro indicators
 *   - ../uae-ai-skills-sme-observatory/data/*    → AI skills taxonomy + observatory snapshot
 *   - ./data/culture.seed.json                   → curated culture & heritage collection
 *
 * Output:
 *   - data/uae.db                                → runtime SQLite database
 *   - data/export/*.json                         → portable normalized JSON (also used by /api data export)
 */
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const APPS = join(ROOT, '..'); // data/apps
const DATA = join(ROOT, 'data');
const EXPORT = join(DATA, 'export');
const DB_PATH = join(DATA, 'uae.db');

function readJSON(p: string): any {
  return JSON.parse(readFileSync(p, 'utf-8'));
}
function txt(v: any): string {
  if (v == null) return '';
  if (Array.isArray(v)) return v.map((x) => String(x)).join('، ');
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
function slugify(s: string, fallback: string): string {
  const base = s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
  return base || fallback;
}

// ---------------------------------------------------------------------------
// 1. INNOVATION PROJECTS
// ---------------------------------------------------------------------------
const SCORE_FIELDS = [
  'impact_score', 'innovation_score', 'golden_visa_relevance',
  'sovereignty_score', 'regulation_score', 'emiratization_score', 'sustainability_score',
] as const;

// Arabic keyword → application sector (first match wins, ordered by specificity)
const SECTOR_RULES: Array<[string, string, string[]]> = [
  ['energy', 'الطاقة', ['كهرباء', 'الطاقة', 'طاقة', 'شمسي', 'الشبكة الذكية', 'ديوا', 'توليد الكهرباء', 'هيدروجين', 'بطاري', 'الأحمال الكهربائية']],
  ['water', 'المياه', ['تحلية', 'مياه', 'المياه', 'الصرف الصحي', 'المحلول الملحّي', 'الجوفية', 'موارد المياه']],
  ['mobility', 'النقل والمواصلات', ['المرور', 'الطرق', 'مواصلات', 'النقل', 'مركبات', 'حافلات', 'مترو', 'الطيران', 'مطار', 'موانئ', 'الشحن', 'لوجست', 'حركة المرور']],
  ['environment', 'البيئة والاستدامة', ['بيئ', 'انبعاث', 'الكربون', 'المناخ', 'إعادة التدوير', 'النفايات', 'تلوث', 'التنوع البيولوجي', 'الجزر الحرارية']],
  ['health', 'الصحة', ['الصحة', 'صحي', 'طبي', 'مستشفى', 'المرضى', 'الدواء', 'العلاج', 'تشخيص', 'الرعاية الصحية']],
  ['education', 'التعليم والمهارات', ['التعليم', 'المدارس', 'الطلاب', 'الجامع', 'المهارات', 'التدريب', 'التعلّم']],
  ['finance', 'المالية', ['المالية', 'مصرف', 'البنوك', 'الاستثمار', 'التأمين', 'المدفوعات', 'الاحتيال', 'الضرائب', 'الفواتير']],
  ['realestate', 'العقارات والإسكان', ['عقار', 'الإسكان', 'المساكن', 'المباني', 'الإنشاء', 'مدينة ذكية', 'العقاري', 'البنية التحتية']],
  ['tourism', 'السياحة', ['سياح', 'الفنادق', 'الزوار', 'سائح', 'الوجهات', 'الفعاليات', 'الضيافة']],
  ['agriculture', 'الغذاء والزراعة', ['الزراع', 'الغذاء', 'المزارع', 'أغذية', 'المحاصيل', 'الأمن الغذائي', 'النخيل']],
  ['safety', 'الأمن والسلامة', ['الأمن', 'الشرطة', 'السلامة', 'الطوارئ', 'الدفاع المدني', 'إدارة المخاطر', 'الكوارث', 'الإنقاذ']],
  ['government', 'الحكومة والخدمات', ['حكوم', 'البلدية', 'الخدمات العامة', 'التراخيص', 'الوثائق', 'الهوية الرقمية', 'القطاع العام']],
  ['culture', 'الثقافة والتراث', ['الثقاف', 'التراث', 'المتاحف', 'الفنون', 'اللغة العربية', 'المخطوطات']],
  ['retail', 'التجارة والتجزئة', ['التجزئة', 'التسوق', 'التجارة الإلكترونية', 'المستهلك', 'السلع الاستهلاكية']],
];
function classifySector(text: string): { key: string; ar: string } {
  for (const [key, ar, kws] of SECTOR_RULES) {
    if (kws.some((k) => text.includes(k))) return { key, ar };
  }
  return { key: 'cross', ar: 'متعدد القطاعات' };
}
const EMIRATE_RULES: Array<[string, string[]]> = [
  ['Dubai', ['دبي', 'ديوا', 'هيئة الطرق والمواصلات']],
  ['Abu Dhabi', ['أبوظبي', 'أبو ظبي', 'مصدر', 'العين', 'ليوا']],
  ['Sharjah', ['الشارقة']],
  ['Ras Al Khaimah', ['رأس الخيمة']],
  ['Ajman', ['عجمان']],
  ['Fujairah', ['الفجيرة']],
  ['Umm Al Quwain', ['أم القيوين']],
];
function detectEmirate(text: string): string {
  for (const [em, kws] of EMIRATE_RULES) if (kws.some((k) => text.includes(k))) return em;
  return 'الإمارات';
}

const rawProjects: any[] = [];
for (let i = 1; i <= 5; i++) {
  const p = join(APPS, 'uae2', `projects_part${i}_ar.json`);
  if (existsSync(p)) rawProjects.push(...readJSON(p));
}
const seen = new Set<string>();
const projects: any[] = rawProjects.map((p, idx) => {
  const text = [p.name, p.mission, p.problem, p.target_users, p.public_benefit].join(' ');
  const sector = classifySector(text);
  const scores: Record<string, number> = {};
  let sum = 0;
  for (const f of SCORE_FIELDS) { scores[f] = Number(p[f]) || 0; sum += scores[f]; }
  let id = slugify(p.name, `project-${idx + 1}`);
  while (seen.has(id)) id = `${id}-${idx + 1}`;
  seen.add(id);
  return {
    id,
    name: txt(p.name),
    mission: txt(p.mission),
    problem: txt(p.problem),
    target_users: txt(p.target_users),
    public_benefit: txt(p.public_benefit),
    tech_stack: txt(p.tech_stack),
    ai_opportunities: txt(p.ai_opportunities),
    data_opportunities: txt(p.data_opportunities),
    open_source_opportunities: txt(p.open_source_opportunities),
    monetization: txt(p.monetization),
    sector_key: sector.key,
    sector_ar: sector.ar,
    emirate: detectEmirate(text),
    ...scores,
    avg_score: Math.round((sum / SCORE_FIELDS.length) * 10) / 10,
  };
});

// ---------------------------------------------------------------------------
// 2. FREE ZONES + MACRO STATS
// ---------------------------------------------------------------------------
const fzRaw = readJSON(join(APPS, 'uae5', 'data', 'freezones.json'));
const freezones = (fzRaw.zones as any[]).map((z) => ({
  id: z.id,
  name_en: z.name_en,
  name_ar: z.name_ar,
  emirate: z.emirate,
  established: z.established ?? null,
  type: z.type ?? 'freezone',
  sectors: z.sectors ?? [],
  cost_band: z.cost_band ?? 'mid',
  indicative_min_first_year_aed: z.indicative_min_first_year_aed ?? null,
  visas_with_base_package: z.visas_with_base_package ?? null,
  office_min: z.office_min ?? null,
  website: z.website ?? null,
  highlights_en: z.highlights_en ?? '',
  highlights_ar: z.highlights_ar ?? '',
  confidence: z.confidence ?? 0.7,
}));
const statsRaw = readJSON(join(APPS, 'uae5', 'data', 'stats.json'));
const macro = statsRaw.macro as any[];

// ---------------------------------------------------------------------------
// 3. AI SKILLS TAXONOMY + OBSERVATORY
// ---------------------------------------------------------------------------
function parseSkillsCSV(text: string): any[] {
  const lines = text.trim().split(/\r?\n/);
  lines.shift(); // header
  return lines.filter(Boolean).map((line) => {
    const parts = line.split(',');
    return {
      skill_id: parts[0]?.trim() ?? '',
      skill_en: parts[1]?.trim() ?? '',
      skill_ar: parts[2]?.trim() ?? '',
      category: parts[3]?.trim() ?? '',
      level: parts[4]?.trim() ?? '',
      example_use_case: parts.slice(5).join(',').trim(),
    };
  });
}
const skills = parseSkillsCSV(readFileSync(join(APPS, 'uae-ai-skills-sme-observatory', 'data', 'ai_skills_taxonomy.csv'), 'utf-8'));
const snapshot = readJSON(join(APPS, 'uae-ai-skills-sme-observatory', 'data', 'dashboard_snapshot.json'));
const indicators = readJSON(join(APPS, 'uae-ai-skills-sme-observatory', 'data', 'starter_indicators.json'));
const observatory = {
  generated_on: snapshot.generated_on,
  status: snapshot.status,
  kpis: snapshot.kpis ?? [],
  adoption_by_function: snapshot.adoption_by_function ?? [],
  skills_demand: snapshot.skills_demand ?? [],
  indicators: indicators.indicators ?? [],
};

// ---------------------------------------------------------------------------
// 4. CULTURE & HERITAGE
// ---------------------------------------------------------------------------
const cultureRaw = readJSON(join(DATA, 'culture.seed.json'));
const cultureThemes = cultureRaw.meta.themes as any[];
const culture = (cultureRaw.items as any[]).map((c) => ({ ...c, tags: c.tags ?? [] }));

// ---------------------------------------------------------------------------
// 5. DATASET CATALOG (Data Observatory registry)
// ---------------------------------------------------------------------------
const datasets = [
  {
    id: 'innovation-projects', title_ar: 'مشاريع الابتكار في الإمارات', title_en: 'UAE Innovation Projects',
    description_ar: 'قاعدة بيانات تضم 106 مشاريع ابتكارية مدعومة بالذكاء الاصطناعي عبر قطاعات الطاقة والنقل والصحة والبيئة وغيرها، مع درجات أثر وابتكار وحوكمة.',
    description_en: '106 AI-powered innovation projects across energy, mobility, health, environment and more — scored for impact, innovation and governance.',
    categories: ['AI', 'Innovation', 'Business'], records: projects.length, format: 'JSON', source: 'UAE Innovation Catalogue (curated)',
    license: 'CC BY 4.0', confidence: 0.8, updated: '2026-06-12', endpoint: '/api/v1/projects',
    fields: ['name', 'mission', 'sector', 'tech_stack', 'ai_opportunities', 'impact_score', 'innovation_score', 'sustainability_score'],
  },
  {
    id: 'free-zones', title_ar: 'المناطق الحرة في الإمارات', title_en: 'UAE Free Zones',
    description_ar: '36 منطقة حرة عبر الإمارات السبع مع التكاليف التأشيرية والقطاعات المدعومة وسنة التأسيس ودرجات الثقة.',
    description_en: '36 free zones across all seven emirates with costs, visa allowances, supported sectors and confidence scores.',
    categories: ['Business', 'SME', 'Real Estate'], records: freezones.length, format: 'JSON', source: fzRaw.meta?.source ?? 'u.ae / zone authorities',
    license: 'CC BY 4.0', confidence: 0.7, updated: fzRaw.meta?.updated ?? '2026-06', endpoint: '/api/v1/free-zones',
    fields: ['name_en', 'name_ar', 'emirate', 'cost_band', 'indicative_min_first_year_aed', 'visas_with_base_package', 'sectors'],
  },
  {
    id: 'macro-indicators', title_ar: 'المؤشرات الاقتصادية الكلية', title_en: 'Macro Economic Indicators',
    description_ar: 'مؤشرات اقتصادية كلية للإمارات (الناتج المحلي، السكان، الاستثمار الأجنبي، حصة القطاعات غير النفطية) مع المصدر والسنة.',
    description_en: 'UAE macro indicators (GDP, population, FDI, non-oil share) with source and vintage labelling.',
    categories: ['Business', 'Economy'], records: macro.length, format: 'JSON', source: 'IMF / UNCTAD / Ministry of Economy',
    license: 'CC BY 4.0', confidence: 0.75, updated: statsRaw.meta?.updated ?? '2026-06', endpoint: '/api/v1/stats',
    fields: ['key', 'value', 'label_en', 'label_ar', 'source', 'year'],
  },
  {
    id: 'ai-skills', title_ar: 'تصنيف مهارات الذكاء الاصطناعي', title_en: 'AI Skills Taxonomy',
    description_ar: 'تصنيف لمهارات الذكاء الاصطناعي مع الفئة والمستوى وأمثلة استخدام للشركات الصغيرة والمتوسطة.',
    description_en: 'AI skills taxonomy with category, level and SME use-case examples.',
    categories: ['AI', 'SME', 'Education'], records: skills.length, format: 'CSV/JSON', source: 'UAE AI Skills & SME Observatory',
    license: 'CC BY 4.0', confidence: 0.7, updated: '2026-06-11', endpoint: '/api/v1/skills',
    fields: ['skill_id', 'skill_en', 'skill_ar', 'category', 'level', 'example_use_case'],
  },
  {
    id: 'ai-observatory', title_ar: 'مرصد تبني الذكاء الاصطناعي', title_en: 'AI Adoption Observatory',
    description_ar: 'لقطة مؤشرات تبني الذكاء الاصطناعي حسب الوظيفة والطلب على المهارات ومؤشرات الاقتصاد الرقمي.',
    description_en: 'AI adoption snapshot by business function, skills demand and digital-economy indicators.',
    categories: ['AI', 'SME'], records: observatory.kpis.length + observatory.adoption_by_function.length + observatory.indicators.length,
    format: 'JSON', source: 'UAE AI Skills & SME Observatory', license: 'CC BY 4.0', confidence: 0.6, updated: observatory.generated_on,
    endpoint: '/api/v1/observatory', fields: ['kpis', 'adoption_by_function', 'skills_demand', 'indicators'],
  },
  {
    id: 'culture-heritage', title_ar: 'التراث والثقافة الإماراتية', title_en: 'UAE Culture & Heritage',
    description_ar: 'مجموعة منسقة من عناصر التراث الإماراتي عبر ستة محاور: طرق التجارة، المواسم، الحكايات، الثقافة، اللهجة، والمواقع التراثية.',
    description_en: 'Curated UAE heritage collection across six themes: trade routes, seasons, stories, culture, dialect and heritage sites.',
    categories: ['Culture', 'Heritage', 'Tourism'], records: culture.length, format: 'JSON', source: 'UNESCO ICH / DCT / curated',
    license: 'CC BY 4.0', confidence: 0.82, updated: cultureRaw.meta?.updated ?? '2026-06', endpoint: '/api/v1/culture',
    fields: ['theme', 'title_ar', 'title_en', 'summary_ar', 'era', 'lat', 'lng', 'tags', 'source', 'confidence'],
  },
];

// ---------------------------------------------------------------------------
// 6. KNOWLEDGE GRAPH (Emirates ⇄ Free Zones ⇄ Sectors ⇄ Projects + Skill domains)
// ---------------------------------------------------------------------------
type GNode = { id: string; label: string; type: string; weight: number; meta?: any };
type GEdge = { source: string; target: string; type: string };
const nodes = new Map<string, GNode>();
const edges: GEdge[] = [];
const addNode = (n: GNode) => { if (!nodes.has(n.id)) nodes.set(n.id, n); else nodes.get(n.id)!.weight += n.weight; };
const addEdge = (s: string, t: string, type: string) => { edges.push({ source: s, target: t, type }); };

// Emirates
const emirates = ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ras Al Khaimah', 'Ajman', 'Fujairah', 'Umm Al Quwain'];
const emirateAr: Record<string, string> = {
  'Dubai': 'دبي', 'Abu Dhabi': 'أبوظبي', 'Sharjah': 'الشارقة', 'Ras Al Khaimah': 'رأس الخيمة',
  'Ajman': 'عجمان', 'Fujairah': 'الفجيرة', 'Umm Al Quwain': 'أم القيوين',
};
for (const em of emirates) addNode({ id: `em:${em}`, label: emirateAr[em] ?? em, type: 'emirate', weight: 3 });
// Sectors (from projects)
const sectorAr = new Map<string, string>();
for (const p of projects) sectorAr.set(p.sector_key, p.sector_ar);
for (const [k, ar] of sectorAr) addNode({ id: `sec:${k}`, label: ar, type: 'sector', weight: 2 });
// Free zones → emirate, free zone → sectors
for (const z of freezones) {
  addNode({ id: `fz:${z.id}`, label: z.name_ar, type: 'freezone', weight: 1, meta: { emirate: z.emirate, cost_band: z.cost_band } });
  if (emirates.includes(z.emirate)) addEdge(`fz:${z.id}`, `em:${z.emirate}`, 'LOCATED_IN');
  for (const s of z.sectors) {
    const sid = `fzsec:${s}`;
    addNode({ id: sid, label: s, type: 'fzsector', weight: 1 });
    addEdge(`fz:${z.id}`, sid, 'SUPPORTS');
  }
}
// Projects → sector + emirate (cap project nodes to keep graph legible: link to sector + emirate)
for (const p of projects) {
  addNode({ id: `pr:${p.id}`, label: p.name, type: 'project', weight: 1, meta: { impact: p.impact_score, sector: p.sector_key } });
  addEdge(`pr:${p.id}`, `sec:${p.sector_key}`, 'BELONGS_TO');
  if (p.emirate !== 'الإمارات' && emirates.includes(p.emirate)) addEdge(`pr:${p.id}`, `em:${p.emirate}`, 'IMPLEMENTED_IN');
}
// Skill categories as a domain ring linked to AI sector
const skillCats = [...new Set(skills.map((s) => s.category).filter(Boolean))];
for (const c of skillCats) addNode({ id: `skc:${c}`, label: c, type: 'skillcat', weight: 1 });
const graph = { nodes: [...nodes.values()], edges };

// ---------------------------------------------------------------------------
// WRITE EXPORTS
// ---------------------------------------------------------------------------
if (existsSync(EXPORT)) rmSync(EXPORT, { recursive: true });
mkdirSync(EXPORT, { recursive: true });
const exports: Record<string, any> = {
  projects, freezones, stats: { meta: statsRaw.meta, macro }, skills,
  observatory, culture: { meta: cultureRaw.meta, items: culture }, datasets, graph,
};
for (const [name, data] of Object.entries(exports)) {
  writeFileSync(join(EXPORT, `${name}.json`), JSON.stringify(data, null, 2));
}

// ---------------------------------------------------------------------------
// BUILD SQLITE
// ---------------------------------------------------------------------------
if (existsSync(DB_PATH)) rmSync(DB_PATH);
const db = new DatabaseSync(DB_PATH);
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE projects (
    id TEXT PRIMARY KEY, name TEXT, mission TEXT, problem TEXT, target_users TEXT, public_benefit TEXT,
    tech_stack TEXT, ai_opportunities TEXT, data_opportunities TEXT, open_source_opportunities TEXT, monetization TEXT,
    sector_key TEXT, sector_ar TEXT, emirate TEXT,
    impact_score INT, innovation_score INT, golden_visa_relevance INT, sovereignty_score INT,
    regulation_score INT, emiratization_score INT, sustainability_score INT, avg_score REAL
  );
  CREATE TABLE freezones (
    id TEXT PRIMARY KEY, name_en TEXT, name_ar TEXT, emirate TEXT, established INT, type TEXT,
    sectors TEXT, cost_band TEXT, indicative_min_first_year_aed INT, visas_with_base_package INT,
    office_min TEXT, website TEXT, highlights_en TEXT, highlights_ar TEXT, confidence REAL
  );
  CREATE TABLE macro (key TEXT PRIMARY KEY, value TEXT, label_en TEXT, label_ar TEXT, source TEXT, year INT);
  CREATE TABLE skills (skill_id TEXT PRIMARY KEY, skill_en TEXT, skill_ar TEXT, category TEXT, level TEXT, example_use_case TEXT);
  CREATE TABLE culture (
    id TEXT PRIMARY KEY, theme TEXT, title_ar TEXT, title_en TEXT, summary_ar TEXT, summary_en TEXT,
    era TEXT, lat REAL, lng REAL, tags TEXT, source TEXT, confidence REAL
  );
  CREATE TABLE datasets (
    id TEXT PRIMARY KEY, title_ar TEXT, title_en TEXT, description_ar TEXT, description_en TEXT,
    categories TEXT, records INT, format TEXT, source TEXT, license TEXT, confidence REAL, updated TEXT, endpoint TEXT, fields TEXT
  );
  CREATE TABLE graph_nodes (id TEXT PRIMARY KEY, label TEXT, type TEXT, weight INT, meta TEXT);
  CREATE TABLE graph_edges (source TEXT, target TEXT, type TEXT);
  CREATE INDEX idx_proj_sector ON projects(sector_key);
  CREATE INDEX idx_proj_impact ON projects(impact_score);
  CREATE INDEX idx_fz_emirate ON freezones(emirate);
  CREATE INDEX idx_fz_cost ON freezones(cost_band);
  CREATE INDEX idx_skill_cat ON skills(category);
  CREATE INDEX idx_culture_theme ON culture(theme);
`);

const insProj = db.prepare(`INSERT INTO projects (id,name,mission,problem,target_users,public_benefit,tech_stack,ai_opportunities,data_opportunities,open_source_opportunities,monetization,sector_key,sector_ar,emirate,impact_score,innovation_score,golden_visa_relevance,sovereignty_score,regulation_score,emiratization_score,sustainability_score,avg_score) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
for (const p of projects) insProj.run(p.id, p.name, p.mission, p.problem, p.target_users, p.public_benefit, p.tech_stack, p.ai_opportunities, p.data_opportunities, p.open_source_opportunities, p.monetization, p.sector_key, p.sector_ar, p.emirate, p.impact_score, p.innovation_score, p.golden_visa_relevance, p.sovereignty_score, p.regulation_score, p.emiratization_score, p.sustainability_score, p.avg_score);

const insFz = db.prepare(`INSERT INTO freezones (id,name_en,name_ar,emirate,established,type,sectors,cost_band,indicative_min_first_year_aed,visas_with_base_package,office_min,website,highlights_en,highlights_ar,confidence) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
for (const z of freezones) insFz.run(z.id, z.name_en, z.name_ar, z.emirate, z.established, z.type, JSON.stringify(z.sectors), z.cost_band, z.indicative_min_first_year_aed, z.visas_with_base_package, z.office_min, z.website, z.highlights_en, z.highlights_ar, z.confidence);

const insMacro = db.prepare(`INSERT INTO macro (key,value,label_en,label_ar,source,year) VALUES (?,?,?,?,?,?)`);
for (const m of macro) insMacro.run(m.key, m.value, m.label_en ?? '', m.label_ar ?? '', m.source ?? '', m.year ?? null);

const insSkill = db.prepare(`INSERT INTO skills (skill_id,skill_en,skill_ar,category,level,example_use_case) VALUES (?,?,?,?,?,?)`);
for (const s of skills) insSkill.run(s.skill_id, s.skill_en, s.skill_ar, s.category, s.level, s.example_use_case);

const insCul = db.prepare(`INSERT INTO culture (id,theme,title_ar,title_en,summary_ar,summary_en,era,lat,lng,tags,source,confidence) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
for (const c of culture) insCul.run(c.id, c.theme, c.title_ar, c.title_en, c.summary_ar, c.summary_en ?? '', c.era ?? '', c.lat ?? null, c.lng ?? null, JSON.stringify(c.tags), c.source ?? '', c.confidence ?? 0.5);

const insDs = db.prepare(`INSERT INTO datasets (id,title_ar,title_en,description_ar,description_en,categories,records,format,source,license,confidence,updated,endpoint,fields) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
for (const d of datasets) insDs.run(d.id, d.title_ar, d.title_en, d.description_ar, d.description_en, JSON.stringify(d.categories), d.records, d.format, d.source, d.license, d.confidence, d.updated, d.endpoint, JSON.stringify(d.fields));

const insGN = db.prepare(`INSERT INTO graph_nodes (id,label,type,weight,meta) VALUES (?,?,?,?,?)`);
for (const n of graph.nodes) insGN.run(n.id, n.label, n.type, n.weight, JSON.stringify(n.meta ?? null));
const insGE = db.prepare(`INSERT INTO graph_edges (source,target,type) VALUES (?,?,?)`);
for (const e of graph.edges) insGE.run(e.source, e.target, e.type);

db.close();

console.log('✓ Seed complete');
console.log(`  projects:   ${projects.length}`);
console.log(`  freezones:  ${freezones.length}`);
console.log(`  macro:      ${macro.length}`);
console.log(`  skills:     ${skills.length}`);
console.log(`  culture:    ${culture.length}`);
console.log(`  datasets:   ${datasets.length}`);
console.log(`  graph:      ${graph.nodes.length} nodes / ${graph.edges.length} edges`);
console.log(`  → ${DB_PATH}`);
console.log(`  → ${EXPORT}/*.json`);
