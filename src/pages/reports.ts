/** reports.ts — Reports Center: print/PDF-ready, data-driven reports across the platform. */
import type { LayoutOpts, PageQuery } from '../lib/layout.js';
import { icon } from '../lib/icons.js';
import { jsonScript, esc, num, aed, COST_BAND_AR, EMIRATE_AR, LEVEL_AR, CATEGORY_AR } from '../lib/i18n.js';
import { pageHead, sectionHead, scoreBar, confidence, badge, exportButtons, errorState, emptyState } from '../lib/ui.js';
import {
  platformStats, getMacro, getCategoryCounts, getDatasets,
  getProjectFacets, getProjectScoreAverages, getTopProjects,
  getFreeZones, getFreeZoneFacets, getSkills, getSkillFacets,
  getObservatory, getCulture, getCultureThemes,
} from '../lib/db.js';

interface ReportDef { key: string; title: string; sub: string; icon: string; tone: string; resource: string }
const REPORTS: ReportDef[] = [
  { key: 'overview', title: 'نظرة عامة على المنصة', sub: 'الأرقام الرئيسية ومؤشرات الاقتصاد الكلي وكتالوج البيانات', icon: 'dashboard', tone: 'green', resource: 'datasets' },
  { key: 'innovation', title: 'مشاريع الابتكار', sub: 'القطاعات ومتوسطات الدرجات وأعلى المشاريع أثرًا', icon: 'bulb', tone: 'gold', resource: 'projects' },
  { key: 'freezones', title: 'المناطق الحرة', sub: 'التوزيع حسب الإمارة وفئة التكلفة والقطاع', icon: 'building', tone: 'blue', resource: 'free-zones' },
  { key: 'skills', title: 'مهارات الذكاء الاصطناعي', sub: 'مصفوفة المهارات ومؤشرات المرصد والطلب حسب الوظيفة', icon: 'brain', tone: 'violet', resource: 'skills' },
  { key: 'culture', title: 'التراث الثقافي', sub: 'المحاور الثقافية وسجل العناصر التراثية', icon: 'landmark', tone: 'gold', resource: 'culture' },
];

const SCORE_LABELS: Record<string, string> = {
  impact_score: 'الأثر العام',
  innovation_score: 'الابتكار',
  golden_visa_relevance: 'صلة الإقامة الذهبية',
  sovereignty_score: 'السيادة الرقمية',
  regulation_score: 'الجاهزية التنظيمية',
  emiratization_score: 'التوطين',
  sustainability_score: 'الاستدامة',
};
const TONE_MAP: Record<string, string> = { green: 'green', gold: 'gold', blue: 'blue', red: 'red', violet: 'violet', yellow: 'gold' };

export function reportsPage(query: PageQuery = {}): LayoutOpts {
  const s = platformStats();
  const selected = REPORTS.find((r) => r.key === query.report)?.key ?? 'overview';
  const def = REPORTS.find((r) => r.key === selected)!;

  // ---- Export bar: CSV + JSON for the selected report's primary resource + Print.
  // Reports have no on-page filters → export the full resource (no query string).
  const resource = esc(def.resource);
  const exportBar = exportButtons({
    csv: `/api/v1/export/${resource}.csv`,
    json: `/api/v1/export/${resource}.json`,
    print: true,
  });

  // ---- Report picker (hidden in print) -----------------------------------
  const picker = `
  <div class="no-print mb-6">
    ${pageHead({
      eyebrow: 'منصة الإمارات للذكاء المفتوح · مركز التقارير',
      title: 'مركز التقارير',
      lede: 'مولّد تقارير قابلة للطباعة وحفظ PDF — اختر تقريرًا، ثم اطبعه أو احفظه كملف PDF. كل تقرير مبني مباشرة من بيانات المنصة الحيّة، موسومًا بالمصدر وتاريخ التحديث.',
      actions: `<button class="btn btn-primary no-print" onclick="window.print()">${icon('print')} طباعة / حفظ PDF</button>${exportBar}`,
    })}
    <div class="cards cols-3 rep-picker">
      ${REPORTS.map((r) => {
        const active = r.key === selected;
        return `<a class="panel card panel-hover ${active ? 'rep-card-active' : ''}" href="/reports?report=${esc(r.key)}">
          <div class="flex items-center justify-between">
            <span class="badge ${TONE_MAP[r.tone]}" style="padding:6px">${icon(r.icon)}</span>
            ${active ? `<span class="badge green"><span class="dot"></span> محدّد</span>` : `<span class="muted t-sm flex items-center gap-1">فتح ${icon('chevron')}</span>`}
          </div>
          <div class="card-title mt-2">${esc(r.title)}</div>
          <div class="card-text muted clamp-2">${esc(r.sub)}</div>
        </a>`;
      }).join('')}
    </div>
  </div>`;

  let report = '';
  let bodyEnd = '';
  let useCharts = false;

  if (selected === 'overview') { const b = overviewReport(s); report = b.html; bodyEnd = b.script; useCharts = true; }
  else if (selected === 'innovation') { const b = innovationReport(s); report = b.html; bodyEnd = b.script; useCharts = true; }
  else if (selected === 'freezones') { const b = freezonesReport(s); report = b.html; bodyEnd = b.script; useCharts = true; }
  else if (selected === 'skills') { const b = skillsReport(s); report = b.html; bodyEnd = b.script; useCharts = true; }
  else if (selected === 'culture') { report = cultureReport(s); }

  const body = picker + `<div class="report" id="report">${report}</div>`;
  const head = `<style>${REPORT_CSS}</style>`;

  return {
    title: `تقرير · ${def.title}`,
    active: '/reports',
    body,
    bodyEnd,
    useCharts,
    head,
    description: `تقرير ${def.title} — منصة الإمارات للذكاء المفتوح. ${def.sub}`,
  };
}

/* ============================ Shared building blocks ============================ */

function reportHeader(title: string, subtitle: string, updated: string): string {
  return `<header class="rep-head">
    <div class="rep-head-top">
      <div class="rep-brand">
        <span class="rep-logo">ع</span>
        <div>
          <div class="rep-org">منصة الإمارات للذكاء المفتوح</div>
          <div class="rep-org-en">UAE Open Intelligence Platform</div>
        </div>
      </div>
      <div class="rep-meta">
        <div><span class="muted">تاريخ التوليد</span> <span class="mono">${esc(new Date().toISOString().slice(0, 10))}</span></div>
        <div><span class="muted">إصدار البيانات</span> <span class="mono">${esc(updated)}</span></div>
      </div>
    </div>
    <h2 class="rep-title">${esc(title)}</h2>
    <p class="rep-sub">${esc(subtitle)}</p>
  </header>`;
}

function reportFooter(sources: string[], note?: string): string {
  return `<footer class="rep-foot">
    <div class="rep-foot-row"><span class="rep-foot-k">المنهجية</span>
      <span>تُجمَّع الأرقام مباشرة من قاعدة بيانات المنصة المفتوحة. المؤشرات الموسومة بـ «نموذجية / prototype» تقريبية وتحتاج تحقّقًا من المصدر الرسمي قبل الاستشهاد بها.</span></div>
    ${note ? `<div class="rep-foot-row"><span class="rep-foot-k">ملاحظة</span><span>${esc(note)}</span></div>` : ''}
    <div class="rep-foot-row"><span class="rep-foot-k">المصادر</span>
      <span>${sources.map((x) => esc(x)).join(' · ')}</span></div>
    <div class="rep-foot-row"><span class="rep-foot-k">الترخيص</span>
      <span>بيانات مفتوحة بترخيص CC BY 4.0 — يُسمح بإعادة الاستخدام مع نسب المصدر إلى منصة الإمارات للذكاء المفتوح.</span></div>
  </footer>`;
}

function statBlock(label: string, value: string, sub = ''): string {
  return `<div class="rep-stat">
    <div class="rep-stat-v mono">${esc(value)}</div>
    <div class="rep-stat-l">${esc(label)}</div>
    ${sub ? `<div class="rep-stat-s muted">${esc(sub)}</div>` : ''}
  </div>`;
}

function chartPanel(id: string, title: string, sub: string, height = 240): string {
  // title is trusted internal markup (may contain icon() SVG) → render raw; escape only sub.
  return `<div class="panel panel-pad rep-chart no-print">
    <div class="section-head"><div class="titles">
      <div class="section-title">${title}</div>
      <div class="section-sub">${esc(sub)}</div>
    </div></div>
    <div class="chart-box" style="height:${height}px"><canvas id="${id}"></canvas></div>
  </div>`;
}

function table(headers: string[], rows: string[], aligns: string[] = []): string {
  const th = headers.map((h, i) => `<th${aligns[i] === 'num' ? ' style="text-align:start"' : ''}>${esc(h)}</th>`).join('');
  // Empty state: render a single full-width row so an empty dataset degrades gracefully.
  const body = rows.length
    ? rows.join('')
    : `<tr><td colspan="${headers.length}">${emptyState('لا توجد بيانات في هذا القسم')}</td></tr>`;
  return `<div class="table-wrap rep-table"><table class="data">
    <thead><tr>${th}</tr></thead>
    <tbody>${body}</tbody>
  </table></div>`;
}

function pageBreak(): string { return `<div class="page-break"></div>`; }

/**
 * Inline JS helper injected once per chart-bearing report. `UAE.repChart(canvasId, fn)`
 * runs the chart init inside try/catch; on failure (or a missing canvas) it renders an
 * errorState() into the enclosing .chart-box so the panel degrades gracefully instead of
 * silently breaking the rest of the page script.
 */
const CHART_ERR_HTML = errorState('تعذّر رسم المخطط');
function chartGuardScript(): string {
  return `<script>
  window.UAE = window.UAE || {};
  UAE.repChart = function(canvasId, fn){
    var el = document.getElementById(canvasId);
    var box = el ? el.closest('.chart-box') : null;
    try {
      if (!el) throw new Error('canvas not found: ' + canvasId);
      fn(el);
    } catch (err) {
      if (window.console) console.error('[reports] chart failed', canvasId, err);
      if (box) box.innerHTML = ${jsonScript(CHART_ERR_HTML)};
    }
  };
  </script>`;
}

/* ============================ Overview report ============================ */

function overviewReport(s: ReturnType<typeof platformStats>): { html: string; script: string } {
  const macro = getMacro().macro as any[];
  const macroMeta = getMacro().meta as any;
  const cats = getCategoryCounts();
  const facets = getProjectFacets();
  const sectors = (facets.sectors as any[]).slice(0, 10);
  const datasets = getDatasets() as any[];

  const headline = `
  <section class="rep-section">
    <h3 class="rep-h3">${icon('layers')} لقطة المنصة</h3>
    <div class="rep-stats">
      ${statBlock('إجمالي السجلات', num(s.totalRecords), 'عبر كل المراصد')}
      ${statBlock('مشاريع الابتكار', num(s.projects), `${s.sectors} قطاعًا`)}
      ${statBlock('المناطق الحرة', num(s.freezones), `${s.emirates} إمارات`)}
      ${statBlock('مهارات الذكاء الاصطناعي', num(s.skills))}
      ${statBlock('عناصر التراث', num(s.culture))}
      ${statBlock('مجموعات البيانات', num(s.datasets))}
      ${statBlock('عقد الرسم المعرفي', num(s.graphNodes), `${num(s.graphEdges)} علاقة`)}
      ${statBlock('متوسط درجة الأثر', `${s.avgImpact}/10`)}
    </div>
  </section>`;

  const macroRows = macro.map((m) => `<tr>
    <td class="fw-6">${esc(m.label_ar)}</td>
    <td class="num accent fw-6">${esc(m.value)}</td>
    <td class="muted t-sm">${esc(m.source)}</td>
    <td class="num">${esc(m.year)}</td>
  </tr>`);

  const macroTable = `<section class="rep-section">
    <h3 class="rep-h3">${icon('trending')} مؤشرات الاقتصاد الكلي</h3>
    ${table(['المؤشر', 'القيمة', 'المصدر', 'السنة'], macroRows, ['', 'num', '', 'num'])}
    <p class="rep-note muted t-sm">${esc(macroMeta?.note_ar ?? '')}</p>
  </section>`;

  const sectorRows = sectors.map((x: any, i: number) => {
    const pct = s.projects ? Math.round((x.count / s.projects) * 100) : 0;
    return `<tr>
      <td class="num muted">${i + 1}</td>
      <td class="fw-6">${esc(x.sector_ar)}</td>
      <td class="num">${num(x.count)}</td>
      <td><div class="flex items-center gap-3">${scoreBar(x.avg_impact)}<span class="num t-sm">${esc(x.avg_impact)}</span></div></td>
      <td class="num">${pct}%</td>
    </tr>`;
  });
  const sectorTable = `<section class="rep-section">
    <h3 class="rep-h3">${icon('activity')} أبرز القطاعات حسب عدد المشاريع</h3>
    ${table(['#', 'القطاع', 'المشاريع', 'متوسط الأثر', 'الحصة'], sectorRows, ['num', '', 'num', '', 'num'])}
  </section>`;

  const catRow = cats.map((c: any) => `<span class="rep-pill">${esc(CATEGORY_AR[c.category] ?? c.category)} <b class="mono">${c.count}</b></span>`).join('');
  const catBlock = `<section class="rep-section">
    <h3 class="rep-h3">${icon('grid')} تصنيفات مجموعات البيانات</h3>
    <div class="rep-pills">${catRow}</div>
  </section>`;

  const dsRows = datasets.map((d: any) => `<tr>
    <td class="fw-6">${esc(d.title_ar)}<div class="muted t-xs mono">${esc(d.id)}</div></td>
    <td class="num">${num(d.records)}</td>
    <td class="t-sm">${(d.categories ?? []).map((c: string) => esc(CATEGORY_AR[c] ?? c)).join('، ')}</td>
    <td class="num mono t-sm">${esc(d.format)}</td>
    <td class="t-sm muted">${esc(d.source)}</td>
    <td>${confidence(d.confidence)}</td>
  </tr>`);
  const dsTable = `<section class="rep-section">
    <h3 class="rep-h3">${icon('database')} كتالوج مجموعات البيانات</h3>
    ${table(['المجموعة', 'السجلات', 'التصنيفات', 'الصيغة', 'المصدر', 'الثقة'], dsRows, ['', 'num', '', 'num', '', ''])}
  </section>`;

  const html =
    reportHeader('نظرة عامة على المنصة', 'ملخص تنفيذي لبيانات منصة الإمارات للذكاء المفتوح: الأرقام الرئيسية، مؤشرات الاقتصاد الكلي، وكتالوج البيانات المفتوحة.', s.updated)
    + headline
    + chartPanel('ovSectorChart', `${icon('activity')} توزيع المشاريع حسب القطاع`, 'الحصة النسبية لكل قطاع من إجمالي المشاريع')
    + macroTable
    + catBlock
    + pageBreak()
    + sectorTable
    + dsTable
    + reportFooter(
      ['u.ae — البوابة الرسمية لحكومة الإمارات', 'وزارة الاقتصاد', 'كتالوج المنصة المنسّق'],
      macroMeta?.note_ar,
    );

  const script = chartGuardScript() + `<script>
  document.addEventListener('DOMContentLoaded', function(){
    UAE.repChart('ovSectorChart', function(canvas){
      UAE.charts.doughnut(canvas,
        ${jsonScript(sectors.map((x: any) => x.sector_ar))},
        ${jsonScript(sectors.map((x: any) => x.count))},
        { plugins: { legend: { position: 'right', labels: { boxWidth: 8, padding: 8 } } } });
    });
  });
  </script>`;
  return { html, script };
}

/* ============================ Innovation report ============================ */

function innovationReport(s: ReturnType<typeof platformStats>): { html: string; script: string } {
  const facets = getProjectFacets();
  const sectors = facets.sectors as any[];
  const emirates = facets.emirates as any[];
  const avgs = getProjectScoreAverages();
  const top = getTopProjects('impact_score', 10) as any[];

  const sectorRows = sectors.map((x: any) => `<tr>
    <td class="fw-6">${esc(x.sector_ar)}</td>
    <td class="num">${num(x.count)}</td>
    <td><div class="flex items-center gap-3">${scoreBar(x.avg_impact)}<span class="num t-sm">${esc(x.avg_impact)}/10</span></div></td>
  </tr>`);
  const sectorTable = `<section class="rep-section">
    <h3 class="rep-h3">${icon('activity')} المشاريع حسب القطاع</h3>
    ${table(['القطاع', 'عدد المشاريع', 'متوسط درجة الأثر'], sectorRows, ['', 'num', ''])}
  </section>`;

  const emirateRow = emirates.map((e: any) => `<span class="rep-pill">${esc(EMIRATE_AR[e.emirate] ?? e.emirate)} <b class="mono">${e.count}</b></span>`).join('');
  const emirateBlock = `<section class="rep-section">
    <h3 class="rep-h3">${icon('pin')} التوزيع الجغرافي</h3>
    <div class="rep-pills">${emirateRow}</div>
  </section>`;

  const avgRows = Object.entries(SCORE_LABELS).map(([k, label]) => {
    const v = (avgs as any)[k] ?? 0;
    const gold = ['golden_visa_relevance', 'sustainability_score'].includes(k);
    return `<tr>
      <td class="fw-6">${esc(label)}</td>
      <td class="num">${esc(v)}</td>
      <td><div class="flex items-center gap-3">${scoreBar(v, 10, gold)}<span class="num t-sm muted">${esc(v)}/10</span></div></td>
    </tr>`;
  });
  const avgTable = `<section class="rep-section">
    <h3 class="rep-h3">${icon('target')} متوسطات الدرجات عبر المشاريع</h3>
    ${table(['المحور', 'المتوسط', 'القيمة'], avgRows, ['', 'num', ''])}
  </section>`;

  const topRows = top.map((p: any, i: number) => `<tr>
    <td class="num muted">${i + 1}</td>
    <td class="fw-6">${esc(p.name)}</td>
    <td><span class="tag">${esc(p.sector_ar)}</span></td>
    <td class="num accent fw-6">${esc(p.impact_score)}</td>
    <td class="num">${esc(p.innovation_score)}</td>
    <td class="num">${esc(p.sustainability_score)}</td>
    <td class="num">${esc(p.avg_score)}</td>
  </tr>`);
  const topTable = `<section class="rep-section">
    <h3 class="rep-h3">${icon('sparkles')} أعلى 10 مشاريع وفق درجة الأثر</h3>
    ${table(['#', 'المشروع', 'القطاع', 'الأثر', 'الابتكار', 'الاستدامة', 'المعدّل'], topRows, ['num', '', '', 'num', 'num', 'num', 'num'])}
  </section>`;

  const html =
    reportHeader('تقرير مشاريع الابتكار', `تحليل ${num(s.projects)} مشروعًا ابتكاريًا مدعومًا بالذكاء الاصطناعي عبر ${s.sectors} قطاعًا — القطاعات، متوسطات الدرجات، وأعلى المشاريع أثرًا.`, s.updated)
    + `<section class="rep-section"><div class="rep-stats">
        ${statBlock('إجمالي المشاريع', num(s.projects))}
        ${statBlock('القطاعات', num(s.sectors))}
        ${statBlock('متوسط الأثر', `${s.avgImpact}/10`)}
        ${statBlock('متوسط الابتكار', `${(avgs as any).innovation_score ?? '—'}/10`)}
      </div></section>`
    + chartPanel('inAvgChart', `${icon('target')} ملف الدرجات (رادار)`, 'متوسط كل محور تقييم عبر جميع المشاريع', 300)
    + sectorTable
    + emirateBlock
    + avgTable
    + pageBreak()
    + topTable
    + reportFooter(['كتالوج الابتكار في الإمارات (منسّق)', 'منهجية تقييم المنصة (0–10)'],
        'الدرجات تقييمية مبنية على معايير المنصة وقد تختلف عن التقييمات الرسمية.');

  const radarLabels = Object.values(SCORE_LABELS);
  const radarValues = Object.keys(SCORE_LABELS).map((k) => (avgs as any)[k] ?? 0);
  const script = chartGuardScript() + `<script>
  document.addEventListener('DOMContentLoaded', function(){
    UAE.repChart('inAvgChart', function(canvas){
      UAE.charts.radar(canvas,
        ${jsonScript(radarLabels)},
        [{ label: 'متوسط الدرجة', data: ${jsonScript(radarValues)}, color: UAE.color(0) }]);
    });
  });
  </script>`;
  return { html, script };
}

/* ============================ Free zones report ============================ */

function freezonesReport(s: ReturnType<typeof platformStats>): { html: string; script: string } {
  const facets = getFreeZoneFacets();
  const byEmirate = facets.emirates as any[];
  const byBand = facets.costBands as any[];
  const bySector = (facets.sectors as any[]).slice(0, 12);
  const zones = (getFreeZones({ sort: 'cost_asc', limit: 200 }).rows) as any[];

  const emirateRows = byEmirate.map((e: any) => `<tr>
    <td class="fw-6">${esc(EMIRATE_AR[e.emirate] ?? e.emirate)}</td>
    <td class="num">${num(e.count)}</td>
    <td class="num">${aed(e.avg_cost)}</td>
  </tr>`);
  const emirateTable = `<section class="rep-section">
    <h3 class="rep-h3">${icon('pin')} المناطق الحرة حسب الإمارة</h3>
    ${table(['الإمارة', 'عدد المناطق', 'متوسط تكلفة السنة الأولى'], emirateRows, ['', 'num', 'num'])}
  </section>`;

  const bandOrder: Record<string, number> = { low: 0, mid: 1, high: 2 };
  const bands = [...byBand].sort((a, b) => (bandOrder[a.cost_band] ?? 9) - (bandOrder[b.cost_band] ?? 9));
  const bandRows = bands.map((b: any) => {
    const pct = s.freezones ? Math.round((b.count / s.freezones) * 100) : 0;
    return `<tr>
      <td>${badge(COST_BAND_AR[b.cost_band] ?? b.cost_band, b.cost_band === 'low' ? 'green' : b.cost_band === 'mid' ? 'gold' : 'red')}</td>
      <td class="num">${num(b.count)}</td>
      <td class="num">${pct}%</td>
    </tr>`;
  });
  const bandTable = `<section class="rep-section">
    <h3 class="rep-h3">${icon('coins')} التوزيع حسب فئة التكلفة</h3>
    ${table(['الفئة', 'العدد', 'الحصة'], bandRows, ['', 'num', 'num'])}
  </section>`;

  const sectorRow = bySector.map((x: any) => `<span class="rep-pill">${esc(x.sector)} <b class="mono">${x.count}</b></span>`).join('');
  const sectorBlock = `<section class="rep-section">
    <h3 class="rep-h3">${icon('layers')} أكثر القطاعات تغطيةً</h3>
    <div class="rep-pills">${sectorRow}</div>
  </section>`;

  const zoneRows = zones.map((z: any) => `<tr>
    <td class="fw-6">${esc(z.name_ar)}<div class="muted t-xs">${esc(z.name_en)}</div></td>
    <td class="t-sm">${esc(EMIRATE_AR[z.emirate] ?? z.emirate)}</td>
    <td>${badge(COST_BAND_AR[z.cost_band] ?? z.cost_band, z.cost_band === 'low' ? 'green' : z.cost_band === 'mid' ? 'gold' : 'red')}</td>
    <td class="num">${aed(z.indicative_min_first_year_aed)}</td>
    <td class="num">${num(z.visas_with_base_package)}</td>
    <td class="num">${esc(z.established)}</td>
    <td>${confidence(z.confidence)}</td>
  </tr>`);
  const zoneTable = `<section class="rep-section">
    <h3 class="rep-h3">${icon('building')} سجل المناطق الحرة الكامل (${num(zones.length)})</h3>
    ${table(['المنطقة الحرة', 'الإمارة', 'الفئة', 'الحد الأدنى للسنة الأولى', 'التأشيرات', 'التأسيس', 'الثقة'], zoneRows, ['', '', '', 'num', 'num', 'num', ''])}
  </section>`;

  const html =
    reportHeader('تقرير المناطق الحرة', `دليل ${num(s.freezones)} منطقة حرة عبر ${s.emirates} إمارات — التوزيع الجغرافي، فئات التكلفة، القطاعات، وجدول مرجعي كامل بالتكاليف الاسترشادية.`, s.updated)
    + `<section class="rep-section"><div class="rep-stats">
        ${statBlock('إجمالي المناطق الحرة', num(s.freezones))}
        ${statBlock('الإمارات المغطّاة', num(s.emirates))}
        ${statBlock('فئات التكلفة', String(bands.length))}
        ${statBlock('قطاعات مغطّاة', num((facets.sectors as any[]).length))}
      </div></section>`
    + chartPanel('fzBandChart', `${icon('coins')} المناطق الحرة حسب فئة التكلفة`, 'عدد المناطق في كل فئة سعرية')
    + emirateTable
    + bandTable
    + sectorBlock
    + pageBreak()
    + zoneTable
    + reportFooter(['u.ae — البوابة الرسمية لحكومة الإمارات', 'المواقع الرسمية لسلطات المناطق الحرة'],
        'التكاليف استرشادية للسنة الأولى وفق الباقة الأساسية، وتتغيّر حسب النشاط وعدد التأشيرات — راجع السلطة المعنية.');

  const script = chartGuardScript() + `<script>
  document.addEventListener('DOMContentLoaded', function(){
    UAE.repChart('fzBandChart', function(canvas){
      var labels = ${jsonScript(bands.map((b: any) => COST_BAND_AR[b.cost_band] ?? b.cost_band))};
      UAE.charts.bar(canvas, labels,
        [{ label: 'عدد المناطق', data: ${jsonScript(bands.map((b: any) => b.count))},
           color: ${jsonScript(bands.map((b: any) => b.cost_band === 'low' ? '#00d68f' : b.cost_band === 'mid' ? '#f5c451' : '#ff5d6c'))} }],
        { plugins: { legend: { display: false } } });
    });
  });
  </script>`;
  return { html, script };
}

/* ============================ Skills report ============================ */

function skillsReport(s: ReturnType<typeof platformStats>): { html: string; script: string } {
  const skills = getSkills() as any[];
  const facets = getSkillFacets();
  const cats = facets.categories as any[];
  const levels = facets.levels as any[];
  const obs = getObservatory();
  const kpis = (obs.kpis ?? []) as any[];
  const adoption = (obs.adoption_by_function ?? []) as any[];
  const indicators = (obs.indicators ?? []) as any[];

  const kpiBlock = `<section class="rep-section">
    <h3 class="rep-h3">${icon('zap')} مؤشرات المرصد الرئيسية</h3>
    <div class="rep-stats">
      ${kpis.map((k: any) => statBlock(k.label_ar, k.value, k.delta)).join('')}
    </div>
  </section>`;

  const catRow = cats.map((c: any) => `<span class="rep-pill">${esc(c.category)} <b class="mono">${c.count}</b></span>`).join('');
  const levelRow = levels.map((l: any) => `<span class="rep-pill">${esc(LEVEL_AR[l.level] ?? l.level)} <b class="mono">${l.count}</b></span>`).join('');
  const facetBlock = `<section class="rep-section">
    <h3 class="rep-h3">${icon('grid')} توزيع المهارات</h3>
    <div class="mb-3"><div class="muted t-sm mb-2">حسب الفئة</div><div class="rep-pills">${catRow}</div></div>
    <div><div class="muted t-sm mb-2">حسب المستوى</div><div class="rep-pills">${levelRow}</div></div>
  </section>`;

  const adoptRows = adoption.map((a: any) => `<tr>
    <td class="fw-6">${esc(a.function_ar)}</td>
    <td class="num">${esc(a.share)}%</td>
    <td><div class="flex items-center gap-3">${scoreBar(a.share, 100)}<span class="num t-sm muted">${esc(a.share)}%</span></div></td>
  </tr>`);
  const adoptTable = `<section class="rep-section">
    <h3 class="rep-h3">${icon('users')} تبنّي الذكاء الاصطناعي حسب الوظيفة</h3>
    ${table(['الوظيفة', 'الحصة', 'المستوى'], adoptRows, ['', 'num', ''])}
    <p class="rep-note muted t-sm">بيانات نموذجية (prototype) — تحتاج تحققًا من المصدر الرسمي.</p>
  </section>`;

  const indRows = indicators.map((ind: any) => `<tr>
    <td class="fw-6">${esc(ind.label_ar)}<div class="muted t-xs">${esc(ind.label_en)}</div></td>
    <td class="num accent fw-6">${esc(ind.value)}</td>
    <td class="t-sm muted">${esc(ind.baseline ?? ind.period ?? (ind.target_year ? `هدف ${ind.target_year}` : '—'))}</td>
    <td class="t-sm muted">${esc(ind.source)}</td>
  </tr>`);
  const indTable = `<section class="rep-section">
    <h3 class="rep-h3">${icon('trending')} مؤشرات السياسات الوطنية</h3>
    ${table(['المؤشر', 'القيمة', 'الأساس / الفترة', 'المصدر'], indRows, ['', 'num', '', ''])}
  </section>`;

  const skillRows = skills.map((sk: any) => `<tr>
    <td class="num mono muted">${esc(sk.skill_id)}</td>
    <td class="fw-6">${esc(sk.skill_ar)}<div class="muted t-xs">${esc(sk.skill_en)}</div></td>
    <td class="t-sm">${esc(sk.category)}</td>
    <td>${badge(LEVEL_AR[sk.level] ?? sk.level, sk.level === 'Beginner' ? 'green' : sk.level === 'Intermediate' ? 'gold' : 'red')}</td>
    <td class="t-sm muted clamp-2">${esc(sk.example_use_case)}</td>
  </tr>`);
  const skillTable = `<section class="rep-section">
    <h3 class="rep-h3">${icon('brain')} مصفوفة مهارات الذكاء الاصطناعي (${num(skills.length)})</h3>
    ${table(['#', 'المهارة', 'الفئة', 'المستوى', 'مثال استخدام'], skillRows, ['num', '', '', '', ''])}
  </section>`;

  const html =
    reportHeader('تقرير مهارات الذكاء الاصطناعي', `إطار ${num(s.skills)} مهارة في الذكاء الاصطناعي بمستويات وأمثلة تطبيقية، مع مؤشرات المرصد وتبنّي الذكاء الاصطناعي حسب الوظيفة.`, obs.generated_on ?? s.updated)
    + kpiBlock
    + chartPanel('skAdoptChart', `${icon('users')} التبنّي حسب الوظيفة`, 'الحصة النسبية لكل وظيفة من حالات التبنّي')
    + facetBlock
    + adoptTable
    + indTable
    + pageBreak()
    + skillTable
    + reportFooter(
        ['استراتيجية الاقتصاد الرقمي في الإمارات', 'وزارة الاقتصاد', 'PwC Middle East', 'حزمة مرصد المنصة'],
        'حالة المرصد: ' + (obs.status ?? 'prototype') + ' — بعض المؤشرات نموذجية وتحتاج تحققًا من المصدر الرسمي.');

  const script = chartGuardScript() + `<script>
  document.addEventListener('DOMContentLoaded', function(){
    UAE.repChart('skAdoptChart', function(canvas){
      UAE.charts.doughnut(canvas,
        ${jsonScript(adoption.map((a: any) => a.function_ar))},
        ${jsonScript(adoption.map((a: any) => a.share))},
        { plugins: { legend: { position: 'right', labels: { boxWidth: 8, padding: 8 } } } });
    });
  });
  </script>`;
  return { html, script };
}

/* ============================ Culture report ============================ */

function cultureReport(s: ReturnType<typeof platformStats>): string {
  const themes = getCultureThemes() as any[];
  const items = getCulture() as any[];

  const themeRows = themes.map((t: any) => `<tr>
    <td class="fw-6">${esc(t.title_ar)}<div class="muted t-xs">${esc(t.title_en ?? t.key)}</div></td>
    <td class="num">${num(t.count)}</td>
    <td class="t-sm muted clamp-2">${esc(t.summary_ar ?? t.description_ar ?? '')}</td>
  </tr>`);
  const themeTable = `<section class="rep-section">
    <h3 class="rep-h3">${icon('layers')} المحاور الثقافية</h3>
    ${table(['المحور', 'عدد العناصر', 'الوصف'], themeRows, ['', 'num', ''])}
  </section>`;

  const themeMap = new Map(themes.map((t: any) => [t.key, t.title_ar]));
  const itemRows = items.map((c: any) => `<tr>
    <td class="fw-6">${esc(c.title_ar)}<div class="muted t-xs">${esc(c.title_en)}</div></td>
    <td class="t-sm">${esc(themeMap.get(c.theme) ?? c.theme)}</td>
    <td class="t-sm mono muted">${esc(c.era)}</td>
    <td class="t-sm">${(c.tags ?? []).slice(0, 3).map((x: string) => `<span class="tag">${esc(x)}</span>`).join(' ')}</td>
    <td class="t-sm muted">${esc(c.source)}</td>
    <td>${confidence(c.confidence)}</td>
  </tr>`);
  const itemTable = `<section class="rep-section">
    <h3 class="rep-h3">${icon('landmark')} سجل العناصر التراثية (${num(items.length)})</h3>
    ${table(['العنصر', 'المحور', 'الحقبة', 'الوسوم', 'المصدر', 'الثقة'], itemRows, ['', '', '', '', '', ''])}
  </section>`;

  return reportHeader('تقرير التراث الثقافي', `سجل ${num(s.culture)} عنصرًا تراثيًا موزّعًا على ${themes.length} محاور ثقافية — مع الحقبة والمصدر ودرجة الثقة في كل عنصر.`, s.updated)
    + `<section class="rep-section"><div class="rep-stats">
        ${statBlock('عناصر التراث', num(s.culture))}
        ${statBlock('المحاور الثقافية', String(themes.length))}
        ${statBlock('عناصر بإحداثيات على الخريطة', num(items.filter((c: any) => c.lat != null && c.lng != null).length))}
      </div></section>`
    + themeTable
    + pageBreak()
    + itemTable
    + reportFooter(['اليونسكو (UNESCO)', 'الأرشيف الوطني للإمارات', 'مصادر تراثية منسّقة'],
        'درجة الثقة تعكس مدى توثيق المصدر؛ بعض الإحداثيات تقريبية.');
}

/* ============================ Page CSS (scoped .rep-*) ============================ */

const REPORT_CSS = `
.rep-picker .card { gap: var(--sp-2); }
.rep-card-active { border-color: var(--accent-line) !important; box-shadow: var(--glow-green) !important; }
.report { background: var(--bg-1); border: 1px solid var(--line); border-radius: var(--r-lg); padding: clamp(20px, 3.5vw, 48px); box-shadow: var(--e-2); }
.rep-head { border-bottom: 2px solid var(--line-strong); padding-bottom: var(--sp-4); margin-bottom: var(--sp-5); }
.rep-head-top { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--sp-4); flex-wrap: wrap; }
.rep-brand { display: flex; align-items: center; gap: var(--sp-3); }
.rep-logo { width: 40px; height: 40px; border-radius: 11px; display: grid; place-items: center; flex: none; background: linear-gradient(140deg, var(--uae-green), var(--uae-emerald)); color: #04140d; font-weight: 700; font-size: 19px; }
.rep-org { font-weight: 700; font-size: 15px; letter-spacing: -.02em; }
.rep-org-en { font-size: 11px; color: var(--txt-2); letter-spacing: .04em; }
.rep-meta { font-size: 12px; color: var(--txt-1); text-align: end; display: flex; flex-direction: column; gap: 3px; }
.rep-title { font-size: clamp(22px, 3vw, 30px); font-weight: 700; letter-spacing: -.03em; margin-top: var(--sp-4); }
.rep-sub { color: var(--txt-1); font-size: 14px; margin-top: var(--sp-2); max-width: 80ch; line-height: 1.7; }
.rep-section { margin: var(--sp-5) 0; break-inside: avoid; }
.rep-h3 { font-size: 16px; font-weight: 700; letter-spacing: -.02em; display: flex; align-items: center; gap: var(--sp-2); margin-bottom: var(--sp-3); padding-bottom: var(--sp-2); border-bottom: 1px solid var(--line); }
.rep-h3 svg { width: 17px; height: 17px; color: var(--accent); }
.rep-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: var(--sp-3); }
.rep-stat { border: 1px solid var(--line); border-radius: var(--r-md); padding: var(--sp-3) var(--sp-4); background: var(--bg-2); }
.rep-stat-v { font-size: 24px; font-weight: 600; letter-spacing: -.02em; color: var(--txt-0); line-height: 1.1; }
.rep-stat-l { font-size: 12.5px; color: var(--txt-1); margin-top: 4px; font-weight: 500; }
.rep-stat-s { font-size: 11px; margin-top: 2px; }
.rep-table { margin-top: var(--sp-2); }
.rep-pills { display: flex; flex-wrap: wrap; gap: var(--sp-2); }
.rep-pill { font-size: 12.5px; padding: 5px 11px; border-radius: var(--r-pill); background: var(--bg-2); border: 1px solid var(--line); color: var(--txt-1); }
.rep-pill b { color: var(--accent); margin-inline-start: 4px; }
.rep-note { margin-top: var(--sp-2); line-height: 1.6; }
.rep-chart { margin: var(--sp-4) 0; }
.rep-foot { margin-top: var(--sp-6); padding-top: var(--sp-4); border-top: 2px solid var(--line-strong); display: flex; flex-direction: column; gap: var(--sp-2); font-size: 12px; color: var(--txt-1); line-height: 1.6; }
.rep-foot-row { display: flex; gap: var(--sp-3); }
.rep-foot-k { flex: none; width: 72px; color: var(--txt-2); font-weight: 600; }

/* Mobile / RTL: stack the report header, keep meta readable, avoid horizontal overflow. */
@media (max-width: 640px) {
  .rep-head-top { flex-direction: column; gap: var(--sp-3); }
  .rep-meta { text-align: start; }
  .rep-stats { grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); }
  .rep-foot-row { flex-direction: column; gap: 2px; }
  .rep-foot-k { width: auto; }
}

@media print {
  .report { border: none; box-shadow: none; padding: 0; background: #fff; }
  .rep-stat { background: #fff !important; border-color: #ccc !important; }
  .rep-pill { background: #fff !important; border-color: #ccc !important; }
  .rep-stat-v, .rep-h3 svg, .rep-pill b { color: #000 !important; }
  .rep-head, .rep-foot { border-color: #000 !important; }
  .rep-h3 { border-color: #999 !important; }
  table.data thead th { background: #f0f0f0 !important; color: #000 !important; }
  .rep-logo { background: #000 !important; color: #fff !important; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
}
`;
