/** datasets.ts — Data Observatory: searchable open-data catalog + dataset detail view. */
import type { LayoutOpts, PageQuery } from '../lib/layout.js';
import { icon } from '../lib/icons.js';
import { esc, num, compact, safeUrl, CATEGORY_AR, colorFor } from '../lib/i18n.js';
import { pageHead, sectionHead, badge, confidence, copyBtn, emptyState, exportButtons } from '../lib/ui.js';
import { getDatasets, getDataset, getCategoryCounts } from '../lib/db.js';

const catAr = (c: string) => CATEGORY_AR[c] ?? c;

/** Map a confidence float to a tone for badges/meters. */
function confTone(v: number): { tone: string; label: string } {
  if (v >= 0.8) return { tone: 'green', label: 'عالية' };
  if (v >= 0.7) return { tone: 'gold', label: 'متوسطة' };
  return { tone: 'red', label: 'تقديرية' };
}

/* ============================ LIST ============================ */
export function datasetsPage(query: PageQuery = {}): LayoutOpts {
  const category = (query.category || '').trim();
  const q = (query.q || '').trim();

  const all = getDatasets() as any[];
  const cats = getCategoryCounts() as Array<{ category: string; count: number }>;
  const rows = getDatasets({ category: category || undefined, q: q || undefined }) as any[];

  // ---- Export query string: carry the CURRENT filters (category, q) so the
  //      download matches exactly what the user is looking at. ----
  const exportQS = [
    category ? `category=${encodeURIComponent(category)}` : '',
    q ? `q=${encodeURIComponent(q)}` : '',
  ].filter(Boolean).join('&');
  const exportSuffix = exportQS ? `?${exportQS}` : '';
  const exportBar = exportButtons({
    csv: `/api/v1/export/datasets.csv${exportSuffix}`,
    json: `/api/v1/export/datasets.json${exportSuffix}`,
    print: true,
  });

  // ---- Coverage stats (computed from the FULL catalog, not the filtered view) ----
  const totalRecords = all.reduce((s, d) => s + (d.records || 0), 0);
  const totalFields = all.reduce((s, d) => s + ((d.fields || []).length), 0);
  const formats = [...new Set(all.map((d) => d.format))];
  const avgConf = all.length ? all.reduce((s, d) => s + (d.confidence || 0), 0) / all.length : 0;
  const licenses = [...new Set(all.map((d) => d.license))];

  const stats: Array<{ ic: string; label: string; value: string; tone: string }> = [
    { ic: 'database', label: 'مجموعات البيانات', value: num(all.length), tone: 'green' },
    { ic: 'layers', label: 'إجمالي السجلات', value: num(totalRecords), tone: 'blue' },
    { ic: 'grid', label: 'تصنيفات مفتوحة', value: num(cats.length), tone: 'violet' },
    { ic: 'code', label: 'حقول قابلة للاستعلام', value: num(totalFields), tone: 'gold' },
    { ic: 'shield', label: 'متوسط الثقة', value: `${Math.round(avgConf * 100)}%`, tone: 'green' },
    { ic: 'check', label: 'الترخيص', value: licenses[0] || 'CC BY 4.0', tone: 'blue' },
  ];

  const statTiles = stats.map((s, i) => `
    <div class="panel kpi panel-hover reveal" data-tone="${s.tone}" style="--d:${i * 50}ms">
      <div class="kpi-top">${icon(s.ic)}<span>${esc(s.label)}</span></div>
      <div class="kpi-value" style="font-size:clamp(20px,2.4vw,28px)">${esc(s.value)}</div>
    </div>`).join('');

  // ---- Category filter chips (preserve the active search query) ----
  const qparam = q ? `&q=${encodeURIComponent(q)}` : '';
  const chipAll = `<a class="chip ${!category ? 'active' : ''}" href="/datasets${q ? `?q=${encodeURIComponent(q)}` : ''}">الكل <span class="nav-badge">${num(all.length)}</span></a>`;
  const chips = cats.map((c) => `
    <a class="chip ${category === c.category ? 'active' : ''}" href="/datasets?category=${encodeURIComponent(c.category)}${qparam}">
      ${esc(catAr(c.category))} <span class="nav-badge">${num(c.count)}</span>
    </a>`).join('');

  // ---- Search box (plain GET form, server re-renders) ----
  const searchForm = `
    <form method="get" action="/datasets" class="flex gap-2 flex-wrap items-center" style="flex:1">
      ${category ? `<input type="hidden" name="category" value="${esc(category)}">` : ''}
      <div class="search-box flex-1" style="min-width:220px">
        ${icon('search')}
        <input class="input" type="search" name="q" value="${esc(q)}" placeholder="ابحث في عناوين ووصف مجموعات البيانات…" autocomplete="off">
      </div>
      <button class="btn btn-primary" type="submit">${icon('search')} بحث</button>
      ${(q || category) ? `<a class="btn btn-ghost" href="/datasets">${icon('x')} مسح</a>` : ''}
    </form>`;

  // ---- Result summary line ----
  const activeFilter = [
    category ? `التصنيف: <span class="accent fw-6">${esc(catAr(category))}</span>` : '',
    q ? `البحث: <span class="accent fw-6">«${esc(q)}»</span>` : '',
  ].filter(Boolean).join(' · ');

  // ---- Dataset cards ----
  const cards = rows.map((d, i) => {
    const ct = confTone(d.confidence);
    const cats3 = (d.categories || []).slice(0, 3)
      .map((c: string) => `<a class="badge ${category === c ? 'green' : ''}" href="/datasets?category=${encodeURIComponent(c)}" title="تصفية حسب ${esc(catAr(c))}">${esc(catAr(c))}</a>`).join('');
    const accent = colorFor(d.id);
    return `
    <div class="panel card panel-hover reveal" style="--d:${i * 55}ms;border-top:2px solid ${accent}">
      <div class="flex items-center justify-between gap-3">
        <span class="brand-mark" style="width:34px;height:34px;border-radius:9px;font-size:14px;background:linear-gradient(140deg,${accent},${accent}aa);box-shadow:0 0 18px -6px ${accent}">${icon('database')}</span>
        <span class="mono t-xs muted">${esc(d.format)}</span>
      </div>
      <a class="card-title clamp-2" href="/datasets/${esc(d.id)}" style="margin-top:2px">${esc(d.title_ar)}</a>
      <div class="mono t-xs muted" dir="ltr" style="text-align:start">${esc(d.title_en)}</div>
      <p class="card-text muted clamp-3">${esc(d.description_ar)}</p>
      <div class="card-meta">${cats3}</div>
      <div class="divider" style="margin:var(--sp-2) 0"></div>
      <div class="flex items-center justify-between gap-3 flex-wrap t-sm">
        <span class="flex items-center gap-1 muted-1" title="عدد السجلات">${icon('layers')} <span class="mono fw-6">${num(d.records)}</span> سجل</span>
        ${badge(ct.label, ct.tone, true)}
      </div>
      <div class="flex items-center justify-between gap-2">
        <span class="muted t-xs flex items-center gap-1">${icon('calendar')} ${esc(d.updated)}</span>
        ${confidence(d.confidence)}
      </div>
      <div class="muted t-xs truncate" title="${esc(d.source)}">${icon('info')} ${esc(d.source)}</div>
      <div class="flex gap-2 mt-2">
        <a class="btn btn-sm flex-1" href="/datasets/${esc(d.id)}">${icon('info')} التفاصيل</a>
        <a class="btn btn-sm btn-primary flex-1" href="${esc(safeUrl(d.endpoint))}" target="_blank" rel="noopener">${icon('code')} API</a>
      </div>
    </div>`;
  }).join('');

  const grid = rows.length
    ? `<div class="cards auto">${cards}</div>`
    : emptyState('لا توجد مجموعات بيانات مطابقة لبحثك. جرّب مصطلحًا آخر أو امسح المرشّحات.', 'database');

  const body = `
  <div class="ds-page">
  ${pageHead({
    eyebrow: 'مرصد البيانات · DATA OBSERVATORY',
    title: 'مرصد البيانات',
    lede: 'السجل الموحّد لمجموعات البيانات المفتوحة في المنصة — قابل للبحث والتصفية بالتصنيف، مع وصول مباشر إلى كل مجموعة عبر واجهة REST موحّدة.',
    actions: `<a class="btn" href="/api-hub">${icon('code')} مركز الـ API</a>`,
  })}

  <div class="kpi-grid mb-6" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr))">
    ${statTiles}
  </div>

  <div class="panel panel-pad mb-5">
    <div class="flex gap-4 flex-wrap items-center mb-4">
      ${searchForm}
    </div>
    ${sectionHead({ title: 'التصنيفات', sub: 'تُصنَّف مجموعات البيانات وفق محاور قطاعية مفتوحة', iconName: 'filter' })}
    <div class="chip-row">${chipAll}${chips}</div>
  </div>

  <div class="section-head ds-results-head">
    <div class="titles">
      <div class="section-title">${icon('database')} المجموعات (${num(rows.length)})</div>
      <div class="section-sub">${activeFilter || `كامل السجل · ${num(all.length)} مجموعة بيانات عبر ${num(cats.length)} تصنيفًا`}</div>
    </div>
    <div class="actions ds-results-actions">
      <span class="badge blue">${esc(formats.join(' · '))}</span>
      ${exportBar}
    </div>
  </div>

  ${grid}
  </div>`;

  const descBits = category ? `تصنيف ${catAr(category)}` : 'كل التصنيفات';
  return {
    title: 'مرصد البيانات',
    active: '/datasets',
    body,
    head: DS_STYLE,
    description: `مرصد البيانات — سجل مجموعات البيانات المفتوحة في منصة الإمارات للذكاء المفتوح (${descBits}). بحث وتصفية ووصول عبر API.`,
  };
}

/** Scoped responsive/RTL polish for the Data Observatory pages (prefix: .ds-). */
const DS_STYLE = `<style>
  /* Results header: keep the formats badge + export bar aligned, wrap gracefully on mobile. */
  .ds-results-actions { display:flex; align-items:center; gap:var(--sp-2); flex-wrap:wrap; }
  /* Chip rows must wrap and never force horizontal scroll. */
  .ds-page .chip-row { flex-wrap:wrap; }
  /* Detail two-column layout collapses to single column on narrow screens. */
  @media (max-width: 860px) {
    .ds-detail-grid { grid-template-columns:1fr !important; }
  }
  @media (max-width: 720px) {
    .ds-results-head { flex-direction:column; align-items:stretch; gap:var(--sp-3); }
    .ds-results-actions { justify-content:flex-start; }
    /* Single-column cards on phones (auto-fill already collapses, this guarantees it). */
    .ds-page .cards.auto { grid-template-columns:1fr; }
  }
</style>`;

/* ============================ DETAIL ============================ */
export function datasetDetailPage(id: string): LayoutOpts | null {
  const d = getDataset(id) as any;
  if (!d) return null;

  const ct = confTone(d.confidence);
  const accent = colorFor(d.id);
  const fields: string[] = d.fields || [];
  const categories: string[] = d.categories || [];

  const catBadges = categories
    .map((c) => `<a class="badge green" href="/datasets?category=${encodeURIComponent(c)}">${esc(catAr(c))}</a>`).join(' ');

  // ---- Metadata table ----
  const metaRows: Array<[string, string, string]> = [
    ['عدد السجلات', `<span class="mono fw-7" style="font-size:15px">${num(d.records)}</span> سجل`, 'layers'],
    ['الصيغة', `<span class="badge blue">${esc(d.format)}</span>`, 'code'],
    ['المصدر', esc(d.source), 'info'],
    ['الترخيص', `<span class="badge gold">${esc(d.license)}</span>`, 'shield'],
    ['درجة الثقة', `${confidence(d.confidence)} <span class="muted t-xs">(${ct.label})</span>`, 'target'],
    ['آخر تحديث', `<span class="mono">${esc(d.updated)}</span>`, 'calendar'],
    ['التصنيفات', catBadges || '<span class="muted">—</span>', 'grid'],
    ['عدد الحقول', `<span class="mono fw-6">${num(fields.length)}</span> حقل`, 'filter'],
  ];

  const metaTable = `
  <div class="table-wrap">
    <table class="data">
      <tbody>
        ${metaRows.map(([k, v, ic]) => `
          <tr>
            <td style="width:38%;white-space:nowrap"><span class="flex items-center gap-2 muted-1">${icon(ic)} ${esc(k)}</span></td>
            <td>${v}</td>
          </tr>`).join('')}
      </tbody>
    </table>
  </div>`;

  // ---- Fields as chips ----
  const fieldChips = fields.length
    ? `<div class="chip-row">${fields.map((f) => `<span class="chip mono" dir="ltr">${icon('code')} ${esc(f)}</span>`).join('')}</div>`
    : emptyState('لا توجد حقول موصوفة لهذه المجموعة', 'filter');

  // ---- API endpoint code block ----
  const apiPath = esc(d.endpoint);
  const codeBlock = `
  <div class="panel panel-solid" style="overflow:hidden">
    <div class="flex items-center justify-between gap-3" style="padding:10px var(--sp-4);border-bottom:1px solid var(--line)">
      <span class="t-xs uppercase muted flex items-center gap-2">${icon('code')} نقطة النهاية · GET</span>
      ${copyBtn(d.endpoint)}
    </div>
    <pre class="mono" dir="ltr" style="margin:0;padding:var(--sp-4);overflow-x:auto;font-size:13px;color:var(--txt-0);line-height:1.7"><span class="badge green" style="vertical-align:middle">GET</span> ${apiPath}</pre>
  </div>`;

  const body = `
  <div class="ds-page">
  <nav class="flex items-center gap-2 muted t-sm mb-4" aria-label="مسار التنقل">
    <a href="/datasets" class="flex items-center gap-1">${icon('database')} مرصد البيانات</a>
    <span style="transform:scaleX(-1);display:inline-flex">${icon('chevron')}</span>
    <span class="muted-1 truncate">${esc(d.title_ar)}</span>
  </nav>

  ${pageHead({
    eyebrow: `مجموعة بيانات · ${categories.map(catAr).join(' / ') || 'بيانات مفتوحة'}`,
    title: d.title_ar,
    lede: d.description_ar,
    actions: `
      <a class="btn btn-primary" href="${esc(safeUrl(d.endpoint))}" target="_blank" rel="noopener">${icon('arrowUR')} جرّب عبر API</a>
      <a class="btn" href="/datasets">${icon('chevron')} العودة للسجل</a>`,
  })}

  <div class="mono t-sm muted mb-5" dir="ltr" style="text-align:start">${esc(d.title_en)}</div>

  <div class="cards ds-detail-grid" style="grid-template-columns:1.1fr .9fr;gap:var(--sp-5)">
    <div class="flex flex-col gap-5">
      <div class="panel panel-pad" style="border-top:2px solid ${accent}">
        ${sectionHead({ title: 'الوصف', sub: 'باللغتين العربية والإنجليزية', iconName: 'info' })}
        <p class="card-text">${esc(d.description_ar)}</p>
        <div class="divider"></div>
        <p class="card-text muted" dir="ltr" style="text-align:start">${esc(d.description_en)}</p>
      </div>

      <div class="panel panel-pad">
        ${sectionHead({ title: 'الحقول المتاحة', sub: `${num(fields.length)} حقلًا قابلًا للاستعلام عبر الـ API`, iconName: 'filter' })}
        ${fieldChips}
      </div>

      <div>
        ${sectionHead({ title: 'الوصول عبر الـ API', sub: 'مظروف استجابة قياسي JSON · { ok, data, error, meta }', iconName: 'code' })}
        ${codeBlock}
        <div class="flex gap-2 mt-3 flex-wrap">
          <a class="btn btn-primary btn-sm" href="${esc(safeUrl(d.endpoint))}" target="_blank" rel="noopener">${icon('external')} فتح الاستجابة</a>
          <a class="btn btn-sm" href="/api-hub">${icon('code')} توثيق الـ API الكامل</a>
        </div>
      </div>
    </div>

    <aside class="flex flex-col gap-5">
      <div class="kpi-grid" style="grid-template-columns:1fr 1fr">
        <div class="panel kpi" data-tone="blue">
          <div class="kpi-top">${icon('layers')}<span>السجلات</span></div>
          <div class="kpi-value" style="font-size:26px">${num(d.records)}</div>
        </div>
        <div class="panel kpi" data-tone="gold">
          <div class="kpi-top">${icon('filter')}<span>الحقول</span></div>
          <div class="kpi-value" style="font-size:26px">${num(fields.length)}</div>
        </div>
      </div>

      <div class="panel panel-pad">
        ${sectionHead({ title: 'البيانات الوصفية', iconName: 'grid' })}
        ${metaTable}
      </div>

      <div class="panel panel-pad" style="background:linear-gradient(135deg,var(--accent-soft),transparent);border-color:var(--accent-line)">
        <div class="section-title" style="font-size:15px">${icon('shield')} الجودة والثقة</div>
        <p class="muted-1 t-sm mt-2">درجة الثقة تعكس مدى توثيق المصدر وحداثته. هذه المجموعة مُقيّمة بثقة <span class="accent fw-6">${ct.label}</span> (${Math.round(d.confidence * 100)}%).</p>
        <div class="mt-3">${confidence(d.confidence)}</div>
      </div>
    </aside>
  </div>
  </div>`;

  return {
    title: d.title_ar,
    active: '/datasets',
    body,
    head: DS_STYLE,
    description: d.description_en,
  };
}
