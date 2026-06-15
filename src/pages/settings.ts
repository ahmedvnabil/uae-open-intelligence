/** settings.ts — Settings + About: appearance, language, data & methodology, platform info, credits. */
import type { LayoutOpts } from '../lib/layout.js';
import { icon } from '../lib/icons.js';
import { esc, num, compact, CATEGORY_AR } from '../lib/i18n.js';
import { pageHead, sectionHead, kpiCard, confidence, badge, exportButtons, emptyState } from '../lib/ui.js';
import { platformStats, getDatasets } from '../lib/db.js';

export function settingsPage(): LayoutOpts {
  const s = platformStats();
  const datasets = getDatasets() as any[];

  const totalDatasetRecords = datasets.reduce((a, d) => a + (Number(d.records) || 0), 0);
  const avgConf = datasets.length
    ? datasets.reduce((a, d) => a + (Number(d.confidence) || 0), 0) / datasets.length
    : 0;

  const techStack = [
    { name: 'Hono', sub: 'إطار خادم خفيف', ic: 'zap' },
    { name: 'TypeScript', sub: 'لغة الأنماط الصارمة', ic: 'code' },
    { name: 'HTMX', sub: 'تحديثات جزئية', ic: 'route' },
    { name: 'Alpine.js', sub: 'تفاعلية خفيفة', ic: 'sparkles' },
    { name: 'نظام تصميم Tailwind', sub: 'فئات الواجهة', ic: 'grid' },
    { name: 'Chart.js', sub: 'الرسوم البيانية', ic: 'activity' },
    { name: 'Leaflet', sub: 'الخرائط التفاعلية', ic: 'pin' },
    { name: 'node:sqlite', sub: 'قاعدة البيانات', ic: 'database' },
  ];

  // ---- Appearance options (wired client-side to the same localStorage key app.js uses) ----
  const themeOptions = [
    { id: 'dark', label: 'داكن', sub: 'مهمّة تحكّم · افتراضي', ic: 'moon' },
    { id: 'light', label: 'فاتح', sub: 'عالي التباين · للطباعة', ic: 'sun' },
  ];

  const body = `
  ${pageHead({
    eyebrow: 'منصة الإمارات للذكاء المفتوح · UAE OPEN INTELLIGENCE',
    title: 'الإعدادات وحول المنصة',
    lede: 'تخصيص المظهر، اللغة، ومراجعة مصادر البيانات والمنهجية، إلى جانب معلومات الإصدار والتراخيص.',
    actions: `<a class="btn btn-sm" href="/api-hub">${icon('code')} مركز الـ API</a><a class="btn btn-sm" href="/reports">${icon('report')} التقارير</a>`,
  })}

  <div class="set-grid">
    <!-- ============ APPEARANCE ============ -->
    <section class="panel panel-pad reveal">
      ${sectionHead({ title: 'المظهر', sub: 'يُحفظ اختيارك محليًا في هذا المتصفح', iconName: 'sun' })}
      <div class="set-row" id="themeSwitch">
        ${themeOptions.map((t) => `
          <button class="set-opt" data-set-theme="${esc(t.id)}" type="button" aria-pressed="false">
            <span class="set-opt-ic">${icon(t.ic)}</span>
            <span class="set-opt-body">
              <span class="set-opt-label">${esc(t.label)}</span>
              <span class="set-opt-sub muted t-xs">${esc(t.sub)}</span>
            </span>
            <span class="set-opt-check">${icon('check')}</span>
          </button>`).join('')}
      </div>
      <div class="muted t-sm mt-3 flex items-center gap-2">
        ${icon('info')} المظهر الحالي: <span class="badge" id="currentThemeBadge"><span class="dot"></span>—</span>
        <span class="muted-1 t-xs">يمكنك أيضًا التبديل من زر القمر/الشمس في الشريط العلوي.</span>
      </div>
    </section>

    <!-- ============ LANGUAGE ============ -->
    <section class="panel panel-pad reveal" style="--d:60ms">
      ${sectionHead({ title: 'اللغة والاتجاه', sub: 'المنصة عربية أولًا بدعم كامل للكتابة من اليمين لليسار', iconName: 'globe' })}
      <div class="set-row">
        <button class="set-opt" type="button" aria-pressed="true" disabled style="cursor:default">
          <span class="set-opt-ic">${icon('globe')}</span>
          <span class="set-opt-body">
            <span class="set-opt-label">العربية <span class="badge green" style="margin-inline-start:6px">RTL</span></span>
            <span class="set-opt-sub muted t-xs">واجهة المستخدم وكل النصوص التشغيلية</span>
          </span>
          <span class="set-opt-check on">${icon('check')}</span>
        </button>
        <button class="set-opt" type="button" aria-pressed="false" disabled style="opacity:.55;cursor:not-allowed" title="قريبًا">
          <span class="set-opt-ic">${icon('globe')}</span>
          <span class="set-opt-body">
            <span class="set-opt-label">English <span class="tag" style="margin-inline-start:6px">soon</span></span>
            <span class="set-opt-sub muted t-xs">LTR interface — coming soon</span>
          </span>
        </button>
      </div>
      <p class="muted t-sm mt-3">
        ${icon('info')} البيانات نفسها ثنائية اللغة على مستوى الحقول: لكل سجل عناوين وملخّصات بالعربية والإنجليزية
        (<span class="mono">title_ar / title_en</span>, <span class="mono">summary_ar / summary_en</span>)،
        ما يتيح تبديل لغة المحتوى لاحقًا دون إعادة هيكلة.
      </p>
    </section>
  </div>

  <!-- ============ DATA & METHODOLOGY ============ -->
  <section class="panel panel-pad reveal mt-5" style="--d:80ms">
    ${sectionHead({
      title: 'البيانات والمنهجية',
      sub: `${num(datasets.length)} مجموعة بيانات · ${num(totalDatasetRecords)} سجل · متوسط الثقة ${Math.round(avgConf * 100)}%`,
      iconName: 'database',
      actions: `${exportButtons({
        csv: '/api/v1/export/datasets.csv',
        json: '/api/v1/export/datasets.json',
        print: true,
      })}<a class="btn btn-sm" href="/datasets">${icon('layers')} مرصد البيانات</a>`,
    })}
    <p class="muted t-xs mb-3 flex items-center gap-2">${icon('download')} تصدير كتالوج المصادر كاملًا (CSV / JSON) للاستخدام البحثي.</p>
    <div class="table-wrap">
      <table class="data">
        <thead>
          <tr>
            <th>مجموعة البيانات</th>
            <th>المصدر</th>
            <th>الترخيص</th>
            <th>السجلات</th>
            <th>الصيغة</th>
            <th>درجة الثقة</th>
            <th>آخر تحديث</th>
            <th>التصنيفات</th>
          </tr>
        </thead>
        <tbody>
          ${datasets.length ? datasets.map((d) => `
            <tr>
              <td>
                <a class="fw-6" href="/datasets/${esc(d.id)}" style="display:block">${esc(d.title_ar)}</a>
                <span class="muted t-xs mono">${esc(d.title_en)}</span>
              </td>
              <td class="muted-1 t-sm">${esc(d.source)}</td>
              <td>${badge(esc(d.license), 'green')}</td>
              <td class="num">${num(d.records)}</td>
              <td><span class="tag">${esc(d.format)}</span></td>
              <td>${confidence(d.confidence)}</td>
              <td class="num muted">${esc(d.updated)}</td>
              <td>
                <div class="chip-row" style="gap:4px">
                  ${(d.categories ?? []).map((c: string) => `<span class="tag">${esc(CATEGORY_AR[c] ?? c)}</span>`).join('')}
                </div>
              </td>
            </tr>`).join('')
            : `<tr><td colspan="8">${emptyState('لا توجد مجموعات بيانات متاحة حاليًا', 'database')}</td></tr>`}
        </tbody>
      </table>
    </div>

    <div class="set-method mt-4">
      <div class="panel panel-solid panel-pad">
        <div class="fw-6 flex items-center gap-2 mb-2">${icon('shield')} ماذا تعني درجة الثقة؟</div>
        <p class="muted-1 t-sm mb-3">مؤشر 0–100% يعكس مدى رسوخ المصدر ودرجة التنسيق اليدوي في كل مجموعة بيانات.</p>
        <div class="flex flex-col gap-2">
          ${confLegendRow(0.85, 'مرتفعة (80%+)', 'مصادر رسمية أو موثّقة بتنسيق دقيق')}
          ${confLegendRow(0.7, 'متوسطة (60–79%)', 'مصادر عامة منسّقة، تُفضَّل مراجعتها قبل القرارات الحرجة')}
          ${confLegendRow(0.5, 'أوّلية (أقل من 60%)', 'بيانات نموذجية/تقديرية موسومة بالمصدر')}
        </div>
      </div>
      <div class="panel panel-solid panel-pad">
        <div class="fw-6 flex items-center gap-2 mb-2">${icon('info')} ملاحظة منهجية</div>
        <p class="muted-1 t-sm">
          الأرقام الموسومة بـ <span class="badge gold">نموذجي</span> أو <span class="badge gold">تقريبي</span>
          مُعلَّمة بالمصدر والسنة داخل كل سجل، ولا يُقصد بها أن تكون قيمًا رسمية نهائية.
          تُجمَّع البيانات وفق سلسلة استخلاص متدرّجة (المصدر الرسمي → التنسيق اليدوي → التحقّق)،
          ويُحتفظ بحقول <span class="mono">source</span> و<span class="mono">year</span> و<span class="mono">confidence</span> لكل سجل لإتاحة التتبّع.
        </p>
        <a class="btn btn-sm mt-3" href="/api-hub">${icon('arrowUR')} مظروف الاستجابة القياسي للـ API</a>
      </div>
    </div>
  </section>

  <div class="set-grid mt-5">
    <!-- ============ PLATFORM INFO ============ -->
    <section class="panel panel-pad reveal" style="--d:100ms">
      ${sectionHead({ title: 'معلومات المنصة', sub: `الإصدار 1.0 · آخر تحديث للبيانات ${esc(s.updated)}`, iconName: 'info' })}
      <div class="kpi-grid mb-4" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">
        ${kpiCard({ label: 'إجمالي السجلات', value: num(s.totalRecords), sub: compact(s.totalRecords) + ' سجل حيّ', tone: 'green', iconName: 'database', glow: true })}
        ${kpiCard({ label: 'مجموعات البيانات', value: num(s.datasets), sub: 'قابلة للتصدير عبر API', tone: 'blue', iconName: 'layers' })}
        ${kpiCard({ label: 'مشاريع الابتكار', value: num(s.projects), sub: `${num(s.sectors)} قطاعًا`, tone: 'gold', iconName: 'bulb' })}
        ${kpiCard({ label: 'عُقد الرسم المعرفي', value: num(s.graphNodes), sub: `${num(s.graphEdges)} علاقة`, tone: 'violet', iconName: 'graph' })}
      </div>

      <div class="divider"></div>
      <div class="fw-6 flex items-center gap-2 mb-3">${icon('layers')} الحزمة التقنية</div>
      <div class="cards" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px">
        ${techStack.map((t) => `
          <div class="set-tech">
            <span class="set-tech-ic accent">${icon(t.ic)}</span>
            <span class="flex flex-col" style="min-width:0">
              <span class="fw-6 t-sm truncate">${esc(t.name)}</span>
              <span class="muted t-xs truncate">${esc(t.sub)}</span>
            </span>
          </div>`).join('')}
      </div>
      <p class="muted t-xs mt-3">${icon('zap')} لا تتطلّب المنصة أي خطوة بناء (no build step) — HTML/CSS/JS أصيلة تُقدَّم من الخادم.</p>

      <div class="flex gap-2 flex-wrap mt-4">
        <a class="btn btn-primary btn-sm" href="/api-hub">${icon('code')} مركز الـ API</a>
        <a class="btn btn-sm" href="/reports">${icon('report')} مركز التقارير</a>
        <a class="btn btn-sm" href="/datasets">${icon('database')} مرصد البيانات</a>
      </div>
    </section>

    <!-- ============ CREDITS / LICENSE ============ -->
    <section class="panel panel-pad reveal" style="--d:120ms">
      ${sectionHead({ title: 'الحقوق والتراخيص', sub: 'الاستخدام البحثي والتعليمي', iconName: 'scale' })}
      <div class="flex flex-col gap-3">
        <div class="set-lic">
          <span class="set-lic-ic" style="color:var(--tone-green)">${icon('database')}</span>
          <div style="min-width:0">
            <div class="fw-6 flex items-center gap-2">البيانات ${badge('CC BY 4.0', 'green')}</div>
            <p class="muted-1 t-sm mt-1">مجموعات البيانات المنسّقة متاحة بموجب رخصة المشاع الإبداعي — النسب 4.0، مع ذكر المصدر عند إعادة الاستخدام.</p>
          </div>
        </div>
        <div class="set-lic">
          <span class="set-lic-ic" style="color:var(--tone-blue)">${icon('code')}</span>
          <div style="min-width:0">
            <div class="fw-6 flex items-center gap-2">الشيفرة ${badge('MIT', 'blue')}</div>
            <p class="muted-1 t-sm mt-1">شيفرة المنصة مفتوحة المصدر بموجب رخصة MIT — حرية الاستخدام والتعديل وإعادة التوزيع.</p>
          </div>
        </div>
      </div>

      <div class="divider"></div>
      <div class="panel panel-solid panel-pad" style="border-color:var(--accent-line)">
        <div class="fw-6 flex items-center gap-2 mb-2 accent">${icon('shield')} إخلاء مسؤولية</div>
        <p class="muted-1 t-sm">
          تُجمِّع هذه المنصة بيانات عامة ومنسّقة عن دولة الإمارات لأغراض البحث والتعليم.
          الأرقام والمؤشرات والتكاليف هنا استرشادية وقد تتغيّر؛ يُرجى التحقّق من الأرقام الحرجة
          (التكاليف، التشريعات، التأشيرات) من المصادر الرسمية قبل اتخاذ أي قرار.
        </p>
      </div>

      <div class="flex items-center justify-between flex-wrap gap-2 mt-4 muted t-xs">
        <span class="live-pill"><span class="dot-status"></span> ${num(s.totalRecords)} سجل · مُحدّث ${esc(s.updated)}</span>
        <span class="mono">UAE Open Intelligence · v1.0</span>
      </div>
    </section>
  </div>`;

  const head = `<style>
    .set-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:var(--sp-4); }
    @media (max-width:980px){ .set-grid { grid-template-columns:1fr; } }
    .set-row { display:flex; gap:var(--sp-3); flex-wrap:wrap; }
    .set-opt {
      flex:1; min-width:200px; display:flex; align-items:center; gap:var(--sp-3); text-align:start;
      padding:var(--sp-3) var(--sp-4); border-radius:var(--r-md); border:1px solid var(--line);
      background:var(--bg-2); color:var(--txt-0); font-family:inherit; cursor:pointer;
      transition:border-color var(--t-fast), background var(--t-fast);
    }
    .set-opt:hover:not([disabled]){ border-color:var(--line-strong); background:var(--bg-3); }
    .set-opt.active { border-color:var(--accent-line); background:var(--accent-soft); }
    .set-opt-ic { width:34px; height:34px; flex:none; display:grid; place-items:center; border-radius:var(--r-sm); background:var(--bg-3); color:var(--accent); }
    .set-opt-ic svg { width:18px; height:18px; }
    .set-opt-body { display:flex; flex-direction:column; min-width:0; }
    .set-opt-label { font-size:14px; font-weight:600; display:flex; align-items:center; }
    .set-opt-check { margin-inline-start:auto; opacity:0; color:var(--accent); transition:opacity var(--t-fast); }
    .set-opt-check svg { width:18px; height:18px; }
    .set-opt.active .set-opt-check, .set-opt-check.on { opacity:1; }
    .set-method { display:grid; grid-template-columns:1fr 1fr; gap:var(--sp-4); }
    @media (max-width:720px){ .set-method { grid-template-columns:1fr; } }
    .set-tech { display:flex; align-items:center; gap:var(--sp-2); padding:9px var(--sp-3); border-radius:var(--r-md); border:1px solid var(--line); background:var(--bg-2); }
    .set-tech-ic svg { width:18px; height:18px; }
    .set-lic { display:flex; gap:var(--sp-3); }
    .set-lic-ic { width:38px; height:38px; flex:none; display:grid; place-items:center; border-radius:var(--r-md); background:var(--bg-3); }
    .set-lic-ic svg { width:20px; height:20px; }
    .conf-legend { display:flex; align-items:center; gap:var(--sp-3); }
    .conf-legend .conf { flex:none; }
    /* keep section-head actions (export bar + buttons) tidy & wrapping on narrow screens */
    .set-grid .section-head .actions, .panel > .section-head .actions { flex-wrap:wrap; gap:var(--sp-2); }
    @media (max-width:640px){
      .section-head { flex-direction:column; align-items:flex-start; gap:var(--sp-2); }
      .section-head .actions { width:100%; }
      .section-head .actions .export-bar { flex:1; }
      .set-row { flex-direction:column; }
      .set-opt { min-width:0; width:100%; }
    }
  </style>`;

  const bodyEnd = `<script>
  document.addEventListener('DOMContentLoaded', function(){
    var THEME_KEY = 'uae-theme';
    var labels = { dark: 'داكن', light: 'فاتح' };
    var sw = document.getElementById('themeSwitch');
    var badge = document.getElementById('currentThemeBadge');
    function current(){ return document.documentElement.getAttribute('data-theme') || 'dark'; }
    function sync(){
      var t = current();
      if (badge) badge.lastChild ? badge.lastChild.textContent = (labels[t] || t) : badge.textContent = (labels[t] || t);
      if (sw) [].forEach.call(sw.querySelectorAll('[data-set-theme]'), function(b){
        var on = b.getAttribute('data-set-theme') === t;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }
    if (sw) sw.addEventListener('click', function(e){
      var b = e.target.closest('[data-set-theme]'); if (!b) return;
      var t = b.getAttribute('data-set-theme');
      document.documentElement.setAttribute('data-theme', t);
      try { localStorage.setItem(THEME_KEY, t); } catch (_) {}
      // keep the topbar moon/sun button + charts in sync (app.js listens for this)
      document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: t } }));
      sync();
    });
    // reflect external theme switches (topbar button)
    document.addEventListener('themechange', sync);
    sync();
  });
  </script>`;

  return {
    title: 'الإعدادات وحول المنصة',
    active: '/settings',
    body,
    head,
    bodyEnd,
    description: 'إعدادات منصة الإمارات للذكاء المفتوح — المظهر واللغة ومصادر البيانات والمنهجية والتراخيص (CC BY 4.0 للبيانات، MIT للشيفرة).',
  };
}

/** Confidence legend row used inside the methodology panel. */
function confLegendRow(level: number, label: string, desc: string): string {
  return `<div class="conf-legend">
    ${confidence(level)}
    <span class="flex flex-col" style="min-width:0">
      <span class="fw-6 t-sm">${esc(label)}</span>
      <span class="muted t-xs">${esc(desc)}</span>
    </span>
  </div>`;
}
