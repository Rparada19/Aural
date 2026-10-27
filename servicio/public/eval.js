(() => {
  const form = document.getElementById('ev');
  const steps = [...form.querySelectorAll('.step')];
  const qs = [...form.querySelectorAll('fieldset.q')];
  const pbar = document.getElementById('pbar');
  const ptext = document.getElementById('ptext');
  const saved = document.getElementById('saved');
  const err = document.getElementById('err');
  let cur = 0;
  let timer;

  const value = (f) => {
    const t = f.dataset.type;
    if (t === 'open') return f.querySelector('textarea').value.trim();
    if (t === 'multi') return [...f.querySelectorAll('input:checked')].map((i) => i.value);
    const c = f.querySelector('input:checked');
    return c ? c.value : '';
  };
  const answered = (f) => { const v = value(f); return Array.isArray(v) ? v.length > 0 : v !== ''; };
  const collect = () => Object.fromEntries(qs.map((f) => [f.dataset.id, value(f)]).filter(([, v]) => (Array.isArray(v) ? v.length : v !== '')));

  const progress = () => {
    const n = qs.filter(answered).length;
    pbar.style.width = `${Math.round((n / qs.length) * 100)}%`;
    ptext.textContent = `${n} de ${qs.length} respondidas`;
  };

  const save = async () => {
    saved.textContent = 'Guardando…';
    try {
      const r = await fetch('/evaluacion/guardar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers: collect() }) });
      saved.textContent = r.ok ? 'Guardado' : 'No se pudo guardar';
    } catch { saved.textContent = 'Sin conexión, reintentaremos'; }
  };
  form.addEventListener('input', (e) => {
    e.target.closest('fieldset')?.classList.remove('missing');
    progress();
    clearTimeout(timer);
    timer = setTimeout(save, 800);
  });

  const show = (i) => {
    steps[cur].hidden = true; cur = i; steps[cur].hidden = false;
    err.hidden = true; window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const check = (scope) => {
    const miss = [...scope.querySelectorAll('fieldset.q')].filter((f) => !answered(f));
    miss.forEach((f) => f.classList.add('missing'));
    if (miss.length) { err.textContent = `Te falta responder ${miss.length} pregunta${miss.length > 1 ? 's' : ''} de este módulo.`; err.hidden = false; miss[0].scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    return !miss.length;
  };
  form.addEventListener('click', (e) => {
    if (e.target.matches('[data-next]') && check(steps[cur])) { save(); show(cur + 1); }
    if (e.target.matches('[data-prev]')) show(cur - 1);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!check(steps[cur])) return;
    if (!confirm('¿Enviar tu evaluación? Después no podrás modificar las respuestas.')) return;
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Enviando…';
    const r = await fetch('/evaluacion/enviar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers: collect() }) });
    if (r.ok) return location.assign('/');
    const data = await r.json().catch(() => ({}));
    btn.disabled = false; btn.textContent = 'Enviar evaluación';
    if (data.missing?.length) {
      const first = form.querySelector(`fieldset[data-id="${data.missing[0]}"]`);
      data.missing.forEach((id) => form.querySelector(`fieldset[data-id="${id}"]`)?.classList.add('missing'));
      show(steps.indexOf(first.closest('.step')));
      err.textContent = 'Hay preguntas sin responder.'; err.hidden = false;
    } else { err.textContent = 'No se pudo enviar. Intenta de nuevo.'; err.hidden = false; }
  });

  // Retoma en el primer módulo incompleto
  const firstOpen = steps.findIndex((s) => [...s.querySelectorAll('fieldset.q')].some((f) => !answered(f)));
  if (firstOpen > 0) show(firstOpen);
  progress();
})();
