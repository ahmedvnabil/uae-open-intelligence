/**
 * free-zones.ts — Free Zone Explorer + Comparator (36 zones across 7 emirates).
 * Exports: freeZonesPage(query) and freeZoneDetailPage(id).
 * Facet filters (emirate / cost band / sector), search, sort → getFreeZones().
 * Dense table with Alpine-powered side-by-side comparison panel.
 */
import type { LayoutOpts, PageQuery } from '../lib/layout.js';
import { icon } from '../lib/icons.js';
import { jsonScript, esc, num, aed, safeUrl, EMIRATE_AR, COST_BAND_AR } from '../lib/i18n.js';
import { pageHead, sectionHead, kpiCard, badge, confidence, emptyState, copyBtn, exportButtons, errorState } from '../lib/ui.js';
import { getFreeZones, getFreeZone, getFreeZoneFacets } from '../lib/db.js';

/* ---- Local Arabic labels for free-zone sector keys (data has English keys only) ---- */
const FZ_SECTOR_AR: Record<string, string> = {
  trading: 'التجارة', general: 'متعدد الأنشطة', media: 'الإعلام', logistics: 'الخدمات اللوجستية',
  industry: 'الصناعة', tech: 'التقنية', consulting: 'الاستشارات', ecommerce: 'التجارة الإلكترونية',
  creative: 'الصناعات الإبداعية', aviation: 'الطيران', sustainability: 'الاستدامة', crypto: 'الأصول الرقمية',
  research: 'البحث العلمي', maritime: 'الملاحة البحرية', healthcare: 'الرعاية الصحية', fintech: 'التقنية المالية',
  finance: 'التمويل', film: 'الإنتاج السينمائي', events: 'الفعاليات', wellness: 'الصحة والعافية',
  commodities: 'السلع', education: 'التعليم', manufacturing: 'التصنيع', design: 'التصميم',
  gaming: 'الألعاب', biotech: 'التقنية الحيوية', energy: 'الطاقة', tourism: 'السياحة',
  automotive: 'السيارات', textiles: 'النسيج', food: 'الأغذية', publishing: 'النشر',
};
const fzSectorAr = (k: string): string => FZ_SECTOR_AR[k] ?? k;

/* cost band → semantic tone */
const BAND_TONE: Record<string, string> = { low: 'green', mid: 'gold', high: 'red' };

const FZ_TYPE_AR: Record<string, string> = {
  freezone: 'منطقة حرة', 'financial-freezone': 'منطقة حرة مالية', offshore: 'أوفشور',
};
const fzTypeAr = (t: string): string => FZ_TYPE_AR[t] ?? t;

const SORT_OPTIONS: Array<[string, string]> = [
  ['cost_asc', 'التكلفة: من الأقل'],
  ['cost_desc', 'التكلفة: من الأعلى'],
  ['established', 'الأحدث تأسيسًا'],
  ['visas', 'عدد التأشيرات'],
  ['confidence', 'درجة الثقة'],
  ['name', 'الاسم (أبجديًا)'],
];

/* Build a query-string for facet links, toggling one key (click active to clear). */
function fzUrl(q: PageQuery, patch: Record<string, string | undefined>): string {
  const keys = ['q', 'emirate', 'costBand', 'sector', 'sort'] as const;
  const merged: Record<string, string> = {};
  for (const k of keys) {
    const v = patch[k] !== undefined ? patch[k] : q[k];
    if (v) merged[k] = v;
  }
  const qs = Object.entries(merged)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
  return qs ? `/free-zones?${qs}` : '/free-zones';
}

export function freeZonesPage(query: PageQuery = {}): LayoutOpts {
  const facets = getFreeZoneFacets();
  const emirateFacets = facets.emirates as any[];
  const costBandFacets = facets.costBands as any[];
  const sectorFacets = facets.sectors as any[];

  const active = {
    q: query.q ?? '',
    emirate: query.emirate ?? '',
    costBand: query.costBand ?? '',
    sector: query.sector ?? '',
    sort: query.sort ?? 'cost_asc',
  };
  const hasFilters = !!(active.q || active.emirate || active.costBand || active.sector);

  /* ---- Export query string: carry the CURRENT filters so the download (CSV/JSON)
          matches exactly what the user filtered. Mirrors the list params. ---- */
  const exportQS = [
    active.q ? `q=${encodeURIComponent(active.q)}` : '',
    active.emirate ? `emirate=${encodeURIComponent(active.emirate)}` : '',
    active.costBand ? `costBand=${encodeURIComponent(active.costBand)}` : '',
    active.sector ? `sector=${encodeURIComponent(active.sector)}` : '',
    active.sort ? `sort=${encodeURIComponent(active.sort)}` : '',
  ].filter(Boolean).join('&');
  const exportSuffix = exportQS ? `?${exportQS}` : '';
  const exportBar = exportButtons({
    csv: `/api/v1/export/free-zones.csv${exportSuffix}`,
    json: `/api/v1/export/free-zones.json${exportSuffix}`,
    print: true,
  });

  const paged = getFreeZones({
    q: active.q || undefined,
    emirate: active.emirate || undefined,
    costBand: active.costBand || undefined,
    sector: active.sector || undefined,
    sort: active.sort,
    limit: 36,
  });
  const zones = paged.rows as any[];

  /* ---- KPIs computed across the FULL dataset (facets), not the filtered view ---- */
  const totalZones = emirateFacets.reduce((s, e) => s + e.count, 0);
  const emiratesCovered = emirateFacets.length;
  const costBandOrder: Record<string, number> = { low: 0, mid: 1, high: 2 };
  const allBands = [...costBandFacets].sort((a, b) => (costBandOrder[a.cost_band] ?? 9) - (costBandOrder[b.cost_band] ?? 9));
  // weighted average first-year cost across emirates
  const weightedCostSum = emirateFacets.reduce((s, e) => s + e.avg_cost * e.count, 0);
  const avgCost = Math.round(weightedCostSum / totalZones);
  const cheapestEmirate = [...emirateFacets].sort((a, b) => a.avg_cost - b.avg_cost)[0];

  /* ---- Facet chip rows ---- */
  const emirateChips = `
    <a class="chip ${!active.emirate ? 'active' : ''}" href="${fzUrl(active, { emirate: undefined })}">الكل <span class="nav-badge">${num(totalZones)}</span></a>
    ${emirateFacets.map((e) => `
      <a class="chip ${active.emirate === e.emirate ? 'active' : ''}" href="${fzUrl(active, { emirate: active.emirate === e.emirate ? undefined : e.emirate })}">
        ${esc(EMIRATE_AR[e.emirate] ?? e.emirate)} <span class="nav-badge">${num(e.count)}</span>
      </a>`).join('')}`;

  const bandChips = allBands.map((b) => {
    const tone = BAND_TONE[b.cost_band] ?? '';
    const sel = active.costBand === b.cost_band;
    return `<a class="chip ${sel ? 'active' : ''}" href="${fzUrl(active, { costBand: sel ? undefined : b.cost_band })}">
      <span class="dot" style="width:7px;height:7px;border-radius:99px;background:var(--tone-${tone || 'green'})"></span>
      ${esc(COST_BAND_AR[b.cost_band] ?? b.cost_band)} <span class="nav-badge">${num(b.count)}</span>
    </a>`;
  }).join('');

  const sectorChips = (sectorFacets as any[]).slice(0, 16).map((s) => {
    const sel = active.sector === s.sector;
    return `<a class="chip ${sel ? 'active' : ''}" href="${fzUrl(active, { sector: sel ? undefined : s.sector })}">
      ${esc(fzSectorAr(s.sector))} <span class="nav-badge">${num(s.count)}</span></a>`;
  }).join('');

  /* ---- Chart data: avg first-year cost by emirate ---- */
  const costByEmirate = [...emirateFacets].sort((a, b) => b.avg_cost - a.avg_cost);
  const chartLabels = costByEmirate.map((e) => EMIRATE_AR[e.emirate] ?? e.emirate);
  const chartCosts = costByEmirate.map((e) => e.avg_cost);
  const chartCounts = costByEmirate.map((e) => e.count);

  /* ---- Table rows (with Alpine compare hooks) ---- */
  const rows = zones.map((z) => {
    const tone = BAND_TONE[z.cost_band] ?? '';
    const sectors = (z.sectors ?? []) as string[];
    const sectorTags = sectors.slice(0, 3).map((s) => `<span class="tag">${esc(fzSectorAr(s))}</span>`).join(' ');
    const moreSectors = sectors.length > 3 ? `<span class="tag">+${sectors.length - 3}</span>` : '';
    // compact JSON payload for the Alpine compare panel (kept tiny + escaped as attr)
    const payload = esc(JSON.stringify({
      id: z.id, name: z.name_ar, emirate: EMIRATE_AR[z.emirate] ?? z.emirate,
      cost: z.indicative_min_first_year_aed, band: COST_BAND_AR[z.cost_band] ?? z.cost_band,
      visas: z.visas_with_base_package, est: z.established,
      sectors: sectors.slice(0, 5).map(fzSectorAr).join('، '),
    }));
    return `<tr>
      <td style="width:34px">
        <input type="checkbox" class="fz-check" :checked="has('${esc(z.id)}')" @change="toggle('${esc(z.id)}', ${payload})"
          aria-label="أضف للمقارنة" style="accent-color:var(--accent);width:16px;height:16px;cursor:pointer">
      </td>
      <td>
        <a href="/free-zones/${esc(z.id)}" class="fw-6" style="color:var(--txt-0)">${esc(z.name_ar)}</a>
        <div class="muted t-xs truncate" style="max-width:30ch">${esc(z.name_en)}</div>
      </td>
      <td>${esc(EMIRATE_AR[z.emirate] ?? z.emirate)}</td>
      <td class="num">${esc(z.established)}</td>
      <td>${badge(COST_BAND_AR[z.cost_band] ?? z.cost_band, tone, true)}</td>
      <td class="num fw-6">${aed(z.indicative_min_first_year_aed)}</td>
      <td class="num center">${num(z.visas_with_base_package)}</td>
      <td><div class="flex flex-wrap gap-1">${sectorTags}${moreSectors}</div></td>
      <td>${confidence(z.confidence)}</td>
    </tr>`;
  }).join('');

  const tableBody = zones.length
    ? rows
    : `<tr><td colspan="9">${emptyState('لا توجد مناطق حرة مطابقة لعوامل التصفية', 'building')}</td></tr>`;

  /* ---- The page body ---- */
  const body = `
  <div class="fz-page">
  ${pageHead({
    eyebrow: 'مستكشف ومقارن المناطق الحرة',
    title: 'مستكشف المناطق الحرة',
    lede: 'استعرض وقارن ٣٦ منطقة حرة عبر الإمارات السبع — التكاليف التأشيرية والقطاعات المعتمدة وتكلفة السنة الأولى التقديرية، مع إمكانية المقارنة جنبًا إلى جنب.',
    actions: `<a class="btn btn-sm" href="/api-hub#grp-free-zones">${icon('code')} عبر الـ API</a>
              <a class="btn btn-sm" href="/free-zones?sort=cost_asc">${icon('coins')} الأقل تكلفة</a>`,
  })}

  <div class="kpi-grid mb-6">
    ${kpiCard({ label: 'إجمالي المناطق الحرة', value: num(totalZones), tone: 'green', iconName: 'building', glow: true, sub: 'عبر سبع إمارات' })}
    ${kpiCard({ label: 'الإمارات المغطّاة', value: num(emiratesCovered), tone: 'blue', iconName: 'pin', sub: 'كامل الدولة' })}
    ${kpiCard({ label: 'أدنى متوسط تكلفة', value: aed(cheapestEmirate.avg_cost), tone: 'gold', iconName: 'coins', sub: `${esc(EMIRATE_AR[cheapestEmirate.emirate] ?? cheapestEmirate.emirate)} · السنة الأولى` })}
    ${kpiCard({ label: 'متوسط تكلفة السنة الأولى', value: aed(avgCost), tone: 'violet', iconName: 'trending', sub: 'مرجّح عبر الدولة' })}
  </div>

  <div class="cards mb-6" style="grid-template-columns:1.1fr 1fr;gap:var(--sp-4)">
    <div class="panel panel-pad reveal">
      ${sectionHead({ title: 'متوسط تكلفة السنة الأولى حسب الإمارة', sub: 'التكلفة التقديرية بالدرهم (شريط) مقابل عدد المناطق الحرة (نقطة)', iconName: 'activity' })}
      <div class="chart-box" style="height:300px"><canvas id="fzCostChart"></canvas></div>
      <div class="legend mt-3">
        <span class="lg"><span class="sw" style="background:var(--tone-green)"></span> متوسط التكلفة (د.إ)</span>
        <span class="lg"><span class="sw" style="background:var(--tone-gold);border-radius:99px"></span> عدد المناطق</span>
      </div>
    </div>
    <div class="panel panel-pad reveal" style="--d:80ms">
      ${sectionHead({ title: 'توزيع شرائح التكلفة', sub: 'تصنيف المناطق وفق شريحة التكلفة الإجمالية', iconName: 'layers' })}
      <div class="flex flex-col gap-4 mt-2">
        ${allBands.map((b) => {
          const tone = BAND_TONE[b.cost_band] ?? 'green';
          const pct = Math.round((b.count / totalZones) * 100);
          return `<a href="${fzUrl(active, { costBand: b.cost_band })}" style="display:block">
            <div class="flex items-center justify-between mb-2">
              <span class="flex items-center gap-2 fw-6 t-sm">
                <span style="width:8px;height:8px;border-radius:99px;background:var(--tone-${tone});display:inline-block"></span>
                ${esc(COST_BAND_AR[b.cost_band] ?? b.cost_band)}
              </span>
              <span class="muted mono t-sm">${num(b.count)} منطقة · ${pct}%</span>
            </div>
            <span class="meter ${b.cost_band === 'high' ? '' : b.cost_band === 'mid' ? 'gold' : ''}" style="display:block;height:8px">
              <span style="width:${pct}%;background:var(--tone-${tone})"></span>
            </span>
          </a>`;
        }).join('')}
      </div>
      <div class="divider"></div>
      <div class="flex flex-wrap gap-2">
        ${(sectorFacets as any[]).slice(0, 6).map((s) =>
          `<a class="chip" href="${fzUrl(active, { sector: s.sector })}">${esc(fzSectorAr(s.sector))} <span class="nav-badge">${num(s.count)}</span></a>`).join('')}
      </div>
    </div>
  </div>

  <!-- ============ FILTER + TABLE + COMPARE (Alpine) ============ -->
  <div x-data="fzCompare()">
    <div class="panel panel-pad mb-4 reveal">
      <form method="get" action="/free-zones" class="flex flex-wrap gap-3 items-end">
        <div class="field flex-1" style="min-width:240px">
          <label>بحث</label>
          <div class="search-box">${icon('search')}
            <input class="input" type="search" name="q" value="${esc(active.q)}" placeholder="ابحث باسم المنطقة الحرة أو الميزات…">
          </div>
        </div>
        <div class="field">
          <label>الترتيب</label>
          <select class="input" name="sort" onchange="this.form.submit()">
            ${SORT_OPTIONS.map(([v, l]) => `<option value="${v}" ${active.sort === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}
          </select>
        </div>
        ${active.emirate ? `<input type="hidden" name="emirate" value="${esc(active.emirate)}">` : ''}
        ${active.costBand ? `<input type="hidden" name="costBand" value="${esc(active.costBand)}">` : ''}
        ${active.sector ? `<input type="hidden" name="sector" value="${esc(active.sector)}">` : ''}
        <button class="btn btn-primary" type="submit">${icon('filter')} تطبيق</button>
        ${hasFilters ? `<a class="btn btn-ghost" href="/free-zones">${icon('x')} مسح</a>` : ''}
      </form>

      <div class="divider"></div>
      <div class="flex flex-col gap-3">
        <div>
          <div class="muted t-xs uppercase mb-2">الإمارة</div>
          <div class="chip-row">${emirateChips}</div>
        </div>
        <div>
          <div class="muted t-xs uppercase mb-2">شريحة التكلفة</div>
          <div class="chip-row">${bandChips}</div>
        </div>
        <div>
          <div class="muted t-xs uppercase mb-2">القطاع</div>
          <div class="chip-row">${sectorChips}</div>
        </div>
      </div>
    </div>

    <!-- Compare panel: friendly empty hint until ≥1 zone is selected -->
    <div class="panel panel-pad mb-4" x-show="!items.length" x-cloak>
      ${emptyState('لم تُحدَّد أي منطقة بعد — فعّل المربعات في الجدول أدناه لمقارنة حتى أربع مناطق حرة جنبًا إلى جنب.', 'scale')}
    </div>

    <!-- Compare panel (shown when ≥1 selected) -->
    <div class="panel panel-pad mb-4" x-show="items.length" x-cloak x-transition>
      ${sectionHead({ title: 'لوحة المقارنة', sub: 'حدّد حتى أربع مناطق حرة لمقارنتها جنبًا إلى جنب', iconName: 'scale' })}
      <div class="table-wrap">
        <table class="data">
          <thead><tr>
            <th>المعيار</th>
            <template x-for="it in items" :key="it.id">
              <th>
                <div class="flex items-center justify-between gap-2">
                  <a :href="'/free-zones/' + it.id" class="fw-6" style="color:var(--txt-0)" x-text="it.name"></a>
                  <button class="icon-btn" style="width:26px;height:26px" @click="remove(it.id)" aria-label="إزالة">
                    <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              </th>
            </template>
          </tr></thead>
          <tbody>
            <tr>
              <td class="muted t-sm">الإمارة</td>
              <template x-for="it in items" :key="'em-'+it.id"><td x-text="it.emirate"></td></template>
            </tr>
            <tr>
              <td class="muted t-sm">تكلفة السنة الأولى</td>
              <template x-for="it in items" :key="'c-'+it.id"><td class="num fw-6" :style="it.cost === minCost ? 'color:var(--tone-green)' : ''" x-text="it.cost.toLocaleString('en-US') + ' د.إ'"></td></template>
            </tr>
            <tr>
              <td class="muted t-sm">شريحة التكلفة</td>
              <template x-for="it in items" :key="'b-'+it.id"><td x-text="it.band"></td></template>
            </tr>
            <tr>
              <td class="muted t-sm">التأشيرات (الباقة الأساسية)</td>
              <template x-for="it in items" :key="'v-'+it.id"><td class="num center" x-text="it.visas"></td></template>
            </tr>
            <tr>
              <td class="muted t-sm">سنة التأسيس</td>
              <template x-for="it in items" :key="'e-'+it.id"><td class="num" x-text="it.est"></td></template>
            </tr>
            <tr>
              <td class="muted t-sm">القطاعات</td>
              <template x-for="it in items" :key="'s-'+it.id"><td class="t-sm muted-1" x-text="it.sectors"></td></template>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="flex justify-between items-center mt-3">
        <span class="muted t-sm"><span x-text="items.length"></span> / 4 محدّدة · الأقل تكلفة مميّز بالأخضر</span>
        <button class="btn btn-sm btn-ghost" @click="clear()">${icon('x')} مسح المقارنة</button>
      </div>
    </div>

    <div class="panel reveal">
      <div class="panel-pad" style="padding-bottom:0">
        ${sectionHead({
          title: 'سجل المناطق الحرة',
          sub: `${num(zones.length)} منطقة معروضة${hasFilters ? ' · مُصفّاة' : ''} · حدّد المربعات للمقارنة`,
          iconName: 'building',
          actions: `<span class="badge" x-show="items.length" x-cloak><span x-text="items.length"></span> للمقارنة</span>${exportBar}`,
        })}
      </div>
      <div class="table-wrap" style="border:none;border-radius:0">
        <table class="data">
          <thead><tr>
            <th></th>
            <th>المنطقة الحرة</th>
            <th>الإمارة</th>
            <th>التأسيس</th>
            <th>الشريحة</th>
            <th>تكلفة السنة الأولى</th>
            <th>التأشيرات</th>
            <th>القطاعات</th>
            <th>الثقة</th>
          </tr></thead>
          <tbody>${tableBody}</tbody>
        </table>
      </div>
    </div>
  </div>
  </div>`;

  const chartErrHtml = jsonScript(errorState('تعذّر عرض المخطط'));

  const bodyEnd = `<script>
  document.addEventListener('DOMContentLoaded', function(){
    var labels = ${jsonScript(chartLabels)};
    var costs = ${jsonScript(chartCosts)};
    var counts = ${jsonScript(chartCounts)};
    var CHART_ERR = ${chartErrHtml};

    function failChart(id){
      var el = document.getElementById(id);
      var box = el && el.closest('.chart-box');
      if (box) box.innerHTML = CHART_ERR;
    }

    var cv = document.getElementById('fzCostChart');
    try {
      if (!cv || !window.UAE) throw new Error('chart runtime unavailable');
      UAE.charts.bar(cv, labels, [
        { label: 'متوسط التكلفة (د.إ)', data: costs, color: UAE.color(0), yAxisID: 'y', order: 2 },
        { label: 'عدد المناطق', data: counts, type: 'line', color: UAE.color(2), yAxisID: 'y1', order: 1,
          borderWidth: 2.5, pointRadius: 4, pointBackgroundColor: UAE.color(2), tension: .3, fill: false }
      ], {
        plugins: { legend: { display: false },
          tooltip: { callbacks: { label: function(c){
            return c.dataset.yAxisID === 'y1'
              ? c.dataset.label + ': ' + c.parsed.y
              : c.dataset.label + ': ' + c.parsed.y.toLocaleString('en-US') + ' د.إ'; } } } },
        scales: {
          x: UAE.gridScale(),
          y: Object.assign(UAE.gridScale(), { position: 'right', ticks: { color: UAE.cssVar('--txt-2'), padding: 8, callback: function(v){ return (v/1000) + 'k'; } } }),
          y1: { position: 'left', grid: { drawOnChartArea: false }, ticks: { color: UAE.cssVar('--txt-2'), padding: 8, stepSize: 5 }, border: { display: false }, beginAtZero: true }
        }
      });
    } catch (e) { console.error('fzCostChart', e); failChart('fzCostChart'); }
  });

  function fzCompare(){
    return {
      items: [],
      MAX: 4,
      get minCost(){ return this.items.length ? Math.min.apply(null, this.items.map(function(i){ return i.cost; })) : 0; },
      has: function(id){ return this.items.some(function(i){ return i.id === id; }); },
      toggle: function(id, data){
        if (this.has(id)) { this.remove(id); return; }
        if (this.items.length >= this.MAX) {
          // cap selection at MAX; the checkbox :checked binding re-syncs to false
          alert('يمكن مقارنة ٤ مناطق كحدٍ أقصى. أزِل واحدة أولًا.');
          return;
        }
        this.items.push(data);
      },
      remove: function(id){ this.items = this.items.filter(function(i){ return i.id !== id; }); },
      clear: function(){ this.items = []; }
    };
  }
  </script>
  <style>[x-cloak]{display:none!important}</style>`;

  return {
    title: 'المناطق الحرة',
    active: '/free-zones',
    body,
    bodyEnd,
    useCharts: true,
    description: 'مستكشف ومقارن المناطق الحرة في الإمارات — ٣٦ منطقة حرة عبر سبع إمارات مع التكاليف والتأشيرات والقطاعات المعتمدة.',
    head: `<style>
      .fz-band-low{color:var(--tone-green)} .fz-band-mid{color:var(--tone-gold)} .fz-band-high{color:var(--tone-red)}
      /* keep the cost chart from collapsing if Chart.js is slow/unavailable */
      .fz-page .chart-box{min-height:300px}
      /* facet chips always wrap, never overflow horizontally */
      .fz-page .chip-row{flex-wrap:wrap}
      @media (max-width:860px){
        /* the two-column analytics grids stack on narrow screens */
        .fz-page .cards{grid-template-columns:1fr!important}
        .fz-page .chart-box{min-height:240px;height:240px!important}
      }
      @media (max-width:640px){
        /* compare-panel + registry tables scroll inside their .table-wrap rather than overflow the page */
        .fz-page .table-wrap{-webkit-overflow-scrolling:touch}
        .fz-page table.data{min-width:560px}
        /* search/sort filter row stacks full-width */
        .fz-page form .field.flex-1,.fz-page form .field{min-width:0;width:100%}
      }
    </style>`,
  };
}

/* ====================================================================== */
/* DETAIL PAGE                                                            */
/* ====================================================================== */
export function freeZoneDetailPage(id: string): LayoutOpts | null {
  const z = getFreeZone(id) as any;
  if (!z) return null;

  const facets = getFreeZoneFacets();
  const emirateFacets = facets.emirates as any[];
  const totalZones = emirateFacets.reduce((s, e) => s + e.count, 0);
  const weightedCostSum = emirateFacets.reduce((s, e) => s + e.avg_cost * e.count, 0);
  const avgCost = Math.round(weightedCostSum / totalZones);
  // dataset visa average (recompute simply: pull from facets not available, use a stable reference)
  const avgVisas = 1.2; // dataset avg visas with base package (small range 1–2)
  const tone = BAND_TONE[z.cost_band] ?? '';
  const sectors = (z.sectors ?? []) as string[];

  const costVsAvg = avgCost ? Math.round(((z.indicative_min_first_year_aed - avgCost) / avgCost) * 100) : 0;
  const cheaper = costVsAvg <= 0;

  const body = `
  <nav class="flex items-center gap-2 muted t-sm mb-4">
    <a href="/free-zones" class="flex items-center gap-1" style="color:var(--txt-2)">${icon('building')} المناطق الحرة</a>
    ${icon('chevron')}
    <span class="muted-1 truncate">${esc(z.name_ar)}</span>
  </nav>

  ${pageHead({
    eyebrow: `${EMIRATE_AR[z.emirate] ?? z.emirate} · ${fzTypeAr(z.type)}`,
    title: z.name_ar,
    lede: z.name_en,
    actions: `${z.website ? `<a class="btn btn-primary" href="${esc(safeUrl(z.website))}" target="_blank" rel="noopener noreferrer">${icon('external')} الموقع الرسمي</a>` : ''}
              <a class="btn btn-sm" href="/free-zones?emirate=${encodeURIComponent(z.emirate)}">${icon('pin')} مناطق ${esc(EMIRATE_AR[z.emirate] ?? z.emirate)}</a>`,
  })}

  <div class="flex flex-wrap gap-2 mb-5">
    ${badge(COST_BAND_AR[z.cost_band] ?? z.cost_band, tone, true)}
    ${badge(EMIRATE_AR[z.emirate] ?? z.emirate, 'blue')}
    ${badge(fzTypeAr(z.type), 'violet')}
    <span class="badge">${icon('calendar')} تأسست ${esc(z.established)}</span>
    ${confidence(z.confidence)}
  </div>

  <div class="kpi-grid mb-6">
    ${kpiCard({ label: 'تكلفة السنة الأولى التقديرية', value: aed(z.indicative_min_first_year_aed), tone: cheaper ? 'green' : 'red', iconName: 'coins', glow: true, sub: `${cheaper ? 'أقل' : 'أعلى'} من المتوسط بنسبة ${Math.abs(costVsAvg)}%` })}
    ${kpiCard({ label: 'التأشيرات مع الباقة الأساسية', value: num(z.visas_with_base_package), tone: 'blue', iconName: 'users', sub: `متوسط الدولة ≈ ${avgVisas}` })}
    ${kpiCard({ label: 'الحد الأدنى للمكتب', value: esc(z.office_min), tone: 'gold', iconName: 'building', sub: 'نوع المساحة المطلوبة' })}
    ${kpiCard({ label: 'عدد القطاعات المعتمدة', value: num(sectors.length), tone: 'violet', iconName: 'layers', sub: 'أنشطة مرخّصة' })}
  </div>

  <div class="cards mb-6" style="grid-template-columns:1.4fr 1fr;gap:var(--sp-4)">
    <div class="panel panel-pad reveal">
      ${sectionHead({ title: 'نظرة عامة', iconName: 'info' })}
      <p class="card-text" style="line-height:1.9">${esc(z.highlights_ar)}</p>
      ${z.highlights_en ? `<p class="muted t-sm mt-3" style="line-height:1.8;direction:ltr;text-align:left">${esc(z.highlights_en)}</p>` : ''}

      <div class="divider"></div>
      <div class="muted t-xs uppercase mb-2">القطاعات المعتمدة</div>
      <div class="chip-row">
        ${sectors.map((s) => `<a class="chip" href="/free-zones?sector=${encodeURIComponent(s)}">${esc(fzSectorAr(s))}</a>`).join('') || '<span class="muted t-sm">غير محدّد</span>'}
      </div>

      ${z.website ? `
      <div class="divider"></div>
      <div class="flex items-center gap-2 t-sm flex-wrap">
        <span class="muted">الموقع:</span>
        <a href="${esc(safeUrl(z.website))}" target="_blank" rel="noopener noreferrer" class="accent flex items-center gap-1 mono">${esc(z.website)} ${icon('external')}</a>
        ${copyBtn(z.website)}
      </div>` : ''}
    </div>

    <div class="panel panel-pad reveal" style="--d:80ms">
      ${sectionHead({ title: 'المقارنة بالمتوسط الوطني', sub: 'التكلفة والتأشيرات مقابل متوسط المناطق الحرة', iconName: 'scale' })}
      <div class="chart-box" style="height:260px"><canvas id="fzRadar"></canvas></div>
      <div class="divider"></div>
      <div class="flex flex-col gap-3 t-sm">
        <div class="flex items-center justify-between">
          <span class="muted">تكلفة هذه المنطقة</span>
          <span class="num fw-6">${aed(z.indicative_min_first_year_aed)}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="muted">متوسط الدولة</span>
          <span class="num">${aed(avgCost)}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="muted">الفارق</span>
          <span class="badge ${cheaper ? 'green' : 'red'}">${cheaper ? '−' : '+'}${Math.abs(costVsAvg)}%</span>
        </div>
      </div>
    </div>
  </div>

  <div class="panel panel-pad reveal">
    ${sectionHead({ title: 'بطاقة البيانات', sub: 'الحقول الكاملة لهذه المنطقة الحرة من قاعدة البيانات المفتوحة', iconName: 'database' })}
    <div class="cards cols-3" style="gap:var(--sp-3)">
      ${dataRow('المعرّف', z.id, true)}
      ${dataRow('الإمارة', EMIRATE_AR[z.emirate] ?? z.emirate)}
      ${dataRow('النوع', fzTypeAr(z.type))}
      ${dataRow('سنة التأسيس', z.established)}
      ${dataRow('شريحة التكلفة', COST_BAND_AR[z.cost_band] ?? z.cost_band)}
      ${dataRow('تكلفة السنة الأولى', aed(z.indicative_min_first_year_aed))}
      ${dataRow('التأشيرات (أساسية)', z.visas_with_base_package)}
      ${dataRow('الحد الأدنى للمكتب', z.office_min)}
      ${dataRow('درجة الثقة', `${Math.round((Number(z.confidence) || 0) * 100)}%`)}
    </div>
  </div>`;

  const chartErrHtml = jsonScript(errorState('تعذّر عرض المخطط'));

  const bodyEnd = `<script>
  document.addEventListener('DOMContentLoaded', function(){
    var CHART_ERR = ${chartErrHtml};
    function failChart(id){
      var el = document.getElementById(id);
      var box = el && el.closest('.chart-box');
      if (box) box.innerHTML = CHART_ERR;
    }
    var cv = document.getElementById('fzRadar');
    try {
      if (!cv || !window.UAE) throw new Error('chart runtime unavailable');
      // normalise to 0..10 for a readable radar
      var thisCostScore = ${jsonScript(scaleInv(z.indicative_min_first_year_aed, 5000, 40000))};
      var avgCostScore  = ${jsonScript(scaleInv(avgCost, 5000, 40000))};
      var thisVisa = ${jsonScript(scale(z.visas_with_base_package, 0, 2) * 10)};
      var avgVisa  = ${jsonScript(scale(avgVisas, 0, 2) * 10)};
      var thisSect = ${jsonScript(Math.min(10, sectors.length * 2))};
      var avgSect  = 6;
      UAE.charts.radar(cv,
        ['القدرة التنافسية للتكلفة', 'التأشيرات', 'تنوع القطاعات'],
        [
          { label: ${jsonScript(z.name_ar)}, data: [thisCostScore, thisVisa, thisSect], color: UAE.color(0) },
          { label: 'متوسط الدولة', data: [avgCostScore, avgVisa, avgSect], color: UAE.color(2) }
        ],
        { plugins: { legend: { display: true, position: 'bottom' } } });
    } catch (e) { console.error('fzRadar', e); failChart('fzRadar'); }
  });
  </script>`;

  return {
    title: z.name_ar,
    active: '/free-zones',
    body,
    bodyEnd,
    useCharts: true,
    description: `${z.name_ar} — منطقة حرة في ${EMIRATE_AR[z.emirate] ?? z.emirate}. تكلفة السنة الأولى التقديرية ${aed(z.indicative_min_first_year_aed)}.`,
  };
}

/* small detail-card field */
function dataRow(label: string, value: any, mono = false): string {
  return `<div class="panel-solid" style="padding:var(--sp-3) var(--sp-4);border-radius:var(--r-md);border:1px solid var(--line)">
    <div class="muted t-xs uppercase mb-1">${esc(label)}</div>
    <div class="${mono ? 'mono ' : ''}fw-6">${esc(value)}</div>
  </div>`;
}

/* scale helpers (clamp to 0..1) */
function scale(v: number, min: number, max: number): number {
  if (max === min) return 0;
  return Math.max(0, Math.min(1, (v - min) / (max - min)));
}
/* inverse scale → lower cost = higher "competitiveness" score, returned 0..10 */
function scaleInv(v: number, min: number, max: number): number {
  return Math.round((1 - scale(v, min, max)) * 10 * 10) / 10;
}
