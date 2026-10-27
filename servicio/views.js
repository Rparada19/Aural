import { AREAS, areaLabel } from './areas.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const STATUS = {
  pendiente: ['Pendiente', 'muted'],
  en_curso: ['En curso', 'warn'],
  enviada: ['Enviada', 'info'],
  analizando: ['Analizando', 'info'],
  analizada: ['Informe listo', 'ok'],
};
export const badge = (s) => { const [l, c] = STATUS[s] || [s, 'muted']; return `<span class="badge ${c}">${esc(l)}</span>`; };
const fdate = (d) => (d ? new Date(d).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Bogota' }) : '—');

export function layout(title, body, user, { wide = false } = {}) {
  const nav = user
    ? `<nav>${user.role === 'admin' ? '<a href="/admin">Equipo</a><a href="/admin/preguntas">Preguntas</a>' : '<a href="/">Mi evaluación</a>'}
       <form method="post" action="/salir"><button class="link">Salir</button></form></nav>`
    : '';
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · Aural Servicio</title><link rel="icon" href="/logo-aural-simbolo.png"><link rel="stylesheet" href="/style.css"></head>
<body><header class="top"><a href="/" class="brand"><img src="/logo-aural.png" alt="Aural"><span>Servicio</span></a>${nav}</header>
<main class="${wide ? 'wide' : ''}">${body}</main></body></html>`;
}

export const loginPage = (msg = '', err = '') => `
<section class="card narrow">
  <p class="eyebrow">Evaluación de servicio</p>
  <h1>Entra con tu correo</h1>
  <p class="muted">Te enviaremos un enlace de acceso. No necesitas contraseña.</p>
  ${msg ? `<p class="notice ok">${esc(msg)}</p>` : ''}${err ? `<p class="notice err">${esc(err)}</p>` : ''}
  <form method="post" action="/login" class="stack">
    <label>Correo<input type="email" name="email" required autocomplete="email" placeholder="tu@correo.com"></label>
    <button class="btn">Enviarme el enlace</button>
  </form>
</section>`;

// ---------- Profesional ----------

export function staffHome(user, ev) {
  const first = esc((user.name || '').split(' ')[0]);
  if (!ev) return `<section class="card narrow"><h1>Hola${first ? ` ${first}` : ''}</h1><p class="muted">Aún no tienes una evaluación asignada. Tu líder te avisará cuando esté lista.</p></section>`;
  if (ev.plan_published && ev.report) return planView(user, ev.report);
  if (['enviada', 'analizando', 'analizada'].includes(ev.status)) {
    return `<section class="card narrow"><p class="eyebrow">Evaluación enviada</p><h1>¡Gracias${first ? `, ${first}` : ''}!</h1>
      <p>Recibimos tus respuestas el ${fdate(ev.submitted_at)}. Tu líder revisará los resultados y en los próximos días tendrás aquí tu plan de trabajo personal.</p></section>`;
  }
  const total = ev.questions.length;
  const done = Object.keys(ev.answers || {}).filter((k) => !empty(ev.answers[k])).length;
  if (ev.status === 'pendiente' || done === 0) {
    const mods = [...new Set(ev.questions.map((x) => x.module))];
    return `<section class="card narrow"><p class="eyebrow">Evaluación · ${esc(areaLabel(ev.area))}</p><h1>Hola${first ? ` ${first}` : ''}</h1>
      <p>Esta evaluación nos ayuda a conocer cómo atiendes hoy, reconocer lo que haces bien y construir contigo un plan de crecimiento que trabajaremos uno a uno.</p>
      <ul class="facts"><li><strong>${total}</strong> preguntas</li><li><strong>~40</strong> minutos</li><li>Se guarda sola</li></ul>
      <p class="muted">Responde con sinceridad y con tus propias palabras: no hay respuestas "para quedar bien", y lo importante es cómo trabajas en la realidad.</p>
      <ol class="modlist">${mods.map((m) => `<li>${esc(m)}</li>`).join('')}</ol>
      <a class="btn" href="/evaluacion">Comenzar</a></section>`;
  }
  return `<section class="card narrow"><h1>Continúa tu evaluación</h1><p>Llevas ${done} de ${total} preguntas respondidas.</p>
    <div class="bar"><span style="width:${Math.round((done / total) * 100)}%"></span></div><a class="btn" href="/evaluacion">Continuar</a></section>`;
}

const empty = (v) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);

function field(qu, a) {
  const n = `q${qu.id}`;
  if (qu.type === 'open') return `<textarea name="${n}" rows="5" placeholder="Escribe tu respuesta…">${esc(a || '')}</textarea>`;
  if (qu.type === 'scale') return `<div class="scale">${qu.options.map((o, i) => `<label><input type="radio" name="${n}" value="${i + 1}" ${Number(a) === i + 1 ? 'checked' : ''}><span><b>${i + 1}</b>${esc(o)}</span></label>`).join('')}</div>`;
  const multi = qu.type === 'multi';
  const sel = multi ? (a || []).map(Number) : [Number(a)];
  return `<div class="opts">${qu.options.map((o, i) => `<label><input type="${multi ? 'checkbox' : 'radio'}" name="${n}" value="${i}" ${a !== undefined && a !== null && a !== '' && sel.includes(i) ? 'checked' : ''}><span>${esc(o)}</span></label>`).join('')}</div>`;
}

export function evaluationForm(ev) {
  const mods = [...new Set(ev.questions.map((x) => x.module))];
  let n = 0;
  const steps = mods.map((m, mi) => {
    const qs = ev.questions.filter((x) => x.module === m);
    return `<section class="step" data-step="${mi}" ${mi ? 'hidden' : ''}>
      <p class="eyebrow">Módulo ${mi + 1} de ${mods.length}</p><h2>${esc(m)}</h2>
      ${qs.map((qu) => `<fieldset class="q" data-type="${qu.type}" data-id="${qu.id}"><legend><span class="num">${++n}</span>${esc(qu.text)}${qu.type === 'multi' ? '' : ''}</legend>${field(qu, ev.answers[qu.id])}</fieldset>`).join('')}
      <div class="nav">${mi ? '<button type="button" class="btn ghost" data-prev>Anterior</button>' : '<span></span>'}
      ${mi < mods.length - 1 ? '<button type="button" class="btn" data-next>Siguiente</button>' : '<button type="submit" class="btn">Enviar evaluación</button>'}</div>
    </section>`;
  }).join('');
  return `<form id="ev" method="post" action="/evaluacion/enviar" class="card evalform">
    <div class="progress"><div class="bar"><span id="pbar"></span></div><span id="ptext" class="muted"></span><span id="saved" class="muted"></span></div>
    ${steps}<p id="err" class="notice err" hidden></p></form><script src="/eval.js"></script>`;
}

export function planView(user, r) {
  const p = r.plan || {};
  return `<section class="card"><p class="eyebrow">Mi plan de trabajo</p><h1>${esc(p.objetivo || 'Plan de trabajo')}</h1>
    ${p.mensaje ? `<p class="lead">${esc(p.mensaje)}</p>` : ''}
    <h2>Ruta de 8 semanas</h2><div class="weeks">${(p.semanas || []).map((s) => `<div class="week"><p class="eyebrow">${esc(s.semana)}</p><h3>${esc(s.foco)}</h3><ul>${(s.acciones || []).map((a) => `<li>${esc(a)}</li>`).join('')}</ul><p class="muted small"><strong>Cómo lo mediremos:</strong> ${esc(s.indicador)}</p></div>`).join('')}</div>
    <h2>Temas de nuestras sesiones uno a uno</h2><ul class="topics">${(p.sesiones_1a1 || []).map((s) => `<li>${esc(s.tema)}</li>`).join('')}</ul></section>`;
}

// ---------- Admin ----------

export function adminHome(people, mailOk) {
  const row = (p) => `<tr><td><a href="/admin/personas/${p.id}"><strong>${esc(p.name)}</strong></a><br><span class="muted small">${esc(p.email)}${p.cargo ? ` · ${esc(p.cargo)}` : ''}</span></td>
    <td>${esc(p.sede)}</td><td>${p.status ? badge(p.status) : '<span class="muted">Sin evaluación</span>'}${p.plan_published ? ' <span class="badge ok">Plan publicado</span>' : ''}</td>
    <td>${p.score ?? '—'}</td><td>${fdate(p.submitted_at)}</td><td>${p.sessions || 0}</td><td><a href="/admin/personas/${p.id}">Ver</a></td></tr>`;
  const groups = Object.entries(AREAS).map(([k, a]) => {
    const list = people.filter((p) => p.area === k);
    const done = list.filter((p) => ['enviada', 'analizando', 'analizada'].includes(p.status)).length;
    return `<section class="card"><div class="row-head"><h2>${esc(a.label)}</h2><span class="muted small">${list.length} personas · ${done} evaluaciones enviadas</span></div>
      <table class="tbl"><thead><tr><th>Profesional</th><th>Sede</th><th>Estado</th><th>Puntaje</th><th>Enviada</th><th>1:1</th><th></th></tr></thead><tbody>
      ${list.length ? list.map(row).join('') : '<tr><td colspan="7" class="muted">Aún no hay profesionales en esta área.</td></tr>'}</tbody></table></section>`;
  }).join('');
  return `<div class="row-head"><div><p class="eyebrow">Evaluación de servicio</p><h1>Equipo de servicio al cliente</h1></div></div>
  ${!mailOk ? '<p class="notice warn">El envío de correos no está configurado: al agregar a alguien verás su enlace para enviarlo por WhatsApp.</p>' : ''}
  <section class="card"><h2>Agregar profesional</h2>
    <form method="post" action="/admin/personas" class="grid5">
      <label>Nombre<input name="name" required></label><label>Correo<input type="email" name="email" required></label>
      <label>Área<select name="area" required><option value="">Selecciona…</option>${Object.entries(AREAS).map(([k, a]) => `<option value="${k}">${esc(a.label.replace('Servicio al cliente · ', '').replace('Servicio al cliente ', ''))}</option>`).join('')}</select></label>
      <label>Cargo<input name="cargo" placeholder="Opcional"></label><label>Sede<input name="sede"></label>
      <button class="btn">Agregar e invitar</button></form></section>
  ${groups}`;
}

function reportView(ev) {
  const r = ev.report;
  const p = r.plan || {};
  return `<section class="card report">
    <div class="row-head"><div><p class="eyebrow">Informe · ${fdate(ev.analyzed_at)}</p><h2>Conclusiones</h2></div>
      <div class="score"><b>${r.puntaje_global}</b><span>${esc(r.nivel || '')}</span></div></div>
    <p class="lead">${esc(r.resumen)}</p>
    ${r.alertas && r.alertas.length ? `<div class="notice err"><strong>Alertas</strong><ul>${r.alertas.map((a) => `<li>${esc(a)}</li>`).join('')}</ul></div>` : ''}
    <h3>Por módulo</h3><div class="mods">${(r.modulos || []).map((m) => `<div class="mod"><div class="mh"><span>${esc(m.modulo)}</span><b>${m.puntaje}</b></div><div class="bar"><span style="width:${m.puntaje}%"></span></div><p class="small">${esc(m.comentario)}</p></div>`).join('')}</div>
    <div class="two"><div><h3>Fortalezas</h3><ul class="ev">${(r.fortalezas || []).map((f) => `<li><strong>${esc(f.titulo)}</strong><span>${esc(f.evidencia)}</span></li>`).join('')}</ul></div>
    <div><h3>Oportunidades de mejora</h3><ul class="ev">${(r.oportunidades || []).map((f) => `<li><strong>${esc(f.titulo)}</strong><span>${esc(f.evidencia)}</span><em>${esc(f.impacto)}</em></li>`).join('')}</ul></div></div>
    ${r.autopercepcion ? `<h3>Autopercepción vs. desempeño</h3><p>${esc(r.autopercepcion)}</p>` : ''}
    <h3>Plan de trabajo</h3><p><strong>${esc(p.objetivo)}</strong></p>
    <div class="weeks">${(p.semanas || []).map((s) => `<div class="week"><p class="eyebrow">${esc(s.semana)}</p><h4>${esc(s.foco)}</h4><ul>${(s.acciones || []).map((a) => `<li>${esc(a)}</li>`).join('')}</ul><p class="muted small"><strong>Indicador:</strong> ${esc(s.indicador)}</p></div>`).join('')}</div>
    <h3>Guía para sesiones uno a uno</h3><div class="two">${(p.sesiones_1a1 || []).map((s) => `<div class="week"><h4>${esc(s.tema)}</h4><ul>${(s.preguntas_guia || []).map((g) => `<li>${esc(g)}</li>`).join('')}</ul></div>`).join('')}</div>
    ${p.mensaje ? `<h3>Mensaje para el profesional</h3><p class="lead">${esc(p.mensaje)}</p>` : ''}
  </section>`;
}

function answersView(ev) {
  return `<details class="card"><summary><h2>Respuestas (${ev.questions.length})</h2></summary>${ev.questions.map((qu, i) => {
    const a = ev.answers[qu.id];
    let txt = '<span class="muted">Sin respuesta</span>';
    let mark = '';
    if (!empty(a)) {
      if (qu.type === 'open') txt = `<p class="pre">${esc(a)}</p>`;
      else if (qu.type === 'scale') txt = `${a}/5 · ${esc(qu.options[a - 1])}`;
      else if (qu.type === 'single') { txt = esc(qu.options[a]); if (qu.correct !== null && qu.correct !== undefined) mark = Number(a) === qu.correct ? ' <span class="badge ok">Correcta</span>' : ` <span class="badge err">Esperada: ${esc(qu.options[qu.correct])}</span>`; }
      else { const s = a.map(Number); txt = s.map((x) => esc(qu.options[x])).join('<br>'); if (Array.isArray(qu.correct)) mark = qu.correct.length === s.length && qu.correct.every((x) => s.includes(x)) ? ' <span class="badge ok">Correcta</span>' : ' <span class="badge err">Incompleta o con errores</span>'; }
    }
    return `<div class="ans"><p class="muted small">${i + 1}. ${esc(qu.module)}</p><p><strong>${esc(qu.text)}</strong></p><div>${txt}${mark}</div></div>`;
  }).join('')}</details>`;
}

export function adminPerson(person, evs, sessions, inviteLink, mailOk) {
  const ev = evs[0];
  const actions = ev ? `
    <form method="post" action="/admin/evaluaciones/${ev.id}/analizar" class="inline"><button class="btn ghost" ${['enviada', 'analizada'].includes(ev.status) ? '' : 'disabled'}>${ev.report ? 'Regenerar análisis' : 'Analizar ahora'}</button></form>
    ${ev.report ? `<form method="post" action="/admin/evaluaciones/${ev.id}/publicar" class="inline"><button class="btn ${ev.plan_published ? 'ghost' : ''}">${ev.plan_published ? 'Ocultar plan al profesional' : 'Publicar plan al profesional'}</button></form>` : ''}
    <button class="btn ghost" onclick="print()">Imprimir</button>` : '';
  return `<p><a href="/admin">← Equipo</a></p>
  <div class="row-head"><div><p class="eyebrow">${esc(areaLabel(person.area))}${person.cargo ? ` · ${esc(person.cargo)}` : ''}${person.sede ? ` · ${esc(person.sede)}` : ''}</p><h1>${esc(person.name)}</h1><p class="muted">${esc(person.email)}</p></div>
    <div class="actions"><form method="post" action="/admin/personas/${person.id}/enlace" class="inline"><button class="btn ghost">${mailOk ? 'Reenviar enlace' : 'Generar enlace'}</button></form>
    <form method="post" action="/admin/personas/${person.id}/evaluacion" class="inline" onsubmit="return confirm('¿Asignar una nueva evaluación? La anterior queda en el historial.')"><button class="btn ghost">Nueva evaluación</button></form></div></div>
  ${inviteLink ? `<div class="notice ok">Enlace de acceso (vence en 7 días): <input class="copy" readonly value="${esc(inviteLink)}" onclick="this.select()"></div>` : ''}
  ${ev ? `<section class="card"><div class="row-head"><div>${badge(ev.status)} <span class="muted small">Asignada ${fdate(ev.created_at)} · Enviada ${fdate(ev.submitted_at)}</span></div><div class="actions">${actions}</div></div>
    ${ev.status === 'analizando' ? '<p class="notice info">Analizando respuestas… recarga en un minuto.</p><script>setTimeout(()=>location.reload(),15000)</script>' : ''}
    ${ev.report_error ? `<p class="notice err">No se pudo generar el análisis: ${esc(ev.report_error)}</p>` : ''}</section>
    ${ev.report ? reportView(ev) : ''}${Object.keys(ev.answers).length ? answersView(ev) : ''}` : '<section class="card"><p class="muted">Sin evaluación asignada.</p></section>'}
  <section class="card"><h2>Sesiones uno a uno</h2>
    <form method="post" action="/admin/personas/${person.id}/sesiones" class="stack">
      <div class="grid2"><label>Fecha<input type="date" name="fecha" required value="${new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })}"></label></div>
      <label>Notas de la sesión<textarea name="notas" rows="3" required></textarea></label>
      <label>Compromisos<textarea name="compromisos" rows="2"></textarea></label><button class="btn">Guardar sesión</button></form>
    ${sessions.map((s) => `<div class="session"><p class="eyebrow">${fdate(s.fecha)}</p><p class="pre">${esc(s.notas)}</p>${s.compromisos ? `<p class="pre"><strong>Compromisos:</strong> ${esc(s.compromisos)}</p>` : ''}</div>`).join('')}
  </section>
  ${evs.length > 1 ? `<section class="card"><h2>Historial</h2><ul>${evs.slice(1).map((e) => `<li>${fdate(e.created_at)} · ${badge(e.status)} ${e.report ? `· Puntaje ${e.report.puntaje_global}` : ''}</li>`).join('')}</ul></section>` : ''}`;
}

const TYPES = { single: 'Selección única', multi: 'Selección múltiple', scale: 'Escala 1–5', open: 'Abierta' };

export function adminQuestions(qs, area) {
  const row = (x) => `<form method="post" action="/admin/preguntas/${x.id ?? 'nueva'}" class="qedit card ${x.active === false ? 'off' : ''}"><input type="hidden" name="area" value="${area}">
    <div class="grid3"><label>Módulo<input name="module" value="${esc(x.module)}" required></label>
    <label>Tipo<select name="type">${Object.entries(TYPES).map(([k, v]) => `<option value="${k}" ${x.type === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
    <label>Orden<input type="number" name="position" value="${x.position ?? ''}"></label></div>
    <label>Pregunta<textarea name="text" rows="2" required>${esc(x.text)}</textarea></label>
    <label>Opciones (una por línea; para escala, las 5 etiquetas)<textarea name="options" rows="3">${esc((x.options || []).join('\n'))}</textarea></label>
    <label>Respuesta(s) esperada(s): número de opción empezando en 1, separadas por coma. Vacío si es de criterio.<input name="correct" value="${esc(x.correct === null || x.correct === undefined ? '' : [].concat(x.correct).map((c) => c + 1).join(', '))}"></label>
    <div class="nav">${x.id ? `<label class="check"><input type="checkbox" name="active" ${x.active ? 'checked' : ''}> Activa</label>` : '<span></span>'}<button class="btn">${x.id ? 'Guardar' : 'Agregar pregunta'}</button></div></form>`;
  return `<p class="eyebrow">Banco de preguntas</p><h1>${esc(areaLabel(area))}</h1>
    <div class="tabs">${Object.entries(AREAS).map(([k, a]) => `<a href="/admin/preguntas?area=${k}" class="${k === area ? 'on' : ''}">${esc(a.label.replace('Servicio al cliente · ', '').replace('Servicio al cliente ', ''))}</a>`).join('')}</div>
    <p><strong>${qs.filter((x) => x.active).length}</strong> preguntas activas.</p>
    <p class="muted">Los cambios aplican a las evaluaciones que se asignen desde ahora; las ya asignadas conservan sus preguntas.</p>
    ${qs.map(row).join('')}<h2>Nueva pregunta</h2>${row({ module: '', type: 'open', text: '', options: [], correct: null })}`;
}
