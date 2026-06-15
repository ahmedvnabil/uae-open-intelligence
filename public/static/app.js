/* UAE Open Intelligence — client runtime. Loaded with `defer`, before Alpine. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- CSS var reader ---------- */
  const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

  /* ---------- Theme ---------- */
  const THEME_KEY = 'uae-theme';
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    const btn = $('#themeBtn');
    if (btn) btn.innerHTML = t === 'dark'
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M5 5l1.5 1.5M17.5 17.5 19 19M2 12h2M20 12h2M5 19l1.5-1.5M17.5 6.5 19 5"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/></svg>';
    document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: t } }));
  }
  let theme = localStorage.getItem(THEME_KEY) || 'dark';
  applyTheme(theme);
  document.addEventListener('click', (e) => {
    if (e.target.closest('#themeBtn')) {
      theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      localStorage.setItem(THEME_KEY, theme);
      applyTheme(theme);
    }
  });

  /* ---------- Mobile nav ---------- */
  function toggleNav(open) {
    const sb = $('#sidebar'), sc = $('#scrim'), btn = $('#menuBtn');
    if (!sb) return;
    const willOpen = open ?? !sb.classList.contains('open');
    sb.classList.toggle('open', willOpen);
    if (sc) sc.hidden = !willOpen;
    if (btn) btn.setAttribute('aria-expanded', String(willOpen));
  }
  document.addEventListener('click', (e) => {
    if (e.target.closest('#menuBtn')) toggleNav();
    else if (e.target.id === 'scrim') toggleNav(false);
    else if (e.target.closest('#mkBurger')) {
      const nav = $('#mkMobileNav'), btn = $('#mkBurger');
      if (nav) { const open = nav.hidden; nav.hidden = !open; if (btn) btn.setAttribute('aria-expanded', String(open)); }
    }
  });

  /* ---------- Navigation progress bar ---------- */
  (function navProgress() {
    const bar = document.createElement('div');
    bar.id = 'navProgress';
    const attach = () => document.body && document.body.appendChild(bar);
    if (document.body) attach(); else document.addEventListener('DOMContentLoaded', attach);
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a');
      if (!a) return;
      const href = a.getAttribute('href') || '';
      if (a.target === '_blank' || a.hasAttribute('download') || !href || href.startsWith('#') ||
          href.startsWith('http') || href.startsWith('mailto') || e.metaKey || e.ctrlKey || e.shiftKey) return;
      if (a.origin && a.origin !== location.origin) return;
      bar.classList.add('on'); bar.style.width = '85%';
    });
    window.addEventListener('pageshow', () => { bar.style.width = '100%'; setTimeout(() => { bar.classList.remove('on'); bar.style.width = '0'; }, 220); });
  })();

  /* ---------- Command palette ---------- */
  const cmdk = {
    overlay: null, input: null, results: null, items: [], active: -1,
    open() {
      this.overlay = $('#cmdkOverlay'); this.input = $('#cmdkInput'); this.results = $('#cmdkResults');
      if (!this.overlay) return;
      this.overlay.hidden = false;
      requestAnimationFrame(() => this.input && this.input.focus());
    },
    close() { if (this.overlay) { this.overlay.hidden = true; this.active = -1; } },
    async search(q) {
      if (!q || !q.trim()) { this.results.innerHTML = '<div class="cmdk-empty">ابدأ بالكتابة للبحث عبر جميع المراصد</div>'; this.items = []; return; }
      try {
        const r = await fetch('/api/v1/search?q=' + encodeURIComponent(q));
        const j = await r.json();
        const data = (j && j.data) || [];
        if (!data.length) { this.results.innerHTML = '<div class="cmdk-empty">لا توجد نتائج لـ «' + escapeHtml(q) + '»</div>'; this.items = []; return; }
        this.items = data;
        this.results.innerHTML = data.map((d, i) =>
          '<a class="cmdk-item' + (i === 0 ? ' active' : '') + '" href="' + escapeHtml(d.url) + '" data-i="' + i + '">' +
            '<span>' + escapeHtml(d.title) + '<br><span class="muted t-xs">' + escapeHtml(d.subtitle) + '</span></span>' +
            '<span class="ci-type">' + escapeHtml(d.type) + '</span></a>').join('');
        this.active = 0;
      } catch (e) { this.results.innerHTML = '<div class="cmdk-empty">تعذّر البحث</div>'; }
    },
    move(dir) {
      const els = $$('.cmdk-item', this.results); if (!els.length) return;
      this.active = (this.active + dir + els.length) % els.length;
      els.forEach((el, i) => el.classList.toggle('active', i === this.active));
      els[this.active].scrollIntoView({ block: 'nearest' });
    },
    enter() { const el = $$('.cmdk-item', this.results)[this.active]; if (el) location.href = el.getAttribute('href'); },
  };
  let cmdkTimer;
  document.addEventListener('click', (e) => {
    if (e.target.closest('#cmdkTrigger, .cmdk-open')) cmdk.open();
    else if (e.target.id === 'cmdkOverlay') cmdk.close();
  });
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); cmdk.overlay && !cmdk.overlay.hidden ? cmdk.close() : cmdk.open(); return; }
    if (cmdk.overlay && !cmdk.overlay.hidden) {
      if (e.key === 'Escape') cmdk.close();
      else if (e.key === 'ArrowDown') { e.preventDefault(); cmdk.move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); cmdk.move(-1); }
      else if (e.key === 'Enter') { e.preventDefault(); cmdk.enter(); }
    }
  });
  document.addEventListener('input', (e) => {
    if (e.target.id === 'cmdkInput') { clearTimeout(cmdkTimer); cmdkTimer = setTimeout(() => cmdk.search(e.target.value), 160); }
  });

  /* ---------- Copy buttons ---------- */
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-copy]');
    if (!btn) return;
    try {
      await navigator.clipboard.writeText(btn.getAttribute('data-copy'));
      const old = btn.innerHTML;
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
      btn.style.color = cssVar('--uae-green');
      setTimeout(() => { btn.innerHTML = old; btn.style.color = ''; }, 1300);
    } catch (_) {}
  });

  /* ---------- Reveal on scroll ---------- */
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { threshold: 0.08 }) : null;
  function observeReveals() { if (io) $$('.reveal:not(.in)').forEach((el) => io.observe(el)); }

  /* ---------- Hero data streams ---------- */
  function buildStreams() {
    $$('.streams').forEach((box) => {
      if (box.dataset.built) return; box.dataset.built = '1';
      let html = '';
      for (let i = 0; i < 18; i++) {
        const left = (i * 5.6 + (i % 3) * 2) % 100;
        const dur = 3 + (i % 5); const delay = (i % 7) * 0.4;
        html += '<span style="left:' + left + '%;animation-duration:' + dur + 's;animation-delay:' + delay + 's"></span>';
      }
      box.innerHTML = html;
    });
  }

  /* ---------- Count-up numbers (data-countup) ---------- */
  function countUp() {
    $$('[data-countup]').forEach((el) => {
      if (el.dataset.done) return; el.dataset.done = '1';
      const target = parseFloat(el.getAttribute('data-countup')); if (isNaN(target)) return;
      const suffix = el.getAttribute('data-suffix') || ''; const dur = 900; const start = performance.now();
      function step(t) {
        const p = Math.min(1, (t - start) / dur); const eased = 1 - Math.pow(1 - p, 3);
        const v = target * eased;
        el.textContent = (target % 1 === 0 ? Math.round(v).toLocaleString('en-US') : v.toFixed(1)) + suffix;
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  /* ---------- Chart.js theme + helpers ---------- */
  const PALETTE = ['#00d68f', '#4cc2ff', '#f5c451', '#9d8bff', '#ff5d6c', '#f0992b', '#2dd4bf', '#a3e635', '#fb7185', '#60a5fa', '#c084fc', '#34d399'];
  function themeChartDefaults() {
    if (!window.Chart) return;
    const C = window.Chart;
    C.defaults.font.family = "'IBM Plex Sans Arabic','Tajawal',sans-serif";
    C.defaults.font.size = 12;
    C.defaults.color = cssVar('--txt-2');
    C.defaults.borderColor = cssVar('--line');
    C.defaults.plugins.legend.labels.color = cssVar('--txt-1');
    C.defaults.plugins.legend.labels.usePointStyle = true;
    C.defaults.plugins.legend.labels.boxWidth = 8;
    C.defaults.plugins.tooltip.backgroundColor = cssVar('--bg-2');
    C.defaults.plugins.tooltip.titleColor = cssVar('--txt-0');
    C.defaults.plugins.tooltip.bodyColor = cssVar('--txt-1');
    C.defaults.plugins.tooltip.borderColor = cssVar('--line-strong');
    C.defaults.plugins.tooltip.borderWidth = 1;
    C.defaults.plugins.tooltip.padding = 10;
    C.defaults.plugins.tooltip.cornerRadius = 8;
    C.defaults.plugins.tooltip.rtl = true;
    C.defaults.maintainAspectRatio = false;
  }
  function gridScale() {
    return { grid: { color: cssVar('--line'), drawTicks: false }, ticks: { color: cssVar('--txt-2'), padding: 8 }, border: { display: false } };
  }
  const registry = [];
  function track(chart, cfgFactory) { registry.push({ chart, cfgFactory }); return chart; }
  // Accessibility: expose each chart canvas as an image with a name from its panel title.
  function labelCanvas(canvas) {
    if (!canvas) return;
    canvas.setAttribute('role', 'img');
    if (!canvas.getAttribute('aria-label')) {
      const panel = canvas.closest('.panel') || canvas.closest('section');
      const t = panel && panel.querySelector('.section-title, .card-title');
      canvas.setAttribute('aria-label', t ? t.textContent.trim() : 'رسم بياني للبيانات');
    }
  }

  const UAE = {
    palette: PALETTE,
    color: (i) => PALETTE[i % PALETTE.length],
    cssVar,
    ready(fn) { if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); },
    refresh() { observeReveals(); buildStreams(); countUp(); },
    gridScale,
    // helper to make a gradient fill
    gradient(ctx, color, h) {
      const g = ctx.createLinearGradient(0, 0, 0, h || 240);
      g.addColorStop(0, color + '55'); g.addColorStop(1, color + '00'); return g;
    },
    charts: {
      line(canvas, labels, datasets, opts = {}) {
        if (!window.Chart || !canvas) return;
        labelCanvas(canvas);
        const ctx = canvas.getContext('2d');
        const ds = datasets.map((d, i) => Object.assign({
          borderColor: d.color || UAE.color(i), backgroundColor: d.fill ? UAE.gradient(ctx, d.color || UAE.color(i), canvas.height) : 'transparent',
          fill: !!d.fill, tension: 0.35, borderWidth: 2.5, pointRadius: 0, pointHoverRadius: 5,
        }, d));
        return track(new window.Chart(canvas, { type: 'line', data: { labels, datasets: ds },
          options: Object.assign({ scales: { x: gridScale(), y: gridScale() }, plugins: { legend: { display: datasets.length > 1 } } }, opts) }));
      },
      bar(canvas, labels, datasets, opts = {}) {
        if (!window.Chart || !canvas) return;
        labelCanvas(canvas);
        const ds = datasets.map((d, i) => Object.assign({ backgroundColor: d.color || UAE.color(i), borderRadius: 6, maxBarThickness: 38 }, d));
        return track(new window.Chart(canvas, { type: 'bar', data: { labels, datasets: ds },
          options: Object.assign({ scales: { x: gridScale(), y: gridScale() }, plugins: { legend: { display: datasets.length > 1 } } }, opts) }));
      },
      doughnut(canvas, labels, values, opts = {}) {
        if (!window.Chart || !canvas) return;
        labelCanvas(canvas);
        return track(new window.Chart(canvas, { type: 'doughnut',
          data: { labels, datasets: [{ data: values, backgroundColor: labels.map((_, i) => UAE.color(i)), borderColor: cssVar('--bg-1'), borderWidth: 2 }] },
          options: Object.assign({ cutout: '64%', plugins: { legend: { position: 'bottom' } } }, opts) }));
      },
      radar(canvas, labels, datasets, opts = {}) {
        if (!window.Chart || !canvas) return;
        labelCanvas(canvas);
        const ds = datasets.map((d, i) => Object.assign({ borderColor: d.color || UAE.color(i), backgroundColor: (d.color || UAE.color(i)) + '33', borderWidth: 2, pointRadius: 3 }, d));
        return track(new window.Chart(canvas, { type: 'radar', data: { labels, datasets: ds },
          options: Object.assign({ scales: { r: { grid: { color: cssVar('--line') }, angleLines: { color: cssVar('--line') }, ticks: { display: false, stepSize: 2 }, pointLabels: { color: cssVar('--txt-1'), font: { size: 12 } }, suggestedMin: 0, suggestedMax: 10 } } }, opts) }));
      },
    },
  };
  window.UAE = UAE;

  /* ---------- Boot ---------- */
  function boot() { themeChartDefaults(); UAE.refresh(); }
  if (document.readyState !== 'loading') boot(); else document.addEventListener('DOMContentLoaded', boot);
  // re-theme charts on theme switch
  document.addEventListener('themechange', () => { themeChartDefaults(); registry.forEach((r) => { try { r.chart.update(); } catch (_) {} }); });
  // re-run reveal/streams after htmx swaps
  document.body && document.body.addEventListener('htmx:afterSwap', () => UAE.refresh());

  /* ---------- util ---------- */
  function escapeHtml(s) { const d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }
})();
