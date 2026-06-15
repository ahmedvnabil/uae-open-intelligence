/** home.ts — Landing page: interactive hero, live KPIs, observatory grid, macro strip. */
import type { LayoutOpts } from '../lib/layout.js';
import { icon } from '../lib/icons.js';
import { jsonScript, esc, num, colorFor, CATEGORY_AR } from '../lib/i18n.js';
import { kpiCard, badge, errorState } from '../lib/ui.js';
import { platformStats, getMacro, getProjectFacets, getTopProjects, getCategoryCounts, getCultureThemes } from '../lib/db.js';

export function homePage(): LayoutOpts {
  const s = platformStats();
  const macro = getMacro().macro;
  const facets = getProjectFacets();
  const sectors = (facets.sectors as any[]).slice(0, 8);
  const top = getTopProjects('impact_score', 6) as any[];
  const cats = getCategoryCounts();
  const themes = getCultureThemes() as any[];

  const observatories = [
    { path: '/innovation', icon: 'bulb', title: 'مشاريع الابتكار', desc: 'مشروع ابتكاري مدعوم بالذكاء الاصطناعي عبر القطاعات الحيوية', count: s.projects, tone: 'green' },
    { path: '/free-zones', icon: 'building', title: 'المناطق الحرة', desc: 'منطقة حرة عبر الإمارات السبع مع التكاليف والقطاعات', count: s.freezones, tone: 'blue' },
    { path: '/skills', icon: 'brain', title: 'مرصد المهارات', desc: 'مهارة ذكاء اصطناعي مع مستويات وأمثلة تطبيقية', count: s.skills, tone: 'violet' },
    { path: '/culture', icon: 'landmark', title: 'الثقافة والتراث', desc: 'عنصر تراثي عبر ستة محاور ثقافية بإحداثيات على الخريطة', count: s.culture, tone: 'gold' },
    { path: '/knowledge-graph', icon: 'graph', title: 'الرسم المعرفي', desc: 'عقدة معرفية تربط الإمارات والقطاعات والمشاريع', count: s.graphNodes, tone: 'green' },
    { path: '/datasets', icon: 'database', title: 'مرصد البيانات', desc: 'مجموعة بيانات قابلة للبحث والتصدير عبر الـ API', count: s.datasets, tone: 'blue' },
  ];

  const macroPick = ['gdp', 'population', 'non_oil_share', 'fdi_inflow'];
  const macroCards = macroPick
    .map((k) => macro.find((m: any) => m.key === k))
    .filter(Boolean)
    .map((m: any) => kpiCard({ label: m.label_ar, value: m.value, sub: `${m.source} · ${m.year}`, tone: 'blue', iconName: 'trending' }))
    .join('');

  const body = `
  <style>
    @media (max-width: 720px) {
      .home-split { grid-template-columns: 1fr !important; }
    }
  </style>
  <section class="hero reveal in">
    <div class="hero-mesh"></div>
    <div class="hero-grid-lines"></div>
    <div class="streams"></div>
    <div class="hero-inner">
      <div class="live-pill mb-4"><span class="dot-status"></span> بيانات حيّة · محدّثة ${esc(s.updated)}</div>
      <div class="page-eyebrow">منصة الإمارات للذكاء المفتوح · UAE OPEN INTELLIGENCE</div>
      <h1 style="font-size:clamp(30px,5vw,56px);font-weight:700;letter-spacing:-.03em;line-height:1.1;margin-top:12px;max-width:18ch">
        ذكاءٌ مفتوحٌ من بيانات <span class="accent" style="text-shadow:0 0 30px rgba(0,214,143,.4)">الإمارات</span>
      </h1>
      <p class="page-lede" style="font-size:17px;max-width:62ch">
        مرصدٌ موحّد يحوّل البيانات المفتوحة في دولة الإمارات إلى تحليلات ومؤشرات ورسوم معرفية و APIs جاهزة —
        من مشاريع الابتكار والمناطق الحرة إلى مهارات الذكاء الاصطناعي والتراث الثقافي.
      </p>
      <div class="flex gap-3 flex-wrap mt-5">
        <a class="btn btn-primary" href="/datasets">${icon('database')} استكشف مرصد البيانات</a>
        <a class="btn" href="/dashboard">${icon('dashboard')} لوحة القيادة</a>
        <button class="btn btn-ghost cmdk-open" type="button">${icon('search')} ابحث في كل شيء <kbd style="font-family:var(--font-mono);font-size:11px;border:1px solid var(--line);padding:1px 6px;border-radius:5px;margin-inline-start:6px">⌘K</kbd></button>
      </div>

      <div class="kpi-grid mt-6" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">
        ${kpiHero(s.totalRecords, 'سجل بيانات', 'database', true)}
        ${kpiHero(s.projects, 'مشروع ابتكار', 'bulb')}
        ${kpiHero(s.freezones, 'منطقة حرة', 'building')}
        ${kpiHero(s.skills, 'مهارة', 'brain')}
        ${kpiHero(s.emirates, 'إمارات مغطّاة', 'pin')}
        ${kpiHero(s.datasets, 'مجموعة بيانات', 'layers')}
      </div>
    </div>
  </section>

  <section class="mb-6">
    <div class="section-head">
      <div class="titles">
        <div class="section-title">${icon('layers')} مراصد المنصة</div>
        <div class="section-sub">ست بوابات بيانية متخصّصة، كلٌّ منها قابل للبحث والتصدير والربط عبر الـ API</div>
      </div>
    </div>
    <div class="cards cols-3">
      ${observatories.map((o, i) => `
        <a class="panel card panel-hover reveal" style="--d:${i * 60}ms" href="${o.path}">
          <div class="flex items-center justify-between">
            <span class="brand-mark" style="background:linear-gradient(140deg,${colorFor(o.path)},${colorFor(o.path)}aa);box-shadow:0 0 20px -4px ${colorFor(o.path)}">${icon(o.icon)}</span>
            <span class="kpi-value mono" style="font-size:24px">${num(o.count)}</span>
          </div>
          <div class="card-title mt-2">${esc(o.title)}</div>
          <div class="card-text muted clamp-2">${esc(o.desc)}</div>
          <div class="accent t-sm flex items-center gap-1 mt-2">استكشف ${icon('chevron')}</div>
        </a>`).join('')}
    </div>
  </section>

  <section class="cards cols-2 mb-6 home-split" style="grid-template-columns:1.3fr 1fr">
    <div class="panel panel-pad reveal">
      <div class="section-head">
        <div class="titles"><div class="section-title">${icon('activity')} توزيع المشاريع حسب القطاع</div>
        <div class="section-sub">${num(s.projects)} مشروعًا · متوسط درجة الأثر ${esc(s.avgImpact)}/10</div></div>
      </div>
      <div class="chart-box" style="height:280px"><canvas id="sectorChart"></canvas></div>
    </div>
    <div class="panel panel-pad reveal" style="--d:80ms">
      <div class="section-head"><div class="titles"><div class="section-title">${icon('target')} مشاريع عالية الأثر</div>
      <div class="section-sub">أعلى المشاريع وفق درجة الأثر العام</div></div></div>
      <div class="flex flex-col gap-3">
        ${top.map((p) => `
          <a class="flex items-center gap-3" href="/innovation/${esc(p.id)}" style="padding:8px;border-radius:10px;transition:background .15s" onmouseover="this.style.background='var(--bg-3)'" onmouseout="this.style.background=''">
            <span class="score-pill flex-none">${esc(p.impact_score)}</span>
            <span class="flex-1 truncate t-sm fw-6">${esc(p.name)}</span>
            <span class="tag flex-none">${esc(p.sector_ar)}</span>
          </a>`).join('')}
      </div>
    </div>
  </section>

  <section class="mb-6">
    <div class="section-head"><div class="titles"><div class="section-title">${icon('trending')} مؤشرات اقتصادية كلية</div>
    <div class="section-sub">أرقام مرجعية من مصادر عامة، موسومة بالمصدر والسنة</div></div>
    <div class="actions"><a class="btn btn-sm" href="/dashboard">عرض الكل ${icon('chevron')}</a></div></div>
    <div class="kpi-grid">${macroCards}</div>
  </section>

  <section class="mb-6">
    <div class="section-head"><div class="titles"><div class="section-title">${icon('grid')} تصنيفات البيانات المفتوحة</div>
    <div class="section-sub">تُصنَّف مجموعات البيانات وفق محاور قطاعية</div></div></div>
    <div class="chip-row">
      ${cats.map((c: any) => `<a class="chip" href="/datasets?category=${esc(c.category)}">${esc(CATEGORY_AR[c.category] ?? c.category)} <span class="nav-badge">${c.count}</span></a>`).join('')}
      ${themes.map((t: any) => `<a class="chip" href="/culture?theme=${esc(t.key)}">${esc(t.title_ar)} <span class="nav-badge">${t.count}</span></a>`).join('')}
    </div>
  </section>

  <section class="panel panel-pad reveal" style="background:linear-gradient(135deg,var(--accent-soft),transparent);border-color:var(--accent-line)">
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <div>
        <div class="section-title">${icon('code')} كل شيء متاح عبر الـ API</div>
        <p class="muted-1 mt-2" style="max-width:60ch">16 نقطة نهاية REST موحّدة بمظروف استجابة قياسي، مع بحث وتصفية وترقيم — جاهزة للتكامل مع تطبيقاتك.</p>
      </div>
      <a class="btn btn-primary" href="/api-hub">${icon('arrowUR')} افتح مركز الـ API</a>
    </div>
  </section>`;

  const sectorLabels = sectors.map((x) => x.sector_ar);
  const sectorValues = sectors.map((x) => x.count);

  const chartError = errorState('تعذّر رسم توزيع القطاعات');
  const bodyEnd = `<script>
  document.addEventListener('DOMContentLoaded', function(){
    var el = document.getElementById('sectorChart');
    try {
      UAE.charts.doughnut(el,
        ${jsonScript(sectorLabels)}, ${jsonScript(sectorValues)},
        { plugins: { legend: { position: 'right', labels: { boxWidth: 8, padding: 10 } } } });
    } catch (e) {
      var box = el && el.closest('.chart-box');
      if (box) box.innerHTML = ${jsonScript(chartError)};
      if (window.console) console.error('sectorChart init failed', e);
    }
  });
  </script>`;

  return { title: 'الرئيسية', active: '/home', body, bodyEnd, useCharts: true };
}

function kpiHero(value: number, label: string, ic: string, glow = false): string {
  return `<div class="panel kpi panel-hover">
    <div class="kpi-top">${icon(ic)}<span>${esc(label)}</span></div>
    <div class="kpi-value ${glow ? 'glow' : ''}" data-countup="${value}">0</div>
  </div>`;
}
