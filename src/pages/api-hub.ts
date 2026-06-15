/** api-hub.ts — API Hub: Swagger-like interactive REST explorer with a live tester. */
import type { LayoutOpts } from '../lib/layout.js';
import { icon } from '../lib/icons.js';
import { esc } from '../lib/i18n.js';
import { pageHead, sectionHead, badge, copyBtn } from '../lib/ui.js';
import { platformStats, getProjects } from '../lib/db.js';

const BASE = '/api/v1';

interface Param { name: string; type: string; desc: string; example?: string }
interface Endpoint {
  method: 'GET';
  path: string;        // path after BASE, e.g. '/projects'
  title: string;       // Arabic title
  desc: string;        // Arabic description
  params?: Param[];    // query / path params
  sample: string;      // a ready-to-run example query string (everything after the path), '' if none
}
interface ResourceGroup { id: string; label: string; iconName: string; tone: string; endpoints: Endpoint[] }

/* ---- Endpoint catalogue (mirrors src/routes/api.ts) -------------------- */
const GROUPS: ResourceGroup[] = [
  {
    id: 'platform', label: 'المنصة', iconName: 'dashboard', tone: 'green',
    endpoints: [
      {
        method: 'GET', path: '/stats', sample: '',
        title: 'إحصاءات المنصة',
        desc: 'عدّادات شاملة لكل المراصد (مشاريع، مناطق حرة، مهارات، تراث، مجموعات بيانات) مع المؤشرات الاقتصادية الكلية الموسومة بالمصدر والسنة.',
      },
      {
        method: 'GET', path: '/search', sample: '?q=ذكاء&limit=8',
        title: 'البحث الشامل',
        desc: 'بحثٌ موحّد عبر جميع المراصد دفعةً واحدة — يُرجِع نتائج مصنّفة بالنوع مع روابط مباشرة لكل سجل.',
        params: [
          { name: 'q', type: 'string', desc: 'نص البحث (مطلوب لإرجاع نتائج).', example: 'ذكاء' },
          { name: 'limit', type: 'integer', desc: 'حدّ النتائج لكل نوع. الافتراضي 8.', example: '8' },
        ],
      },
    ],
  },
  {
    id: 'projects', label: 'مشاريع الابتكار', iconName: 'bulb', tone: 'green',
    endpoints: [
      {
        method: 'GET', path: '/projects', sample: '?sector=mobility&sort=impact&page=1&limit=24',
        title: 'قائمة المشاريع',
        desc: 'قائمة مشاريع الابتكار قابلة للبحث والتصفية والترتيب والترقيم. تتضمن بيانات الترقيم في كتلة meta.',
        params: [
          { name: 'q', type: 'string', desc: 'بحث في الاسم والمهمة والمشكلة والمكدّس التقني.', example: 'استدامة' },
          { name: 'sector', type: 'string', desc: 'تصفية حسب مفتاح القطاع (sector_key): mobility · environment · health · energy · education · finance · …', example: 'mobility' },
          { name: 'emirate', type: 'string', desc: 'تصفية حسب الإمارة.', example: 'Dubai' },
          { name: 'minImpact', type: 'integer', desc: 'حدّ أدنى لدرجة الأثر (0–10).', example: '7' },
          { name: 'sort', type: 'string', desc: 'الترتيب: impact · innovation · sustainability · emiratization · golden_visa · avg · name', example: 'impact' },
          { name: 'page', type: 'integer', desc: 'رقم الصفحة. الافتراضي 1.', example: '1' },
          { name: 'limit', type: 'integer', desc: 'عدد العناصر لكل صفحة (1–200). الافتراضي 24.', example: '24' },
        ],
      },
      {
        method: 'GET', path: '/projects/facets', sample: '',
        title: 'وجوه تصنيف المشاريع',
        desc: 'تجميعات جاهزة للفلاتر: عدد المشاريع ومتوسط الأثر لكل قطاع، وتوزيعها على الإمارات.',
      },
      {
        method: 'GET', path: '/projects/:id', sample: '/p001',
        title: 'تفاصيل مشروع',
        desc: 'سجل مشروع كامل بكل درجاته وفرص الذكاء الاصطناعي والبيانات والمصادر المفتوحة. يُرجِع 404 إذا لم يوجد.',
        params: [
          { name: 'id', type: 'path', desc: 'معرّف المشروع.', example: 'p001' },
        ],
      },
    ],
  },
  {
    id: 'free-zones', label: 'المناطق الحرة', iconName: 'building', tone: 'blue',
    endpoints: [
      {
        method: 'GET', path: '/free-zones', sample: '?costBand=mid&sort=cost_asc&page=1',
        title: 'قائمة المناطق الحرة',
        desc: 'المناطق الحرة عبر الإمارات السبع مع نطاقات التكلفة والقطاعات وعدد التأشيرات والثقة — قابلة للبحث والتصفية والترقيم.',
        params: [
          { name: 'q', type: 'string', desc: 'بحث في الاسم والمميزات (عربي/إنجليزي).', example: 'تقنية' },
          { name: 'emirate', type: 'string', desc: 'تصفية حسب الإمارة.', example: 'Dubai' },
          { name: 'costBand', type: 'string', desc: 'نطاق التكلفة: low · mid · high', example: 'mid' },
          { name: 'sector', type: 'string', desc: 'تصفية حسب قطاع مدعوم.', example: 'media' },
          { name: 'sort', type: 'string', desc: 'الترتيب: cost_asc · cost_desc · established · visas · confidence · name', example: 'cost_asc' },
          { name: 'page', type: 'integer', desc: 'رقم الصفحة. الافتراضي 1.', example: '1' },
          { name: 'limit', type: 'integer', desc: 'عدد العناصر لكل صفحة (1–200). الافتراضي 36.', example: '36' },
        ],
      },
      {
        method: 'GET', path: '/free-zones/facets', sample: '',
        title: 'وجوه تصنيف المناطق الحرة',
        desc: 'تجميعات الفلاتر: عدد ومتوسط التكلفة لكل إمارة، وتوزيع نطاقات التكلفة، وعدد المناطق لكل قطاع.',
      },
      {
        method: 'GET', path: '/free-zones/:id', sample: '/dmcc',
        title: 'تفاصيل منطقة حرة',
        desc: 'سجل منطقة حرة كامل بقطاعاتها وتكاليفها ومميزاتها ودرجة الثقة. يُرجِع 404 إذا لم يوجد.',
        params: [
          { name: 'id', type: 'path', desc: 'معرّف المنطقة الحرة.', example: 'fz01' },
        ],
      },
    ],
  },
  {
    id: 'skills', label: 'المهارات والمرصد', iconName: 'brain', tone: 'violet',
    endpoints: [
      {
        method: 'GET', path: '/skills', sample: '?level=Advanced',
        title: 'مهارات الذكاء الاصطناعي',
        desc: 'كتالوج مهارات الذكاء الاصطناعي بالمستويات والأمثلة التطبيقية، مع وجوه التصنيف في كتلة meta.facets.',
        params: [
          { name: 'category', type: 'string', desc: 'تصفية حسب فئة المهارة: Foundation · Data · Technical · Business · Governance · Cybersecurity', example: 'Technical' },
          { name: 'level', type: 'string', desc: 'المستوى: Beginner · Intermediate · Advanced', example: 'Advanced' },
          { name: 'q', type: 'string', desc: 'بحث في اسم المهارة ومثال الاستخدام.', example: 'تحليل' },
        ],
      },
      {
        method: 'GET', path: '/observatory', sample: '',
        title: 'مرصد التبنّي',
        desc: 'لقطة مرصد تبنّي الذكاء الاصطناعي: مؤشرات الأداء، التبنّي حسب الوظيفة، الطلب على المهارات، والمؤشرات الزمنية مع خطوط الأساس والأهداف.',
      },
    ],
  },
  {
    id: 'culture', label: 'الثقافة والتراث', iconName: 'landmark', tone: 'gold',
    endpoints: [
      {
        method: 'GET', path: '/culture', sample: '?theme=turuq',
        title: 'عناصر التراث',
        desc: 'عناصر تراثية بإحداثيات على الخريطة وموسومة بالمحور والوسوم والمصدر ودرجة الثقة — قابلة للتصفية بالمحور والبحث.',
        params: [
          { name: 'theme', type: 'string', desc: 'تصفية حسب المحور الثقافي: turuq · mawasem · hikayat · thaqafah · lahja · maktabati', example: 'turuq' },
          { name: 'q', type: 'string', desc: 'بحث في العنوان والملخص.', example: 'صقور' },
        ],
      },
      {
        method: 'GET', path: '/culture/themes', sample: '',
        title: 'المحاور الثقافية',
        desc: 'قائمة المحاور الثقافية مع عدد العناصر في كل محور — مثالية لبناء فلاتر شريط الرقائق.',
      },
    ],
  },
  {
    id: 'datasets', label: 'مرصد البيانات', iconName: 'database', tone: 'blue',
    endpoints: [
      {
        method: 'GET', path: '/datasets', sample: '?category=AI',
        title: 'كتالوج مجموعات البيانات',
        desc: 'فهرس مجموعات البيانات القابلة للتصدير، بعدد السجلات والصيغة والمصدر والترخيص ووصف الحقول — قابل للتصفية بالتصنيف والبحث.',
        params: [
          { name: 'category', type: 'string', desc: 'تصفية حسب التصنيف.', example: 'AI' },
          { name: 'q', type: 'string', desc: 'بحث في العنوان والوصف (عربي/إنجليزي).', example: 'سياحة' },
        ],
      },
      {
        method: 'GET', path: '/datasets/:id', sample: '/innovation-projects',
        title: 'تفاصيل مجموعة بيانات',
        desc: 'بطاقة مجموعة بيانات كاملة بحقولها ونقطة الوصول والترخيص. يُرجِع 404 إذا لم توجد.',
        params: [
          { name: 'id', type: 'path', desc: 'معرّف مجموعة البيانات.', example: 'ds01' },
        ],
      },
      {
        method: 'GET', path: '/categories', sample: '',
        title: 'تصنيفات البيانات',
        desc: 'عدد مجموعات البيانات لكل تصنيف — مرتّبة تنازليًا حسب العدد.',
      },
    ],
  },
  {
    id: 'graph', label: 'الرسم المعرفي', iconName: 'graph', tone: 'violet',
    endpoints: [
      {
        method: 'GET', path: '/graph', sample: '?types=emirate,sector',
        title: 'الرسم المعرفي',
        desc: 'عقد وحواف الرسم المعرفي الذي يربط الإمارات والقطاعات والمناطق الحرة والمشاريع وفئات المهارات. يمكن تصفيته بأنواع العقد.',
        params: [
          { name: 'types', type: 'string', desc: 'أنواع العقد مفصولةً بفواصل: emirate · sector · freezone · fzsector · project · skillcat', example: 'emirate,sector' },
        ],
      },
    ],
  },
];

const ENVELOPE_OK = `{
  "ok": true,
  "data": { /* الحمولة: كائن أو مصفوفة */ },
  "error": null,
  "meta": {
    "page": 1,
    "limit": 24,
    "total": 188,
    "has_more": true
  }
}`;

const ENVELOPE_ERR = `{
  "ok": false,
  "data": null,
  "error": "لم يتم العثور على المشروع",
  "code": "NOT_FOUND"
}`;

const TYPE_BADGE: Record<string, string> = {
  path: 'badge', integer: 'badge blue', string: 'badge green',
};

function paramTable(params?: Param[]): string {
  if (!params?.length) return '';
  return `<div class="table-wrap mt-3">
    <table class="data">
      <thead><tr><th>المُعامل</th><th>النوع</th><th>الوصف</th><th class="num">مثال</th></tr></thead>
      <tbody>
        ${params.map((p) => `<tr>
          <td class="mono fw-6">${esc(p.name)}</td>
          <td><span class="${TYPE_BADGE[p.type] ?? 'badge'}">${esc(p.type)}</span></td>
          <td class="muted-1 t-sm">${esc(p.desc)}</td>
          <td class="num muted">${p.example ? esc(p.example) : '—'}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>`;
}

/** Resolve a real, working sample suffix for path-param endpoints. */
function trySample(ep: Endpoint): string {
  if (ep.path === '/projects/:id') {
    const r = getProjects({ limit: 1 }).rows[0] as any;
    return r ? '/' + r.id : ep.sample;
  }
  return ep.sample;
}

function endpointCard(ep: Endpoint, idx: string): string {
  const full = BASE + ep.path;
  // For path-param endpoints the tester base must drop the trailing "/:param";
  // the real id comes from the (editable) sample input → base + sample = a live URL.
  const tryBase = full.replace(/\/:[^/]+$/, '');
  const sampleVal = trySample(ep);
  const paramsCount = ep.params?.length ?? 0;
  return `<div class="panel panel-pad api-ep reveal" id="ep-${esc(idx)}">
    <div class="flex items-center gap-3 flex-wrap api-ep-head">
      <span class="badge green api-method">${esc(ep.method)}</span>
      <code class="api-path mono">${esc(full)}</code>
      ${copyBtn(full)}
      <span class="api-ep-spacer"></span>
      ${paramsCount ? `<span class="tag">${paramsCount} مُعامل</span>` : `<span class="tag">بلا مُعاملات</span>`}
    </div>
    <p class="muted-1 t-sm mt-3" style="line-height:1.7">${esc(ep.title)} — ${esc(ep.desc)}</p>
    ${paramTable(ep.params)}

    <div class="api-try mt-4">
      <div class="flex items-center gap-2 flex-wrap api-try-bar">
        <span class="api-try-label mono">${esc(tryBase)}</span>
        <input class="input mono api-qs" data-base="${esc(tryBase)}" value="${esc(sampleVal)}"
          placeholder="?param=value" aria-label="معاملات الاستعلام لـ ${esc(ep.path)}" spellcheck="false" />
        <button class="btn btn-primary btn-sm api-run" data-target="out-${esc(idx)}" type="button">
          ${icon('play')} تشغيل
        </button>
        <button class="btn btn-ghost btn-sm api-copy-url" type="button" title="نسخ الرابط الكامل">
          ${icon('copy')}
        </button>
      </div>
      <pre class="api-pre" id="out-${esc(idx)}" data-empty="اضغط «تشغيل» لإرسال الطلب ومعاينة استجابة JSON المباشرة…"></pre>
    </div>
  </div>`;
}

export function apiHubPage(): LayoutOpts {
  const s = platformStats();
  const totalEndpoints = GROUPS.reduce((n, g) => n + g.endpoints.length, 0);

  const head = `<style>
  .api-toc { position: sticky; top: calc(var(--topbar-h) + var(--sp-4)); align-self: start; }
  .api-toc a { display:flex; align-items:center; gap:var(--sp-2); padding:8px var(--sp-3); border-radius:var(--r-md); color:var(--txt-1); font-size:13px; font-weight:500; transition:background var(--t-fast), color var(--t-fast); }
  .api-toc a:hover { background:var(--bg-3); color:var(--txt-0); }
  .api-toc a .ico { width:16px; height:16px; opacity:.8; }
  .api-toc .count { margin-inline-start:auto; font-family:var(--font-mono); font-size:11px; color:var(--txt-2); background:var(--bg-3); padding:1px 7px; border-radius:99px; }
  .api-layout { display:grid; grid-template-columns: 232px 1fr; gap:var(--sp-5); align-items:start; }
  @media (max-width: 1100px){ .api-layout { grid-template-columns:1fr; } .api-toc { position:static; } }

  .api-method { font-family:var(--font-mono); font-weight:700; letter-spacing:.06em; padding:3px 10px; }
  .api-path { font-size:14px; color:var(--txt-0); background:var(--bg-0); border:1px solid var(--line); padding:4px 10px; border-radius:var(--r-sm); direction:ltr; text-align:left; max-width:100%; overflow-x:auto; white-space:nowrap; -webkit-overflow-scrolling:touch; }
  .api-ep-spacer { flex:1; }
  .api-ep-head { row-gap:var(--sp-2); }

  .api-try { border-top:1px dashed var(--line); padding-top:var(--sp-4); }
  .api-try-bar { row-gap:var(--sp-2); }
  .api-try-label { font-size:12.5px; color:var(--txt-2); background:var(--bg-0); border:1px solid var(--line); padding:0 10px; height:34px; display:inline-flex; align-items:center; border-radius:var(--r-sm); white-space:nowrap; max-width:100%; overflow-x:auto; direction:ltr; -webkit-overflow-scrolling:touch; }
  .api-qs { height:34px; flex:1; min-width:160px; background:var(--bg-0); font-size:13px; direction:ltr; text-align:left; }
  .api-run { height:34px; white-space:nowrap; }
  .api-run[disabled] { opacity:.6; cursor:progress; }
  .api-copy-url { height:34px; padding:0 10px; }
  /* On narrow screens the try-bar stacks so nothing overflows the card. */
  @media (max-width: 560px){
    .api-try-bar { flex-direction:column; align-items:stretch; }
    .api-try-label { width:100%; }
    .api-qs { width:100%; flex:none; min-width:0; }
    .api-run { width:100%; }
    .api-copy-url { width:100%; }
  }

  .api-pre {
    margin:var(--sp-3) 0 0; background:#04070c; border:1px solid var(--line); border-radius:var(--r-md);
    padding:var(--sp-4); font-family:var(--font-mono); font-size:12.5px; line-height:1.65; color:#cfe3d6;
    max-height:420px; overflow:auto; white-space:pre; tab-size:2; direction:ltr; text-align:left;
  }
  .api-pre:empty::before { content: attr(data-empty); color:var(--txt-2); font-family:var(--font-ar); white-space:normal; }
  .api-pre.loading { color:var(--txt-2); }
  .api-pre.ok { border-color: rgba(0,214,143,.35); box-shadow: inset 0 0 0 1px rgba(0,214,143,.12); }
  .api-pre.err { border-color: rgba(255,93,108,.4); color:#ffc9cf; box-shadow: inset 0 0 0 1px rgba(255,93,108,.12); }
  .api-pre .k { color:#7fd1ff; } .api-pre .s { color:#a3e6b9; } .api-pre .n { color:#f5c451; } .api-pre .b { color:#9d8bff; }

  .api-envelope-grid { display:grid; grid-template-columns:1fr 1fr; gap:var(--sp-4); }
  @media (max-width: 720px){ .api-envelope-grid { grid-template-columns:1fr; } }
  .api-ep + .api-ep { margin-top:var(--sp-4); }
  .api-grp { margin-bottom:var(--sp-6); scroll-margin-top: calc(var(--topbar-h) + var(--sp-4)); }
  </style>`;

  const toc = GROUPS.map((g) => `<a href="#grp-${esc(g.id)}">
    ${icon(g.iconName)}<span>${esc(g.label)}</span><span class="count">${g.endpoints.length}</span>
  </a>`).join('');

  let idx = 0;
  const groupsHtml = GROUPS.map((g) => `
    <section class="api-grp" id="grp-${esc(g.id)}">
      ${sectionHead({ title: g.label, iconName: g.iconName, sub: `${g.endpoints.length} نقطة نهاية ضمن مورد «${g.label}»` })}
      ${g.endpoints.map((ep) => endpointCard(ep, String(idx++))).join('')}
    </section>`).join('');

  const body = `
  ${pageHead({
    eyebrow: 'المنصة والمطورون · DEVELOPER API',
    title: 'مركز الـ API',
    lede: 'كل بياناتنا متاحةٌ عبر واجهة REST واحدة تحت /api/v1، بمظروف استجابة قياسي { ok, data, error, meta }. البيانات مرخّصة بـ CC BY 4.0، وحدّ المعدّل 240 طلبًا في الدقيقة لكل عنوان IP.',
    actions: `<a class="btn" href="${BASE}" target="_blank" rel="noopener">${icon('external')} الفهرس الجذري</a>
      <a class="btn btn-ghost" href="/datasets">${icon('database')} مرصد البيانات</a>`,
  })}

  <section class="kpi-grid mb-6">
    ${kpi('نقطة نهاية', totalEndpoints, 'code', 'green', true)}
    ${kpi('مورد بياني', GROUPS.length, 'layers', 'blue')}
    ${kpi('سجل متاح', s.totalRecords, 'database', 'gold')}
    ${kpi('طلب/دقيقة', 240, 'zap', 'violet')}
  </section>

  <section class="panel panel-pad mb-6 reveal">
    ${sectionHead({ title: 'مظروف الاستجابة القياسي', iconName: 'layers', sub: 'كل استجابات الـ API تتبع هذا الشكل — تحقّق من الحقل ok أولًا قبل قراءة data.' })}
    <div class="api-envelope-grid">
      <div>
        <div class="flex items-center gap-2 mb-2">${badge('نجاح · 200', 'green', true)}<span class="muted t-xs">عند توفّر ترقيم تظهر كتلة meta</span></div>
        <pre class="api-pre" data-raw="${esc(ENVELOPE_OK)}"></pre>
      </div>
      <div>
        <div class="flex items-center gap-2 mb-2">${badge('خطأ · 4xx', 'red', true)}<span class="muted t-xs">الحقل code قابل للقراءة آليًا</span></div>
        <pre class="api-pre" data-raw="${esc(ENVELOPE_ERR)}"></pre>
      </div>
    </div>
    <div class="flex flex-wrap gap-3 mt-4 muted t-sm">
      <span class="flex items-center gap-2">${icon('check')} الترقيم: <code class="mono">?page=1&amp;limit=50</code></span>
      <span class="flex items-center gap-2">${icon('check')} الترميز: <span class="mono">UTF-8 · JSON</span></span>
      <span class="flex items-center gap-2">${icon('check')} الطريقة: <span class="mono">GET فقط (قراءة)</span></span>
      <span class="flex items-center gap-2">${icon('shield')} الترخيص: <span class="mono">CC BY 4.0</span></span>
    </div>
  </section>

  <div class="api-layout">
    <nav class="api-toc panel panel-pad" aria-label="فهرس الموارد">
      <div class="muted t-xs uppercase mb-2" style="padding-inline:var(--sp-3)">الموارد</div>
      ${toc}
      <div class="divider"></div>
      <button class="btn btn-ghost btn-sm w-full" id="apiRunAll" type="button">${icon('play')} تشغيل كل النقاط</button>
    </nav>

    <div>
      <div class="panel panel-pad mb-5 reveal" style="background:linear-gradient(135deg,var(--accent-soft),transparent);border-color:var(--accent-line)">
        <div class="flex items-center gap-3 flex-wrap">
          <span class="brand-mark" style="background:linear-gradient(140deg,var(--uae-green),var(--uae-emerald))">${icon('command')}</span>
          <div class="flex-1" style="min-width:200px">
            <div class="fw-7">وحدة تحكّم المطوّر التفاعلية</div>
            <div class="muted t-sm mt-1">عدّل معاملات الاستعلام في أي حقل ثم اضغط «تشغيل» لإرسال طلب حيّ ومعاينة استجابة JSON المُنسّقة في مكانها.</div>
          </div>
          <span class="live-pill"><span class="dot-status"></span> حيّ على هذا الأصل</span>
        </div>
      </div>
      ${groupsHtml}
    </div>
  </div>`;

  const bodyEnd = `<script>
  document.addEventListener('DOMContentLoaded', function () {
    var origin = window.location.origin;

    // --- Minimal, safe JSON syntax highlighter (input is HTML-escaped first) ---
    function escHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
    function highlight(jsonStr){
      var safe = escHtml(jsonStr);
      safe = safe.replace(/("(\\\\u[a-zA-Z0-9]{4}|\\\\[^u]|[^\\\\"])*")(\\s*:)?/g, function(m, str, _g, colon){
        if (colon) return '<span class="k">' + str + '</span>' + colon;
        return '<span class="s">' + str + '</span>';
      });
      safe = safe.replace(/\\b(-?\\d+\\.?\\d*([eE][+-]?\\d+)?)\\b/g, '<span class="n">$1</span>');
      safe = safe.replace(/\\b(true|false|null)\\b/g, '<span class="b">$1</span>');
      return safe;
    }
    function render(pre, jsonStr, cls){
      pre.className = 'api-pre ' + (cls || '');
      pre.innerHTML = highlight(jsonStr);
    }

    // Pretty-print the static envelope example blocks (data-raw attribute, may contain comments).
    document.querySelectorAll('.api-pre[data-raw]').forEach(function(pre){
      render(pre, pre.getAttribute('data-raw'), '');
    });

    function fullPath(card){
      var input = card.querySelector('.api-qs');
      var base = input.getAttribute('data-base');
      var qs = (input.value || '').trim();
      return base + qs;
    }

    async function run(card){
      var runBtn = card.querySelector('.api-run');
      var out = document.getElementById(runBtn.getAttribute('data-target'));
      var path = fullPath(card);
      // --- LOADING state: pre shows a spinner-style status line, button is disabled/busy. ---
      out.className = 'api-pre loading';
      out.textContent = '⏳ جارٍ الإرسال…  GET ' + path;
      var btnLabel = runBtn.innerHTML;
      runBtn.disabled = true;
      runBtn.setAttribute('aria-busy', 'true');
      var t0 = performance.now();
      // Abort a hung request after 15s so the user gets a clear error, not an endless spinner.
      var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      var timer = ctrl ? setTimeout(function(){ ctrl.abort(); }, 15000) : null;
      try {
        var res = await fetch(path, { headers: { 'Accept': 'application/json' }, signal: ctrl ? ctrl.signal : undefined });
        if (timer) clearTimeout(timer);
        var ms = Math.round(performance.now() - t0);
        var text = await res.text();
        var pretty;
        try { pretty = JSON.stringify(JSON.parse(text), null, 2); }
        catch(_) { pretty = text; }
        var header = '// ' + res.status + ' ' + res.statusText + '  ·  ' + ms + 'ms  ·  ' + path + '\\n';
        render(out, header + pretty, res.ok ? 'ok' : 'err');
      } catch (err) {
        if (timer) clearTimeout(timer);
        // --- ERROR state: network failure / abort / parse — graceful, readable message. ---
        var msg = (err && err.name === 'AbortError')
          ? 'انتهت مهلة الطلب (15 ثانية) — تحقّق من اتصال الشبكة وحاول مجددًا.'
          : String(err && err.message ? err.message : err);
        render(out, '// تعذّر تنفيذ الطلب\\n' + escHtml(msg), 'err');
      } finally {
        runBtn.disabled = false;
        runBtn.removeAttribute('aria-busy');
        runBtn.innerHTML = btnLabel;
      }
    }

    // Delegated handlers for run + copy-full-url.
    document.addEventListener('click', function(e){
      var runBtn = e.target.closest('.api-run');
      if (runBtn){ run(runBtn.closest('.api-ep')); return; }

      var copyUrlBtn = e.target.closest('.api-copy-url');
      if (copyUrlBtn){
        var card = copyUrlBtn.closest('.api-ep');
        var url = origin + fullPath(card);
        if (navigator.clipboard) {
          navigator.clipboard.writeText(url).then(function(){
            var old = copyUrlBtn.innerHTML;
            copyUrlBtn.innerHTML = '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
            setTimeout(function(){ copyUrlBtn.innerHTML = old; }, 1200);
          });
        }
        return;
      }
    });

    // Enter inside a query-string input runs that endpoint.
    document.addEventListener('keydown', function(e){
      if (e.key === 'Enter' && e.target.classList && e.target.classList.contains('api-qs')){
        e.preventDefault();
        run(e.target.closest('.api-ep'));
      }
    });

    // Run all (sequential, gentle on the rate limit).
    var runAll = document.getElementById('apiRunAll');
    if (runAll) runAll.addEventListener('click', async function(){
      runAll.disabled = true;
      var cards = Array.prototype.slice.call(document.querySelectorAll('.api-ep'));
      for (var i = 0; i < cards.length; i++){ await run(cards[i]); }
      runAll.disabled = false;
    });

    if (window.UAE && UAE.refresh) UAE.refresh();
  });
  </script>`;

  return {
    title: 'مركز الـ API',
    active: '/api-hub',
    description: 'مركز الـ API لمنصة الإمارات للذكاء المفتوح — مستكشف تفاعلي لنقاط REST تحت /api/v1 بمظروف قياسي وواجهة اختبار حيّة.',
    body, head, bodyEnd,
  };
}

/* Local KPI helper (count-up, tone-coloured) matching the home-page idiom. */
function kpi(label: string, value: number, ic: string, tone: string, glow = false): string {
  return `<div class="panel kpi panel-hover" data-tone="${esc(tone)}">
    <div class="kpi-top">${icon(ic)}<span>${esc(label)}</span></div>
    <div class="kpi-value ${glow ? 'glow' : ''}" data-countup="${value}">0</div>
  </div>`;
}
