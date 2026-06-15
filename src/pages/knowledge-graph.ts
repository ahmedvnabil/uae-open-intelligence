/** knowledge-graph.ts — Interactive force-directed knowledge graph (Neo4j Bloom / Obsidian style). */
import type { LayoutOpts } from '../lib/layout.js';
import { icon } from '../lib/icons.js';
import { jsonScript, esc, num, CHART_PALETTE } from '../lib/i18n.js';
import { pageHead, kpiCard, exportButtons, loadingState, errorState } from '../lib/ui.js';
import { getGraph, getGraphTypes } from '../lib/db.js';

/** Arabic labels per node type. */
const TYPE_AR: Record<string, string> = {
  emirate: 'إمارة',
  sector: 'قطاع',
  freezone: 'منطقة حرة',
  fzsector: 'قطاع منطقة حرة',
  project: 'مشروع',
  skillcat: 'فئة مهارة',
};

/** Fixed color per node type, drawn deterministically from CHART_PALETTE. */
const TYPE_COLOR: Record<string, string> = {
  emirate: CHART_PALETTE[2]!,   // gold
  sector: CHART_PALETTE[0]!,    // emerald
  freezone: CHART_PALETTE[1]!,  // blue
  fzsector: CHART_PALETTE[3]!,  // violet
  project: CHART_PALETTE[4]!,   // red/coral
  skillcat: CHART_PALETTE[6]!,  // teal
};

const TYPE_ICON: Record<string, string> = {
  emirate: 'pin', sector: 'layers', freezone: 'building', fzsector: 'grid', project: 'bulb', skillcat: 'brain',
};

/** Arabic labels per edge relation. */
const EDGE_AR: Record<string, string> = {
  LOCATED_IN: 'يقع في',
  SUPPORTS: 'يدعم',
  IMPLEMENTED_IN: 'يُنفَّذ في',
  BELONGS_TO: 'ينتمي إلى',
};

export function knowledgeGraphPage(): LayoutOpts {
  const graph = getGraph();
  const types = getGraphTypes() as Array<{ type: string; count: number }>;
  const { nodes, edges, stats } = graph;

  // Edge relation breakdown for the inspector strip.
  const relCounts = new Map<string, number>();
  for (const e of edges) relCounts.set(e.type, (relCounts.get(e.type) ?? 0) + 1);
  const rels = [...relCounts.entries()].sort((a, b) => b[1] - a[1]);

  // Most-connected hubs (degree centrality) for the side panel.
  const deg = new Map<string, number>();
  for (const e of edges) { deg.set(e.source, (deg.get(e.source) ?? 0) + 1); deg.set(e.target, (deg.get(e.target) ?? 0) + 1); }
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const hubs = [...deg.entries()]
    .map(([id, d]) => ({ node: nodeById.get(id), degree: d }))
    .filter((h) => h.node)
    .sort((a, b) => b.degree - a.degree)
    .slice(0, 8);

  const legendItems = types
    .map((t) => `<span class="lg kg-legend-item" data-lg-type="${esc(t.type)}" title="${esc(t.count)} عقدة">
        <span class="sw" style="background:${TYPE_COLOR[t.type] ?? '#888'}"></span>
        ${esc(TYPE_AR[t.type] ?? t.type)} <span class="muted mono">${esc(t.count)}</span>
      </span>`).join('');

  const filterChips = types
    .map((t) => `<button class="chip active kg-chip" data-type="${esc(t.type)}" aria-pressed="true">
        ${icon(TYPE_ICON[t.type] ?? 'grid')}
        ${esc(TYPE_AR[t.type] ?? t.type)}
        <span class="nav-badge">${esc(t.count)}</span>
      </button>`).join('');

  const relRows = rels
    .map(([rel, c]) => `<div class="flex items-center justify-between t-sm kg-rel-row">
        <span class="flex items-center gap-2"><span class="kg-rel-dot"></span>${esc(EDGE_AR[rel] ?? rel)} <span class="muted mono t-xs">${esc(rel)}</span></span>
        <span class="mono fw-6">${num(c)}</span>
      </div>`).join('');

  const hubRows = hubs
    .map((h) => {
      const n = h.node!;
      const c = TYPE_COLOR[n.type] ?? '#888';
      return `<button class="kg-hub" data-focus="${esc(n.id)}" title="ركّز على هذه العقدة">
        <span class="kg-hub-dot" style="background:${c};box-shadow:0 0 10px -2px ${c}"></span>
        <span class="flex-1 truncate t-sm fw-6 start">${esc(n.label)}</span>
        <span class="tag flex-none">${esc(TYPE_AR[n.type] ?? n.type)}</span>
        <span class="score-pill flex-none">${num(h.degree)}</span>
      </button>`;
    }).join('');

  const body = `
  ${pageHead({
    eyebrow: 'التحليل والمعرفة · KNOWLEDGE GRAPH',
    title: 'الرسم المعرفي',
    lede: 'شبكةٌ تفاعلية تربط الإمارات السبع بالمناطق الحرة والقطاعات الاقتصادية ومشاريع الابتكار وفئات المهارات — محاكاة قوى فيزيائية حيّة على لوحة رسم، مع تكبير وتحريك واستكشاف للجيران.',
    actions: `<span class="live-pill"><span class="dot-status"></span> محاكاة حيّة</span>
      ${exportButtons({ json: '/api/v1/graph', print: false })}`,
  })}

  <div class="kpi-grid mb-5">
    ${kpiCard({ label: 'إجمالي العقد', value: num(stats.nodes), sub: 'كيانات مترابطة', tone: 'green', iconName: 'graph', glow: true })}
    ${kpiCard({ label: 'إجمالي الروابط', value: num(stats.edges), sub: 'علاقات بين الكيانات', tone: 'blue', iconName: 'route' })}
    ${kpiCard({ label: 'أنواع العقد', value: num(types.length), sub: 'طبقات معرفية', tone: 'violet', iconName: 'layers' })}
    ${kpiCard({ label: 'أنواع العلاقات', value: num(rels.length), sub: 'دلالات الربط', tone: 'gold', iconName: 'zap' })}
  </div>

  <div class="kg-shell mb-5">
    <!-- ============ GRAPH CANVAS ============ -->
    <div class="panel kg-canvas-panel reveal">
      <div class="kg-toolbar">
        <div class="flex items-center gap-2 flex-wrap" style="flex:1;min-width:0">
          <span class="badge green"><span class="dot"></span> <span id="kgVisNodes">${num(stats.nodes)}</span> عقدة</span>
          <span class="badge blue"><span class="dot"></span> <span id="kgVisEdges">${num(stats.edges)}</span> رابط</span>
          <span class="muted t-xs mono" id="kgZoomLabel" style="margin-inline-start:6px">100%</span>
        </div>
        <div class="kg-toolbar-actions flex items-center gap-2">
          <div class="pill-toggle">
            <button id="kgLabelsBtn" class="active" title="إظهار التسميات">التسميات</button>
            <button id="kgPlayBtn" title="تشغيل/إيقاف المحاكاة">إعادة الترتيب</button>
          </div>
          <button class="icon-btn" id="kgZoomIn" title="تكبير" aria-label="تكبير">${icon('arrowUR')}</button>
          <button class="icon-btn" id="kgZoomOut" title="تصغير" aria-label="تصغير">${icon('search')}</button>
          <button class="icon-btn" id="kgReset" title="إعادة التوسيط" aria-label="إعادة التوسيط">${icon('target')}</button>
        </div>
      </div>

      <div class="kg-canvas-wrap" id="kgCanvasWrap" role="img" aria-label="رسم معرفي تفاعلي يربط إمارات الدولة والمناطق الحرة والقطاعات ومشاريع الابتكار وفئات مهارات الذكاء الاصطناعي. تتوفر العلاقات نصيًا في لوحة «أكثر العقد ترابطًا» المجاورة.">
        <canvas id="kgCanvas"></canvas>
        <div class="kg-canvas-state" id="kgCanvasState">${loadingState('جارٍ بناء الشبكة المعرفية…')}</div>
        <div class="kg-tooltip" id="kgTooltip" hidden></div>
        <div class="kg-hint">
          ${icon('compass')} اسحب الخلفية للتحريك · عجلة الفأرة للتكبير · اسحب عقدة لتثبيتها · مرّر للإبراز · انقر للفتح
        </div>
      </div>

      <div class="kg-legend-bar">
        <div class="legend">${legendItems}</div>
      </div>
    </div>

    <!-- ============ INSPECTOR / SIDE PANEL ============ -->
    <div class="kg-side flex flex-col gap-4">
      <div class="panel panel-pad reveal" style="--d:60ms">
        <div class="section-title t-lg mb-3">${icon('filter')} تصفية الطبقات</div>
        <div class="chip-row" id="kgChips">${filterChips}</div>
        <div class="flex gap-2 mt-3">
          <button class="btn btn-sm flex-1" id="kgAll">إظهار الكل</button>
          <button class="btn btn-sm flex-1" id="kgNone">إخفاء الكل</button>
        </div>
      </div>

      <div class="panel panel-pad reveal" id="kgInspector" style="--d:120ms">
        <div class="section-title t-lg mb-2">${icon('info')} المُفتّش</div>
        <div id="kgInspectorBody" class="muted t-sm">
          مرّر فوق عقدة أو انقرها لعرض تفاصيلها وجيرانها هنا.
        </div>
      </div>

      <div class="panel panel-pad reveal" style="--d:180ms">
        <div class="section-title t-lg mb-3">${icon('target')} أكثر العقد ترابطًا</div>
        <div class="flex flex-col gap-1" id="kgHubs">${hubRows}</div>
      </div>

      <div class="panel panel-pad reveal" style="--d:240ms">
        <div class="section-title t-lg mb-3">${icon('route')} أنواع العلاقات</div>
        <div class="flex flex-col gap-2">${relRows}</div>
      </div>
    </div>
  </div>

  <!-- ============ EXPLAINER ============ -->
  <div class="panel panel-pad reveal" style="background:linear-gradient(135deg,var(--accent-soft),transparent);border-color:var(--accent-line)">
    <div class="section-title mb-3">${icon('book')} ماذا يُظهر هذا الرسم؟</div>
    <p class="muted-1" style="max-width:80ch;line-height:1.85">
      يربط الرسم المعرفي بين خمس طبقات من بيانات الإمارات المفتوحة في شبكةٍ واحدة:
      <span class="accent fw-6">الإمارات السبع</span> ترتبط بـ<span class="accent fw-6">المناطق الحرة</span> الواقعة فيها
      (علاقة «يقع في»)، وكلُّ منطقةٍ حرة تدعم مجموعةً من <span class="accent fw-6">قطاعات الأعمال</span> (علاقة «يدعم»)،
      بينما تنتمي <span class="accent fw-6">مشاريع الابتكار</span> إلى <span class="accent fw-6">القطاعات الاقتصادية</span> (علاقة «ينتمي إلى») وتُنفَّذ في إماراتٍ بعينها (علاقة «يُنفَّذ في»)،
      وتُكمِل <span class="accent fw-6">فئات المهارات</span> الصورة بربطها بالقطاعات. كلما زاد حجم العقدة دلّ ذلك على وزنٍ ومركزيةٍ أعلى داخل الشبكة.
    </p>
    <div class="kg-flow mt-4">
      ${flowPill('pin', 'إمارة', 'gold')}
      ${flowArrow('يقع فيها')}
      ${flowPill('building', 'منطقة حرة', 'blue')}
      ${flowArrow('تدعم')}
      ${flowPill('grid', 'قطاع منطقة حرة', 'violet')}
      ${flowArrow('·')}
      ${flowPill('layers', 'قطاع', 'green')}
      ${flowArrow('ينتمي إليه')}
      ${flowPill('bulb', 'مشروع', 'red')}
    </div>
  </div>`;

  const head = `<style>
    .kg-shell { display: grid; grid-template-columns: 1fr 340px; gap: var(--sp-4); align-items: start; }

    .kg-canvas-panel { padding: 0; overflow: hidden; }
    .kg-toolbar { display: flex; align-items: center; gap: var(--sp-3); padding: var(--sp-3) var(--sp-4); border-bottom: 1px solid var(--line); flex-wrap: wrap; }
    .kg-toolbar-actions { margin-inline-start: auto; }

    .kg-canvas-wrap { position: relative; height: 620px; cursor: grab; background:
        radial-gradient(60% 60% at 50% 40%, rgba(0,214,143,.05), transparent 70%),
        repeating-linear-gradient(0deg, transparent, transparent 43px, var(--line) 43px, var(--line) 44px),
        repeating-linear-gradient(90deg, transparent, transparent 43px, var(--line) 43px, var(--line) 44px); }
    .kg-canvas-wrap.grabbing { cursor: grabbing; }
    .kg-canvas-wrap canvas { display: block; width: 100%; height: 100%; }
    @media (max-width: 720px) { .kg-canvas-wrap { height: 460px; } }

    /* Loading / error overlay centered over the canvas; sits above the grid bg, below tooltip (z:5). */
    .kg-canvas-state { position: absolute; inset: 0; z-index: 4; display: flex; align-items: center; justify-content: center;
      pointer-events: none; background: var(--bg-1); }
    .kg-canvas-state:empty { display: none; }
    .kg-canvas-state .state-block { pointer-events: auto; background: var(--glass-bg); backdrop-filter: blur(8px);
      border: 1px solid var(--line); border-radius: var(--r-md); padding: var(--sp-4) var(--sp-5); }

    /* Mobile: side panel stacks ABOVE the canvas so filters lead, canvas stays full-width and usable. */
    @media (max-width: 1100px) {
      .kg-shell { grid-template-columns: 1fr; }
      .kg-shell .kg-side { order: -1; }
    }
    @media (max-width: 720px) { .kg-toolbar-actions { margin-inline-start: 0; } }

    .kg-hint { position: absolute; inset-block-end: 10px; inset-inline-start: 10px; display: flex; align-items: center; gap: 6px;
      font-size: 11px; color: var(--txt-2); background: var(--glass-bg); backdrop-filter: blur(8px); padding: 6px 11px; border-radius: var(--r-pill);
      border: 1px solid var(--line); pointer-events: none; max-width: calc(100% - 20px); }
    .kg-hint svg { width: 14px; height: 14px; flex: none; color: var(--accent); }

    .kg-tooltip { position: absolute; z-index: 5; pointer-events: none; background: var(--bg-1); border: 1px solid var(--line-strong);
      border-radius: var(--r-md); padding: 8px 11px; box-shadow: var(--e-2); max-width: 260px; transform: translate(-50%, calc(-100% - 14px)); }
    .kg-tooltip .tt-type { font-size: 10.5px; text-transform: uppercase; letter-spacing: .06em; color: var(--txt-2); display: flex; align-items: center; gap: 5px; }
    .kg-tooltip .tt-type .tt-sw { width: 8px; height: 8px; border-radius: 99px; }
    .kg-tooltip .tt-label { font-size: 13.5px; font-weight: 700; color: var(--txt-0); margin-top: 3px; line-height: 1.35; }
    .kg-tooltip .tt-meta { font-size: 11px; color: var(--txt-2); margin-top: 4px; }

    .kg-legend-bar { padding: var(--sp-3) var(--sp-4); border-top: 1px solid var(--line); }
    .kg-legend-item { cursor: pointer; user-select: none; padding: 2px 6px; border-radius: 6px; transition: background var(--t-fast), opacity var(--t-fast); }
    .kg-legend-item:hover { background: var(--bg-3); }
    .kg-legend-item.off { opacity: .35; }

    .kg-chip svg { width: 14px; height: 14px; }
    .kg-chip:not(.active) { opacity: .5; }
    .kg-chip:not(.active) .nav-badge { opacity: .6; }

    .kg-hub { display: flex; align-items: center; gap: var(--sp-2); padding: 7px var(--sp-2); border-radius: var(--r-md);
      background: transparent; border: 1px solid transparent; cursor: pointer; text-align: start; font-family: inherit; transition: all var(--t-fast); }
    .kg-hub:hover { background: var(--bg-3); border-color: var(--line); }
    .kg-hub-dot { width: 9px; height: 9px; border-radius: 99px; flex: none; }

    .kg-rel-row { padding: 4px 0; }
    .kg-rel-dot { width: 7px; height: 7px; border-radius: 99px; background: var(--accent); flex: none; }

    #kgInspectorBody .ib-row { display: flex; align-items: center; gap: var(--sp-2); padding: 5px 0; border-bottom: 1px solid var(--line); }
    #kgInspectorBody .ib-row:last-child { border-bottom: none; }
    #kgInspectorBody .ib-neighbors { margin-top: var(--sp-2); display: flex; flex-direction: column; gap: 3px; max-height: 220px; overflow-y: auto; }
    #kgInspectorBody .ib-neighbor { display: flex; align-items: center; gap: 7px; font-size: 12px; padding: 4px 6px; border-radius: 6px; }
    #kgInspectorBody .ib-neighbor:hover { background: var(--bg-3); }
    #kgInspectorBody .ib-dot { width: 8px; height: 8px; border-radius: 99px; flex: none; }
    #kgInspectorBody .ib-open { color: var(--accent); font-weight: 600; display: inline-flex; align-items: center; gap: 4px; margin-top: var(--sp-3); }

    .kg-flow { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .kg-flow-pill { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 600; padding: 6px 13px; border-radius: var(--r-pill); border: 1px solid var(--line); }
    .kg-flow-pill svg { width: 14px; height: 14px; }
    .kg-flow-arrow { font-size: 11px; color: var(--txt-2); display: inline-flex; align-items: center; gap: 4px; }
    .kg-flow-arrow::before { content: ""; width: 18px; height: 1px; background: var(--line-strong); display: inline-block; }
  </style>`;

  const palette = {
    typeColor: TYPE_COLOR,
    typeAr: TYPE_AR,
    edgeAr: EDGE_AR,
    bg1: '#0a0f18', txt0: '#eef3fa', txt2: '#7e8da3', line: 'rgba(148,170,200,0.16)', accent: '#00d68f',
  };

  const bodyEnd = `<script>
  document.addEventListener('DOMContentLoaded', function () {
    var GRAPH = ${jsonScript({ nodes, edges })};
    var PAL = ${jsonScript(palette)};
    var ERROR_HTML = ${jsonScript(errorState('تعذّر عرض الرسم المعرفي. حاول تحديث الصفحة.'))};

    var stateEl = document.getElementById('kgCanvasState');
    function clearState() { if (stateEl) stateEl.innerHTML = ''; }
    function failState() { if (stateEl) { stateEl.innerHTML = ERROR_HTML; stateEl.style.pointerEvents = 'auto'; } }

   try {
    var wrap = document.getElementById('kgCanvasWrap');
    var canvas = document.getElementById('kgCanvas');
    var tooltip = document.getElementById('kgTooltip');
    var inspectorBody = document.getElementById('kgInspectorBody');
    if (!canvas || !wrap) { clearState(); return; }
    var ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas 2d context unavailable');

    // ---------- Build node/edge models ----------
    var nodeIndex = {};
    var W0 = wrap.clientWidth || 800, H0 = wrap.clientHeight || 620;
    var nodes = GRAPH.nodes.map(function (n, i) {
      // seed positions on a loose spiral so the sim untangles cleanly
      var ang = i * 2.399, rad = 18 + 14 * Math.sqrt(i);
      var node = {
        id: n.id, label: n.label, type: n.type, weight: n.weight || 1, meta: n.meta || null,
        x: W0 / 2 + Math.cos(ang) * rad, y: H0 / 2 + Math.sin(ang) * rad,
        vx: 0, vy: 0, r: 4 + Math.sqrt(n.weight || 1) * 3.4, fixed: false, deg: 0,
      };
      nodeIndex[n.id] = node;
      return node;
    });
    var edges = GRAPH.edges.map(function (e) {
      var s = nodeIndex[e.source], t = nodeIndex[e.target];
      if (s) s.deg++; if (t) t.deg++;
      return { s: s, t: t, type: e.type };
    }).filter(function (e) { return e.s && e.t; });
    nodes.forEach(function (n) { n.r += Math.min(6, n.deg * 0.5); });

    // adjacency for neighbor highlight
    var adj = {};
    nodes.forEach(function (n) { adj[n.id] = {}; });
    edges.forEach(function (e) { adj[e.s.id][e.t.id] = e.type; adj[e.t.id][e.s.id] = e.type; });

    // ---------- View transform ----------
    var view = { x: 0, y: 0, scale: 1 };
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    function resize() {
      var w = wrap.clientWidth, h = wrap.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    }
    resize();
    window.addEventListener('resize', function () { resize(); draw(); });

    // ---------- State ----------
    var active = {};  // visible types
    GRAPH.nodes.forEach(function (n) { active[n.type] = true; });
    var hovered = null, selected = null, showLabels = true;
    var alpha = 1;            // simulation "temperature"
    var dragNode = null, panning = false, lastPX = 0, lastPY = 0, moved = false;

    function visible(n) { return active[n.type]; }

    // ---------- Force simulation ----------
    function tick() {
      if (alpha < 0.01) return;
      var vis = nodes.filter(visible);
      var cx = wrap.clientWidth / 2, cy = wrap.clientHeight / 2;
      // gravity toward center
      for (var i = 0; i < vis.length; i++) {
        var n = vis[i];
        n.vx += (cx - n.x) * 0.0009 * alpha;
        n.vy += (cy - n.y) * 0.0009 * alpha;
      }
      // repulsion (O(n^2), fine at ~209 nodes) with cutoff
      for (var a = 0; a < vis.length; a++) {
        var na = vis[a];
        for (var b = a + 1; b < vis.length; b++) {
          var nb = vis[b];
          var dx = na.x - nb.x, dy = na.y - nb.y;
          var d2 = dx * dx + dy * dy;
          if (d2 > 90000) continue;        // distance cutoff (~300px)
          if (d2 < 1) { d2 = 1; dx = Math.random() - 0.5; dy = Math.random() - 0.5; }
          var dist = Math.sqrt(d2);
          var force = (2600 * alpha) / d2;
          var fx = (dx / dist) * force, fy = (dy / dist) * force;
          na.vx += fx; na.vy += fy; nb.vx -= fx; nb.vy -= fy;
        }
      }
      // spring attraction along edges
      for (var e = 0; e < edges.length; e++) {
        var ed = edges[e];
        if (!visible(ed.s) || !visible(ed.t)) continue;
        var ddx = ed.t.x - ed.s.x, ddy = ed.t.y - ed.s.y;
        var len = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
        var target = 78;
        var k = (len - target) * 0.015 * alpha;
        var ux = (ddx / len) * k, uy = (ddy / len) * k;
        ed.s.vx += ux; ed.s.vy += uy; ed.t.vx -= ux; ed.t.vy -= uy;
      }
      // integrate + damping
      for (var j = 0; j < vis.length; j++) {
        var nd = vis[j];
        if (nd.fixed || nd === dragNode) { nd.vx = 0; nd.vy = 0; continue; }
        nd.vx *= 0.86; nd.vy *= 0.86;
        nd.x += nd.vx; nd.y += nd.vy;
      }
      alpha *= 0.992;          // cool down
    }

    // ---------- Coordinate helpers ----------
    function toScreen(n) { return { x: n.x * view.scale + view.x, y: n.y * view.scale + view.y }; }
    function toWorld(px, py) { return { x: (px - view.x) / view.scale, y: (py - view.y) / view.scale }; }
    function nodeAt(px, py) {
      var w = toWorld(px, py), best = null, bestD = Infinity;
      for (var i = nodes.length - 1; i >= 0; i--) {
        var n = nodes[i];
        if (!visible(n)) continue;
        var dx = n.x - w.x, dy = n.y - w.y, d = dx * dx + dy * dy;
        var rr = (n.r + 4) * (n.r + 4);
        if (d <= rr && d < bestD) { bestD = d; best = n; }
      }
      return best;
    }

    // ---------- Draw ----------
    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(view.x, view.y);
      ctx.scale(view.scale, view.scale);

      var focus = hovered || selected;
      var neigh = focus ? adj[focus.id] : null;

      // edges
      ctx.lineWidth = 1 / view.scale;
      for (var e = 0; e < edges.length; e++) {
        var ed = edges[e];
        if (!visible(ed.s) || !visible(ed.t)) continue;
        var isFocus = focus && (ed.s === focus || ed.t === focus);
        if (focus && !isFocus) { ctx.strokeStyle = 'rgba(120,140,170,0.05)'; }
        else if (isFocus) { ctx.strokeStyle = PAL.accent + 'cc'; ctx.lineWidth = 1.6 / view.scale; }
        else { ctx.strokeStyle = PAL.line; ctx.lineWidth = 1 / view.scale; }
        ctx.beginPath();
        ctx.moveTo(ed.s.x, ed.s.y);
        ctx.lineTo(ed.t.x, ed.t.y);
        ctx.stroke();
      }

      // nodes
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        if (!visible(n)) continue;
        var dim = focus && n !== focus && !(neigh && neigh[n.id]);
        var col = PAL.typeColor[n.type] || '#8aa';
        ctx.globalAlpha = dim ? 0.18 : 1;

        if (n === focus) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r + 6 / view.scale, 0, 6.2832);
          ctx.fillStyle = col + '33'; ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, 6.2832);
        ctx.fillStyle = col; ctx.fill();
        ctx.lineWidth = 1.5 / view.scale;
        ctx.strokeStyle = (n === selected) ? PAL.txt0 : PAL.bg1;
        ctx.stroke();

        // labels
        var bigEnough = n.r * view.scale > 9;
        if (showLabels && !dim && (bigEnough || n === focus || (neigh && neigh[n.id]))) {
          ctx.globalAlpha = dim ? 0.2 : 1;
          var fs = Math.max(9.5, Math.min(13, 11 / view.scale));
          ctx.font = (n === focus ? '700 ' : '500 ') + fs + "px 'IBM Plex Sans Arabic', sans-serif";
          ctx.textAlign = 'center'; ctx.textBaseline = 'top';
          ctx.direction = 'rtl';
          var lbl = n.label.length > 26 ? n.label.slice(0, 25) + '…' : n.label;
          ctx.fillStyle = 'rgba(6,9,15,0.7)';
          var tw = ctx.measureText(lbl).width;
          ctx.fillRect(n.x - tw / 2 - 3, n.y + n.r + 2, tw + 6, fs + 4);
          ctx.fillStyle = (n === focus) ? PAL.txt0 : PAL.txt2;
          ctx.fillText(lbl, n.x, n.y + n.r + 4);
        }
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }

    var firstPaint = false;
    function loop() {
      tick(); draw();
      if (!firstPaint) { firstPaint = true; clearState(); }   // first frame painted → drop the loading overlay
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    function reheat(v) { alpha = Math.max(alpha, v || 0.5); }

    // ---------- Tooltip + inspector ----------
    function metaText(n) {
      if (!n.meta) return '';
      var parts = [];
      if (n.meta.impact != null) parts.push('درجة الأثر: ' + n.meta.impact + '/10');
      if (n.meta.sector) parts.push('القطاع: ' + n.meta.sector);
      if (n.meta.emirate) parts.push('الإمارة: ' + n.meta.emirate);
      if (n.meta.cost_band) parts.push('فئة التكلفة: ' + n.meta.cost_band);
      return parts.join(' · ');
    }
    function showTooltip(n, px, py) {
      var col = PAL.typeColor[n.type] || '#8aa';
      var mt = metaText(n);
      tooltip.innerHTML =
        '<div class="tt-type"><span class="tt-sw" style="background:' + col + '"></span>' + (PAL.typeAr[n.type] || n.type) + ' · ' + (n.deg) + ' روابط</div>' +
        '<div class="tt-label">' + escapeHtml(n.label) + '</div>' +
        (mt ? '<div class="tt-meta">' + escapeHtml(mt) + '</div>' : '');
      tooltip.style.left = px + 'px';
      tooltip.style.top = py + 'px';
      tooltip.hidden = false;
    }
    function hideTooltip() { tooltip.hidden = true; }

    function linkFor(n) {
      var c = n.id.indexOf(':');
      var prefix = c >= 0 ? n.id.slice(0, c) : '';
      var rest = c >= 0 ? n.id.slice(c + 1) : n.id;
      if (prefix === 'pr') return '/innovation/' + encodeURIComponent(rest);
      if (prefix === 'fz') return '/free-zones/' + encodeURIComponent(rest);
      return null;
    }

    function renderInspector(n) {
      if (!n) { inspectorBody.innerHTML = 'مرّر فوق عقدة أو انقرها لعرض تفاصيلها وجيرانها هنا.'; return; }
      var col = PAL.typeColor[n.type] || '#8aa';
      var nb = adj[n.id];
      var ids = Object.keys(nb);
      var mt = metaText(n);
      var link = linkFor(n);
      var html =
        '<div class="ib-row"><span class="ib-dot" style="background:' + col + ';box-shadow:0 0 10px -2px ' + col + '"></span>' +
          '<span class="fw-7" style="font-size:14px;color:var(--txt-0)">' + escapeHtml(n.label) + '</span></div>' +
        '<div class="ib-row"><span class="muted t-xs">النوع</span><span class="badge" style="margin-inline-start:auto;color:' + col + '">' + (PAL.typeAr[n.type] || n.type) + '</span></div>' +
        '<div class="ib-row"><span class="muted t-xs">عدد الروابط</span><span class="mono fw-6" style="margin-inline-start:auto">' + ids.length + '</span></div>' +
        (mt ? '<div class="ib-row"><span class="muted t-xs">بيانات</span><span class="t-xs" style="margin-inline-start:auto;text-align:end">' + escapeHtml(mt) + '</span></div>' : '');
      if (link) html += '<a class="ib-open" href="' + link + '">فتح صفحة التفاصيل ' + arrowSvg() + '</a>';
      html += '<div class="muted t-xs" style="margin-top:var(--sp-3)">الجيران (' + ids.length + ')</div><div class="ib-neighbors">';
      ids.slice(0, 40).forEach(function (id) {
        var m = nodeIndex[id]; if (!m) return;
        var mc = PAL.typeColor[m.type] || '#8aa';
        html += '<button class="ib-neighbor" data-focus="' + escapeAttr(m.id) + '" style="border:none;background:none;cursor:pointer;text-align:start;font-family:inherit">' +
          '<span class="ib-dot" style="background:' + mc + '"></span>' +
          '<span class="flex-1 truncate" style="color:var(--txt-1)">' + escapeHtml(m.label) + '</span>' +
          '<span class="muted t-xs">' + (PAL.edgeAr[nb[id]] || nb[id]) + '</span></button>';
      });
      html += '</div>';
      inspectorBody.innerHTML = html;
    }

    function focusNode(n) {
      selected = n;
      if (n) {
        // ease the view to center the node
        var w = wrap.clientWidth, h = wrap.clientHeight;
        view.x = w / 2 - n.x * view.scale;
        view.y = h / 2 - n.y * view.scale;
      }
      renderInspector(n);
      draw();
    }

    // ---------- Pointer interactions ----------
    function relPos(ev) {
      var rect = wrap.getBoundingClientRect();
      var t = ev.touches ? ev.touches[0] : ev;
      return { x: t.clientX - rect.left, y: t.clientY - rect.top, cx: t.clientX, cy: t.clientY };
    }

    wrap.addEventListener('mousedown', function (ev) {
      var p = relPos(ev);
      moved = false;
      var n = nodeAt(p.x, p.y);
      if (n) { dragNode = n; n.fixed = true; }
      else { panning = true; wrap.classList.add('grabbing'); }
      lastPX = p.x; lastPY = p.y;
    });
    window.addEventListener('mousemove', function (ev) {
      var p = relPos(ev);
      if (dragNode) {
        moved = true;
        var w = toWorld(p.x, p.y);
        dragNode.x = w.x; dragNode.y = w.y; dragNode.vx = 0; dragNode.vy = 0;
        reheat(0.3); hideTooltip();
      } else if (panning) {
        moved = true;
        view.x += p.x - lastPX; view.y += p.y - lastPY;
        lastPX = p.x; lastPY = p.y; hideTooltip();
      } else {
        var hit = nodeAt(p.x, p.y);
        if (hit !== hovered) { hovered = hit; draw(); }
        if (hit) { wrap.style.cursor = 'pointer'; showTooltip(hit, p.x, p.y); }
        else { wrap.style.cursor = ''; hideTooltip(); }
      }
    });
    window.addEventListener('mouseup', function (ev) {
      if (dragNode && !moved) {           // click without drag = focus / navigate
        var link = linkFor(dragNode);
        if (link) { location.href = link; return; }
        focusNode(dragNode);
      }
      if (dragNode) { dragNode.fixed = false; }
      dragNode = null; panning = false; wrap.classList.remove('grabbing');
    });
    wrap.addEventListener('mouseleave', function () { hovered = null; hideTooltip(); draw(); });

    // wheel zoom centered on cursor
    wrap.addEventListener('wheel', function (ev) {
      ev.preventDefault();
      var p = relPos(ev);
      var factor = ev.deltaY < 0 ? 1.12 : 0.893;
      var ns = Math.max(0.25, Math.min(3.5, view.scale * factor));
      var k = ns / view.scale;
      view.x = p.x - (p.x - view.x) * k;
      view.y = p.y - (p.y - view.y) * k;
      view.scale = ns;
      updateZoomLabel(); hideTooltip(); draw();
    }, { passive: false });

    // touch (single-finger pan/drag)
    wrap.addEventListener('touchstart', function (ev) {
      var p = relPos(ev); var n = nodeAt(p.x, p.y);
      if (n) { dragNode = n; n.fixed = true; } else { panning = true; }
      lastPX = p.x; lastPY = p.y; moved = false;
    }, { passive: true });
    wrap.addEventListener('touchmove', function (ev) {
      var p = relPos(ev); moved = true;
      if (dragNode) { var w = toWorld(p.x, p.y); dragNode.x = w.x; dragNode.y = w.y; reheat(0.3); }
      else if (panning) { view.x += p.x - lastPX; view.y += p.y - lastPY; }
      lastPX = p.x; lastPY = p.y;
    }, { passive: true });
    wrap.addEventListener('touchend', function () {
      if (dragNode && !moved) { var link = linkFor(dragNode); if (link) location.href = link; else focusNode(dragNode); }
      if (dragNode) dragNode.fixed = false;
      dragNode = null; panning = false;
    });

    // ---------- Zoom buttons ----------
    function zoomBy(factor) {
      var w = wrap.clientWidth / 2, h = wrap.clientHeight / 2;
      var ns = Math.max(0.25, Math.min(3.5, view.scale * factor));
      var k = ns / view.scale;
      view.x = w - (w - view.x) * k; view.y = h - (h - view.y) * k; view.scale = ns;
      updateZoomLabel(); draw();
    }
    function updateZoomLabel() { var el = document.getElementById('kgZoomLabel'); if (el) el.textContent = Math.round(view.scale * 100) + '%'; }
    document.getElementById('kgZoomIn').addEventListener('click', function () { zoomBy(1.2); });
    document.getElementById('kgZoomOut').addEventListener('click', function () { zoomBy(0.83); });
    document.getElementById('kgReset').addEventListener('click', function () {
      view.x = 0; view.y = 0; view.scale = 1; selected = null; updateZoomLabel(); renderInspector(null); reheat(0.6); draw();
    });
    document.getElementById('kgPlayBtn').addEventListener('click', function () { reheat(0.9); });
    document.getElementById('kgLabelsBtn').addEventListener('click', function () {
      showLabels = !showLabels; this.classList.toggle('active', showLabels); draw();
    });

    // ---------- Type filters ----------
    function updateCounts() {
      var vn = nodes.filter(visible).length;
      var ve = edges.filter(function (e) { return visible(e.s) && visible(e.t); }).length;
      var en = document.getElementById('kgVisNodes'), ee = document.getElementById('kgVisEdges');
      if (en) en.textContent = vn.toLocaleString('en-US');
      if (ee) ee.textContent = ve.toLocaleString('en-US');
    }
    function setType(type, on) {
      active[type] = on;
      document.querySelectorAll('.kg-chip[data-type="' + type + '"]').forEach(function (c) {
        c.classList.toggle('active', on); c.setAttribute('aria-pressed', on);
      });
      var lg = document.querySelector('.kg-legend-item[data-lg-type="' + type + '"]');
      if (lg) lg.classList.toggle('off', !on);
      updateCounts(); reheat(0.5); draw();
    }
    document.querySelectorAll('.kg-chip').forEach(function (chip) {
      chip.addEventListener('click', function () { setType(chip.getAttribute('data-type'), !active[chip.getAttribute('data-type')]); });
    });
    document.querySelectorAll('.kg-legend-item').forEach(function (lg) {
      lg.addEventListener('click', function () { var t = lg.getAttribute('data-lg-type'); setType(t, !active[t]); });
    });
    document.getElementById('kgAll').addEventListener('click', function () { Object.keys(active).forEach(function (t) { setType(t, true); }); });
    document.getElementById('kgNone').addEventListener('click', function () { Object.keys(active).forEach(function (t) { setType(t, false); }); });

    // ---------- Focus from hubs + inspector neighbors (event delegation) ----------
    document.addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-focus]');
      if (!btn) return;
      var n = nodeIndex[btn.getAttribute('data-focus')];
      if (!n) return;
      if (!active[n.type]) setType(n.type, true);
      hovered = n;
      focusNode(n);
    });

    // ---------- helpers ----------
    function escapeHtml(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }
    function escapeAttr(s) { return escapeHtml(s).replace(/"/g, '&quot;'); }
    function arrowSvg() { return '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px"><polyline points="9 18 15 12 9 6"/></svg>'; }

    updateZoomLabel();
   } catch (err) {
     if (window.console && console.error) console.error('[knowledge-graph] init failed', err);
     failState();   // render errorState() into #kgCanvasState so a JS error never leaves a blank box
   }
  });
  </script>`;

  return { title: 'الرسم المعرفي', active: '/knowledge-graph', body, head, bodyEnd };
}

/* ---- Small server-side render helpers for the explainer flow ---- */
function flowPill(ic: string, label: string, tone: string): string {
  const color: Record<string, string> = { gold: '#f5c451', blue: '#4cc2ff', violet: '#9d8bff', green: '#00d68f', red: '#ff5d6c' };
  const c = color[tone] ?? '#00d68f';
  return `<span class="kg-flow-pill" style="color:${c};background:${c}1a;border-color:${c}40">${icon(ic)} ${esc(label)}</span>`;
}
function flowArrow(label: string): string {
  return `<span class="kg-flow-arrow">${esc(label)}</span>`;
}
