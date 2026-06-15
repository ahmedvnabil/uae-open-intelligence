/** ui.ts — Shared render helpers + navigation config. All return HTML strings. */
import { icon } from './icons.js';
import { esc, num } from './i18n.js';

/* ---- Navigation (drives sidebar + command palette) ---- */
export interface NavItem { path: string; label: string; icon: string; badgeKey?: string }
export interface NavGroup { label: string; items: NavItem[] }
export const NAV: NavGroup[] = [
  { label: 'نظرة عامة', items: [
    { path: '/home', label: 'الرئيسية', icon: 'home' },
    { path: '/dashboard', label: 'لوحة القيادة', icon: 'dashboard' },
  ]},
  { label: 'مراصد البيانات', items: [
    { path: '/datasets', label: 'مرصد البيانات', icon: 'database', badgeKey: 'datasets' },
    { path: '/innovation', label: 'مشاريع الابتكار', icon: 'bulb', badgeKey: 'projects' },
    { path: '/free-zones', label: 'المناطق الحرة', icon: 'building', badgeKey: 'freezones' },
    { path: '/skills', label: 'مرصد المهارات', icon: 'brain', badgeKey: 'skills' },
    { path: '/culture', label: 'الثقافة والتراث', icon: 'landmark', badgeKey: 'culture' },
  ]},
  { label: 'التحليل والمعرفة', items: [
    { path: '/knowledge-graph', label: 'الرسم المعرفي', icon: 'graph' },
    { path: '/reports', label: 'مركز التقارير', icon: 'report' },
  ]},
  { label: 'المنصة والمطورون', items: [
    { path: '/api-hub', label: 'مركز الـ API', icon: 'code' },
    { path: '/about', label: 'حول والمنهجية', icon: 'info' },
    { path: '/settings', label: 'الإعدادات', icon: 'settings' },
  ]},
];

/* ---- Badges ---- */
export function badge(text: string, tone = '', dot = false): string {
  return `<span class="badge ${tone}">${dot ? '<span class="dot"></span>' : ''}${esc(text)}</span>`;
}

/* ---- Confidence meter (0..1) ---- */
export function confidence(v: number | null | undefined): string {
  const pct = Math.round((Number(v) || 0) * 100);
  return `<span class="conf" title="درجة الثقة في البيانات"><span class="bar"><span style="width:${pct}%"></span></span>${pct}%</span>`;
}

/* ---- Score bar (value out of max) ---- */
export function scoreBar(value: number, max = 10, gold = false): string {
  const pct = Math.max(0, Math.min(100, (Number(value) / max) * 100));
  return `<span class="meter ${gold ? 'gold' : ''}" title="${value}/${max}"><span style="width:${pct}%"></span></span>`;
}
export function scorePill(value: number): string {
  return `<span class="score-pill">${esc(value)}</span>`;
}

/* ---- KPI card ---- */
export interface KpiOpts { label: string; value: string | number; delta?: string; deltaDir?: 'up' | 'down' | ''; tone?: string; iconName?: string; glow?: boolean; sub?: string }
export function kpiCard(o: KpiOpts): string {
  return `<div class="panel kpi panel-hover" data-tone="${o.tone ?? 'green'}">
    <div class="kpi-top">${o.iconName ? icon(o.iconName) : ''}<span>${esc(o.label)}</span></div>
    <div class="kpi-value ${o.glow ? 'glow' : ''}">${esc(o.value)}</div>
    ${o.delta ? `<div class="kpi-delta ${o.deltaDir ?? ''}">${esc(o.delta)}</div>` : ''}
    ${o.sub ? `<div class="muted t-xs">${esc(o.sub)}</div>` : ''}
  </div>`;
}

/* ---- Section header ---- */
export interface SectionOpts { title: string; sub?: string; iconName?: string; actions?: string }
export function sectionHead(o: SectionOpts): string {
  return `<div class="section-head">
    <div class="titles">
      <div class="section-title">${o.iconName ? `<span class="accent flex">${icon(o.iconName)}</span>` : ''}${esc(o.title)}</div>
      ${o.sub ? `<div class="section-sub">${esc(o.sub)}</div>` : ''}
    </div>
    ${o.actions ? `<div class="actions">${o.actions}</div>` : ''}
  </div>`;
}

/* ---- Page header ---- */
export interface PageHeadOpts { eyebrow?: string; title: string; lede?: string; actions?: string }
export function pageHead(o: PageHeadOpts): string {
  return `<div class="page-head section-head">
    <div class="titles">
      ${o.eyebrow ? `<div class="page-eyebrow">${esc(o.eyebrow)}</div>` : ''}
      <h1 class="page-title">${esc(o.title)}</h1>
      ${o.lede ? `<p class="page-lede">${esc(o.lede)}</p>` : ''}
    </div>
    ${o.actions ? `<div class="actions">${o.actions}</div>` : ''}
  </div>`;
}

/* ---- Empty state ---- */
export function emptyState(text = 'لا توجد نتائج مطابقة', iconName = 'search'): string {
  return `<div class="empty">${icon(iconName)}<div>${esc(text)}</div></div>`;
}

/* ---- Pagination ---- */
export function pagination(p: { page: number; limit: number; total: number; has_more: boolean }, baseUrl: string): string {
  const pages = Math.ceil(p.total / p.limit);
  if (pages <= 1) return '';
  const join = baseUrl.includes('?') ? '&' : '?';
  const link = (pg: number, label: string, disabled: boolean) =>
    disabled ? `<span class="btn btn-sm" style="opacity:.4">${label}</span>` : `<a class="btn btn-sm" href="${esc(baseUrl)}${join}page=${pg}">${label}</a>`;
  return `<div class="flex items-center justify-center gap-3 mt-5">
    ${link(p.page - 1, 'السابق', p.page <= 1)}
    <span class="muted t-sm mono">${p.page} / ${pages} · ${num(p.total)} سجل</span>
    ${link(p.page + 1, 'التالي', !p.has_more)}
  </div>`;
}

/* ---- Copy button (uses app.js delegated handler) ---- */
export function copyBtn(text: string): string {
  return `<button class="icon-btn" data-copy="${esc(text)}" title="نسخ" aria-label="نسخ">${icon('copy')}</button>`;
}

/* ---- Export bar: CSV / JSON / Print. csv/json are download URLs; print uses window.print(). ---- */
export interface ExportOpts { csv?: string; json?: string; print?: boolean }
export function exportButtons(o: ExportOpts): string {
  const parts: string[] = [];
  if (o.csv) parts.push(`<a class="btn btn-sm" href="${esc(o.csv)}" download title="تنزيل CSV">${icon('download')} CSV</a>`);
  if (o.json) parts.push(`<a class="btn btn-sm" href="${esc(o.json)}" download title="تنزيل JSON">${icon('download')} JSON</a>`);
  if (o.print) parts.push(`<button class="btn btn-sm no-print" type="button" onclick="window.print()" title="طباعة / حفظ PDF">${icon('print')} طباعة</button>`);
  return parts.length ? `<div class="export-bar no-print">${parts.join('')}</div>` : '';
}

/* ---- The three interaction states ---- */
export function loadingState(text = 'جارٍ التحميل…'): string {
  return `<div class="state-block loading" role="status" aria-live="polite"><span class="spinner"></span><span>${esc(text)}</span></div>`;
}
export function errorState(text = 'تعذّر تحميل البيانات', retryAttr = ''): string {
  return `<div class="state-block error" role="alert">${icon('info')}<span>${esc(text)}</span>${retryAttr ? `<button class="btn btn-sm" ${retryAttr}>إعادة المحاولة</button>` : ''}</div>`;
}

/* ---- Unified filter bar (search + chip rows + selects + apply). Renders a <form method="get">. ---- */
export interface FilterChip { label: string; href: string; active?: boolean; count?: number }
export interface FilterSelect { name: string; label: string; value?: string; options: Array<{ value: string; label: string }> }
export interface FilterBarOpts {
  action?: string;            // form action (defaults to current path via "")
  q?: string;                 // current search value
  searchPlaceholder?: string;
  hidden?: Record<string, string | undefined>; // hidden fields to preserve (e.g. active category)
  chipGroups?: Array<{ label?: string; chips: FilterChip[] }>;
  selects?: FilterSelect[];
}
export function filterBar(o: FilterBarOpts): string {
  const hidden = Object.entries(o.hidden ?? {})
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `<input type="hidden" name="${esc(k)}" value="${esc(v!)}">`).join('');
  const selects = (o.selects ?? []).map((s) => `
    <label class="field-inline"><span class="muted t-xs">${esc(s.label)}</span>
      <select class="input" name="${esc(s.name)}" onchange="this.form.requestSubmit()">
        ${s.options.map((op) => `<option value="${esc(op.value)}" ${op.value === (s.value ?? '') ? 'selected' : ''}>${esc(op.label)}</option>`).join('')}
      </select></label>`).join('');
  const chipGroups = (o.chipGroups ?? []).map((g) => `
    <div class="chip-row">${g.label ? `<span class="muted t-xs filter-chip-label">${esc(g.label)}</span>` : ''}${g.chips.map((c) =>
      `<a class="chip ${c.active ? 'active' : ''}" href="${esc(c.href)}">${esc(c.label)}${c.count != null ? ` <span class="nav-badge">${num(c.count)}</span>` : ''}</a>`).join('')}</div>`).join('');
  return `<form class="panel panel-pad filters-panel" method="get" action="${esc(o.action ?? '')}" role="search">
    ${hidden}
    <div class="filters-top">
      <div class="search-box flex-1">${icon('search')}<input class="input" type="search" name="q" value="${esc(o.q ?? '')}" placeholder="${esc(o.searchPlaceholder ?? 'ابحث…')}" spellcheck="false"></div>
      ${selects}
      <button class="btn btn-primary" type="submit">${icon('filter')} تطبيق</button>
    </div>
    ${chipGroups ? `<div class="filters-chips">${chipGroups}</div>` : ''}
  </form>`;
}
