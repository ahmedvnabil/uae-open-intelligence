/** innovation.ts — Innovation Projects Explorer over 106 AI projects + rich project detail. */
import type { LayoutOpts, PageQuery } from '../lib/layout.js';
import { icon } from '../lib/icons.js';
import { jsonScript, esc, num, colorFor, EMIRATE_AR } from '../lib/i18n.js';
import { pageHead, sectionHead, kpiCard, badge, scoreBar, pagination, emptyState, exportButtons, errorState } from '../lib/ui.js';
import { platformStats, getProjects, getProject, getProjectFacets } from '../lib/db.js';

/* ---- Sort options (keys match db.ts PROJECT_SORTS) ---- */
const SORTS: Array<{ key: string; label: string }> = [
  { key: 'impact', label: 'الأثر' },
  { key: 'innovation', label: 'الابتكار' },
  { key: 'sustainability', label: 'الاستدامة' },
  { key: 'emiratization', label: 'التوطين' },
  { key: 'golden_visa', label: 'التأشيرة الذهبية' },
  { key: 'avg', label: 'المعدّل العام' },
  { key: 'name', label: 'الاسم (أبجدي)' },
];

/* The seven score dimensions, ordered for the radar + breakdown panel. */
const SCORE_DIMS: Array<{ col: string; label: string; gold?: boolean }> = [
  { col: 'impact_score', label: 'الأثر' },
  { col: 'innovation_score', label: 'الابتكار' },
  { col: 'golden_visa_relevance', label: 'التأشيرة الذهبية', gold: true },
  { col: 'sovereignty_score', label: 'السيادة' },
  { col: 'regulation_score', label: 'التنظيم' },
  { col: 'emiratization_score', label: 'التوطين' },
  { col: 'sustainability_score', label: 'الاستدامة', gold: true },
];

const emirateLabel = (e: string) => EMIRATE_AR[e] ?? e;

/* ============================================================
   LIST PAGE — /innovation
   ============================================================ */
export function innovationPage(query: PageQuery = {}): LayoutOpts {
  const q = (query.q ?? '').trim();
  const sector = query.sector ?? '';
  const emirate = query.emirate ?? '';
  const sort = SORTS.some((s) => s.key === query.sort) ? query.sort! : 'impact';
  const minImpact = query.minImpact ? Number(query.minImpact) : undefined;
  const page = query.page ? Math.max(1, parseInt(query.page, 10) || 1) : 1;
  const limit = 24;

  const facets = getProjectFacets();
  const sectors = facets.sectors as any[];
  const emirates = facets.emirates as any[];
  const stats = platformStats();

  const paged = getProjects({ q, sector, emirate, sort, minImpact, page, limit });
  const rows = paged.rows as any[];

  // KPI: count of high-impact projects (impact_score >= 9) across the whole base.
  const highImpact = getProjects({ minImpact: 9, limit: 1 }).total;

  /* ---- Filter-preserving query builder for links / pagination ---- */
  const params = (extra: Record<string, string | undefined> = {}) => {
    const merged: Record<string, string | undefined> = {
      q, sector, emirate, sort,
      minImpact: minImpact != null ? String(minImpact) : undefined,
      ...extra,
    };
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) {
      if (v == null || v === '') continue;
      if (k === 'sort' && v === 'impact') continue; // default sort: omit for clean URLs
      sp.set(k, v);
    }
    const s = sp.toString();
    return s ? `/innovation?${s}` : '/innovation';
  };
  // pagination() appends its own page param, so keep page out of the base.
  const baseUrl = params({ page: undefined });

  const hasFilters = !!(q || sector || emirate || minImpact);

  /* ---- Export query string: carry the CURRENT filters (q,sector,emirate,minImpact,sort) ---- */
  const exportQS = (() => {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    if (sector) sp.set('sector', sector);
    if (emirate) sp.set('emirate', emirate);
    if (minImpact != null) sp.set('minImpact', String(minImpact));
    if (sort && sort !== 'impact') sp.set('sort', sort);
    const s = sp.toString();
    return s ? `?${s}` : '';
  })();
  const exportBar = exportButtons({
    csv: `/api/v1/export/projects.csv${exportQS}`,
    json: `/api/v1/export/projects.json${exportQS}`,
    print: true,
  });

  /* ---- Sector filter chips ---- */
  const sectorChips = [
    `<a class="chip ${!sector ? 'active' : ''}" href="${esc(params({ sector: undefined, page: undefined }))}">الكل <span class="nav-badge">${num(stats.projects)}</span></a>`,
    ...sectors.map((s) =>
      `<a class="chip ${sector === s.sector_key ? 'active' : ''}" href="${esc(params({ sector: s.sector_key, page: undefined }))}">
        <span class="dot-status" style="background:${colorFor(s.sector_key)};box-shadow:0 0 6px ${colorFor(s.sector_key)}"></span>
        ${esc(s.sector_ar)} <span class="nav-badge">${s.count}</span></a>`),
  ].join('');

  /* ---- Emirate filter chips ---- */
  const emirateChips = [
    `<a class="chip ${!emirate ? 'active' : ''}" href="${esc(params({ emirate: undefined, page: undefined }))}">كل الإمارات</a>`,
    ...emirates.map((e) =>
      `<a class="chip ${emirate === e.emirate ? 'active' : ''}" href="${esc(params({ emirate: e.emirate, page: undefined }))}">
        ${esc(emirateLabel(e.emirate))} <span class="nav-badge">${e.count}</span></a>`),
  ].join('');

  /* ---- Project cards ---- */
  const cards = rows.map((p, i) => {
    const ac = colorFor(p.sector_key);
    const ai = String(p.ai_opportunities ?? '').trim();
    return `<a class="panel card panel-hover reveal" style="--d:${(i % 6) * 50}ms;border-top:2px solid ${ac}" href="/innovation/${esc(p.id)}">
      <div class="card-meta">
        <span class="tag" style="color:${ac};background:${ac}1f">${esc(p.sector_ar)}</span>
        <span class="badge"><span class="dot" style="background:var(--txt-2)"></span>${esc(emirateLabel(p.emirate))}</span>
        <span class="score-pill" style="margin-inline-start:auto" title="المعدّل العام">${esc(p.avg_score)}</span>
      </div>
      <div class="card-title clamp-2">${esc(p.name)}</div>
      <div class="card-text muted clamp-3">${esc(p.mission)}</div>
      <div class="flex flex-col gap-2 mt-2">
        ${scoreRow('الأثر', p.impact_score)}
        ${scoreRow('الابتكار', p.innovation_score)}
        ${scoreRow('الاستدامة', p.sustainability_score, true)}
      </div>
      ${ai ? `<div class="flex items-start gap-2 mt-2 t-xs muted-1" style="border-top:1px solid var(--line);padding-top:8px">
        <span class="accent flex-none" style="margin-top:2px">${icon('sparkles')}</span>
        <span class="clamp-2"><span class="fw-6 accent">فرص الذكاء الاصطناعي · </span>${esc(ai)}</span></div>` : ''}
      <div class="accent t-sm flex items-center gap-1 mt-2">عرض التفاصيل ${icon('chevron')}</div>
    </a>`;
  }).join('');

  /* ---- Sector distribution chart data ---- */
  const chartLabels = sectors.map((s) => s.sector_ar);
  const chartValues = sectors.map((s) => s.count);
  const chartColors = sectors.map((s) => colorFor(s.sector_key));
  const chartLinks = sectors.map((s) => params({ sector: s.sector_key, page: undefined }));

  const body = `
  ${pageHead({
    eyebrow: 'مرصد الابتكار · INNOVATION OBSERVATORY',
    title: 'مشاريع الابتكار',
    lede: `قاعدة قابلة للاستكشاف تضم ${num(stats.projects)} مشروعًا مدعومًا بالذكاء الاصطناعي عبر ${stats.sectors} قطاعًا حيويًا — مُقيَّمة على سبع دلالات استراتيجية تشمل الأثر والابتكار والسيادة والتوطين والاستدامة.`,
    actions: `<a class="btn btn-sm" href="/api-hub">${icon('code')} عبر الـ API</a><a class="btn btn-sm" href="/knowledge-graph">${icon('graph')} الرسم المعرفي</a>`,
  })}

  <div class="kpi-grid mb-6">
    ${kpiCard({ label: 'إجمالي المشاريع', value: num(stats.projects), iconName: 'bulb', tone: 'green', glow: true, sub: 'مشروع ابتكاري موثّق' })}
    ${kpiCard({ label: 'القطاعات المغطّاة', value: num(stats.sectors), iconName: 'layers', tone: 'blue', sub: 'قطاع حيوي' })}
    ${kpiCard({ label: 'متوسط درجة الأثر', value: `${esc(stats.avgImpact)} / 10`, iconName: 'target', tone: 'gold', sub: 'عبر كامل المحفظة' })}
    ${kpiCard({ label: 'مشاريع عالية الأثر', value: num(highImpact), iconName: 'zap', tone: 'violet', sub: 'درجة الأثر ٩ فأعلى' })}
  </div>

  <section class="cards mb-6 inno-split" style="grid-template-columns:1.55fr 1fr">
    <div class="panel panel-pad reveal">
      ${sectionHead({ title: 'تصفية واستكشاف', sub: 'اختر قطاعًا أو إمارة أو ابحث في الأسماء والمهام والمكدّس التقني', iconName: 'filter' })}
      <form method="get" action="/innovation" class="flex gap-3 flex-wrap items-end mb-4">
        <div class="field flex-1" style="min-width:220px">
          <label for="q">بحث حر</label>
          <div class="search-box">${icon('search')}
            <input class="input" type="search" id="q" name="q" value="${esc(q)}" placeholder="اسم المشروع، المهمة، التقنية…">
          </div>
        </div>
        <div class="field" style="min-width:170px">
          <label for="sort">الترتيب حسب</label>
          <select class="input" id="sort" name="sort">
            ${SORTS.map((s) => `<option value="${s.key}" ${sort === s.key ? 'selected' : ''}>${esc(s.label)}</option>`).join('')}
          </select>
        </div>
        <div class="field" style="min-width:150px">
          <label for="minImpact">حد الأثر الأدنى</label>
          <select class="input" id="minImpact" name="minImpact">
            <option value="" ${minImpact == null ? 'selected' : ''}>أي درجة</option>
            ${[7, 8, 9].map((v) => `<option value="${v}" ${minImpact === v ? 'selected' : ''}>${v}+</option>`).join('')}
          </select>
        </div>
        ${sector ? `<input type="hidden" name="sector" value="${esc(sector)}">` : ''}
        ${emirate ? `<input type="hidden" name="emirate" value="${esc(emirate)}">` : ''}
        <button class="btn btn-primary" type="submit">${icon('filter')} طبّق</button>
        ${hasFilters ? `<a class="btn btn-ghost" href="/innovation">${icon('x')} مسح</a>` : ''}
      </form>
      <div class="muted t-xs uppercase mb-2">القطاع</div>
      <div class="chip-row mb-4">${sectorChips}</div>
      <div class="muted t-xs uppercase mb-2">الإمارة</div>
      <div class="chip-row">${emirateChips}</div>
    </div>

    <div class="panel panel-pad reveal" style="--d:80ms">
      ${sectionHead({ title: 'توزيع المشاريع حسب القطاع', sub: 'انقر شريحةً للتصفية', iconName: 'activity' })}
      <div class="chart-box" id="innoSectorBox" style="height:300px"><canvas id="innoSectorChart"></canvas></div>
    </div>
  </section>

  <section>
    ${sectionHead({
      title: 'المشاريع',
      sub: hasFilters
        ? `${num(paged.total)} نتيجة مطابقة للمرشّحات الحالية`
        : `عرض ${num(rows.length)} من ${num(paged.total)} مشروعًا`,
      iconName: 'grid',
      actions: exportBar,
    })}
    ${rows.length
      ? `<div class="cards auto">${cards}</div>${pagination(paged, baseUrl)}`
      : emptyState('لا توجد مشاريع مطابقة للمرشّحات. جرّب توسيع نطاق البحث أو مسح المرشّحات.', 'search')}
  </section>`;

  const bodyEnd = `<script>
  document.addEventListener('DOMContentLoaded', function(){
    var el = document.getElementById('innoSectorChart');
    if (!el) return;
    var box = document.getElementById('innoSectorBox');
    try {
      var labels = ${jsonScript(chartLabels)};
      var values = ${jsonScript(chartValues)};
      var colors = ${jsonScript(chartColors)};
      var links  = ${jsonScript(chartLinks)};
      UAE.charts.doughnut(el, labels, values, {
        cutout: '60%',
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 8, padding: 9, font: { size: 11 } } } },
        onClick: function(evt, items){ if (items && items.length) location.href = links[items[0].index]; }
      });
      // recolor slices to the deterministic per-sector palette
      var c = window.Chart && window.Chart.getChart ? window.Chart.getChart(el) : null;
      if (c) { c.data.datasets[0].backgroundColor = colors; c.update(); }
    } catch (err) {
      if (box) box.innerHTML = ${jsonScript(errorState('تعذّر رسم مخطط توزيع القطاعات'))};
    }
  });
  </script>`;

  return {
    title: 'مشاريع الابتكار',
    active: '/innovation',
    description: 'مرصد مشاريع الابتكار في دولة الإمارات — 106 مشروعًا مدعومًا بالذكاء الاصطناعي، مُقيَّمة على الأثر والابتكار والسيادة والتوطين والاستدامة، قابلة للبحث والتصفية والتصدير عبر الـ API.',
    head: `<style>
      /* scoped responsive tweaks — list view */
      @media (max-width: 920px) {
        .inno-split { grid-template-columns: 1fr !important; }
      }
      @media (max-width: 560px) {
        .inno-split .chart-box { height: 240px !important; }
        .section-head .actions .export-bar { width: 100%; }
      }
    </style>`,
    body,
    bodyEnd,
    useCharts: true,
  };
}

/* ============================================================
   DETAIL PAGE — /innovation/:id
   ============================================================ */
export function projectDetailPage(id: string): LayoutOpts | null {
  const p = getProject(id) as any;
  if (!p) return null;

  const ac = colorFor(p.sector_key);

  // tech_stack is an Arabic-comma (،) separated string.
  const tech = String(p.tech_stack ?? '')
    .split(/[،,]/).map((t) => t.trim()).filter(Boolean);

  const radarValues = SCORE_DIMS.map((d) => Number(p[d.col]) || 0);
  const avgOfDims = (radarValues.reduce((a, b) => a + b, 0) / radarValues.length).toFixed(1);

  /* ---- Narrative panels ---- */
  const narrative: Array<{ title: string; iconName: string; value: string }> = [
    { title: 'المهمة', iconName: 'target', value: p.mission },
    { title: 'المشكلة', iconName: 'zap', value: p.problem },
    { title: 'المستفيدون', iconName: 'users', value: p.target_users },
    { title: 'المنفعة العامة', iconName: 'shield', value: p.public_benefit },
    { title: 'فرص الذكاء الاصطناعي', iconName: 'sparkles', value: p.ai_opportunities },
    { title: 'فرص البيانات', iconName: 'database', value: p.data_opportunities },
    { title: 'المصادر المفتوحة', iconName: 'code', value: p.open_source_opportunities },
    { title: 'نموذج الاستثمار والتسويق', iconName: 'coins', value: p.monetization },
  ];

  const narrativeCards = narrative
    .filter((n) => String(n.value ?? '').trim())
    .map((n) => `
      <div class="panel panel-pad reveal">
        <div class="section-title t-lg mb-2"><span class="accent flex">${icon(n.iconName)}</span>${esc(n.title)}</div>
        <p class="card-text muted-1">${esc(n.value)}</p>
      </div>`).join('');

  /* ---- Scores breakdown ---- */
  const scoreRows = SCORE_DIMS.map((d) => {
    const v = Number(p[d.col]) || 0;
    return `<div class="flex items-center gap-3" style="padding:9px 0;border-bottom:1px solid var(--line)">
      <span class="flex-1 t-sm fw-6 truncate">${esc(d.label)}</span>
      <span class="flex-1" style="max-width:220px">${scoreBar(v, 10, d.gold)}</span>
      <span class="score-pill flex-none mono" style="${d.gold ? 'background:rgba(245,196,81,.14);color:var(--uae-gold)' : ''}">${esc(v)}</span>
    </div>`;
  }).join('');

  const techTags = tech.length
    ? `<div class="chip-row">${tech.map((t) => `<span class="chip" style="cursor:default">${icon('code')} ${esc(t)}</span>`).join('')}</div>`
    : '<p class="muted t-sm">غير محدّد.</p>';

  const body = `
  <nav class="flex items-center gap-2 muted t-sm mb-4" aria-label="مسار التنقّل">
    <a href="/innovation" class="flex items-center gap-1">${icon('bulb')} مشاريع الابتكار</a>
    <span style="transform:scaleX(-1)">${icon('chevron')}</span>
    <span class="truncate" style="max-width:60ch">${esc(p.name)}</span>
  </nav>

  <section class="panel panel-pad reveal mb-6" style="border-top:3px solid ${ac};background:linear-gradient(150deg, ${ac}14, transparent 60%)">
    <div class="flex items-start justify-between gap-4 flex-wrap">
      <div style="min-width:0;flex:1">
        <div class="card-meta mb-2">
          <span class="badge" style="color:${ac};background:${ac}1f;border-color:${ac}40">${icon('layers')} ${esc(p.sector_ar)}</span>
          ${badge(emirateLabel(p.emirate), 'blue', true)}
        </div>
        <h1 class="page-title" style="margin-top:6px">${esc(p.name)}</h1>
        <p class="page-lede clamp-3">${esc(p.mission)}</p>
      </div>
      <div class="flex flex-col items-center gap-1 flex-none center" style="padding:8px 18px;border-inline-start:1px solid var(--line)">
        <span class="muted t-xs uppercase">المعدّل العام</span>
        <span class="kpi-value glow" style="font-size:clamp(38px,5vw,52px);color:${ac};text-shadow:0 0 26px ${ac}66">${esc(p.avg_score)}</span>
        <span class="muted t-xs">من ١٠ · متوسط الدلالات ${esc(avgOfDims)}</span>
      </div>
    </div>
  </section>

  <section class="cards mb-6 inno-detail-split" style="grid-template-columns:1fr 1fr">
    <div class="panel panel-pad reveal">
      ${sectionHead({ title: 'ملف التقييم الاستراتيجي', sub: 'سبع دلالات على مقياس من 0 إلى 10', iconName: 'activity' })}
      <div class="chart-box" id="scoreRadarBox" style="height:340px"><canvas id="scoreRadar"></canvas></div>
    </div>
    <div class="panel panel-pad reveal" style="--d:70ms">
      ${sectionHead({ title: 'تفصيل الدرجات', sub: 'القيمة الرقمية لكل دلالة', iconName: 'target' })}
      ${scoreRows}
      <div class="divider"></div>
      <div class="section-title t-lg mb-2"><span class="accent flex">${icon('code')}</span>المكدّس التقني</div>
      ${techTags}
    </div>
  </section>

  <section>
    ${sectionHead({ title: 'تفاصيل المشروع', sub: 'المهمة، المشكلة، المستفيدون، والفرص', iconName: 'book' })}
    <div class="cards cols-2">${narrativeCards}</div>
  </section>

  <section class="panel panel-pad reveal mt-6" style="background:linear-gradient(135deg,var(--accent-soft),transparent);border-color:var(--accent-line)">
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <div>
        <div class="section-title">${icon('arrowUR')} استكشف مشاريع مشابهة</div>
        <p class="muted-1 mt-2">تصفّح بقية مشاريع قطاع «${esc(p.sector_ar)}» أو عُد إلى المرصد الكامل.</p>
      </div>
      <div class="flex gap-2 flex-wrap">
        <a class="btn" href="/innovation?sector=${esc(p.sector_key)}">${icon('layers')} مشاريع ${esc(p.sector_ar)}</a>
        <a class="btn btn-primary" href="/innovation">${icon('bulb')} كل المشاريع</a>
      </div>
    </div>
  </section>`;

  const bodyEnd = `<script>
  document.addEventListener('DOMContentLoaded', function(){
    var el = document.getElementById('scoreRadar');
    if (!el) return;
    var box = document.getElementById('scoreRadarBox');
    try {
      UAE.charts.radar(el,
        ${jsonScript(SCORE_DIMS.map((d) => d.label))},
        [{ label: ${jsonScript(p.name)}, data: ${jsonScript(radarValues)}, color: ${jsonScript(ac)} }],
        { plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(c){ return c.formattedValue + ' / 10'; } } } } });
    } catch (err) {
      if (box) box.innerHTML = ${jsonScript(errorState('تعذّر رسم مخطط التقييم'))};
    }
  });
  </script>`;

  return {
    title: `${p.name} · مشاريع الابتكار`,
    active: '/innovation',
    description: String(p.mission ?? '').slice(0, 155),
    head: `<style>
      /* scoped responsive tweaks — detail view */
      @media (max-width: 860px) {
        .inno-detail-split { grid-template-columns: 1fr !important; }
      }
      @media (max-width: 560px) {
        .inno-detail-split .chart-box { height: 280px !important; }
      }
    </style>`,
    body,
    bodyEnd,
    useCharts: true,
  };
}

/* ---- small helper: labelled score meter row for project cards ---- */
function scoreRow(label: string, value: number, gold = false): string {
  return `<div class="flex items-center gap-2">
    <span class="muted t-xs flex-none" style="width:56px">${esc(label)}</span>
    <span class="flex-1">${scoreBar(value, 10, gold)}</span>
    <span class="mono t-xs flex-none" style="width:24px;text-align:end">${esc(value)}</span>
  </div>`;
}
