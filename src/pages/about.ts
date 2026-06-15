/** about.ts — About / Methodology: data sources, confidence scoring, limitations. */
import type { LayoutOpts } from '../lib/layout.js';
import { icon } from '../lib/icons.js';
import { esc, num, CATEGORY_AR } from '../lib/i18n.js';
import { pageHead, sectionHead, confidence, badge } from '../lib/ui.js';
import { platformStats, getDatasets } from '../lib/db.js';

export function aboutPage(): LayoutOpts {
  const s = platformStats();
  const datasets = getDatasets() as any[];

  const domains = [
    { icon: 'bulb', title: 'مشاريع الابتكار', n: s.projects, src: 'فهرس ابتكار منسّق (curated)', note: 'صُنّفت قطاعيًا آليًا عبر مطابقة كلمات مفتاحية عربية، وحُسب متوسط سبع درجات تقييم لكل مشروع.' },
    { icon: 'building', title: 'المناطق الحرة', n: s.freezones, src: 'u.ae وهيئات المناطق الحرة', note: 'التكاليف تقديرية للسنة الأولى مجمّعة من باقاتٍ معلَنة (2024–2025) وتتغيّر بكثرة — تحقّق من الهيئة مباشرة.' },
    { icon: 'brain', title: 'مهارات ومرصد الذكاء الاصطناعي', n: s.skills, src: 'مرصد مهارات الذكاء الاصطناعي والشركات الصغيرة', note: 'مؤشرات المرصد نموذجية (prototype) وتحتاج تحقّقًا — موسومة بذلك في الصفحات.' },
    { icon: 'landmark', title: 'الثقافة والتراث', n: s.culture, src: 'يونسكو (ICH/WHS) ودائرة الثقافة والسياحة — منسّق', note: 'مجموعة منسّقة لأغراض تعليمية، بإحداثيات تقريبية على الخريطة.' },
    { icon: 'trending', title: 'المؤشرات الكلية', n: s.macro, src: 'IMF · UNCTAD · وزارة الاقتصاد · FCSC', note: 'أرقامٌ مرجعية موسومة بالمصدر والسنة؛ ما يحمل «≈» أو «تقديري» تقريبي.' },
  ];

  const confBands = [
    { tone: 'green', label: 'عالية (≥ 0.8)', desc: 'مصدر رسمي أو مُدرج عالميًا (مثل يونسكو) — موثوقية مرتفعة.' },
    { tone: 'gold', label: 'متوسطة (0.7 – 0.8)', desc: 'مصدر عام موثوق مع بعض التقدير أو التجميع.' },
    { tone: 'red', label: 'تقديرية (< 0.7)', desc: 'أرقام نموذجية/تقديرية تحتاج تحقّقًا قبل الاستشهاد بها.' },
  ];

  const sourcesRows = datasets.map((d) => `<tr>
    <td><div class="fw-6">${esc(d.title_ar)}</div><div class="muted t-xs">${esc(d.title_en)}</div></td>
    <td>${(d.categories ?? []).map((c: string) => badge(CATEGORY_AR[c] ?? c)).join(' ')}</td>
    <td class="num">${num(d.records)}</td>
    <td class="t-sm">${esc(d.source)}</td>
    <td>${badge(d.license, 'blue')}</td>
    <td>${confidence(d.confidence)}</td>
    <td class="num t-sm muted">${esc(d.updated)}</td>
  </tr>`).join('');

  const body = `
  ${pageHead({
    eyebrow: 'منصة الإمارات للذكاء المفتوح · حول والمنهجية',
    title: 'حول المنصة والمنهجية',
    lede: 'ماهية المنصة، ومصادر بياناتها، وكيف نَسِم كل رقم بدرجة ثقة ومصدر — بشفافية كاملة للأغراض البحثية والتعليمية.',
  })}

  <section class="cards cols-2 mb-6" style="grid-template-columns:1.4fr 1fr">
    <div class="panel panel-pad">
      ${sectionHead({ title: 'ما هي المنصة؟', iconName: 'info' })}
      <p class="card-text">منصة الإمارات للذكاء المفتوح مرصدٌ عربيٌّ أولًا يوحّد البيانات المفتوحة المتعلّقة بدولة الإمارات في واجهةٍ تشغيلية واحدة: مشاريع الابتكار، المناطق الحرة، مهارات الذكاء الاصطناعي، التراث الثقافي، والمؤشرات الاقتصادية الكلية — مع بحثٍ موحّد، تحليلات، رسمٍ معرفي، تقارير قابلة للطباعة، و APIs جاهزة.</p>
      <p class="card-text mt-3">المنصة مفتوحة المصدر (الكود بترخيص MIT، والبيانات بترخيص CC BY 4.0) ومبنيّة بدون أطر واجهة ثقيلة — Hono و TypeScript و HTMX و Alpine و SQLite — لتكون سريعةً وسهلة النشر.</p>
    </div>
    <div class="panel panel-pad">
      ${sectionHead({ title: 'لمحة سريعة', iconName: 'activity' })}
      <div class="kpi-grid" style="grid-template-columns:1fr 1fr">
        ${tile(s.totalRecords, 'سجل بيانات')}
        ${tile(s.datasets, 'مجموعة بيانات')}
        ${tile(s.sectors, 'قطاع')}
        ${tile(s.graphNodes, 'عقدة معرفية')}
      </div>
    </div>
  </section>

  <section class="mb-6">
    ${sectionHead({ title: 'مصادر البيانات', sub: 'كل مجموعة موسومة بالمصدر والترخيص ودرجة الثقة وتاريخ التحديث', iconName: 'database' })}
    <div class="table-wrap"><table class="data">
      <thead><tr><th>المجموعة</th><th>التصنيف</th><th>السجلات</th><th>المصدر</th><th>الترخيص</th><th>الثقة</th><th>التحديث</th></tr></thead>
      <tbody>${sourcesRows}</tbody>
    </table></div>
  </section>

  <section class="mb-6">
    ${sectionHead({ title: 'المراصد الخمسة ومناهجها', iconName: 'layers' })}
    <div class="cards cols-2">
      ${domains.map((d) => `<div class="panel card panel-hover">
        <div class="card-meta">
          <span class="fic" style="width:38px;height:38px;border-radius:11px;display:grid;place-items:center;background:var(--accent-soft);color:var(--accent)">${icon(d.icon)}</span>
          <div><div class="card-title">${esc(d.title)}</div><div class="muted t-xs">${esc(d.src)}</div></div>
          <span class="score-pill" style="margin-inline-start:auto">${num(d.n)}</span>
        </div>
        <div class="card-text muted">${esc(d.note)}</div>
      </div>`).join('')}
    </div>
  </section>

  <section class="cards cols-2 mb-6" style="grid-template-columns:1fr 1fr">
    <div class="panel panel-pad">
      ${sectionHead({ title: 'كيف نقرأ درجة الثقة', sub: 'كل رقم يحمل درجة من 0 إلى 1', iconName: 'shield' })}
      <div class="flex flex-col gap-3">
        ${confBands.map((b) => `<div class="flex items-start gap-3">
          ${badge(b.label, b.tone, true)}
          <span class="card-text muted flex-1">${esc(b.desc)}</span>
        </div>`).join('')}
      </div>
      <p class="muted t-xs mt-4">${esc('تظهر درجة الثقة كشريطٍ ذهبي بجانب كل سجل ومجموعة بيانات.')}</p>
    </div>
    <div class="panel panel-pad">
      ${sectionHead({ title: 'المنهجية والمعالجة', iconName: 'compass' })}
      <ul class="card-text muted" style="padding-inline-start:18px;display:flex;flex-direction:column;gap:8px;margin:0">
        <li>تُطبَّع كل المصادر في قاعدة بيانات SQLite واحدة عبر خط معالجة قابل لإعادة التشغيل (<span class="mono">npm run seed</span>).</li>
        <li>تُصنَّف المشاريع قطاعيًا عبر قواعد كلماتٍ مفتاحية عربية، ويُكتشف الارتباط بالإمارة من النص.</li>
        <li>يُولَّد الرسم المعرفي آليًا (إمارات ⇄ مناطق حرة ⇄ قطاعات ⇄ مشاريع + فئات مهارات).</li>
        <li>تُصدَّر نسخةٌ JSON محمولة لكل مجموعة، وهي أيضًا متاحة للتنزيل عبر الـ API.</li>
      </ul>
    </div>
  </section>

  <section class="panel panel-pad" style="border-color:var(--accent-line);background:linear-gradient(135deg,var(--accent-soft),transparent)">
    ${sectionHead({ title: 'حدود الاستخدام وإخلاء المسؤولية', iconName: 'info' })}
    <p class="card-text">تُجمَّع البيانات وتُنسَّق من مصادر عامة لأغراض البحث والتعليم. قد تتغيّر بعض الأرقام (خاصة تكاليف المناطق الحرة والمؤشرات النموذجية) بمرور الوقت. <span class="fw-6">تحقّق دائمًا من الأرقام الحرجة من المصادر الرسمية</span> (u.ae، المركز الاتحادي للتنافسية والإحصاء، وزارة الاقتصاد، وهيئات المناطق الحرة) قبل الاعتماد عليها في قرارات.</p>
    <div class="flex gap-3 flex-wrap mt-4">
      <a class="btn" href="/api-hub">${icon('code')} وثائق الـ API</a>
      <a class="btn" href="/datasets">${icon('database')} تصفّح المجموعات</a>
      <a class="btn" href="/settings">${icon('settings')} الإعدادات</a>
    </div>
  </section>`;

  return {
    title: 'حول والمنهجية',
    active: '/about',
    body,
    description: 'حول منصة الإمارات للذكاء المفتوح: مصادر البيانات، منهجية المعالجة، نظام درجات الثقة، وحدود الاستخدام.',
  };
}

function tile(value: number, label: string): string {
  return `<div class="panel panel-solid" style="padding:var(--sp-4)">
    <div class="kpi-value mono" style="font-size:24px">${num(value)}</div>
    <div class="muted t-xs mt-1">${esc(label)}</div>
  </div>`;
}
