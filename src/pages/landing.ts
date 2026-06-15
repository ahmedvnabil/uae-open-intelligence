/** landing.ts — Public marketing landing (chrome: 'public'). Explains the product & value. */
import type { LayoutOpts } from '../lib/layout.js';
import { icon } from '../lib/icons.js';
import { esc, num, CATEGORY_AR } from '../lib/i18n.js';
import { platformStats, getCategoryCounts, getMacro, getCultureThemes } from '../lib/db.js';

export function landingPage(): LayoutOpts {
  const s = platformStats();
  const macro = getMacro().macro as any[];
  const cats = getCategoryCounts();
  const themes = getCultureThemes() as any[];
  const gdp = macro.find((m) => m.key === 'gdp')?.value ?? '—';

  const features = [
    { icon: 'database', title: 'مرصد بيانات موحّد', desc: 'سجلٌ واحد قابل للبحث والتصفية يجمع المشاريع والمناطق الحرة والمهارات والتراث — مع درجات ثقة ومصادر موسومة.' },
    { icon: 'graph', title: 'رسم معرفي تفاعلي', desc: 'استكشف العلاقات بين الإمارات والقطاعات والمناطق الحرة والمشاريع في رسم بياني حيّ بالتكبير والتحريك.' },
    { icon: 'code', title: 'API جاهز للإنتاج', desc: '16 نقطة نهاية REST بمظروف استجابة قياسي وتصفية وترقيم — مع مستكشف ومُختبِر مباشر.' },
    { icon: 'activity', title: 'تحليلات قطاعية', desc: 'لوحات ومؤشرات ورسوم (رادار، حرارية، دائرية) تُحوّل البيانات الخام إلى رؤى فورية.' },
    { icon: 'landmark', title: 'خريطة تراثية', desc: 'مواقع وعناصر التراث الإماراتي على خريطة تفاعلية، موسومة باليونسكو ودرجات الثقة.' },
    { icon: 'report', title: 'تقارير قابلة للطباعة', desc: 'مولّد تقارير جاهزة للطباعة وحفظ PDF، وتصدير CSV/JSON لكل مجموعة بيانات.' },
  ];

  const observatories = [
    { path: '/innovation', icon: 'bulb', title: 'مشاريع الابتكار', count: s.projects },
    { path: '/free-zones', icon: 'building', title: 'المناطق الحرة', count: s.freezones },
    { path: '/skills', icon: 'brain', title: 'مهارات الذكاء الاصطناعي', count: s.skills },
    { path: '/culture', icon: 'landmark', title: 'الثقافة والتراث', count: s.culture },
    { path: '/knowledge-graph', icon: 'graph', title: 'الرسم المعرفي', count: s.graphNodes },
    { path: '/datasets', icon: 'database', title: 'مرصد البيانات', count: s.datasets },
  ];

  const steps = [
    { n: '1', title: 'استكشف', desc: 'تصفّح المراصد الخمسة أو ابحث في كل شيء عبر البحث الموحّد.' },
    { n: '2', title: 'حلّل', desc: 'قارن وفلتر وشاهد المؤشرات والرسوم والرسم المعرفي.' },
    { n: '3', title: 'صدّر أو اربط', desc: 'نزّل CSV/JSON، اطبع تقريرًا، أو اربط تطبيقك عبر الـ API.' },
  ];

  const body = `
  <section class="hero" style="border-radius:0;border:none;margin:0">
    <div class="hero-mesh"></div>
    <div class="hero-grid-lines"></div>
    <div class="streams"></div>
    <div class="mk-section hero-inner" style="padding-top:var(--sp-8);padding-bottom:var(--sp-8)">
      <div class="live-pill mb-4"><span class="dot-status"></span> منصة بيانات مفتوحة · محدّثة ${esc(s.updated)}</div>
      <h1 style="font-size:clamp(34px,6vw,64px);font-weight:700;letter-spacing:-.03em;line-height:1.08;max-width:20ch">
        كل بيانات الإمارات المفتوحة، <span class="accent" style="text-shadow:0 0 34px rgba(0,214,143,.45)">ذكاءً واحدًا</span>
      </h1>
      <p class="mk-lede" style="font-size:18px;max-width:60ch">
        منصةٌ عربيةٌ أولًا تحوّل البيانات المفتوحة في دولة الإمارات إلى مرصدٍ موحّد وتحليلاتٍ ومؤشرات ورسومٍ معرفية و APIs جاهزة —
        من مشاريع الابتكار والمناطق الحرة إلى مهارات الذكاء الاصطناعي والتراث الثقافي.
      </p>
      <div class="flex gap-3 flex-wrap mt-5">
        <a class="btn btn-primary" href="/dashboard" style="height:46px;padding:0 24px;font-size:15px">${icon('play')} ادخل المنصة</a>
        <a class="btn" href="/datasets" style="height:46px;padding:0 22px;font-size:15px">${icon('database')} استكشف البيانات</a>
        <a class="btn btn-ghost" href="/api-hub" style="height:46px;padding:0 18px">${icon('code')} وثائق الـ API</a>
      </div>
      <div class="kpi-grid mt-6" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">
        ${heroKpi(s.totalRecords, 'سجل بيانات', 'database', true)}
        ${heroKpi(s.projects, 'مشروع ابتكار', 'bulb')}
        ${heroKpi(s.freezones, 'منطقة حرة', 'building')}
        ${heroKpi(s.skills, 'مهارة', 'brain')}
        ${heroKpi(s.emirates, 'إمارات', 'pin')}
        ${heroKpi(s.datasets, 'مجموعة بيانات', 'layers')}
      </div>
    </div>
  </section>

  <div class="mk-section" style="padding-top:var(--sp-5);padding-bottom:var(--sp-5)">
    <div class="panel panel-pad flex items-center justify-between flex-wrap gap-4" style="background:var(--bg-1)">
      <span class="muted t-sm">يجمع ٥ مراصد · ${esc(num(s.totalRecords))} سجل · ٧ إمارات · ${esc(s.graphNodes)} عقدة معرفية</span>
      <span class="flex gap-4 flex-wrap items-center t-sm muted-1">
        <span class="flex items-center gap-1">${icon('shield')} بيانات موسومة بالثقة</span>
        <span class="flex items-center gap-1">${icon('globe')} عربي أولًا · RTL</span>
        <span class="flex items-center gap-1">${icon('scale')} CC BY 4.0</span>
      </span>
    </div>
  </div>

  <section class="mk-section" id="features" style="scroll-margin-top:80px">
    <div class="mk-eyebrow">لماذا المنصة</div>
    <h2 class="mk-h2">منصة تشغيلية متكاملة — لا مجرد لوحة بيانات</h2>
    <p class="mk-lede">كل ما تحتاجه لاستكشاف بيانات الإمارات المفتوحة وتحليلها ومشاركتها، في مكانٍ واحد.</p>
    <div class="cards cols-3 mt-5">
      ${features.map((f) => `<div class="panel mk-feature panel-hover reveal">
        <span class="fic">${icon(f.icon)}</span>
        <div class="card-title">${esc(f.title)}</div>
        <div class="card-text muted">${esc(f.desc)}</div>
      </div>`).join('')}
    </div>
  </section>

  <section class="mk-section" id="observatories" style="scroll-margin-top:80px">
    <div class="mk-eyebrow">المراصد</div>
    <h2 class="mk-h2">ست بوابات بيانية متخصّصة</h2>
    <div class="cards cols-3 mt-5">
      ${observatories.map((o) => `<a class="panel card panel-hover reveal" href="${o.path}">
        <div class="flex items-center justify-between">
          <span class="fic" style="width:40px;height:40px;border-radius:11px;display:grid;place-items:center;background:var(--accent-soft);color:var(--accent)">${icon(o.icon)}</span>
          <span class="kpi-value mono" style="font-size:24px">${num(o.count)}</span>
        </div>
        <div class="card-title mt-2">${esc(o.title)}</div>
        <div class="accent t-sm flex items-center gap-1">استكشف ${icon('chevron')}</div>
      </a>`).join('')}
    </div>
  </section>

  <section class="mk-section mk-section-narrow">
    <div class="mk-eyebrow">كيف تعمل</div>
    <h2 class="mk-h2">ثلاث خطوات من البيانات إلى القرار</h2>
    <div class="cards cols-3 mt-5">
      ${steps.map((st) => `<div class="panel panel-pad reveal"><div class="mk-step">
        <span class="n">${esc(st.n)}</span>
        <div><div class="card-title">${esc(st.title)}</div><div class="card-text muted mt-1">${esc(st.desc)}</div></div>
      </div></div>`).join('')}
    </div>
  </section>

  <section class="mk-section" id="data" style="scroll-margin-top:80px">
    <div class="cards cols-2" style="grid-template-columns:1fr 1fr;gap:var(--sp-5)">
      <div class="panel panel-pad reveal">
        <div class="mk-eyebrow">البيانات والمنهجية</div>
        <h2 class="mk-h2" style="font-size:24px">بيانات موسومة بالمصدر والثقة</h2>
        <p class="card-text muted mt-3">كل سجلٍ في المنصة يحمل مصدره وتاريخه ودرجة ثقةٍ من ٠ إلى ١. الأرقام التقديرية أو النموذجية موسومةٌ بوضوح — حتى تعرف دائمًا مدى موثوقية ما تراه.</p>
        <div class="chip-row mt-4">
          ${cats.map((c: any) => `<span class="chip">${esc(CATEGORY_AR[c.category] ?? c.category)} <span class="nav-badge">${c.count}</span></span>`).join('')}
        </div>
        <a class="btn mt-4" href="/about">${icon('info')} اقرأ المنهجية الكاملة</a>
      </div>
      <div class="panel panel-pad reveal" style="--d:80ms">
        <div class="mk-eyebrow">بصمة اقتصادية</div>
        <h2 class="mk-h2" style="font-size:24px">مؤشرات على نطاق الدولة</h2>
        <div class="kpi-grid mt-4" style="grid-template-columns:1fr 1fr">
          ${macroTile('الناتج المحلي', gdp)}
          ${macroTile('السكان', macro.find((m) => m.key === 'population')?.value ?? '—')}
          ${macroTile('غير النفطي', macro.find((m) => m.key === 'non_oil_share')?.value ?? '—')}
          ${macroTile('محاور تراثية', `${themes.length}`)}
        </div>
        <p class="muted t-xs mt-3">مصادر عامة (IMF · UNCTAD · وزارة الاقتصاد) موسومة بالسنة في لوحة القيادة.</p>
      </div>
    </div>
  </section>

  <section class="mk-section">
    <div class="mk-cta reveal">
      <div class="mk-eyebrow">ابدأ الآن</div>
      <h2 class="mk-h2">افتح المنصة واستكشف بيانات الإمارات المفتوحة</h2>
      <p class="mk-lede" style="margin-inline:auto">مجانية، عربية أولًا، ومفتوحة بترخيص CC BY 4.0.</p>
      <div class="flex gap-3 justify-center flex-wrap mt-5">
        <a class="btn btn-primary" href="/dashboard" style="height:46px;padding:0 24px;font-size:15px">${icon('play')} ادخل لوحة القيادة</a>
        <a class="btn" href="/api-hub" style="height:46px;padding:0 22px;font-size:15px">${icon('code')} ابدأ بالـ API</a>
      </div>
    </div>
  </section>`;

  return {
    title: 'منصة الإمارات للذكاء المفتوح',
    active: '',
    chrome: 'public',
    body,
    description: 'منصة الإمارات للذكاء المفتوح — مرصد بيانات عربي أولًا يحوّل البيانات المفتوحة في الإمارات إلى تحليلات ومؤشرات ورسوم معرفية و APIs جاهزة.',
  };
}

function heroKpi(value: number, label: string, ic: string, glow = false): string {
  return `<div class="panel kpi panel-hover">
    <div class="kpi-top">${icon(ic)}<span>${esc(label)}</span></div>
    <div class="kpi-value ${glow ? 'glow' : ''}" data-countup="${value}">0</div>
  </div>`;
}
function macroTile(label: string, value: string): string {
  return `<div class="panel panel-solid" style="padding:var(--sp-4)">
    <div class="kpi-value mono" style="font-size:22px">${esc(value)}</div>
    <div class="muted t-xs mt-1">${esc(label)}</div>
  </div>`;
}
