/** skills.ts — AI Skills Observatory: KPIs, category×level heatmap, demand/adoption charts, gap analysis, filterable skills table, source-cited indicators. */
import type { LayoutOpts, PageQuery } from '../lib/layout.js';
import { icon } from '../lib/icons.js';
import { jsonScript, esc, num, LEVEL_AR } from '../lib/i18n.js';
import { kpiCard, badge, sectionHead, pageHead, emptyState, exportButtons, errorState } from '../lib/ui.js';
import { getSkills, getSkillFacets, getObservatory } from '../lib/db.js';

/** Arabic labels for skill-table categories (skills use English category keys not in CATEGORY_AR). */
const SKILL_CAT_AR: Record<string, string> = {
  Foundation: 'الأساسيات', Technical: 'التقنية', Data: 'البيانات',
  Business: 'الأعمال', Cybersecurity: 'الأمن السيبراني', Governance: 'الحوكمة',
};
const catAr = (c: string) => SKILL_CAT_AR[c] ?? c;

/** Tone per skill level for badges (Beginner=green, Intermediate=gold, Advanced=red). */
const LEVEL_TONE: Record<string, string> = { Beginner: 'green', Intermediate: 'gold', Advanced: 'red' };

/** Fixed level column order for heatmap + consistent display. */
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'] as const;

/** Heuristic mapping: observatory demand topics → local skill categories (prototype indicator). */
const DEMAND_TO_CAT: Record<string, string[]> = {
  'تعلم الآلة': ['Technical'],
  'تحليل البيانات': ['Data'],
  'هندسة الأوامر': ['Foundation'],
  'معالجة اللغة الطبيعية': ['Technical'],
  'الرؤية الحاسوبية': ['Technical'],
  'الذكاء الاصطناعي المسؤول': ['Governance', 'Cybersecurity'],
};

export function skillsPage(query: PageQuery = {}): LayoutOpts {
  const obs = getObservatory();
  const facets = getSkillFacets();
  const cats = facets.categories as any[]; // [{category,count}]
  const levels = facets.levels as any[];   // [{level,count}]

  const activeCat = query.category ?? '';
  const activeLevel = query.level ?? '';
  const q = (query.q ?? '').trim();

  // Filtered set for the table.
  const rows = getSkills({ category: activeCat || undefined, level: activeLevel || undefined, q: q || undefined }) as any[];
  // Full set (unfiltered) for heatmap + supply counts.
  const allSkills = getSkills() as any[];
  const totalSkills = allSkills.length;
  const catCount = cats.length;

  /* Export query string carrying the table's CURRENT filters (category,level,q). */
  const exportQS = (() => {
    const p = new URLSearchParams();
    if (activeCat) p.set('category', activeCat);
    if (activeLevel) p.set('level', activeLevel);
    if (q) p.set('q', q);
    const s = p.toString();
    return s ? `?${s}` : '';
  })();
  const exportBar = exportButtons({
    csv: `/api/v1/export/skills.csv${esc(exportQS)}`,
    json: `/api/v1/export/skills.json${esc(exportQS)}`,
    print: true,
  });

  /* ---------------- KPI row ---------------- */
  const toneMap: Record<string, string> = { green: 'green', gold: 'gold', yellow: 'gold', blue: 'blue', red: 'red', violet: 'violet' };
  const kpiCards = (obs.kpis as any[]).map((k) =>
    kpiCard({
      label: k.label_ar,
      value: k.value,
      delta: k.delta,
      tone: toneMap[k.tone] ?? 'green',
      iconName: k.tone === 'red' ? 'shield' : k.tone === 'yellow' ? 'info' : k.tone === 'blue' ? 'globe' : 'trending',
      sub: k.source,
    }),
  ).join('');
  const cornerKpis =
    kpiCard({ label: 'إجمالي المهارات المرصودة', value: num(totalSkills), tone: 'violet', iconName: 'brain', glow: true, sub: 'موزّعة على ثلاثة مستويات إتقان' }) +
    kpiCard({ label: 'فئات المهارات', value: num(catCount), tone: 'green', iconName: 'layers', sub: cats.map((c) => catAr(c.category)).slice(0, 3).join(' · ') });

  /* ---------------- Heatmap: categories × levels ---------------- */
  // cellCount keyed by `${category}|${level}` keeps the indexing strict-mode-safe.
  const cellCount = new Map<string, number>();
  let maxCell = 1;
  for (const s of allSkills) {
    const key = `${s.category}|${s.level}`;
    const next = (cellCount.get(key) ?? 0) + 1;
    cellCount.set(key, next);
    if (next > maxCell) maxCell = next;
  }
  const cellOf = (cat: string, lvl: string) => cellCount.get(`${cat}|${lvl}`) ?? 0;
  const heatRows = cats.map((c) => {
    const rowTotal = LEVELS.reduce((a, l) => a + cellOf(c.category, l), 0);
    const cells = LEVELS.map((l) => {
      const n = cellOf(c.category, l);
      // Opacity ramps from .18 (present) to ~.9 (max) on the green accent; empty cells stay neutral.
      const intensity = n === 0 ? 0 : 0.18 + (n / maxCell) * 0.72;
      const bg = n === 0 ? 'var(--bg-3)' : `rgba(0,214,143,${intensity.toFixed(2)})`;
      const href = `/skills?category=${encodeURIComponent(c.category)}&level=${encodeURIComponent(l)}`;
      const title = `${catAr(c.category)} · ${LEVEL_AR[l]}: ${n} مهارة`;
      return `<a class="heat-cell" href="${href}" title="${esc(title)}" style="background:${bg};${n === 0 ? 'color:var(--txt-3)' : ''}">${n || ''}</a>`;
    }).join('');
    return `
      <div class="sk-heat-rowlabel truncate" title="${esc(catAr(c.category))}">${esc(catAr(c.category))}<span class="muted t-xs mono"> · ${rowTotal}</span></div>
      ${cells}`;
  }).join('');
  const heatHeader = `<div class="sk-heat-corner"></div>${LEVELS.map((l) =>
    `<div class="sk-heat-collabel">${esc(LEVEL_AR[l])}</div>`).join('')}`;

  /* ---------------- Gap analysis: demand share vs supply count ---------------- */
  const supplyByCat: Record<string, number> = {};
  for (const c of cats) supplyByCat[c.category] = c.count;
  const gapRows = (obs.skills_demand as any[]).map((d) => {
    const mappedCats = DEMAND_TO_CAT[d.skill_ar] ?? [];
    const supply = mappedCats.reduce((a, c) => a + (supplyByCat[c] ?? 0), 0);
    // Normalised supply share of the catalog vs demand share.
    const supplyShare = totalSkills ? Math.round((supply / totalSkills) * 100) : 0;
    const gap = d.share - supplyShare; // positive => undersupplied
    return { ...d, mappedCats, supply, supplyShare, gap };
  }).sort((a, b) => b.gap - a.gap);

  const maxDemand = Math.max(1, ...(obs.skills_demand as any[]).map((d) => d.share));
  const gapList = gapRows.map((g) => {
    const dPct = (g.share / maxDemand) * 100;
    const sPct = (g.supplyShare / maxDemand) * 100;
    const gapTone = g.gap > 12 ? 'red' : g.gap > 0 ? 'gold' : 'green';
    const gapLabel = g.gap > 0 ? `فجوة +${g.gap}` : g.gap < 0 ? `وفرة ${g.gap}` : 'متوازن';
    const catsLabel = g.mappedCats.length ? g.mappedCats.map((c: string) => catAr(c)).join(' · ') : '—';
    return `
      <div class="sk-gap-row">
        <div class="flex items-center justify-between gap-2">
          <span class="t-sm fw-6 truncate">${esc(g.skill_ar)}</span>
          ${badge(gapLabel, gapTone, true)}
        </div>
        <div class="sk-gap-bars mt-2">
          <div class="sk-gap-track" title="الطلب المقدّر ${g.share}%"><span class="sk-gap-fill demand" style="width:${dPct.toFixed(1)}%"></span></div>
          <div class="sk-gap-track" title="العرض في الكتالوج ${g.supplyShare}%"><span class="sk-gap-fill supply" style="width:${sPct.toFixed(1)}%"></span></div>
        </div>
        <div class="flex items-center justify-between mt-1">
          <span class="muted t-xs mono">طلب ${g.share}% · عرض ${g.supplyShare}%</span>
          <span class="muted t-xs">${esc(catsLabel)}</span>
        </div>
      </div>`;
  }).join('');

  /* ---------------- Filter chips ---------------- */
  const buildHref = (overrides: Record<string, string>) => {
    const p = new URLSearchParams();
    const cat = overrides.category ?? activeCat;
    const lvl = overrides.level ?? activeLevel;
    if (cat) p.set('category', cat);
    if (lvl) p.set('level', lvl);
    if (q) p.set('q', q);
    const s = p.toString();
    return `/skills${s ? `?${s}` : ''}`;
  };
  const catChips = `
    <a class="chip ${!activeCat ? 'active' : ''}" href="${buildHref({ category: '' })}">الكل <span class="nav-badge">${num(totalSkills)}</span></a>
    ${cats.map((c) => `<a class="chip ${activeCat === c.category ? 'active' : ''}" href="${buildHref({ category: c.category })}">${esc(catAr(c.category))} <span class="nav-badge">${c.count}</span></a>`).join('')}`;
  const levelChips = `
    <a class="chip ${!activeLevel ? 'active' : ''}" href="${buildHref({ level: '' })}">كل المستويات</a>
    ${levels.map((l: any) => `<a class="chip ${activeLevel === l.level ? 'active' : ''}" href="${buildHref({ level: l.level })}">${esc(LEVEL_AR[l.level] ?? l.level)} <span class="nav-badge">${l.count}</span></a>`).join('')}`;

  /* ---------------- Skills table ---------------- */
  const tableBody = rows.length ? rows.map((s) => `
    <tr>
      <td>
        <div class="fw-6">${esc(s.skill_ar)}</div>
        <div class="muted t-xs">${esc(s.skill_en)}</div>
      </td>
      <td>${badge(catAr(s.category), 'blue')}</td>
      <td>${badge(LEVEL_AR[s.level] ?? s.level, LEVEL_TONE[s.level] ?? '', true)}</td>
      <td class="muted t-sm clamp-2" style="max-width:380px">${esc(s.example_use_case)}</td>
    </tr>`).join('') : '';

  /* ---------------- Indicators (source-cited) ---------------- */
  const indicatorCards = (obs.indicators as any[]).map((ind, i) => {
    const meta = ind.period ?? (ind.target_year ? `مستهدف ${ind.target_year}` : '');
    return `
    <div class="panel card panel-hover reveal" style="--d:${i * 50}ms">
      <div class="flex items-center justify-between">
        <span class="accent flex">${icon('trending')}</span>
        ${meta ? `<span class="tag">${esc(meta)}</span>` : ''}
      </div>
      <div class="kpi-value mono mt-2" style="font-size:26px">${esc(ind.value)}</div>
      <div class="card-title" style="font-size:13.5px;line-height:1.5">${esc(ind.label_ar)}</div>
      ${ind.baseline ? `<div class="muted t-xs">خط الأساس: ${esc(ind.baseline)}</div>` : ''}
      <div class="muted t-xs flex items-center gap-1 mt-1">${icon('book')} ${esc(ind.source)}</div>
    </div>`;
  }).join('');

  /* ---------------- Body ---------------- */
  const body = `
  <div class="sk-page">
  ${pageHead({
    eyebrow: 'مرصد المهارات · AI SKILLS OBSERVATORY',
    title: 'مرصد مهارات الذكاء الاصطناعي',
    lede: 'خريطة مهارات الذكاء الاصطناعي عبر الفئات والمستويات، مع مؤشرات الطلب والاعتماد وتحليل الفجوة بين الطلب والعرض. الأرقام النموذجية موسومة بمصدرها.',
    actions: `<a class="btn btn-sm" href="/api-hub">${icon('code')} عبر الـ API</a>`,
  })}

  <div class="live-pill mb-4"><span class="dot-status"></span> حزمة مرصد نموذجية · أُنشئت ${esc(obs.generated_on)} · موسومة بالمصدر</div>

  <section class="kpi-grid mb-6">
    ${kpiCards}
    ${cornerKpis}
  </section>

  <section class="cards cols-2 mb-6" style="grid-template-columns:1fr 1fr">
    <div class="panel panel-pad reveal">
      ${sectionHead({ title: 'خريطة حرارية للمهارات', sub: 'عدد المهارات حسب الفئة (صفوف) × مستوى الإتقان (أعمدة) — اضغط أي خلية للتصفية', iconName: 'grid' })}
      <div class="sk-heat">
        <div class="sk-heat-head">${heatHeader}</div>
        <div class="sk-heat-body">${heatRows}</div>
      </div>
      <div class="legend mt-4">
        <span class="lg"><span class="sw" style="background:var(--bg-3)"></span> لا توجد مهارات</span>
        <span class="lg"><span class="sw" style="background:rgba(0,214,143,.3)"></span> منخفض</span>
        <span class="lg"><span class="sw" style="background:rgba(0,214,143,.6)"></span> متوسط</span>
        <span class="lg"><span class="sw" style="background:rgba(0,214,143,.9)"></span> مرتفع</span>
      </div>
    </div>

    <div class="panel panel-pad reveal" style="--d:80ms">
      ${sectionHead({ title: 'تحليل الفجوة: الطلب مقابل العرض', sub: 'مؤشرات نموذجية — مقارنة حصة الطلب المقدّرة بنصيب الفئة من كتالوج المهارات', iconName: 'target' })}
      <div class="legend mb-3">
        <span class="lg"><span class="sw" style="background:var(--uae-blue)"></span> الطلب المقدّر</span>
        <span class="lg"><span class="sw" style="background:var(--uae-violet)"></span> العرض في الكتالوج</span>
      </div>
      <div class="sk-gap-list">${gapList}</div>
    </div>
  </section>

  <section class="cards cols-2 mb-6" style="grid-template-columns:1.15fr 1fr">
    <div class="panel panel-pad reveal">
      ${sectionHead({ title: 'الطلب على المهارات', sub: 'الحصة المقدّرة من الطلب لكل مهارة — مؤشر نموذجي', iconName: 'activity' })}
      <div class="chart-box" style="height:300px"><canvas id="demandChart"></canvas></div>
    </div>
    <div class="panel panel-pad reveal" style="--d:80ms">
      ${sectionHead({ title: 'اعتماد الذكاء الاصطناعي حسب الوظيفة', sub: 'توزيع الاعتماد عبر الوظائف المؤسسية — مؤشر نموذجي', iconName: 'users' })}
      <div class="chart-box" style="height:300px"><canvas id="adoptionChart"></canvas></div>
    </div>
  </section>

  <section class="mb-6">
    ${sectionHead({ title: 'كتالوج المهارات', sub: `${num(rows.length)} مهارة مطابقة من أصل ${num(totalSkills)} · صفِّ حسب الفئة والمستوى أو ابحث`, iconName: 'brain', actions: exportBar })}

    <div class="panel panel-pad mb-4">
      <form method="get" action="/skills" class="flex gap-3 flex-wrap items-end">
        <div class="field flex-1" style="min-width:240px">
          <label for="sk-q">بحث في المهارات</label>
          <div class="search-box">
            ${icon('search')}
            <input class="input" id="sk-q" name="q" value="${esc(q)}" placeholder="اسم المهارة أو حالة الاستخدام…" autocomplete="off">
          </div>
        </div>
        ${activeCat ? `<input type="hidden" name="category" value="${esc(activeCat)}">` : ''}
        ${activeLevel ? `<input type="hidden" name="level" value="${esc(activeLevel)}">` : ''}
        <button class="btn btn-primary" type="submit">${icon('search')} بحث</button>
        ${(q || activeCat || activeLevel) ? `<a class="btn btn-ghost" href="/skills">${icon('x')} مسح</a>` : ''}
      </form>

      <div class="mt-4">
        <div class="muted t-xs mb-2 flex items-center gap-1">${icon('filter')} الفئة</div>
        <div class="chip-row">${catChips}</div>
      </div>
      <div class="mt-3">
        <div class="muted t-xs mb-2 flex items-center gap-1">${icon('layers')} المستوى</div>
        <div class="chip-row">${levelChips}</div>
      </div>
    </div>

    ${rows.length ? `
    <div class="panel" style="overflow:hidden">
      <div class="table-wrap" style="border:none;border-radius:0">
        <table class="data">
          <thead>
            <tr>
              <th>المهارة</th>
              <th>الفئة</th>
              <th>المستوى</th>
              <th>مثال على الاستخدام</th>
            </tr>
          </thead>
          <tbody>${tableBody}</tbody>
        </table>
      </div>
    </div>` : emptyState('لا توجد مهارات مطابقة لعوامل التصفية الحالية', 'brain')}
  </section>

  <section class="mb-6">
    ${sectionHead({ title: 'مؤشرات مرجعية موسومة بالمصدر', sub: 'أرقام عامة حول الاقتصاد الرقمي وأثر الذكاء الاصطناعي — كل مؤشر مقرون بمصدره وفترته', iconName: 'report' })}
    <div class="cards cols-4">${indicatorCards}</div>
    <p class="muted t-xs mt-3 flex items-center gap-1">${icon('info')} جميع أرقام المرصد (مؤشرات الطلب والاعتماد وتحليل الفجوة) هي بيانات نموذجية أوّلية موسومة بمصدرها، ويُنصح بالتحقق منها قبل الاستخدام في القرارات.</p>
  </section>
  </div>`;

  /* ---------------- Charts ---------------- */
  const demandLabels = (obs.skills_demand as any[]).map((d) => d.skill_ar);
  const demandValues = (obs.skills_demand as any[]).map((d) => d.share);
  const adoptionLabels = (obs.adoption_by_function as any[]).map((a) => a.function_ar);
  const adoptionValues = (obs.adoption_by_function as any[]).map((a) => a.share);

  const chartErrHtml = jsonScript(errorState('تعذّر عرض المخطط'));

  const bodyEnd = `<script>
  document.addEventListener('DOMContentLoaded', function(){
    var demandLabels = ${jsonScript(demandLabels)};
    var demandValues = ${jsonScript(demandValues)};
    var adoptionLabels = ${jsonScript(adoptionLabels)};
    var adoptionValues = ${jsonScript(adoptionValues)};
    var CHART_ERR = ${chartErrHtml};

    function failChart(id){
      var el = document.getElementById(id);
      var box = el && el.closest('.chart-box');
      if (box) box.innerHTML = CHART_ERR;
    }

    try {
      UAE.charts.bar(document.getElementById('demandChart'),
        demandLabels,
        [{ data: demandValues, color: UAE.color(1), label: 'الطلب %' }],
        { indexAxis: 'y',
          scales: { x: Object.assign(UAE.gridScale(), { suggestedMax: 30, ticks: { color: UAE.cssVar('--txt-2'), callback: function(v){ return v + '%'; } } }), y: UAE.gridScale() },
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(c){ return c.parsed.x + '% من الطلب'; } } } } });
    } catch (e) { console.error('demandChart', e); failChart('demandChart'); }

    try {
      UAE.charts.doughnut(document.getElementById('adoptionChart'),
        adoptionLabels, adoptionValues,
        { plugins: { legend: { position: 'right', labels: { boxWidth: 8, padding: 10 } },
          tooltip: { callbacks: { label: function(c){ return c.label + ': ' + c.parsed + '%'; } } } } });
    } catch (e) { console.error('adoptionChart', e); failChart('adoptionChart'); }
  });
  </script>`;

  return {
    title: 'مرصد مهارات الذكاء الاصطناعي',
    active: '/skills',
    body,
    bodyEnd,
    useCharts: true,
    head: `<style>
      /* Heatmap wrapped in a horizontal-scroll shell so it shrinks gracefully on narrow screens. */
      .sk-heat { overflow-x: auto; -webkit-overflow-scrolling: touch; }
      .sk-heat-head, .sk-heat-body { display: grid; grid-template-columns: minmax(110px,1.4fr) repeat(3, minmax(56px,1fr)); gap: 4px; align-items: center; min-width: 320px; }
      .sk-heat-head { margin-bottom: 4px; }
      .sk-heat-collabel { text-align: center; font-size: 11.5px; font-weight: 600; color: var(--txt-2); padding: 4px 0; }
      .sk-heat-rowlabel { font-size: 12.5px; font-weight: 600; color: var(--txt-1); padding-inline-end: 8px; }
      .sk-heat-body .heat-cell { display: flex; align-items: center; justify-content: center; aspect-ratio: auto; min-height: 40px; font-size: 13px; font-weight: 600; text-decoration: none; border-radius: var(--r-sm, 6px); transition: transform var(--t-fast), box-shadow var(--t-fast); }
      .sk-heat-body .heat-cell:hover { transform: scale(1.04); box-shadow: 0 0 0 1px var(--accent-line); }
      .sk-gap-list { display: flex; flex-direction: column; gap: 14px; }
      .sk-gap-row { padding-bottom: 12px; border-bottom: 1px solid var(--line); }
      .sk-gap-row:last-child { border-bottom: none; padding-bottom: 0; }
      .sk-gap-bars { display: flex; flex-direction: column; gap: 5px; }
      .sk-gap-track { height: 8px; border-radius: 99px; background: var(--bg-3); overflow: hidden; }
      .sk-gap-fill { display: block; height: 100%; border-radius: 99px; }
      .sk-gap-fill.demand { background: var(--uae-blue); }
      .sk-gap-fill.supply { background: var(--uae-violet); }
      /* Keep chart panels at a fixed height even when an error state replaces the canvas. */
      .sk-page .chart-box { height: 300px; }
      .sk-page .chart-box .state-block { height: 100%; }
      @media (max-width: 720px) {
        .sk-heat-rowlabel { font-size: 11px; }
        .sk-page .export-bar { width: 100%; }
      }
    </style>`,
    description: 'مرصد مهارات الذكاء الاصطناعي في الإمارات — خريطة حرارية للفئات والمستويات، مؤشرات الطلب والاعتماد، وتحليل فجوة المهارات.',
  };
}
