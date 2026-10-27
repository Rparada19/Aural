(() => {
  const el = document.getElementById('net-data');
  const cv = document.querySelector('.net');
  if (!el || !cv) return;
  const D = JSON.parse(el.textContent);
  const ctx = cv.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const C = { navy: '#041E42', q: '#6B8CC7', p: '#163E73', off: '#C4CEDB', f: '#1FA59A', b: '#E2A03F', line: 'rgba(22,62,115,.14)', best: 'rgba(31,165,154,.85)' };
  let W, H, nodes, links, pulses = [];

  function layout() {
    const r = cv.getBoundingClientRect();
    const dpr = devicePixelRatio || 1;
    W = r.width; H = Math.max(360, Math.min(560, W * 0.62));
    cv.style.height = H + 'px'; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 26;
    const sx = Math.max(1, Math.min(1.9, (W / 2 - 90) / R));
    const ring = (arr, rad, off = 0) => arr.map((x, i) => { const a = off + (i / Math.max(1, arr.length)) * Math.PI * 2; return { ...x, x: cx + Math.cos(a) * rad * sx, y: cy + Math.sin(a) * rad * 0.9, a, rad }; });
    const center = { k: 'c', l: D.center, x: cx, y: cy };
    const th = ring(D.themes, R * 0.36, -Math.PI / 2 + 0.4).map((t) => ({ ...t, k: t.t === 'brecha' ? 'b' : 'f' }));
    const qs = ring(D.questions, R * 0.64, 0.3).map((q) => ({ ...q, k: 'q' }));
    const ps = ring(D.people, R * 0.96, 0.1).map((p) => ({ ...p, k: 'p' }));
    nodes = [center, ...th, ...qs, ...ps];
    const byQ = Object.fromEntries(qs.map((q) => [q.id, q]));
    const byP = Object.fromEntries(ps.map((p) => [p.id, p]));
    const bestSet = new Set(D.best.map(([u, q]) => `${u}:${q}`));
    links = [];
    th.forEach((t) => links.push({ a: center, b: t, w: 1 }));
    qs.forEach((q, i) => { links.push({ a: q, b: th.length ? th[i % th.length] : center, w: 0.6 }); });
    ps.filter((p) => p.on).forEach((p) => qs.forEach((q, j) => { if ((p.id + j) % 3 === 0 || bestSet.has(`${p.id}:${q.id}`)) links.push({ a: p, b: q, w: 0.4, best: bestSet.has(`${p.id}:${q.id}`) }); }));
  }

  function spawn() {
    const active = links.filter((l) => l.a.k === 'p' || l.best);
    if (!active.length) return;
    const l = active[Math.floor(Math.random() * active.length)];
    pulses.push({ l, t: 0, s: 0.006 + Math.random() * 0.01 });
  }

  function draw(time) {
    ctx.clearRect(0, 0, W, H);
    const wob = (n) => (reduce || n.k === 'c' ? 0 : Math.sin(time / 1400 + (n.x + n.y) / 60) * 2);
    for (const l of links) {
      ctx.strokeStyle = l.best ? C.best : C.line; ctx.lineWidth = l.best ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(l.a.x + wob(l.a), l.a.y + wob(l.a)); ctx.lineTo(l.b.x + wob(l.b), l.b.y + wob(l.b)); ctx.stroke();
    }
    for (const p of pulses) {
      const { a, b } = p.l; const x = a.x + (b.x - a.x) * p.t, y = a.y + (b.y - a.y) * p.t;
      ctx.fillStyle = p.l.best ? C.f : 'rgba(31,165,154,.7)'; ctx.beginPath(); ctx.arc(x, y, p.l.best ? 3.2 : 2.2, 0, Math.PI * 2); ctx.fill();
      p.t += p.s;
    }
    pulses = pulses.filter((p) => p.t < 1);
    for (const n of nodes) {
      const x = n.x + wob(n), y = n.y + wob(n);
      if (n.k === 'c') {
        ctx.fillStyle = C.navy; ctx.beginPath(); ctx.arc(x, y, 34, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '600 11px Gotham, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const words = String(n.l).split(' '); const half = Math.ceil(words.length / 2);
        if (words.length > 1) { ctx.fillText(words.slice(0, half).join(' '), x, y - 7, 60); ctx.fillText(words.slice(half).join(' '), x, y + 7, 60); } else ctx.fillText(n.l, x, y, 60);
        continue;
      }
      const r = n.k === 'f' || n.k === 'b' ? 6 + (n.w || 5) * 1.1 : n.k === 'q' ? 5 : 7;
      ctx.fillStyle = n.k === 'p' ? (n.on ? C.p : C.off) : C[n.k];
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      if (n.k !== 'q') {
        ctx.fillStyle = n.k === 'p' ? '#5B6478' : '#1B2A44'; ctx.font = `${n.k === 'p' ? 400 : 600} 11px Gotham, sans-serif`;
        ctx.textBaseline = 'middle';
        const c = Math.cos(n.a), sn = Math.sin(n.a);
        ctx.textAlign = Math.abs(c) < 0.3 ? 'center' : c > 0 ? 'left' : 'right';
        const tx = x + c * (r + 6), ty = y + sn * (r + 10);
        if (n.k !== 'p') { const w = ctx.measureText(n.l).width; const bx = ctx.textAlign === 'left' ? tx : ctx.textAlign === 'right' ? tx - w : tx - w / 2; ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(bx - 3, ty - 8, w + 6, 16); ctx.fillStyle = '#1B2A44'; }
        ctx.fillText(n.l, tx, ty, 140);
      }
    }
  }

  function frame(t) {
    if (!reduce && Math.random() < (cv.classList.contains('busy') ? 0.6 : 0.12)) spawn();
    draw(t);
    if (!reduce) requestAnimationFrame(frame);
  }
  layout();
  addEventListener('resize', () => { layout(); if (reduce) draw(0); });
  if (reduce) draw(0); else requestAnimationFrame(frame);
})();
