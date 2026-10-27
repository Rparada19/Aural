(() => {
  const D = JSON.parse(document.getElementById('ai-data').textContent);
  const cv = document.getElementById('ai-net');
  const ctx = cv.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TEAL = [31, 165, 154], AMBER = [226, 160, 63], WHITE = [255, 255, 255];
  let W, H, layers, edges, sparks = [];
  const fmt = (n) => Number(n).toLocaleString('es-CO');

  function build() {
    const r = cv.getBoundingClientRect(), dpr = devicePixelRatio || 1;
    W = r.width; H = r.height;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const compact = W < 640;
    const padL = compact ? 24 : Math.min(260, W * 0.27), padR = compact ? 24 : Math.min(230, W * 0.24);
    const sizes = [D.inputs.length, 9, 11, 9, D.outputs.length];
    const xs = sizes.map((_, i) => padL + (i * (W - padL - padR)) / (sizes.length - 1));
    layers = sizes.map((n, li) => Array.from({ length: n }, (_, i) => ({
      x: xs[li], y: H * 0.1 + ((i + 0.5) * (H * 0.8)) / n, a: Math.random() * 0.3, li, i,
      label: li === 0 ? D.inputs[i] : li === sizes.length - 1 ? D.outputs[i] : null,
    })));
    edges = [];
    for (let l = 0; l < layers.length - 1; l++) for (const a of layers[l]) for (const b of layers[l + 1]) if (Math.random() < (l === 0 || l === layers.length - 2 ? 0.75 : 0.45)) edges.push({ a, b, w: 0.04 + Math.random() * 0.08 });
  }

  function fire(from) {
    const out = edges.filter((e) => e.a === from);
    for (const e of out) if (Math.random() < 0.45) sparks.push({ e, t: 0, s: 0.012 + Math.random() * 0.014 });
  }

  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (const e of edges) { ctx.strokeStyle = rgba(WHITE, e.w); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(e.a.x, e.a.y); ctx.lineTo(e.b.x, e.b.y); ctx.stroke(); e.w = Math.max(0.04, e.w * 0.995); }
    for (const s of sparks) {
      const { a, b } = s.e, x = a.x + (b.x - a.x) * s.t, y = a.y + (b.y - a.y) * s.t;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 7); g.addColorStop(0, rgba(TEAL, 0.95)); g.addColorStop(1, rgba(TEAL, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
      s.t += s.s;
      if (s.t >= 1) { s.done = true; s.e.w = Math.min(0.5, s.e.w + 0.12); b.a = Math.min(1, b.a + 0.45); if (b.li < layers.length - 1) fire(b); else pulseOutput(b); }
    }
    sparks = sparks.filter((s) => !s.done);
    const last = layers.length - 1;
    for (const L of layers) for (const n of L) {
      const r = n.label ? 9 : 6;
      const glow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 3.2);
      const c = n.li === last ? AMBER : TEAL;
      glow.addColorStop(0, rgba(c, 0.35 * n.a + 0.05)); glow.addColorStop(1, rgba(c, 0));
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(n.x, n.y, r * 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = n.a > 0.25 ? rgba(c, 0.6 + n.a * 0.4) : rgba(WHITE, 0.85); ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2); ctx.fill();
      n.a *= 0.965;
      if (n.label && W >= 640) {
        ctx.font = '500 13px Gotham, system-ui, sans-serif'; ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(255,255,255,.88)';
        if (n.li === 0) { ctx.textAlign = 'right'; ctx.fillText(n.label[0], n.x - 18, n.y - 7); ctx.fillStyle = 'rgba(143,227,217,.95)'; ctx.font = '700 13px Gotham, system-ui, sans-serif'; ctx.fillText(fmt(n.label[1]), n.x - 18, n.y + 9); }
        else { ctx.textAlign = 'left'; ctx.fillText(n.label, n.x + 18, n.y); }
      }
    }
  }

  const feed = document.getElementById('ai-feed');
  let fi = 0;
  function pulseOutput() {
    if (!D.learned.length || Math.random() > 0.08) return;
    const it = D.learned[fi++ % D.learned.length];
    const li = document.createElement('li');
    li.className = it.k === 'brecha' ? 'gap' : 'str';
    li.innerHTML = `<span></span><div><strong></strong><em></em></div>`;
    li.querySelector('strong').textContent = it.t;
    li.querySelector('em').textContent = `${it.k === 'brecha' ? 'Por reforzar' : 'Fortaleza'} · ${it.a}`;
    feed.prepend(li);
    while (feed.children.length > 7) feed.lastChild.remove();
  }

  function tick() {
    if (Math.random() < 0.09) { const n = layers[0][Math.floor(Math.random() * layers[0].length)]; n.a = 1; fire(n); }
    draw();
    requestAnimationFrame(tick);
  }

  build();
  addEventListener('resize', build);
  if (reduce) { for (const L of layers) for (const n of L) n.a = 0.5; draw(); D.learned.slice(0, 7).forEach(() => pulseOutput.call(null)); }
  else { requestAnimationFrame(tick); }
  if (!feed.children.length) for (let i = 0; i < Math.min(4, D.learned.length); i++) { const it = D.learned[i]; const li = document.createElement('li'); li.className = it.k === 'brecha' ? 'gap' : 'str'; li.innerHTML = '<span></span><div><strong></strong><em></em></div>'; li.querySelector('strong').textContent = it.t; li.querySelector('em').textContent = `${it.k === 'brecha' ? 'Por reforzar' : 'Fortaleza'} · ${it.a}`; feed.appendChild(li); fi = i + 1; }

  // Cifras que cuentan hacia arriba
  document.querySelectorAll('[data-count]').forEach((b) => {
    const to = Number(b.dataset.count); if (reduce || !to) return;
    const t0 = performance.now();
    const step = (t) => { const k = Math.min(1, (t - t0) / 1600); b.textContent = fmt(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });

  const root = document.getElementById('ai-live');
  document.getElementById('ai-full').addEventListener('click', () => { if (document.fullscreenElement) document.exitFullscreen(); else root.requestFullscreen?.(); });
  document.addEventListener('fullscreenchange', () => setTimeout(build, 50));
})();
