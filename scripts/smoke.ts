/**
 * smoke.ts — Boot the server on a test port and assert every page + key API route.
 * Usage: npm test   (exits non-zero on any failure)
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 3099;
const BASE = `http://localhost:${PORT}`;

const PAGES: Array<[string, string]> = [
  ['/', 'ادخل المنصة'],
  ['/home', 'الرئيسية'],
  ['/about', 'المنهجية'],
  ['/dashboard', 'لوحة القيادة'],
  ['/datasets', 'مرصد البيانات'],
  ['/datasets/innovation-projects', 'مشاريع'],
  ['/free-zones', 'المناطق الحرة'],
  ['/free-zones/dmcc', 'دبي'],
  ['/innovation', 'الابتكار'],
  ['/skills', 'مهارات'],
  ['/culture', 'التراث'],
  ['/knowledge-graph', 'الرسم المعرفي'],
  ['/reports', 'التقارير'],
  ['/api-hub', 'API'],
  ['/settings', 'الإعدادات'],
];
const APIS = [
  '/api/v1/stats', '/api/v1/projects?limit=2', '/api/v1/projects/facets',
  '/api/v1/free-zones?limit=2', '/api/v1/free-zones/facets', '/api/v1/skills',
  '/api/v1/observatory', '/api/v1/culture', '/api/v1/culture/themes',
  '/api/v1/datasets', '/api/v1/categories', '/api/v1/graph', '/api/v1/search?q=%D8%AF%D8%A8%D9%8A',
  '/healthz',
];

async function waitForServer(timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try { const r = await fetch(`${BASE}/healthz`); if (r.ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

const server = spawn('node', ['--import', 'tsx', join(ROOT, 'src', 'server.ts')], {
  cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: ['ignore', 'pipe', 'pipe'],
});
let serverLog = '';
server.stdout.on('data', (d) => (serverLog += d));
server.stderr.on('data', (d) => (serverLog += d));

let pass = 0, fail = 0;
const fails: string[] = [];
function check(name: string, ok: boolean, detail = '') {
  if (ok) { pass++; }
  else { fail++; fails.push(`${name}${detail ? ' — ' + detail : ''}`); }
  console.log(`  ${ok ? '✓' : '✗'} ${name}${ok || !detail ? '' : ' — ' + detail}`);
}

try {
  if (!(await waitForServer())) { console.error('Server did not start.\n' + serverLog); process.exit(1); }
  console.log('\nPAGES');
  for (const [path, marker] of PAGES) {
    try {
      const r = await fetch(`${BASE}${path}`);
      const body = await r.text();
      check(path, r.status === 200 && body.includes('</html>') && body.includes(marker), `status ${r.status}${body.includes(marker) ? '' : ', missing marker'}`);
    } catch (e: any) { check(path, false, e.message); }
  }
  console.log('\nAPI');
  for (const path of APIS) {
    try {
      const r = await fetch(`${BASE}${path}`);
      const j = await r.json() as any;
      check(path, r.status === 200 && (j.ok === true || j.status === 'healthy'), `status ${r.status}`);
    } catch (e: any) { check(path, false, e.message); }
  }
  console.log('\nEXPORTS');
  for (const path of ['/api/v1/export/projects.csv', '/api/v1/export/free-zones.json', '/api/v1/export/culture.csv']) {
    try {
      const r = await fetch(`${BASE}${path}`);
      const body = await r.text();
      const dispo = r.headers.get('content-disposition') || '';
      check(path, r.status === 200 && body.length > 50 && dispo.includes('attachment'), `status ${r.status}`);
    } catch (e: any) { check(path, false, e.message); }
  }

  console.log('\n404 handling');
  try { const r = await fetch(`${BASE}/does-not-exist`); check('/does-not-exist → 404', r.status === 404); } catch (e: any) { check('404', false, e.message); }
} finally {
  server.kill('SIGTERM');
}

console.log(`\n${fail === 0 ? '✅' : '❌'} ${pass} passed, ${fail} failed`);
if (fail) { console.log('Failures:\n  - ' + fails.join('\n  - ')); process.exit(1); }
process.exit(0);
