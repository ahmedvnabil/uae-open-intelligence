/** i18n.ts — formatting + escaping helpers (Arabic-first, Western digits with tabular numerals). */

/** Escape untrusted/dynamic strings before inserting into HTML (XSS-safe). */
export function esc(s: unknown): string {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
/** Escape a value for use inside a double-quoted HTML attribute. */
export const escAttr = esc;

/**
 * Serialize a value as JSON safe to embed inside an inline <script> block.
 * JSON.stringify does NOT escape `<`, `>`, `&`, U+2028/U+2029 — a `</script>`
 * substring in the data would terminate the script element. This neutralizes that.
 */
export function jsonScript(v: unknown): string {
  // No regex literals: a literal U+2028 in a regex is a line terminator (parse error).
  const LS = String.fromCharCode(0x2028), PS = String.fromCharCode(0x2029);
  return JSON.stringify(v)
    .split('<').join('\\u003c')
    .split('>').join('\\u003e')
    .split('&').join('\\u0026')
    .split(LS).join('\\u2028')
    .split(PS).join('\\u2029');
}

/** Allow only http(s) and relative URLs in hrefs; reject javascript:/data: schemes. */
export function safeUrl(u: unknown): string {
  const s = String(u ?? '');
  return /^(https?:\/\/|\/)/i.test(s) ? s : '#';
}

/** Group-separated integer, e.g. 34000 → "34,000". */
export function num(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return Number(n).toLocaleString('en-US');
}
/** AED currency, e.g. 34000 → "34,000 د.إ". */
export function aed(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return `${num(n)} د.إ`;
}
/** Compact, e.g. 11000000 → "11M". */
export function compact(n: number): string {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

export const COST_BAND_AR: Record<string, string> = { low: 'منخفضة', mid: 'متوسطة', high: 'مرتفعة' };
export const EMIRATE_AR: Record<string, string> = {
  'Dubai': 'دبي', 'Abu Dhabi': 'أبوظبي', 'Sharjah': 'الشارقة', 'Ras Al Khaimah': 'رأس الخيمة',
  'Ajman': 'عجمان', 'Fujairah': 'الفجيرة', 'Umm Al Quwain': 'أم القيوين', 'الإمارات': 'الإمارات',
};
export const LEVEL_AR: Record<string, string> = { Beginner: 'مبتدئ', Intermediate: 'متوسط', Advanced: 'متقدم' };
export const CATEGORY_AR: Record<string, string> = {
  Business: 'الأعمال', Culture: 'الثقافة', Tourism: 'السياحة', Heritage: 'التراث', AI: 'الذكاء الاصطناعي',
  SME: 'الشركات الصغيرة', 'Real Estate': 'العقارات', Innovation: 'الابتكار', Economy: 'الاقتصاد', Education: 'التعليم',
};

/** Deterministic accent color per sector/key — used across charts & badges. */
const PALETTE = ['#00d68f', '#4cc2ff', '#f5c451', '#9d8bff', '#ff5d6c', '#f0992b', '#2dd4bf', '#a3e635', '#fb7185', '#60a5fa', '#c084fc', '#34d399', '#fbbf24', '#f472b6'];
export function colorFor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length]!;
}
export const CHART_PALETTE = PALETTE;
