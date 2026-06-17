/** server.ts — Hono application: static assets, security headers, rate limiting, pages + API. */
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { layout, type LayoutOpts } from './lib/layout.js';
import { icon } from './lib/icons.js';
import api from './routes/api.js';

import { landingPage } from './pages/landing.js';
import { homePage } from './pages/home.js';
import { aboutPage } from './pages/about.js';
import { dashboardPage } from './pages/dashboard.js';
import { datasetsPage, datasetDetailPage } from './pages/datasets.js';
import { freeZonesPage, freeZoneDetailPage } from './pages/free-zones.js';
import { innovationPage, projectDetailPage } from './pages/innovation.js';
import { skillsPage } from './pages/skills.js';
import { culturePage } from './pages/culture.js';
import { knowledgeGraphPage } from './pages/knowledge-graph.js';
import { reportsPage } from './pages/reports.js';
import { apiHubPage } from './pages/api-hub.js';
import { settingsPage } from './pages/settings.js';

const app = new Hono();

/* ---- Security headers ---- */
app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
  c.header('X-DNS-Prefetch-Control', 'off');
  c.header('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://um.zad.tools",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com",
    "connect-src 'self' https://um.zad.tools",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '));
});

/* ---- Lightweight in-memory rate limiter for the API ---- */
const hits = new Map<string, { n: number; reset: number }>();
const RATE_LIMIT = 240, RATE_WINDOW = 60_000;
app.use('/api/*', async (c, next) => {
  const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || c.req.header('x-real-ip') || 'local';
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now > rec.reset) hits.set(ip, { n: 1, reset: now + RATE_WINDOW });
  else if (++rec.n > RATE_LIMIT) {
    c.header('Retry-After', String(Math.ceil((rec.reset - now) / 1000)));
    c.status(429);
    return c.json({ ok: false, data: null, error: 'تم تجاوز حد الطلبات. حاول لاحقًا.', code: 'RATE_LIMITED' });
  }
  c.header('Access-Control-Allow-Origin', '*');
  await next();
});

/* ---- Static assets ---- */
app.use('/static/*', serveStatic({ root: './public' }));
app.use('/img/*', serveStatic({ root: './public' }));
app.get('/robots.txt', (c) => c.text('User-agent: *\nAllow: /\n'));
app.get('/healthz', (c) => c.json({ ok: true, status: 'healthy' }));

/* ---- API ---- */
app.route('/api/v1', api);

/* ---- Page render helper ---- */
const render = (c: any, r: LayoutOpts) => c.html(layout(r));
function detail(c: any, r: LayoutOpts | null) {
  return r ? c.html(layout(r)) : c.notFound();
}

/* ---- Pages (the 12 required routes + detail pages) ---- */
app.get('/', (c) => render(c, landingPage()));
app.get('/home', (c) => render(c, homePage()));
app.get('/about', (c) => render(c, aboutPage()));
app.get('/dashboard', (c) => render(c, dashboardPage()));
app.get('/datasets', (c) => render(c, datasetsPage(c.req.query())));
app.get('/datasets/:id', (c) => detail(c, datasetDetailPage(c.req.param('id'))));
app.get('/free-zones', (c) => render(c, freeZonesPage(c.req.query())));
app.get('/free-zones/:id', (c) => detail(c, freeZoneDetailPage(c.req.param('id'))));
app.get('/innovation', (c) => render(c, innovationPage(c.req.query())));
app.get('/innovation/:id', (c) => detail(c, projectDetailPage(c.req.param('id'))));
app.get('/skills', (c) => render(c, skillsPage(c.req.query())));
app.get('/culture', (c) => render(c, culturePage(c.req.query())));
app.get('/knowledge-graph', (c) => render(c, knowledgeGraphPage()));
app.get('/reports', (c) => render(c, reportsPage(c.req.query())));
app.get('/api-hub', (c) => render(c, apiHubPage()));
app.get('/settings', (c) => render(c, settingsPage()));

/* ---- 404 ---- */
app.notFound((c) => {
  c.status(404);
  return c.html(layout({
    title: 'الصفحة غير موجودة', active: '',
    body: `<div class="empty" style="padding:var(--sp-8) 0">
      ${icon('compass', '')}
      <h1 class="page-title">404 — لم نعثر على هذه الصفحة</h1>
      <p class="page-lede" style="margin-inline:auto">قد يكون الرابط قديمًا أو غير صحيح. عُد إلى الصفحة الرئيسية أو استخدم البحث الشامل.</p>
      <div class="flex gap-3 justify-center mt-5"><a class="btn btn-primary" href="/">العودة للرئيسية</a><a class="btn" href="/datasets">مرصد البيانات</a></div>
    </div>`,
  }));
});

/* ---- Error handler ---- */
app.onError((err, c) => {
  console.error('[error]', err);
  c.status(500);
  return c.html(layout({
    title: 'خطأ في الخادم', active: '',
    body: `<div class="empty" style="padding:var(--sp-8) 0"><h1 class="page-title">500 — خطأ غير متوقع</h1>
      <p class="page-lede" style="margin-inline:auto">حدث خطأ أثناء معالجة طلبك. حاول مرة أخرى.</p>
      <div class="flex justify-center mt-5"><a class="btn btn-primary" href="/">العودة للرئيسية</a></div></div>`,
  }));
});

const port = Number(process.env.PORT) || 3000;
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`\n  ▶ UAE Open Intelligence Platform`);
  console.log(`  ▶ http://localhost:${info.port}\n`);
});

export default app;
