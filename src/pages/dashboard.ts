/** dashboard.ts — Executive command-center: the single operational overview of the whole platform. */
import type { LayoutOpts } from '../lib/layout.js';
import { icon } from '../lib/icons.js';
import { jsonScript, esc, num, EMIRATE_AR } from '../lib/i18n.js';
import { kpiCard, sectionHead, badge, confidence, scoreBar, pageHead, exportButtons, errorState, emptyState } from '../lib/ui.js';
import {
  platformStats, getMacro, getProjectFacets, getProjectScoreAverages,
  getFreeZoneFacets, getObservatory, getTopProjects, getDatasets,
} from '../lib/db.js';

export function dashboardPage(): LayoutOpts {
  const s = platformStats();
  const macro = getMacro().macro as any[];
  const pf = getProjectFacets();
  const sectors = pf.sectors as any[];
  const scoreAvg = getProjectScoreAverages();
  const fzf = getFreeZoneFacets();
  const fzEmirates = fzf.emirates as any[];
  const obs = getObservatory();
  const adoption = (obs.adoption_by_function as any[]) ?? [];
  const skillsDemand = (obs.skills_demand as any[]) ?? [];
  const obsKpis = (obs.kpis as any[]) ?? [];
  const top = getTopProjects('impact_score', 6) as any[];
  const datasets = getDatasets() as any[];
  const datasetTotalRecords = datasets.reduce((a, d) => a + (Number(d.records) || 0), 0);

  /* ---- KPI row -------------------------------------------------------- */
  const kpis = [
    kpiCard({ label: 'إجمالي السجلات', value: num(s.totalRecords), sub: `عبر 5 مراصد · محدّث ${esc(s.updated)}`, tone: 'green', iconName: 'database', glow: true }),
    kpiCard({ label: 'مشاريع الابتكار', value: num(s.projects), sub: `${num(s.sectors)} قطاعًا حيويًا`, tone: 'green', iconName: 'bulb' }),
    kpiCard({ label: 'المناطق الحرة', value: num(s.freezones), sub: `${num(s.emirates)} إمارات مغطّاة`, tone: 'blue', iconName: 'building' }),
    kpiCard({ label: 'مهارات الذكاء الاصطناعي', value: num(s.skills), sub: 'بمستويات وأمثلة تطبيقية', tone: 'violet', iconName: 'brain' }),
    kpiCard({ label: 'متوسط درجة الأثر', value: `${esc(s.avgImpact)}/10`, sub: `${num(top.length)} مشاريع بأثر 10/10`, tone: 'gold', iconName: 'target', glow: true }),
    kpiCard({ label: 'عقد الرسم المعرفي', value: num(s.graphNodes), sub: `${num(s.graphEdges)} علاقة مستخرَجة`, tone: 'blue', iconName: 'graph' }),
  ].join('');

  /* ---- Macro strip ---------------------------------------------------- */
  const macroTiles = macro.map((m) => `
    <div class="dash-macro" title="${esc(m.label_en)}">
      <div class="dash-macro-val mono">${esc(m.value)}</div>
      <div class="dash-macro-lbl">${esc(m.label_ar)}</div>
      <div class="dash-macro-src">${esc(m.source)} · ${esc(m.year)}</div>
    </div>`).join('');

  /* ---- Observatory mini-KPIs (strategic signals) ---------------------- */
  const toneClass = (t: string) => (t === 'red' ? 'red' : t === 'gold' ? 'gold' : t === 'blue' ? 'blue' : t === 'violet' ? 'violet' : 'green');
  const signalTiles = obsKpis.slice(0, 4).map((k) => `
    <div class="dash-signal" data-tone="${esc(toneClass(k.tone))}">
      <div class="flex items-center justify-between gap-2">
        <span class="dash-signal-val mono">${esc(k.value)}</span>
        ${k.delta ? badge(esc(k.delta), toneClass(k.tone)) : ''}
      </div>
      <div class="dash-signal-lbl clamp-2">${esc(k.label_ar)}</div>
      <div class="dash-macro-src truncate">${esc(k.source)}</div>
    </div>`).join('');

  /* ---- Top projects list ---------------------------------------------- */
  const topList = top.map((p, i) => `
    <a class="dash-row" href="/innovation/${esc(p.id)}">
      <span class="dash-rank mono">${num(i + 1)}</span>
      <span class="flex-1" style="min-width:0">
        <span class="dash-row-title truncate fw-6">${esc(p.name)}</span>
        <span class="flex items-center gap-2 mt-2">
          <span class="tag">${esc(p.sector_ar)}</span>
          ${scoreBar(p.impact_score, 10)}
        </span>
      </span>
      <span class="score-pill flex-none">${esc(p.impact_score)}</span>
    </a>`).join('');

  /* ---- Dataset catalog summary ---------------------------------------- */
  const datasetList = datasets.slice(0, 6).map((d) => `
    <a class="dash-row" href="/datasets/${esc(d.id)}">
      <span class="dash-ds-ico flex-none">${icon('database')}</span>
      <span class="flex-1" style="min-width:0">
        <span class="dash-row-title truncate fw-6">${esc(d.title_ar)}</span>
        <span class="flex items-center gap-2 mt-2 flex-wrap">
          <span class="tag mono">${num(d.records)} سجل</span>
          <span class="tag">${esc(d.format)}</span>
          ${confidence(d.confidence)}
        </span>
      </span>
      ${icon('chevron', 'flex-none')}
    </a>`).join('');

  /* ---- Body ----------------------------------------------------------- */
  const body = `
  ${pageHead({
    eyebrow: 'مركز القيادة التشغيلي · OPERATIONS COMMAND CENTER',
    title: 'لوحة القيادة',
    lede: 'نظرة تشغيلية موحّدة على منصة الإمارات للذكاء المفتوح — السجلات، المؤشرات الكلية، توزيع المشاريع والمناطق الحرة، تبنّي الذكاء الاصطناعي، ومتوسطات تقييم الأثر عبر سبعة أبعاد.',
    actions: `<span class="live-pill"><span class="dot-status"></span> بيانات حيّة · ${esc(s.updated)}</span>
      <div class="dash-export-group">
        <span class="muted t-xs dash-export-lbl">المشاريع</span>
        ${exportButtons({ csv: '/api/v1/export/projects.csv', json: '/api/v1/export/projects.json' })}
        <span class="muted t-xs dash-export-lbl">المؤشرات الكلية</span>
        ${exportButtons({ csv: '/api/v1/export/macro.csv', json: '/api/v1/export/macro.json', print: true })}
      </div>
      <a class="btn btn-sm" href="/reports">${icon('report')} التقارير</a>
      <a class="btn btn-sm" href="/api-hub">${icon('code')} الـ API</a>`,
  })}

  <section class="kpi-grid mb-6 reveal in">${kpis}</section>

  <section class="mb-6">
    ${sectionHead({ title: 'مؤشرات اقتصادية كلية', sub: 'أرقام مرجعية من مصادر عامة، موسومة بالمصدر والسنة', iconName: 'trending' })}
    <div class="dash-macro-grid reveal">${macro.length ? macroTiles : emptyState('لا تتوفّر مؤشرات كلية', 'trending')}</div>
  </section>

  <section class="cards mb-6 reveal" style="grid-template-columns:1.25fr 1fr">
    <div class="panel panel-pad">
      ${sectionHead({ title: 'توزيع المشاريع حسب القطاع', sub: `${num(s.projects)} مشروعًا عبر ${num(sectors.length)} قطاعًا · متوسط الأثر ${esc(s.avgImpact)}/10`, iconName: 'activity' })}
      <div class="chart-box" style="height:300px"><canvas id="dashSectorChart"></canvas></div>
    </div>
    <div class="panel panel-pad">
      ${sectionHead({ title: 'متوسط تقييم المشاريع', sub: 'سبعة أبعاد تقييم على مقياس 0–10', iconName: 'target' })}
      <div class="chart-box" style="height:300px"><canvas id="dashRadarChart"></canvas></div>
    </div>
  </section>

  <section class="cards cols-2 mb-6 reveal">
    <div class="panel panel-pad">
      ${sectionHead({ title: 'المناطق الحرة حسب الإمارة', sub: 'العدد ومتوسط التكلفة التقديرية للسنة الأولى', iconName: 'building' })}
      <div class="chart-box" style="height:300px"><canvas id="dashFzChart"></canvas></div>
      <div class="legend mt-3">
        <span class="lg"><span class="sw" style="background:var(--uae-blue)"></span> عدد المناطق الحرة</span>
        <span class="lg"><span class="sw" style="background:var(--uae-gold)"></span> متوسط التكلفة (د.إ)</span>
      </div>
    </div>
    <div class="panel panel-pad">
      ${sectionHead({ title: 'تبنّي الذكاء الاصطناعي حسب الوظيفة', sub: `حصة كل وظيفة تشغيلية · مرصد ${esc(obs.status)} · ${esc(obs.generated_on)}`, iconName: 'zap' })}
      <div class="chart-box" style="height:300px"><canvas id="dashAdoptionChart"></canvas></div>
    </div>
  </section>

  ${signalTiles ? `
  <section class="mb-6">
    ${sectionHead({ title: 'إشارات استراتيجية', sub: 'مؤشرات مختارة من مرصد تبنّي الذكاء الاصطناعي', iconName: 'sparkles' })}
    <div class="dash-signal-grid reveal">${signalTiles}</div>
  </section>` : ''}

  <section class="cards cols-2 mb-6 reveal" style="align-items:start">
    <div class="panel panel-pad">
      ${sectionHead({
        title: 'مشاريع عالية الأثر',
        sub: 'أعلى ستة مشاريع وفق درجة الأثر العام',
        iconName: 'bulb',
        actions: `<a class="btn btn-sm" href="/innovation">عرض الكل ${icon('chevron')}</a>`,
      })}
      <div class="dash-list">${top.length ? topList : emptyState('لا توجد مشاريع لعرضها', 'bulb')}</div>
    </div>
    <div class="panel panel-pad">
      ${sectionHead({
        title: 'كتالوج مجموعات البيانات',
        sub: `${num(datasets.length)} مجموعة · ${num(datasetTotalRecords)} سجل قابل للتصدير عبر الـ API`,
        iconName: 'database',
        actions: `<a class="btn btn-sm" href="/datasets">عرض الكل ${icon('chevron')}</a>`,
      })}
      <div class="dash-list">${datasets.length ? datasetList : emptyState('لا توجد مجموعات بيانات', 'database')}</div>
    </div>
  </section>

  ${skillsDemand.length ? `
  <section class="panel panel-pad reveal mb-2">
    ${sectionHead({ title: 'الطلب على مهارات الذكاء الاصطناعي', sub: 'أعلى المهارات طلبًا في سوق العمل، بحسب الحصة والمستوى', iconName: 'brain' })}
    <div class="dash-skill-bars">
      ${skillsDemand.map((sk) => `
        <div class="dash-skill">
          <div class="flex items-center justify-between gap-2 mb-2">
            <span class="t-sm fw-6 truncate">${esc(sk.skill_ar)}</span>
            <span class="flex items-center gap-2">${badge(esc(sk.level), 'violet')}<span class="mono t-sm accent">${esc(sk.share)}%</span></span>
          </div>
          <span class="meter"><span style="width:${Math.max(0, Math.min(100, Number(sk.share) || 0))}%"></span></span>
        </div>`).join('')}
    </div>
  </section>` : ''}`;

  /* ---- Chart data (inlined) ------------------------------------------- */
  const radarLabels = ['الأثر', 'الابتكار', 'التأشيرة الذهبية', 'السيادة', 'التنظيم', 'التوطين', 'الاستدامة'];
  const radarValues = [
    scoreAvg.impact_score, scoreAvg.innovation_score, scoreAvg.golden_visa_relevance,
    scoreAvg.sovereignty_score, scoreAvg.regulation_score, scoreAvg.emiratization_score,
    scoreAvg.sustainability_score,
  ];
  const sectorLabels = sectors.map((x) => x.sector_ar);
  const sectorValues = sectors.map((x) => x.count);
  const fzLabels = fzEmirates.map((x) => EMIRATE_AR[x.emirate] ?? x.emirate);
  const fzCounts = fzEmirates.map((x) => x.count);
  const fzCosts = fzEmirates.map((x) => x.avg_cost);
  const adoptionLabels = adoption.map((x) => x.function_ar);
  const adoptionValues = adoption.map((x) => x.share);

  const data = {
    radarLabels, radarValues, sectorLabels, sectorValues,
    fzLabels, fzCounts, fzCosts, adoptionLabels, adoptionValues,
  };

  const errBlock = errorState('تعذّر عرض هذا الرسم البياني');

  const bodyEnd = `<script>
  document.addEventListener('DOMContentLoaded', function(){
    var D = ${jsonScript(data)};
    var ERR = ${jsonScript(errBlock)};

    // Render an error block into a chart's container (.chart-box) if its init fails.
    function chartErr(id){
      var el = document.getElementById(id);
      var box = el ? el.closest('.chart-box') : null;
      if (box) box.innerHTML = ERR;
    }
    // Run one chart init in isolation so a single failure can't blank the dashboard.
    function safeChart(id, fn){
      try {
        if (!window.Chart) { chartErr(id); return; }
        fn();
      } catch (e) {
        if (window.console) console.error('chart ' + id + ' failed:', e);
        chartErr(id);
      }
    }

    // Projects by sector — doughnut
    safeChart('dashSectorChart', function(){
      UAE.charts.doughnut(document.getElementById('dashSectorChart'), D.sectorLabels, D.sectorValues, {
        plugins: { legend: { position: 'right', labels: { boxWidth: 8, padding: 9, font: { size: 11.5 } } },
          tooltip: { callbacks: { label: function(c){ return ' ' + c.label + ': ' + c.parsed + ' مشروع'; } } } }
      });
    });

    // Average project scores — radar
    safeChart('dashRadarChart', function(){
      UAE.charts.radar(document.getElementById('dashRadarChart'), D.radarLabels,
        [{ label: 'متوسط التقييم', data: D.radarValues, color: UAE.color(0) }],
        { plugins: { legend: { display: false },
          tooltip: { callbacks: { label: function(c){ return ' ' + c.label + ': ' + c.parsed.r + '/10'; } } } } });
    });

    // Free zones by emirate — count (bars) + avg cost (line), dual axis
    safeChart('dashFzChart', function(){
      var fzCanvas = document.getElementById('dashFzChart');
      if (!fzCanvas) return;
      new window.Chart(fzCanvas, {
        type: 'bar',
        data: { labels: D.fzLabels, datasets: [
          { label: 'عدد المناطق الحرة', data: D.fzCounts, backgroundColor: UAE.cssVar('--uae-blue'), borderRadius: 6, maxBarThickness: 30, yAxisID: 'y', order: 2 },
          { type: 'line', label: 'متوسط التكلفة (د.إ)', data: D.fzCosts, borderColor: UAE.cssVar('--uae-gold'), backgroundColor: UAE.cssVar('--uae-gold'), borderWidth: 2.5, tension: 0.35, pointRadius: 3, yAxisID: 'y1', order: 1 }
        ] },
        options: {
          maintainAspectRatio: false,
          plugins: { legend: { display: false },
            tooltip: { callbacks: { label: function(c){
              return c.dataset.yAxisID === 'y1' ? ' متوسط التكلفة: ' + c.parsed.y.toLocaleString('en-US') + ' د.إ'
                                                : ' المناطق الحرة: ' + c.parsed.y; } } } },
          scales: {
            x: UAE.gridScale(),
            y: Object.assign(UAE.gridScale(), { position: 'right', beginAtZero: true, ticks: { precision: 0, color: UAE.cssVar('--uae-blue'), padding: 8 } }),
            y1: { position: 'left', beginAtZero: true, grid: { drawOnChartArea: false }, border: { display: false },
              ticks: { color: UAE.cssVar('--uae-gold'), padding: 8, callback: function(v){ return (v/1000) + 'k'; } } }
          }
        }
      });
    });

    // AI adoption by function — bar
    safeChart('dashAdoptionChart', function(){
      UAE.charts.bar(document.getElementById('dashAdoptionChart'), D.adoptionLabels,
        [{ label: 'الحصة %', data: D.adoptionValues, color: UAE.cssVar('--uae-violet') }],
        { plugins: { legend: { display: false },
          tooltip: { callbacks: { label: function(c){ return ' الحصة: ' + c.parsed.y + '%'; } } } },
          scales: { x: UAE.gridScale(), y: Object.assign(UAE.gridScale(), { beginAtZero: true, max: 100, ticks: { callback: function(v){ return v + '%'; }, padding: 8 } }) } });
    });
  });
  </script>`;

  const head = `<style>
    .dash-macro-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(168px,1fr)); gap:var(--sp-3); }
    .dash-macro { background:var(--glass-bg); backdrop-filter:blur(var(--glass-blur)); -webkit-backdrop-filter:blur(var(--glass-blur)); border:1px solid var(--line); border-radius:var(--r-md); padding:var(--sp-4); transition:border-color var(--t-fast), transform var(--t-fast); }
    .dash-macro:hover { border-color:var(--line-strong); transform:translateY(-2px); }
    .dash-macro-val { font-size:21px; font-weight:600; color:var(--txt-0); letter-spacing:-.02em; line-height:1.1; }
    .dash-macro-lbl { font-size:12.5px; color:var(--txt-1); margin-top:6px; line-height:1.45; }
    .dash-macro-src { font-size:10.5px; color:var(--txt-3); margin-top:6px; }

    .dash-signal-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:var(--sp-4); }
    .dash-signal { position:relative; background:var(--glass-bg); backdrop-filter:blur(var(--glass-blur)); -webkit-backdrop-filter:blur(var(--glass-blur)); border:1px solid var(--line); border-radius:var(--r-lg); padding:var(--sp-4) var(--sp-5); overflow:hidden; box-shadow:var(--e-2); }
    .dash-signal::before { content:""; position:absolute; inset-inline-start:0; top:0; bottom:0; width:3px; background:var(--tone-green); }
    .dash-signal[data-tone="blue"]::before { background:var(--tone-blue); }
    .dash-signal[data-tone="gold"]::before { background:var(--tone-gold); }
    .dash-signal[data-tone="red"]::before { background:var(--tone-red); }
    .dash-signal[data-tone="violet"]::before { background:var(--tone-violet); }
    .dash-signal-val { font-size:25px; font-weight:600; color:var(--txt-0); letter-spacing:-.02em; }
    .dash-signal-lbl { font-size:12.5px; color:var(--txt-1); margin-top:8px; line-height:1.45; min-height:2.6em; }

    .dash-list { display:flex; flex-direction:column; }
    .dash-row { display:flex; align-items:center; gap:var(--sp-3); padding:11px var(--sp-2); border-radius:var(--r-md); transition:background var(--t-fast); border-bottom:1px solid var(--line); }
    .dash-row:last-child { border-bottom:none; }
    .dash-row:hover { background:var(--bg-3); }
    .dash-row-title { display:block; font-size:13.5px; color:var(--txt-0); }
    .dash-rank { width:26px; height:26px; flex:none; display:grid; place-items:center; border-radius:8px; background:var(--accent-soft); color:var(--accent); font-size:12px; font-weight:600; }
    .dash-ds-ico { width:30px; height:30px; display:grid; place-items:center; border-radius:9px; background:rgba(76,194,255,.12); color:var(--uae-blue); }
    .dash-ds-ico svg { width:16px; height:16px; }
    .dash-row .ico { color:var(--txt-3); }

    .dash-skill-bars { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:var(--sp-4) var(--sp-5); }
    .dash-skill .meter { width:100%; height:7px; }

    /* Header export group: two labelled resource exports, wraps on narrow screens */
    .dash-export-group { display:inline-flex; align-items:center; gap:var(--sp-2); flex-wrap:wrap; }
    .dash-export-lbl { white-space:nowrap; }
    .dash-export-group .export-bar { gap:6px; }

    @media (max-width:980px) { .cards[style*="1.25fr"] { grid-template-columns:1fr !important; } }
    @media (max-width:760px) {
      /* Charts stack full-width on mobile */
      .cards.cols-2 { grid-template-columns:1fr; }
      .chart-box { height:260px !important; }
      /* Macro + signal tiles stay readable and never overflow */
      .dash-macro-grid { grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); }
      .dash-signal-grid { grid-template-columns:1fr; }
      .dash-export-group { width:100%; }
    }
  </style>`;

  return {
    title: 'لوحة القيادة',
    active: '/dashboard',
    description: 'لوحة القيادة التنفيذية — نظرة تشغيلية موحّدة على منصة الإمارات للذكاء المفتوح: السجلات والمؤشرات الكلية وتوزيع المشاريع والمناطق الحرة وتبنّي الذكاء الاصطناعي.',
    body,
    bodyEnd,
    head,
    useCharts: true,
  };
}
