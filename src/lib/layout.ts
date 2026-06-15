/** layout.ts — The page shell every route renders into. Arabic-first, RTL, dark default. */
import { NAV } from './ui.js';
import { icon } from './icons.js';
import { esc, num } from './i18n.js';
import { platformStats } from './db.js';

/** Query bag passed to page functions (all of Hono's c.req.query()). */
export type PageQuery = Record<string, string | undefined>;
/** A page function returns LayoutOpts; the server wraps it with layout(). */
export type PageResult = LayoutOpts;

export interface LayoutOpts {
  title: string;          // page <title> (without site suffix)
  active: string;         // active nav path, e.g. '/innovation'
  body: string;           // page HTML
  description?: string;   // meta description
  head?: string;          // extra <head> markup (page-specific CSS/links)
  bodyEnd?: string;       // extra scripts before </body>
  useLeaflet?: boolean;   // load Leaflet css/js
  useCharts?: boolean;    // load Chart.js
  chrome?: 'app' | 'public'; // 'app' = sidebar shell (default); 'public' = full-width marketing chrome
}

function sidebar(active: string, stats: Record<string, any>): string {
  const groups = NAV.map((g) => `
    <div class="nav-group-label">${esc(g.label)}</div>
    ${g.items.map((it) => {
      const isActive = it.path === '/' ? active === '/' : active.startsWith(it.path);
      const badge = it.badgeKey && stats[it.badgeKey] != null ? `<span class="nav-badge">${num(stats[it.badgeKey])}</span>` : '';
      return `<a class="nav-item ${isActive ? 'active' : ''}" href="${it.path}" ${isActive ? 'aria-current="page"' : ''}>${icon(it.icon)}<span>${esc(it.label)}</span>${badge}</a>`;
    }).join('')}
  `).join('');
  return `<aside class="sidebar" id="sidebar" aria-label="التنقل الرئيسي">
    <a class="brand" href="/">
      <span class="brand-mark">ع</span>
      <span>
        <span class="brand-name">منصة الإمارات للذكاء المفتوح</span><br>
        <span class="brand-sub">UAE Open Intelligence</span>
      </span>
    </a>
    <nav>${groups}</nav>
    <div class="sidebar-foot">
      <div class="live-pill mb-2"><span class="dot-status"></span> ${num(stats.totalRecords)} سجل بيانات حيّ</div>
      <div>الإصدار 0.1.0 · ${esc(stats.updated)}</div>
    </div>
  </aside>`;
}

/* ---- Public (marketing) chrome ---- */
function publicHeader(): string {
  return `<header class="mk-header" id="mkHeader">
    <div class="mk-bar">
      <a class="mk-brand" href="/">
        <span class="brand-mark">ع</span>
        <span><span class="brand-name">منصة الإمارات للذكاء المفتوح</span><span class="brand-sub">UAE Open Intelligence</span></span>
      </a>
      <nav class="mk-nav" aria-label="روابط الموقع">
        <a href="/#features">المميزات</a>
        <a href="/#observatories">المراصد</a>
        <a href="/#data">البيانات</a>
        <a href="/about">المنهجية</a>
        <a href="/api-hub">API</a>
      </nav>
      <div class="mk-actions">
        <button class="icon-btn" id="themeBtn" title="تبديل المظهر" aria-label="تبديل المظهر">${icon('moon')}</button>
        <a class="btn btn-primary btn-sm" href="/dashboard">${icon('play')} ادخل المنصة</a>
        <button class="icon-btn mk-burger" id="mkBurger" aria-label="القائمة" aria-expanded="false">${icon('menu')}</button>
      </div>
    </div>
    <nav class="mk-mobile-nav" id="mkMobileNav" hidden aria-label="قائمة الجوال">
      <a href="/#features">المميزات</a><a href="/#observatories">المراصد</a>
      <a href="/#data">البيانات</a><a href="/about">المنهجية</a><a href="/api-hub">API</a>
      <a class="btn btn-primary" href="/dashboard">ادخل المنصة</a>
    </nav>
  </header>`;
}

function publicFooter(stats: Record<string, any>): string {
  return `<footer class="mk-footer">
    <div class="mk-foot-grid">
      <div class="mk-foot-brand">
        <a class="mk-brand" href="/"><span class="brand-mark">ع</span>
          <span><span class="brand-name">منصة الإمارات للذكاء المفتوح</span><span class="brand-sub">UAE Open Intelligence</span></span></a>
        <p class="muted t-sm mt-3" style="max-width:42ch">مرصدٌ موحّد يحوّل البيانات المفتوحة في دولة الإمارات إلى تحليلات ومؤشرات ورسوم معرفية و APIs جاهزة.</p>
        <div class="live-pill mt-3"><span class="dot-status"></span> ${num(stats.totalRecords)} سجل بيانات حيّ · الإصدار 0.1.0</div>
      </div>
      <div class="mk-foot-col"><h3>المنصة</h3>
        <a href="/dashboard">لوحة القيادة</a><a href="/datasets">مرصد البيانات</a><a href="/innovation">مشاريع الابتكار</a><a href="/free-zones">المناطق الحرة</a></div>
      <div class="mk-foot-col"><h3>التحليل</h3>
        <a href="/skills">مرصد المهارات</a><a href="/culture">الثقافة والتراث</a><a href="/knowledge-graph">الرسم المعرفي</a><a href="/reports">التقارير</a></div>
      <div class="mk-foot-col"><h3>الموارد</h3>
        <a href="/api-hub">مركز الـ API</a><a href="/about">حول والمنهجية</a><a href="/datasets">تصدير البيانات</a><a href="/settings">الإعدادات</a></div>
    </div>
    <div class="mk-foot-bottom">
      <span>© 2026 منصة الإمارات للذكاء المفتوح · بيانات مفتوحة بترخيص CC BY 4.0 · الكود بترخيص MIT</span>
      <span class="muted">صُمّمت للأغراض البحثية والتعليمية — تحقّق من الأرقام الحرجة من المصادر الرسمية.</span>
    </div>
  </footer>`;
}

function topbar(title: string): string {
  return `<header class="topbar">
    <button class="icon-btn menu-btn" id="menuBtn" aria-label="القائمة" aria-controls="sidebar" aria-expanded="false">${icon('menu')}</button>
    <button class="cmdk-trigger" id="cmdkTrigger" aria-label="بحث">
      ${icon('search')}
      <span>ابحث في المنصة بأكملها…</span>
      <kbd>⌘K</kbd>
    </button>
    <div class="topbar-actions">
      <a class="icon-btn" href="/api-hub" title="مركز الـ API" aria-label="API">${icon('code')}</a>
      <a class="icon-btn" href="/reports" title="التقارير" aria-label="التقارير">${icon('report')}</a>
      <button class="icon-btn" id="themeBtn" title="تبديل المظهر" aria-label="تبديل المظهر">${icon('moon')}</button>
    </div>
  </header>`;
}

const cmdPalette = `
<div class="cmdk-overlay" id="cmdkOverlay" hidden>
  <div class="cmdk" role="dialog" aria-modal="true" aria-label="بحث شامل">
    <div class="cmdk-input-wrap">
      ${icon('search')}
      <input class="cmdk-input" id="cmdkInput" placeholder="ابحث عن مشاريع، مناطق حرة، مهارات، تراث…" autocomplete="off" />
      <kbd style="font-family:var(--font-mono);font-size:11px;color:var(--txt-2)">ESC</kbd>
    </div>
    <div class="cmdk-results" id="cmdkResults">
      <div class="cmdk-empty">ابدأ بالكتابة للبحث في 188+ سجلًا عبر جميع المراصد</div>
    </div>
  </div>
</div>`;

export function layout(o: LayoutOpts): string {
  const stats = platformStats();
  const desc = o.description ?? 'منصة الإمارات للذكاء المفتوح — مرصد بيانات ومركز تحليلات و API لبيانات الإمارات المفتوحة. Arabic-first UAE open-data intelligence platform.';
  const leafletCss = o.useLeaflet ? `<link rel="stylesheet" href="/static/vendor/leaflet.min.css">` : '';
  const isPublic = o.chrome === 'public';
  const inner = isPublic
    ? `${publicHeader()}
    <main class="mk-main" id="content">${o.body}</main>
    ${publicFooter(stats)}`
    : `<div class="app">
    ${sidebar(o.active, stats)}
    <div class="main">
      ${topbar(o.title)}
      <main class="content" id="content">${o.body}</main>
      <footer class="no-print" style="padding:var(--sp-5) var(--sp-6);border-top:1px solid var(--line);color:var(--txt-2);font-size:12.5px;display:flex;gap:var(--sp-4);flex-wrap:wrap;justify-content:space-between">
        <span>منصة الإمارات للذكاء المفتوح · بيانات مفتوحة بترخيص CC BY 4.0</span>
        <span class="flex gap-4"><a href="/api-hub">API</a><a href="/datasets">البيانات</a><a href="/reports">التقارير</a><a href="/about">حول المنصة</a></span>
      </footer>
    </div>
  </div>
  <div class="scrim" id="scrim" hidden></div>
  ${cmdPalette}`;
  return `<!doctype html>
<html lang="ar" dir="rtl" data-theme="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(o.title)} · منصة الإمارات للذكاء المفتوح</title>
  <meta name="description" content="${esc(desc)}">
  <meta name="theme-color" content="#06090f">
  <meta property="og:title" content="${esc(o.title)} · UAE Open Intelligence">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:type" content="website">
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%2300d68f'/%3E%3Ctext x='16' y='23' font-size='20' text-anchor='middle' fill='%23042015' font-family='sans-serif' font-weight='700'%3Eع%3C/text%3E%3C/svg%3E">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="/static/app.css">
  <!-- Fonts loaded async (non-render-blocking) — fallback stack renders instantly via display=swap -->
  <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Tajawal:wght@400;500;700&display=swap">
  <link rel="stylesheet" media="print" onload="this.media='all'" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Tajawal:wght@400;500;700&display=swap">
  <noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&family=Tajawal:wght@400;500;700&display=swap"><style>.reveal{opacity:1!important;transform:none!important}</style></noscript>
  ${leafletCss}
  ${o.head ?? ''}
</head>
<body class="${isPublic ? 'public' : ''}">
  ${inner}
  ${!isPublic ? `<script src="/static/vendor/htmx.min.js" defer></script>` : ''}
  ${o.useCharts ? `<script src="/static/vendor/chart.umd.min.js" defer></script>` : ''}
  ${o.useLeaflet ? `<script src="/static/vendor/leaflet.min.js" defer></script>` : ''}
  <script src="/static/app.js" defer></script>
  ${!isPublic ? `<script src="/static/vendor/alpine.min.js" defer></script>` : ''}
  ${o.bodyEnd ?? ''}
</body>
</html>`;
}
