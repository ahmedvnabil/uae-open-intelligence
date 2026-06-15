/** api.ts — Standard API response envelope (per engineering conventions). */
import type { Context } from 'hono';

export interface Meta { [k: string]: unknown }
export function ok(c: Context, data: unknown, meta: Meta = {}, status = 200) {
  c.status(status as any);
  return c.json({ ok: true, data, error: null, meta });
}
export function fail(c: Context, error: string, code = 'ERROR', status = 400) {
  c.status(status as any);
  return c.json({ ok: false, data: null, error, code });
}
/** Pagination metadata block. */
export function pageMeta(p: { page: number; limit: number; total: number; has_more: boolean }): Meta {
  return { page: p.page, limit: p.limit, total: p.total, has_more: p.has_more };
}
