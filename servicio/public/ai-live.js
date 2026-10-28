(() => {
  const D = JSON.parse(document.getElementById('wow-data').textContent);
  const root = document.getElementById('wow');
  const cv = document.getElementById('wow-bg');
  const ctx = cv.getContext('2d');
  const core = document.getElementById('wow-core');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmt = (n) => Number(n).toLocaleString('es-CO');
  const TEAL = '31,165,154', MINT = '143,227,217', AMBER = '242,178,74', SKY = '120,170,255';

  let W, H, dpr, stars = [], sphere = [], edges = [], pulses = [], streams = [], flash = 0;
  let cx = 0, cy = 0, R = 120;

  // Esfera de Fibonacci
  const N = 170;
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = i * 2.399963;
    sphere.push({ x: Math.cos(th) * r, y, z: Math.sin(th) * r, a: Math.random() * 0.4 });
  }
  for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
    const a = sphere[i], b = sphere[j];
    if ((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2 < 0.09) edges.push([i, j]);
  }

  function layout() {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = innerWidth; H = Math.max(innerHeight, root.scrollHeight);
    cv.width = W * dpr; cv.height = H * dpr; cv.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const r = core.getBoundingClientRect(), top = root.getBoundingClientRect().top;
    cx = r.left + r.width / 2; cy = r.top - top + r.height / 2; R = Math.min(r.width, r.height) * 0.62;
    stars = Array.from({ length: Math.round((W * H) / 9000) }, () => ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.3 + 0.2, s: Math.random() * 0.25 + 0.05, t: Math.random() * 6 }));
    const anchor = (el, side) => { const b = el.getBoundingClientRect(); return { x: side === 'r' ? b.right : b.left, y: b.top - top + b.height / 2, el }; };
    const stacked = innerWidth <= 900;
    streams = stacked ? [] : [
      ...[...root.querySelectorAll('.chip[data-i]')].map((el) => ({ from: anchor(el, 'r'), dir: 'in' })),
      ...[...root.querySelectorAll('.chip[data-o]')].map((el) => ({ to: anchor(el, 'l'), dir: 'out' })),
    ];
  }

  const bez = (p0, p1, p2, p3, t) => {
    const u = 1 - t;
    return { x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x, y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y };
  };
  const curve = (s) => {
    const c = { x: cx, y: cy };
    if (s.dir === 'in') { const a = s.from, m = (c.x - a.x) / 2; return [a, { x: a.x + m, y: a.y }, { x: c.x - m, y: c.y }, c]; }
    const b = s.to, m = (b.x - c.x) / 2; return [c, { x: c.x + m, y: c.y }, { x: b.x - m, y: b.y }, b];
  };
  const particles = [];
  function emit(s) { particles.push({ s, t: 0, v: 0.006 + Math.random() * 0.006, w: Math.random() * 1.5 + 1.5 }); }

  let rot = 0, tilt = 0.35;
  function frame(time) {
    ctx.clearRect(0, 0, W, H);
    // estrellas
    for (const st of stars) {
      st.y -= st.s; if (st.y < 0) st.y = H;
      ctx.fillStyle = `rgba(${MINT},${0.25 + 0.35 * Math.abs(Math.sin(time / 1500 + st.t))})`;
      ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, 6.283); ctx.fill();
    }
    // corrientes de datos
    for (const s of streams) {
      const p = curve(s);
      ctx.strokeStyle = s.dir === 'in' ? `rgba(${TEAL},.16)` : `rgba(${AMBER},.16)`; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y); ctx.bezierCurveTo(p[1].x, p[1].y, p[2].x, p[2].y, p[3].x, p[3].y); ctx.stroke();
      if (!reduce && Math.random() < (s.dir === 'in' ? 0.05 : 0.03)) emit(s);
    }
    for (const pt of particles) {
      pt.t += pt.v;
      const p = curve(pt.s), q = bez(p[0], p[1], p[2], p[3], Math.min(1, pt.t));
      const col = pt.s.dir === 'in' ? MINT : AMBER;
      const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, pt.w * 5);
      g.addColorStop(0, `rgba(${col},.95)`); g.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(q.x, q.y, pt.w * 5, 0, 6.283); ctx.fill();
      if (pt.t >= 1) {
        pt.done = true;
        if (pt.s.dir === 'in') { flash = Math.min(1, flash + 0.25); sphere[Math.floor(Math.random() * N)].a = 1; }
        else say(pt.s.to.el);
      }
    }
    for (let i = particles.length - 1; i >= 0; i--) if (particles[i].done) particles.splice(i, 1);

    // esfera
    rot += reduce ? 0 : 0.0035;
    const cr = Math.cos(rot), sr = Math.sin(rot), ct = Math.cos(tilt), stt = Math.sin(tilt);
    const pr = sphere.map((n) => {
      const x = n.x * cr + n.z * sr, z1 = -n.x * sr + n.z * cr;
      const y = n.y * ct - z1 * stt, z = n.y * stt + z1 * ct;
      const k = 1 / (1.9 - z * 0.6);
      return { x: cx + x * R * k * 1.2, y: cy + y * R * k * 1.2, z, n };
    });
    const halo = ctx.createRadialGradient(cx, cy, R * 0.1, cx, cy, R * 1.9);
    halo.addColorStop(0, `rgba(${TEAL},${0.18 + flash * 0.25})`); halo.addColorStop(0.5, `rgba(${SKY},.06)`); halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(cx, cy, R * 1.9, 0, 6.283); ctx.fill();
    flash *= 0.96;
    for (const [i, j] of edges) {
      const a = pr[i], b = pr[j], d = (a.z + b.z) / 2;
      ctx.strokeStyle = `rgba(${MINT},${0.05 + (d + 1) * 0.12})`; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    if (!reduce && Math.random() < 0.35) { const e = edges[Math.floor(Math.random() * edges.length)]; pulses.push({ e, t: 0 }); }
    for (const p of pulses) {
      const a = pr[p.e[0]], b = pr[p.e[1]]; p.t += 0.04;
      const x = a.x + (b.x - a.x) * p.t, y = a.y + (b.y - a.y) * p.t;
      ctx.fillStyle = `rgba(255,255,255,${0.9 - p.t * 0.6})`; ctx.beginPath(); ctx.arc(x, y, 1.8, 0, 6.283); ctx.fill();
      if (p.t >= 1) { p.done = true; pr[p.e[1]].n.a = Math.min(1, pr[p.e[1]].n.a + 0.5); }
    }
    pulses = pulses.filter((p) => !p.done).slice(-140);
    for (const p of pr.sort((a, b) => a.z - b.z)) {
      const r = 1.4 + (p.z + 1) * 1.4 + p.n.a * 2.5;
      ctx.fillStyle = p.n.a > 0.3 ? `rgba(${AMBER},${0.6 + p.n.a * 0.4})` : `rgba(${MINT},${0.35 + (p.z + 1) * 0.3})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 6.283); ctx.fill();
      p.n.a *= 0.97;
    }
    if (!reduce) requestAnimationFrame(frame);
  }

  // Cada salida dice una frase completa de lo que la IA produjo
  const idx = {};
  function say(el) {
    el.classList.add('lit'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('lit'), 900);
    const k = el.dataset.o, pool = D.outs?.[k] || [];
    if (pool.length < 2 || el._busy || Date.now() - (el._at || 0) < 4200) return;
    el._busy = true; el._at = Date.now();
    const p = el.querySelector('.say'); p.classList.add('swap');
    setTimeout(() => { idx[k] = ((idx[k] ?? 0) + 1) % pool.length; p.textContent = pool[idx[k]]; p.classList.remove('swap'); el._busy = false; }, 350);
  }

  // Contadores
  const count = () => root.querySelectorAll('[data-count]').forEach((b) => {
    const to = Number(b.dataset.count);
    if (reduce || !to) { b.textContent = fmt(to); return; }
    const t0 = performance.now();
    const step = (t) => { const k = Math.min(1, (t - t0) / 2200); b.textContent = fmt(Math.round(to * (1 - Math.pow(1 - k, 4)))); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });

  // Frase que se escribe sola
  const tag = document.getElementById('wow-tag');
  let ti = 0;
  function typeLine() {
    const txt = D.taglines[ti++ % D.taglines.length];
    if (reduce) { tag.textContent = txt; return; }
    let i = 0;
    const w = setInterval(() => { tag.textContent = txt.slice(0, ++i); if (i >= txt.length) { clearInterval(w); setTimeout(() => erase(txt), 2200); } }, 45);
  }
  function erase(txt) {
    let i = txt.length;
    const w = setInterval(() => { tag.textContent = txt.slice(0, --i); if (i <= 0) { clearInterval(w); typeLine(); } }, 22);
  }

  // Lo último que aprendió
  const it = document.getElementById('wow-insight'), is = document.getElementById('wow-insight-s');
  let li = 0;
  function nextInsight() {
    if (!D.learned.length) { it.textContent = 'Esperando las primeras evaluaciones del equipo…'; return; }
    const x = D.learned[li++ % D.learned.length];
    it.classList.remove('show'); is.classList.remove('show');
    setTimeout(() => {
      it.textContent = x.t; is.textContent = `${x.k === 'brecha' ? 'Por reforzar' : 'Fortaleza'} · ${x.a}`;
      it.className = `wow-insight-t show ${x.k === 'brecha' ? 'gap' : 'str'}`; is.classList.add('show');
    }, 250);
  }

  layout();
  addEventListener('resize', layout);
  document.addEventListener('fullscreenchange', () => setTimeout(layout, 80));
  document.fonts?.ready.then(layout);
  requestAnimationFrame(frame);
  count(); typeLine(); nextInsight();
  if (!reduce) setInterval(nextInsight, 3800);
  // En móvil no hay corrientes: los resultados se encienden por turnos
  if (!reduce) setInterval(() => {
    if (innerWidth > 900) return;
    const outs = root.querySelectorAll('.chip[data-o]'); if (!outs.length) return;
    const el = outs[Math.floor(Math.random() * outs.length)];
    flash = 1; say(el);
  }, 1400);

  document.getElementById('wow-full').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.();
  });
})();
