/** culture.ts — Culture & Heritage Explorer: theme filter, Leaflet map, theme cards, heritage grid, tourism insights. */
import type { LayoutOpts, PageQuery } from '../lib/layout.js';
import { icon } from '../lib/icons.js';
import { jsonScript, esc, num, colorFor } from '../lib/i18n.js';
import { pageHead, sectionHead, badge, confidence, emptyState, kpiCard, exportButtons, loadingState, errorState } from '../lib/ui.js';
import { getCulture, getCultureThemes } from '../lib/db.js';

/** Per-theme icon mapping (falls back to landmark for any unknown key). */
const THEME_ICON: Record<string, string> = {
  turuq: 'route',
  mawasem: 'calendar',
  hikayat: 'message',
  thaqafah: 'landmark',
  lahja: 'globe',
  maktabati: 'book',
};

export function culturePage(query: PageQuery = {}): LayoutOpts {
  const activeTheme = query.theme ?? '';
  const q = query.q ?? '';

  // Export URLs carry the page's CURRENT filters (theme, q) so the user exports exactly what they see.
  const exportParams = new URLSearchParams();
  if (activeTheme) exportParams.set('theme', activeTheme);
  if (q) exportParams.set('q', q);
  const exportQS = exportParams.toString() ? `?${exportParams.toString()}` : '';
  const exportBar = exportButtons({
    csv: `/api/v1/export/culture.csv${exportQS}`,
    json: `/api/v1/export/culture.json${exportQS}`,
    print: true,
  });

  const themes = getCultureThemes() as any[];
  const items = getCulture({ theme: activeTheme || undefined, q: q || undefined }) as any[];

  // Quick lookup of theme metadata (title_ar / desc_ar) by key.
  const themeMap = new Map(themes.map((t) => [t.key, t]));
  const themeAr = (key: string) => (themeMap.get(key)?.title_ar ?? key) as string;

  const totalItems = themes.reduce((s, t) => s + (t.count ?? 0), 0);

  // ---- Tourism insights (computed from the *current* result set) ----
  const lc = (s: unknown) => String(s ?? '').toLowerCase();
  const hasTag = (it: any, tag: string) => (it.tags ?? []).some((t: any) => lc(t) === tag);
  const unescoCount = items.filter((it) => hasTag(it, 'unesco')).length;
  const mappedCount = items.filter((it) => it.lat != null && it.lng != null).length;
  const siteCount = items.filter((it) => hasTag(it, 'heritage-site') || hasTag(it, 'oasis') || lc(it.era).includes('أثري')).length;
  const themesCovered = new Set(items.map((it) => it.theme)).size;
  const avgConf = items.length ? items.reduce((s, it) => s + (Number(it.confidence) || 0), 0) / items.length : 0;

  // Items with valid coordinates → inlined into the map script.
  const mapped = items
    .filter((it) => it.lat != null && it.lng != null)
    .map((it) => ({
      id: it.id,
      title_ar: it.title_ar,
      summary_ar: it.summary_ar,
      era: it.era,
      source: it.source,
      theme: it.theme,
      theme_ar: themeAr(it.theme),
      lat: Number(it.lat),
      lng: Number(it.lng),
      color: colorFor(it.theme),
    }));

  // ---- Filter bar: theme chips (with "all" reset) + search box ----
  const themeChips = `
    <a class="chip ${!activeTheme ? 'active' : ''}" href="/culture${q ? `?q=${encodeURIComponent(q)}` : ''}">
      ${icon('layers')} كل المحاور <span class="nav-badge">${num(totalItems)}</span>
    </a>
    ${themes.map((t) => {
      const href = `/culture?theme=${encodeURIComponent(t.key)}${q ? `&q=${encodeURIComponent(q)}` : ''}`;
      return `<a class="chip ${activeTheme === t.key ? 'active' : ''}" href="${esc(href)}" title="${esc(t.desc_ar)}">
        ${icon(THEME_ICON[t.key] ?? 'landmark')} ${esc(t.title_ar)} <span class="nav-badge">${num(t.count)}</span>
      </a>`;
    }).join('')}`;

  const filterBar = `
  <section class="panel panel-pad reveal mb-6">
    <div class="flex items-center justify-between gap-4 flex-wrap mb-3">
      <div class="t-sm muted-1 flex items-center gap-2">${icon('filter')} ترشيح حسب المحور الثقافي</div>
      <form method="get" action="/culture" class="search-box" style="min-width:min(320px,100%)">
        ${activeTheme ? `<input type="hidden" name="theme" value="${esc(activeTheme)}">` : ''}
        ${icon('search')}
        <input class="input" type="search" name="q" value="${esc(q)}" placeholder="ابحث في العناصر التراثية…" autocomplete="off">
      </form>
    </div>
    <div class="chip-row">${themeChips}</div>
    ${(activeTheme || q) ? `<div class="mt-3 flex items-center gap-2 t-sm muted flex-wrap">
        <span>${num(items.length)} عنصرًا مطابقًا</span>
        ${activeTheme ? badge(themeAr(activeTheme), 'gold') : ''}
        ${q ? badge(`«${q}»`, 'blue') : ''}
        <a class="btn btn-sm btn-ghost" href="/culture">${icon('x')} مسح الترشيح</a>
      </div>` : ''}
  </section>`;

  // ---- Tourism insights KPI strip ----
  const insights = `
  <section class="mb-6 reveal">
    ${sectionHead({ title: 'رؤى سياحية وتراثية', sub: 'مؤشرات محسوبة من العناصر المعروضة حاليًا', iconName: 'compass' })}
    <div class="kpi-grid">
      ${kpiCard({ label: 'عناصر مدرجة في اليونسكو', value: num(unescoCount), sub: 'موسومة بـ unesco', tone: 'gold', iconName: 'shield' })}
      ${kpiCard({ label: 'مواقع على الخريطة', value: num(mappedCount), sub: 'لها إحداثيات جغرافية', tone: 'green', iconName: 'pin' })}
      ${kpiCard({ label: 'مواقع أثرية وتراثية', value: num(siteCount), sub: 'واحات ومواقع تاريخية', tone: 'blue', iconName: 'landmark' })}
      ${kpiCard({ label: 'محاور ثقافية مغطّاة', value: `${num(themesCovered)}/${num(themes.length)}`, sub: 'من إجمالي المحاور', tone: 'violet', iconName: 'layers' })}
      ${kpiCard({ label: 'متوسط درجة الثقة', value: `${Math.round(avgConf * 100)}%`, sub: 'موثوقية المصادر', tone: 'gold', iconName: 'target' })}
    </div>
  </section>`;

  // ---- Map section ----
  const mapLegend = themes
    .filter((t) => mapped.some((m) => m.theme === t.key))
    .map((t) => `<span class="lg"><span class="sw" style="background:${colorFor(t.key)}"></span>${esc(t.title_ar)}</span>`)
    .join('');

  const mapSection = `
  <section class="panel panel-pad reveal mb-6">
    ${sectionHead({
      title: 'خريطة التراث الإماراتي',
      sub: `${num(mapped.length)} موقعًا تراثيًا موزّعة على إمارات الدولة — انقر النقطة لعرض التفاصيل`,
      iconName: 'pin',
    })}
    ${mapped.length
      ? `<div class="map-box" id="cultureMap" role="img" aria-label="خريطة المواقع التراثية الإماراتية">${loadingState('جارٍ تحميل الخريطة…')}</div>
         <div class="legend mt-4">${mapLegend}</div>`
      : emptyState('لا توجد مواقع بإحداثيات ضمن الترشيح الحالي', 'pin')}
  </section>`;

  // ---- Theme overview cards ----
  const themeCards = `
  <section class="mb-6 reveal">
    ${sectionHead({ title: 'المحاور الثقافية الستة', sub: 'بوّابات موضوعية تنظّم التراث الإماراتي', iconName: 'grid' })}
    <div class="cards cols-3">
      ${themes.map((t, i) => {
        const href = `/culture?theme=${encodeURIComponent(t.key)}`;
        const c = colorFor(t.key);
        const isActive = activeTheme === t.key;
        return `<a class="panel card panel-hover reveal ${isActive ? '' : ''}" style="--d:${i * 50}ms${isActive ? `;border-color:${c}66` : ''}" href="${esc(href)}">
          <div class="flex items-center justify-between">
            <span class="brand-mark" style="background:linear-gradient(140deg,${c},${c}aa);box-shadow:0 0 20px -4px ${c};color:#04140d">${icon(THEME_ICON[t.key] ?? 'landmark')}</span>
            <span class="kpi-value mono" style="font-size:24px;color:${c}">${num(t.count)}</span>
          </div>
          <div class="card-title mt-2 flex items-center gap-2">${esc(t.title_ar)} <span class="muted t-xs mono">${esc(t.title_en)}</span></div>
          <div class="card-text muted clamp-2">${esc(t.desc_ar)}</div>
          <div class="t-sm flex items-center gap-1 mt-2" style="color:${c}">استكشف المحور ${icon('chevron')}</div>
        </a>`;
      }).join('')}
    </div>
  </section>`;

  // ---- Heritage item cards grid ----
  const itemsGrid = `
  <section class="reveal">
    ${sectionHead({
      title: 'العناصر التراثية',
      sub: `${num(items.length)} عنصرًا منسّقًا، كلٌّ موسوم بالمصدر ودرجة الثقة`,
      iconName: 'book',
      actions: `<span class="badge gold">${icon('shield')} ${num(unescoCount)} ضمن اليونسكو</span>`,
    })}
    ${items.length
      ? `<div class="cards auto">
          ${items.map((it, i) => {
            const c = colorFor(it.theme);
            const tags = (it.tags ?? []) as any[];
            return `<article class="panel card panel-hover reveal" style="--d:${(i % 9) * 45}ms">
              <div class="card-meta">
                <span class="tag" style="color:${c}">${icon(THEME_ICON[it.theme] ?? 'landmark')} ${esc(themeAr(it.theme))}</span>
                ${it.era ? badge(it.era, '') : ''}
                ${hasTag(it, 'unesco') ? badge('اليونسكو', 'gold', true) : ''}
              </div>
              <h3 class="card-title">${esc(it.title_ar)}</h3>
              ${it.title_en ? `<div class="muted t-xs mono" style="margin-top:-6px">${esc(it.title_en)}</div>` : ''}
              <p class="card-text clamp-3">${esc(it.summary_ar)}</p>
              ${tags.length ? `<div class="chip-row" style="margin-top:auto">
                ${tags.slice(0, 5).map((tg) => `<a class="tag" href="/culture?q=${encodeURIComponent(String(tg))}">#${esc(tg)}</a>`).join('')}
              </div>` : ''}
              <div class="divider" style="margin:var(--sp-2) 0"></div>
              <div class="flex items-center justify-between gap-2 flex-wrap">
                <span class="muted t-xs flex items-center gap-1 truncate" title="${esc(it.source)}">${icon('info')} ${esc(it.source)}</span>
                ${confidence(it.confidence)}
              </div>
            </article>`;
          }).join('')}
        </div>`
      : emptyState('لا توجد عناصر تراثية مطابقة للترشيح — جرّب محورًا آخر أو امسح البحث', 'landmark')}
  </section>`;

  const head = `<style>
    .map-box .leaflet-popup-content-wrapper { background: var(--bg-2); color: var(--txt-0); border: 1px solid var(--line-strong); border-radius: 12px; box-shadow: var(--e-3); }
    .map-box .leaflet-popup-tip { background: var(--bg-2); border: 1px solid var(--line-strong); }
    .map-box .leaflet-popup-content { margin: 12px 14px; font-family: var(--font-ar); line-height: 1.6; direction: rtl; }
    .map-box .leaflet-popup-close-button { color: var(--txt-2); }
    .map-box .leaflet-bar a, .map-box .leaflet-control-attribution { background: var(--bg-2); color: var(--txt-1); border-color: var(--line); }
    .map-box .leaflet-control-attribution a { color: var(--accent); }
    .cult-pop-title { font-weight: 700; font-size: 14px; color: var(--txt-0); margin-bottom: 4px; }
    .cult-pop-sum { font-size: 12.5px; color: var(--txt-1); max-width: 240px; }
    .cult-pop-meta { font-size: 11px; color: var(--txt-2); margin-top: 6px; font-family: var(--font-mono); display: flex; flex-wrap: wrap; gap: 6px; }
    .cult-pop-theme { display: inline-block; font-size: 11px; font-weight: 600; padding: 1px 7px; border-radius: 99px; margin-bottom: 6px; }
    /* Loading/error state fills the map box and stays vertically centred. */
    #cultureMap .state-block { height: 100%; }
    /* Mobile + RTL polish (scoped): chips wrap, map keeps height, cards single-column. */
    @media (max-width: 640px) {
      .cult-page .chip-row { gap: var(--sp-2); }
      .cult-page .map-box { height: 320px; }
      .cult-page .cards.auto, .cult-page .cards.cols-3 { grid-template-columns: 1fr; }
      .cult-page .export-bar { width: 100%; }
    }
  </style>`;

  const body = `
  <div class="cult-page">
  ${pageHead({
    eyebrow: 'مستكشف التراث · UAE CULTURE & HERITAGE',
    title: 'الثقافة والتراث الإماراتي',
    lede: 'مجموعة منسّقة من العناصر التراثية والثقافية الإماراتية — موزّعة على ستة محاور، ومنقّطة على الخريطة، وموسومة بالمصدر ودرجة الثقة لأغراض البحث والتعليم.',
    actions: `${exportBar}<a class="btn btn-sm" href="/api-hub">${icon('code')} عبر الـ API</a>`,
  })}
  ${filterBar}
  ${insights}
  ${mapSection}
  ${themeCards}
  ${itemsGrid}
  </div>`;

  const bodyEnd = mapped.length
    ? `<script>
  document.addEventListener('DOMContentLoaded', function(){
    var el = document.getElementById('cultureMap');
    if (!el) return;
    var mapErrorHtml = ${jsonScript(errorState('تعذّر تحميل الخريطة'))};
    try {
      if (typeof L === 'undefined') throw new Error('Leaflet unavailable');
      el.innerHTML = '';
      var items = ${jsonScript(mapped)};
      var map = L.map(el, { scrollWheelZoom: false, attributionControl: true }).setView([24.3, 54.5], 7);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap' }).addTo(map);
      map.on('click', function(){ map.scrollWheelZoom.enable(); });
      map.on('mouseout', function(){ map.scrollWheelZoom.disable(); });
      function escHtml(s){ var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }
      var group = [];
      items.forEach(function(it){
        var m = L.circleMarker([it.lat, it.lng], {
          radius: 8, color: it.color, weight: 2, fillColor: it.color, fillOpacity: 0.55
        }).addTo(map);
        var popup =
          '<div class="cult-pop-theme" style="background:' + it.color + '22;color:' + it.color + '">' + escHtml(it.theme_ar) + '</div>' +
          '<div class="cult-pop-title">' + escHtml(it.title_ar) + '</div>' +
          '<div class="cult-pop-sum">' + escHtml(it.summary_ar) + '</div>' +
          '<div class="cult-pop-meta">' +
            (it.era ? '<span>📅 ' + escHtml(it.era) + '</span>' : '') +
            (it.source ? '<span>📚 ' + escHtml(it.source) + '</span>' : '') +
          '</div>';
        m.bindPopup(popup, { maxWidth: 280 });
        m.on('mouseover', function(){ m.setStyle({ fillOpacity: 0.85, radius: 10 }); });
        m.on('mouseout', function(){ m.setStyle({ fillOpacity: 0.55, radius: 8 }); });
        group.push(m);
      });
      if (group.length > 1) {
        try { map.fitBounds(L.featureGroup(group).getBounds().pad(0.2)); } catch (e) {}
      }
    } catch (err) {
      el.innerHTML = mapErrorHtml;
    }
  });
  </script>`
    : '';

  return {
    title: 'الثقافة والتراث',
    active: '/culture',
    description: 'مستكشف التراث الثقافي الإماراتي — خريطة تفاعلية وعناصر منسّقة عبر ستة محاور ثقافية، موسومة بالمصدر ودرجة الثقة.',
    body,
    bodyEnd,
    head,
    useLeaflet: true,
  };
}
