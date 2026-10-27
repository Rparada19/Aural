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
export const areaName = (k) => (AREAS[k]?.label || k).replace('Servicio al cliente · ', '').replace('Servicio al cliente ', 'SAC ').replace('Audiología · Atención a pacientes', 'Audiología').replace('Comercial · ', '').replace(' (especialistas de producto B2B)', ' B2B');
const AREA_OPTS = (sel = '') => Object.keys(AREAS).map((k) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${esc(areaName(k))}</option>`).join('');
const sedeField = (sedes, val = '') => sedes.length
  ? `<select name="sede" required><option value="">Selecciona…</option>${sedes.map((x) => `<option ${x === val ? 'selected' : ''}>${esc(x)}</option>`).join('')}${val && !sedes.includes(val) ? `<option selected>${esc(val)}</option>` : ''}</select>`
  : `<input name="sede" required value="${esc(val)}">`;
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const days = (d) => (d ? (Date.now() - new Date(d).getTime()) / 86400000 : Infinity);
export const fmonth = (mes) => new Date(`${mes}-15T12:00:00`).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
const fdate = (d) => (d ? new Date(d).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Bogota' }) : '—');

export function layout(title, body, user, { wide = false } = {}) {
  const nav = user
    ? `<nav>${user.role === 'admin' ? '<a href="/admin">Panel</a><a href="/admin/equipo">Equipo</a><a href="/admin/solicitudes">Solicitudes</a><a href="/admin/estudio">Estudio</a><a href="/admin/mensajes">Mensajes</a><a href="/admin/preguntas">Preguntas</a>' : '<a href="/">Mi espacio</a><a href="/estudio">Estudio</a>'}
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
  <p class="muted small" style="margin-top:18px">¿Aún no tienes cuenta? <a href="/registro">Regístrate aquí</a></p>
</section>`;

export const registerPage = (sedes, err = '', b = {}) => `
<section class="hero"><p class="eyebrow">Aural · Programa de servicio</p>
  <h1>Crece con nosotros en cada atención</h1>
  <p class="lead">Regístrate para hacer parte del programa de servicio Aural: una evaluación personal, un plan de trabajo mensual hecho a tu medida, acompañamiento uno a uno con tu líder y tips diarios para tu día a día.</p>
  <ul class="facts"><li><strong>1</strong> evaluación</li><li><strong>Plan</strong> mensual</li><li><strong>Tips</strong> diarios</li></ul></section>
<section class="card narrow" style="margin-top:0">
  <h2>Regístrate</h2>
  ${err ? `<p class="notice err">${esc(err)}</p>` : ''}
  <form method="post" action="/registro" class="stack">
    <label>Nombre completo<input name="name" required value="${esc(b.name)}" autocomplete="name"></label>
    <label>Correo<input type="email" name="email" required value="${esc(b.email)}" autocomplete="email"></label>
    <label>Celular<input name="telefono" value="${esc(b.telefono)}" autocomplete="tel" placeholder="Opcional"></label>
    <label>Área<select name="area" required><option value="">Selecciona…</option>${AREA_OPTS(b.area)}</select></label>
    <label>Sede${sedeField(sedes, b.sede)}</label>
    <label>Cargo<input name="cargo" value="${esc(b.cargo)}" placeholder="Opcional"></label>
    <input name="website" tabindex="-1" autocomplete="off" class="hp" aria-hidden="true">
    <button class="btn">Enviar solicitud</button>
  </form>
  <p class="muted small" style="margin-top:18px">¿Ya tienes cuenta? <a href="/login">Entra aquí</a></p>
</section>`;

export const registerDone = (msg = '') => `<section class="card narrow"><p class="eyebrow">Solicitud recibida</p><h1>¡Gracias por registrarte!</h1>
  <p>${esc(msg || 'Tu líder revisará tu solicitud. Cuando la apruebe te llegará un correo con el enlace para entrar a tu espacio.')}</p><a class="btn ghost" href="/login">Ir a la página de acceso</a></section>`;

// ---------- Profesional ----------

const msgCard = (m) => (m ? `<section class="card tip"><p class="eyebrow">${m.tipo === 'manual' ? 'Mensaje de tu líder' : 'Mensaje del día'}</p><h2>${esc(m.titulo)}</h2><p>${esc(m.mensaje)}</p>${m.tip ? `<div class="tipbox"><strong>Tip para hoy</strong><p>${esc(m.tip)}</p></div>` : ''}</section>` : '');

const ESTADOS = { pendiente: 'Pendiente', en_curso: 'En curso', hecho: 'Hecho' };

function monthlyPlanStaff(plan) {
  const done = plan.items.filter((i) => i.estado === 'hecho').length;
  return `<section class="card" id="plan"><p class="eyebrow">Mi plan de ${esc(fmonth(plan.mes))}</p><h1>${esc(plan.objetivo || 'Plan del mes')}</h1>
    ${plan.mensaje ? `<p class="lead">${esc(plan.mensaje)}</p>` : ''}
    <div class="progress-row"><div class="bar"><span style="width:${pct(done, plan.items.length)}%"></span></div><span class="muted small">${done} de ${plan.items.length} acciones</span></div>
    <div class="items">${plan.items.map((i) => `<form method="post" action="/plan/items/${i.id}" class="item ${i.estado}">
      <div><p class="accion">${esc(i.accion)}</p>${i.indicador ? `<p class="muted small">Cómo se mide: ${esc(i.indicador)}</p>` : ''}
      <input name="nota" value="${esc(i.nota)}" placeholder="¿Cómo te fue? (opcional)"></div>
      <div class="item-actions"><select name="estado">${Object.entries(ESTADOS).map(([k, v]) => `<option value="${k}" ${i.estado === k ? 'selected' : ''}>${v}</option>`).join('')}</select><button class="btn small">Guardar</button></div></form>`).join('')}</div></section>`;
}

const pulseCard = (pulse) => (pulse ? `<section class="card pulse"><p class="eyebrow">Pulso del mes · 1 minuto</p><h2>¿Cómo vivimos el servicio este mes?</h2>
  <p class="muted small">Tus respuestas se muestran de forma agregada y sin tu nombre.</p>
  <form method="post" action="/pulso" class="stack">${pulse.map(([k, t]) => `<fieldset class="q"><legend>${esc(t)}</legend><div class="scale">${['Muy bajo', 'Bajo', 'Regular', 'Bueno', 'Excelente'].map((o, i) => `<label><input type="radio" name="${k}" value="${i + 1}" required><span><b>${i + 1}</b>${o}</span></label>`).join('')}</div></fieldset>`).join('')}
  <label>¿Qué fue lo que más ayudó o afectó el servicio este mes?<textarea name="comentario" rows="3" placeholder="Opcional"></textarea></label>
  <div><button class="btn">Enviar pulso</button></div></form></section>` : '');

export function staffHome(user, ev, plan, msg, pulse, mod) {
  const first = esc((user.name || '').split(' ')[0]);
  const top = msgCard(msg) + studyCard(mod) + (ev && ['enviada', 'analizando', 'analizada'].includes(ev.status) ? pulseCard(pulse) : '');
  if (!ev) return `${top}<section class="card narrow"><h1>Hola${first ? ` ${first}` : ''}</h1><p class="muted">Aún no tienes una evaluación asignada. Tu líder te avisará cuando esté lista.</p></section>`;
  if (ev.plan_published && ev.report) {
    return `${top}${plan ? monthlyPlanStaff(plan) : ''}${plan ? `<details class="card"><summary><h2>Mi ruta de 8 semanas</h2></summary>${planView(user, ev.report)}</details>` : planView(user, ev.report)}`;
  }
  if (['enviada', 'analizando', 'analizada'].includes(ev.status)) {
    return `${top}<section class="card narrow"><p class="eyebrow">Evaluación enviada</p><h1>¡Gracias${first ? `, ${first}` : ''}!</h1>
      <p>Recibimos tus respuestas el ${fdate(ev.submitted_at)}. Tu líder revisará los resultados y en los próximos días tendrás aquí tu plan de trabajo personal.</p></section>`;
  }
  const total = ev.questions.length;
  const done = Object.keys(ev.answers || {}).filter((k) => !empty(ev.answers[k])).length;
  if (ev.status === 'pendiente' || done === 0) {
    const mods = [...new Set(ev.questions.map((x) => x.module))];
    return `${top}<section class="card narrow"><p class="eyebrow">Evaluación · ${esc(areaLabel(ev.area))}</p><h1>Hola${first ? ` ${first}` : ''}</h1>
      <p>Esta evaluación nos ayuda a conocer cómo atiendes hoy, reconocer lo que haces bien y construir contigo un plan de crecimiento que trabajaremos uno a uno.</p>
      <ul class="facts"><li><strong>${total}</strong> preguntas</li><li><strong>~40</strong> minutos</li><li>Se guarda sola</li></ul>
      <p class="muted">Responde con sinceridad y con tus propias palabras: no hay respuestas "para quedar bien", y lo importante es cómo trabajas en la realidad.</p>
      <ol class="modlist">${mods.map((m) => `<li>${esc(m)}</li>`).join('')}</ol>
      <a class="btn" href="/evaluacion">Comenzar</a></section>`;
  }
  return `${top}<section class="card narrow"><h1>Continúa tu evaluación</h1><p>Llevas ${done} de ${total} preguntas respondidas.</p>
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
  return `<section class="card plain"><p class="eyebrow">Mi plan de trabajo</p><h1>${esc(p.objetivo || 'Plan de trabajo')}</h1>
    ${p.mensaje ? `<p class="lead">${esc(p.mensaje)}</p>` : ''}
    <h2>Ruta de 8 semanas</h2><div class="weeks">${(p.semanas || []).map((s) => `<div class="week"><p class="eyebrow">${esc(s.semana)}</p><h3>${esc(s.foco)}</h3><ul>${(s.acciones || []).map((a) => `<li>${esc(a)}</li>`).join('')}</ul><p class="muted small"><strong>Cómo lo mediremos:</strong> ${esc(s.indicador)}</p></div>`).join('')}</div>
    <h2>Temas de nuestras sesiones uno a uno</h2><ul class="topics">${(p.sesiones_1a1 || []).map((s) => `<li>${esc(s.tema)}</li>`).join('')}</ul></section>`;
}

// ---------- Admin ----------

export function adminHome(people, mailOk, sedes = []) {
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
  return `<div class="row-head"><div><p class="eyebrow">Evaluación de servicio</p><h1>Equipo</h1></div></div>
  ${!mailOk ? '<p class="notice warn">El envío de correos no está configurado: al agregar a alguien verás su enlace para enviarlo por WhatsApp.</p>' : ''}
  <section class="card"><h2>Agregar profesional</h2>
    <form method="post" action="/admin/personas" class="grid5">
      <label>Nombre<input name="name" required></label><label>Correo<input type="email" name="email" required></label>
      <label>Área<select name="area" required><option value="">Selecciona…</option>${Object.entries(AREAS).map(([k, a]) => `<option value="${k}">${esc(areaName(k))}</option>`).join('')}</select></label>
      <label>Cargo<input name="cargo" placeholder="Opcional"></label><label>Sede${sedeField(sedes)}</label>
      <button class="btn">Agregar e invitar</button></form>
    <p class="muted small">También pueden registrarse solos en <a href="/registro">/registro</a> y tú apruebas la solicitud.</p></section>
  ${groups}
  <section class="card"><h2>Sedes</h2><form method="post" action="/admin/sedes" class="stack"><label>Una sede por línea (aparecen en el registro)<textarea name="sedes" rows="5">${esc(sedes.join('\n'))}</textarea></label><div><button class="btn ghost">Guardar sedes</button></div></form></section>`;
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

export function adminPerson(person, evs, sessions, inviteLink, mailOk, plans = [], mes = '', error = '') {
  const ev = evs[0];
  const actions = ev ? `
    <form method="post" action="/admin/evaluaciones/${ev.id}/analizar" class="inline"><button class="btn ghost" ${['enviada', 'analizada'].includes(ev.status) ? '' : 'disabled'}>${ev.report ? 'Regenerar análisis' : 'Analizar ahora'}</button></form>
    ${ev.report ? `<form method="post" action="/admin/evaluaciones/${ev.id}/publicar" class="inline"><button class="btn ${ev.plan_published ? 'ghost' : ''}">${ev.plan_published ? 'Ocultar plan al profesional' : 'Publicar plan al profesional'}</button></form>` : ''}
    <button class="btn ghost" onclick="print()">Imprimir</button>` : '';
  return `<p><a href="/admin">← Panel</a></p>${error ? `<p class="notice err">${esc(error)}</p>` : ''}${person.active ? '' : '<p class="notice warn">Esta persona está desactivada: no puede entrar ni recibe mensajes.</p>'}
  <div class="row-head"><div><p class="eyebrow">${esc(areaLabel(person.area))}${person.cargo ? ` · ${esc(person.cargo)}` : ''}${person.sede ? ` · ${esc(person.sede)}` : ''}</p><h1>${esc(person.name)}</h1><p class="muted">${esc(person.email)}</p></div>
    <div class="actions"><form method="post" action="/admin/personas/${person.id}/enlace" class="inline"><button class="btn ghost">${mailOk ? 'Reenviar enlace' : 'Generar enlace'}</button></form>
    <form method="post" action="/admin/personas/${person.id}/evaluacion" class="inline" onsubmit="return confirm('¿Asignar una nueva evaluación? La anterior queda en el historial.')"><button class="btn ghost">Nueva evaluación</button></form>
    <form method="post" action="/admin/personas/${person.id}/desactivar" class="inline" onsubmit="return confirm('¿Cambiar el estado de esta persona?')"><button class="btn ghost">${person.active ? 'Desactivar' : 'Reactivar'}</button></form></div></div>
  ${inviteLink ? `<div class="notice ok">Enlace de acceso (vence en 7 días): <input class="copy" readonly value="${esc(inviteLink)}" onclick="this.select()"></div>` : ''}
  ${ev ? `<section class="card"><div class="row-head"><div>${badge(ev.status)} <span class="muted small">Asignada ${fdate(ev.created_at)} · Enviada ${fdate(ev.submitted_at)}</span></div><div class="actions">${actions}</div></div>
    ${ev.status === 'analizando' ? '<p class="notice info">Analizando respuestas… recarga en un minuto.</p><script>setTimeout(()=>location.reload(),15000)</script>' : ''}
    ${ev.report_error ? `<p class="notice err">No se pudo generar el análisis: ${esc(ev.report_error)}</p>` : ''}</section>
    ${ev.report ? reportView(ev) : ''}${Object.keys(ev.answers).length ? answersView(ev) : ''}` : '<section class="card"><p class="muted">Sin evaluación asignada.</p></section>'}
  ${plansAdmin(person, plans, mes, Boolean(ev?.report))}
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
    <div class="tabs">${Object.entries(AREAS).map(([k, a]) => `<a href="/admin/preguntas?area=${k}" class="${k === area ? 'on' : ''}">${esc(areaName(k))}</a>`).join('')}</div>
    <p><strong>${qs.filter((x) => x.active).length}</strong> preguntas activas.</p>
    <p class="muted">Los cambios aplican a las evaluaciones que se asignen desde ahora; las ya asignadas conservan sus preguntas.</p>
    ${qs.map(row).join('')}<h2>Nueva pregunta</h2>${row({ module: '', type: 'open', text: '', options: [], correct: null })}`;
}

function planAdminCard(pl, open) {
  const done = pl.items.filter((i) => i.estado === 'hecho').length;
  return `<details class="plan" ${open ? 'open' : ''}><summary><div class="row-head"><div><p class="eyebrow">${esc(fmonth(pl.mes))}</p><h3>${esc(pl.objetivo || 'Sin objetivo')}</h3></div>
      <div class="plan-meta">${pl.published ? '<span class="badge ok">Visible para el profesional</span>' : '<span class="badge warn">Borrador</span>'}<span class="muted small">${done}/${pl.items.length} hechas</span></div></div>
      <div class="bar"><span style="width:${pct(done, pl.items.length)}%"></span></div></summary>
    ${pl.mensaje ? `<p class="muted">${esc(pl.mensaje)}</p>` : ''}
    <form method="post" action="/admin/planes/${pl.id}" class="inline-form"><input type="hidden" name="accion_tipo" value="objetivo"><input name="objetivo" value="${esc(pl.objetivo)}" placeholder="Objetivo del mes"><button class="btn ghost small">Guardar objetivo</button></form>
    <div class="items">${pl.items.map((i) => `<div class="item ${i.estado}"><div><p class="accion">${esc(i.accion)}</p>${i.indicador ? `<p class="muted small">Cómo se mide: ${esc(i.indicador)}</p>` : ''}${i.nota ? `<p class="small"><strong>Nota del profesional:</strong> ${esc(i.nota)}</p>` : ''}</div>
      <div class="item-actions"><form method="post" action="/admin/items/${i.id}"><select name="estado" onchange="this.form.submit()">${Object.entries(ESTADOS).map(([k, v]) => `<option value="${k}" ${i.estado === k ? 'selected' : ''}>${v}</option>`).join('')}</select></form>
      <form method="post" action="/admin/items/${i.id}" onsubmit="return confirm('¿Quitar esta acción?')"><input type="hidden" name="borrar" value="1"><button class="link">Quitar</button></form></div></div>`).join('') || '<p class="muted">Sin acciones todavía.</p>'}</div>
    <form method="post" action="/admin/planes/${pl.id}" class="grid-add"><input type="hidden" name="accion_tipo" value="item"><input name="accion" placeholder="Nueva acción" required><input name="indicador" placeholder="Cómo se mide"><button class="btn ghost small">Agregar</button></form>
    <form method="post" action="/admin/planes/${pl.id}" style="margin-top:12px"><input type="hidden" name="accion_tipo" value="publicar"><button class="btn small ${pl.published ? 'ghost' : ''}">${pl.published ? 'Ocultar al profesional' : 'Publicar al profesional'}</button></form>
  </details>`;
}

function plansAdmin(person, plans, mes, hasReport) {
  const current = plans.find((p) => p.mes === mes);
  return `<section class="card" id="planes"><div class="row-head"><div><p class="eyebrow">Seguimiento mensual</p><h2 style="margin-top:0">Planes de trabajo</h2></div></div>
    ${current ? '' : `<p class="muted">${hasReport ? `Aún no hay plan para ${esc(fmonth(mes))}.` : 'Puedes crear el plan cuando tengas el informe de la evaluación, o hacerlo manual desde ya.'}</p>`}
    <form method="post" action="/admin/personas/${person.id}/planes" class="grid-add" onsubmit="this.querySelector('[data-ia]')?.setAttribute('disabled','');">
      <input type="month" name="mes" value="${mes}" required>
      <button class="btn small" name="modo" value="ia" data-ia>${current ? 'Regenerar con IA' : 'Generar plan con IA'}</button>
      <button class="btn ghost small" name="modo" value="manual">Crear vacío</button></form>
    <p class="muted small">La IA usa el informe, el avance de meses anteriores y las notas de las sesiones 1:1. Las acciones ya iniciadas se conservan.</p>
    ${plans.map((p, i) => planAdminCard(p, i === 0)).join('')}
  </section>`;
}

function lineChart(series) {
  const lines = [
    ['Percepción del servicio', (r) => (r.servicio ? Math.round(r.servicio * 20) : null), 'var(--navy)'],
    ['Avance de planes', (r) => r.avance ?? null, '#2f8f5b'],
    ['Puntaje evaluaciones', (r) => r.puntaje ?? null, '#c27a1a'],
    ['Aprobación de módulos', (r) => r.estudio ?? null, '#7a4fb5'],
  ];
  const W = 640, H = 220, L = 34, R = 12, T = 14, B = 30;
  const n = series.length;
  const x = (i) => L + (n === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (n - 1));
  const y = (v) => T + (1 - v / 100) * (H - T - B);
  const grid = [0, 25, 50, 75, 100].map((v) => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`).join('');
  const xl = series.map((r, i) => `<text x="${x(i)}" y="${H - 8}" text-anchor="middle">${esc(fmonth(r.mes).split(' ')[0].slice(0, 3))}</text>`).join('');
  const paths = lines.map(([, f, c]) => {
    const pts = series.map((r, i) => [i, f(r)]).filter(([, v]) => v !== null);
    if (!pts.length) return '';
    return `<polyline fill="none" stroke="${c}" stroke-width="2.5" points="${pts.map(([i, v]) => `${x(i)},${y(v)}`).join(' ')}"/>${pts.map(([i, v]) => `<circle cx="${x(i)}" cy="${y(v)}" r="4" fill="${c}"><title>${v}</title></circle>`).join('')}`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Evolución mensual">${grid}${xl}${paths}</svg>
    <div class="legend">${lines.map(([l, , c]) => `<span><i style="background:${c}"></i>${l}</span>`).join('')}<span class="muted small">Escala 0–100 (percepción = promedio 1–5 × 20)</span></div>`;
}

function evolution(series, comments, pulse) {
  if (!series.length) return `<section class="card"><h2 style="margin-top:0">Cómo estamos en servicio</h2><p class="muted">La evolución mes a mes aparecerá cuando el equipo responda el pulso mensual, avance en sus planes y se analicen evaluaciones.</p></section>`;
  const last = series[series.length - 1];
  const prev = series[series.length - 2];
  const delta = (k, f = 1) => (prev && last[k] != null && prev[k] != null ? (last[k] - prev[k]) * f : null);
  const arrow = (d, unit = '') => (d === null ? '' : d > 0 ? `<span class="up">▲ ${+d.toFixed(1)}${unit}</span>` : d < 0 ? `<span class="down">▼ ${+Math.abs(d).toFixed(1)}${unit}</span>` : '<span class="muted">=</span>');
  const labels = { servicio: 'Servicio', preparacion: 'Preparación', herramientas: 'Procesos y herramientas', acompanamiento: 'Acompañamiento', motivacion: 'Motivación' };
  return `<section class="card"><div class="row-head"><div><p class="eyebrow">Mes a mes</p><h2 style="margin-top:0">Cómo estamos en servicio</h2></div></div>
    <div class="kpis small">
      <div class="kpi"><b>${last.servicio ?? '—'}<small>/5</small></b><span>Percepción del servicio ${arrow(delta('servicio'))}</span></div>
      <div class="kpi"><b>${last.avance != null ? last.avance + '%' : '—'}</b><span>Avance de planes ${arrow(delta('avance'), ' pts')}</span></div>
      <div class="kpi"><b>${last.puntaje ?? '—'}</b><span>Puntaje evaluaciones ${arrow(delta('puntaje'))}</span></div>
      <div class="kpi"><b>${last.estudio != null ? last.estudio + '%' : '—'}</b><span>Aprobación de módulos ${arrow(delta('estudio'), ' pts')}</span></div>
    </div>
    ${lineChart(series)}
    <div class="scroll"><table class="tbl"><thead><tr><th>Mes</th>${pulse.map(([k]) => `<th>${labels[k]}</th>`).join('')}<th>Avance planes</th><th>Puntaje eval.</th><th>Aprobación módulos</th><th>Sesiones 1:1</th><th>Pulsos</th></tr></thead><tbody>
    ${series.slice().reverse().map((r) => `<tr><td><strong>${esc(fmonth(r.mes))}</strong></td>${pulse.map(([k]) => `<td>${r[k] ?? '—'}</td>`).join('')}<td>${r.avance != null ? r.avance + '%' : '—'}</td><td>${r.puntaje ?? '—'}</td><td>${r.estudio != null ? r.estudio + '%' : '—'}</td><td>${r.sesiones ?? 0}</td><td>${r.pulsos ?? 0}</td></tr>`).join('')}</tbody></table></div>
    ${comments.length ? `<h3>Lo que dice el equipo</h3><ul class="quotes">${comments.map((c) => `<li>“${esc(c.comentario)}”<span class="muted small"> — ${esc(areaName(c.area))}, ${esc(fmonth(c.mes))}</span></li>`).join('')}</ul>` : ''}
  </section>`;
}

export function dashboard(rows, mes, area, pending = 0, series = [], comments = [], pulse = []) {
  const dayOfMonth = Number(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }).slice(8, 10));
  const enrich = (r) => {
    const f = [];
    if (!r.status) f.push(['Sin evaluación', 'muted']);
    else if (r.status === 'pendiente' && days(r.created_at) > 5) f.push(['No ha iniciado la evaluación', 'warn']);
    else if (r.status === 'en_curso' && days(r.started_at) > 5) f.push(['Evaluación sin terminar', 'warn']);
    if (r.status === 'analizada' && !r.plan_published) f.push(['Informe por revisar', 'info']);
    if (r.alertas > 0) f.push(['Alertas en el informe', 'err']);
    if (r.plan_published && !r.plan_id) f.push(['Sin plan del mes', 'warn']);
    if (r.plan_id && !r.plan_pub) f.push(['Plan sin publicar', 'info']);
    const prog = pct(r.done, r.items);
    if (r.plan_id && r.items && ((dayOfMonth >= 15 && prog < 40) || (dayOfMonth >= 25 && prog < 70))) f.push(['Plan atrasado', 'err']);
    if (r.plan_published && days(r.last_session) > 30) f.push(['Sin 1:1 en 30 días', 'warn']);
    if (r.mod_id && !r.mod_passed && r.mod_attempts >= 2) f.push(['Perdió el módulo del mes', 'err']);
    else if (r.mod_id && !r.mod_passed && dayOfMonth >= 20) f.push(['Módulo del mes pendiente', 'warn']);
    return { ...r, flags: f, prog };
  };
  const all = rows.map(enrich);
  const list = area ? all.filter((r) => r.area === area) : all;
  const avg = (xs) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
  const scores = list.filter((r) => r.score !== null).map((r) => r.score);
  const progs = list.filter((r) => r.items).map((r) => r.prog);
  const kpis = [
    ['Personas', list.length],
    ['Evaluaciones completas', `${list.filter((r) => ['enviada', 'analizando', 'analizada'].includes(r.status)).length}/${list.length}`],
    ['Puntaje promedio', avg(scores) ?? '—'],
    [`Avance planes · ${fmonth(mes).split(' ')[0]}`, progs.length ? `${avg(progs)}%` : '—'],
    ['Sesiones 1:1 del mes', list.reduce((a, r) => a + r.sessions_month, 0)],
    ['Requieren atención', list.filter((r) => r.flags.some(([, c]) => c === 'err' || c === 'warn')).length],
  ];
  const byArea = Object.keys(AREAS).map((k) => {
    const g = all.filter((r) => r.area === k);
    const s = g.filter((r) => r.score !== null).map((r) => r.score);
    const pr = g.filter((r) => r.items).map((r) => r.prog);
    return `<a class="areacard ${area === k ? 'on' : ''}" href="/admin?area=${k}"><p class="eyebrow">${esc(areaName(k))}</p><div class="ac-row"><div><b>${g.length}</b><span>personas</span></div><div><b>${avg(s) ?? '—'}</b><span>puntaje</span></div><div><b>${pr.length ? avg(pr) + '%' : '—'}</b><span>plan</span></div></div><div class="bar"><span style="width:${pr.length ? avg(pr) : 0}%"></span></div></a>`;
  }).join('');
  const trend = (r) => (r.score !== null && r.prev_score !== null ? (r.score > r.prev_score ? ` <span class="up">▲ ${r.score - r.prev_score}</span>` : r.score < r.prev_score ? ` <span class="down">▼ ${r.prev_score - r.score}</span>` : '') : '');
  const attention = list.filter((r) => r.flags.some(([, c]) => c === 'err' || c === 'warn'));
  return `<div class="row-head"><div><p class="eyebrow">Panel general · ${esc(fmonth(mes))}</p><h1>${area ? esc(areaLabel(area)) : 'Todo el equipo'}</h1></div>
    <div class="actions">${pending ? `<a class="btn" href="/admin/solicitudes">${pending} solicitud${pending > 1 ? 'es' : ''} por aprobar</a>` : ''}<a class="btn ghost" href="/admin/equipo">Agregar personas</a></div></div>
  <div class="kpis">${kpis.map(([l, v]) => `<div class="kpi"><b>${v}</b><span>${esc(l)}</span></div>`).join('')}</div>
  ${evolution(series, comments, pulse)}
  <div class="areas"><a class="areacard all ${area ? '' : 'on'}" href="/admin"><p class="eyebrow">Todas las áreas</p><div class="ac-row"><div><b>${all.length}</b><span>personas</span></div></div></a>${byArea}</div>
  ${attention.length ? `<section class="card"><h2 style="margin-top:0">Requieren atención (${attention.length})</h2><div class="attn">${attention.map((r) => `<a href="/admin/personas/${r.id}" class="attn-item"><strong>${esc(r.name)}</strong><span class="muted small">${esc(areaName(r.area))}${r.sede ? ` · ${esc(r.sede)}` : ''}</span><div>${r.flags.filter(([, c]) => c === 'err' || c === 'warn').map(([l, c]) => `<span class="badge ${c}">${esc(l)}</span>`).join(' ')}</div></a>`).join('')}</div></section>` : ''}
  <section class="card"><table class="tbl dash"><thead><tr><th>Profesional</th><th>Evaluación</th><th>Puntaje</th><th>Plan del mes</th><th>Estudio</th><th>Último 1:1</th><th>Señales</th></tr></thead><tbody>
  ${list.length ? list.map((r) => `<tr><td><a href="/admin/personas/${r.id}"><strong>${esc(r.name)}</strong></a><br><span class="muted small">${esc(areaName(r.area))}${r.sede ? ` · ${esc(r.sede)}` : ''}</span></td>
    <td>${r.status ? badge(r.status) : '<span class="muted">—</span>'}</td><td>${r.score ?? '—'}${trend(r)}</td>
    <td>${r.plan_id ? `<div class="bar slim"><span style="width:${r.prog}%"></span></div><span class="muted small">${r.done}/${r.items} hechas${r.doing ? ` · ${r.doing} en curso` : ''}</span>` : '<span class="muted">—</span>'}</td>
    <td>${r.mod_total ? `${r.mod_ok}/${r.mod_total} aprobados${r.mod_id ? `<br><span class="small ${r.mod_passed ? 'up' : 'muted'}">${r.mod_passed ? 'Mes aprobado' : `Mes: ${r.mod_attempts}/2 intentos`}</span>` : ''}` : '<span class="muted">—</span>'}</td>
    <td>${r.last_session ? fdate(r.last_session) : '<span class="muted">—</span>'}</td>
    <td>${r.flags.map(([l, c]) => `<span class="badge ${c}">${esc(l)}</span>`).join(' ') || '<span class="badge ok">Al día</span>'}</td></tr>`).join('') : '<tr><td colspan="7" class="muted">Aún no hay personas en el equipo.</td></tr>'}
  </tbody></table></section>`;
}

export function adminRequests(rows, sedes) {
  return `<p class="eyebrow">Registro</p><h1>Solicitudes por aprobar</h1>
    <p class="muted">Comparte la página de registro con tu equipo: <input class="copy" readonly value="${esc((process.env.BASE_URL || '') + '/registro')}" onclick="this.select()" style="max-width:420px"></p>
    ${rows.length ? rows.map((u) => `<section class="card"><div class="row-head"><div><h2 style="margin-top:0">${esc(u.name)}</h2><p class="muted">${esc(u.email)}${u.telefono ? ` · ${esc(u.telefono)}` : ''}${u.cargo ? ` · ${esc(u.cargo)}` : ''} · Solicitó ${fdate(u.created_at)}</p></div></div>
      <form method="post" action="/admin/solicitudes/${u.id}" class="grid-req"><label>Área<select name="area">${AREA_OPTS(u.area)}</select></label><label>Sede${sedeField(sedes, u.sede)}</label>
      <button class="btn" name="decision" value="aprobar">Aprobar e invitar</button><button class="btn ghost" name="decision" value="rechazar" formnovalidate onclick="return confirm('¿Rechazar y eliminar esta solicitud?')">Rechazar</button></form></section>`).join('') : '<section class="card"><p class="muted">No hay solicitudes pendientes.</p></section>'}`;
}

export function adminMessages(msgs, activos, counts, mailOk, ok, error) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const grouped = {};
  for (const m of msgs) (grouped[String(m.fecha instanceof Date ? m.fecha.toISOString() : m.fecha).slice(0, 10)] ||= []).push(m);
  return `<p class="eyebrow">Comunicación</p><h1>Mensajes diarios</h1>
    ${ok ? `<p class="notice ok">${esc(ok)}</p>` : ''}${error ? `<p class="notice err">${esc(error)}</p>` : ''}${mailOk ? '' : '<p class="notice warn">El correo no está configurado: los mensajes se muestran en el espacio de cada persona pero no se envían.</p>'}
    <div class="two">
      <section class="card"><h2 style="margin-top:0">Envío automático</h2>
        <p>Cada mañana (lunes a sábado, 6:30 a. m.) se genera con IA un mensaje motivacional y un tip práctico distinto para cada área, y se envía por correo a las ${total} personas activas. También aparece en su espacio.</p>
        <form method="post" action="/admin/mensajes/config" class="inline-form"><label class="check"><input type="checkbox" name="activos" ${activos ? 'checked' : ''} onchange="this.form.submit()"> Envío automático ${activos ? 'activo' : 'pausado'}</label></form>
        <form method="post" action="/admin/mensajes/hoy" style="margin-top:14px" onsubmit="this.querySelector('button').disabled=true;this.querySelector('button').textContent='Generando…'"><button class="btn ghost">Generar y enviar los de hoy ahora</button></form>
        <p class="muted small">Si los de hoy ya se enviaron, no se repiten.</p></section>
      <section class="card"><h2 style="margin-top:0">Enviar un mensaje propio</h2>
        <form method="post" action="/admin/mensajes" class="stack"><label>Para<select name="area"><option value="todas">Todo el equipo (${total})</option>${Object.keys(AREAS).map((k) => `<option value="${k}">${esc(areaName(k))} (${counts[k] || 0})</option>`).join('')}</select></label>
        <label>Título<input name="titulo" required></label><label>Mensaje<textarea name="mensaje" rows="3" required></textarea></label><label>Tip (opcional)<textarea name="tip" rows="2"></textarea></label>
        <div><button class="btn" onclick="return confirm('¿Enviar este mensaje ahora?')">Enviar</button></div></form></section>
    </div>
    <section class="card"><h2 style="margin-top:0">Historial</h2>${Object.keys(grouped).length ? Object.entries(grouped).map(([f, ms]) => `<h3>${fdate(f + 'T12:00:00')}</h3><div class="msgs">${ms.map((m) => `<div class="msg"><div class="row-head"><span class="badge ${m.tipo === 'manual' ? 'info' : 'muted'}">${m.area === 'todas' ? 'Todo el equipo' : esc(areaName(m.area))}${m.tipo === 'manual' ? ' · propio' : ''}</span><span class="muted small">${m.sent_at ? `Enviado a ${m.recipients}` : 'Sin enviar'}</span></div><p><strong>${esc(m.titulo)}</strong></p><p class="small">${esc(m.mensaje)}</p>${m.tip ? `<p class="small muted"><strong>Tip:</strong> ${esc(m.tip)}</p>` : ''}</div>`).join('')}</div>`).join('') : '<p class="muted">Aún no se han generado mensajes.</p>'}</section>`;
}

// ---------- Plan de estudio ----------

const inline = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*(?!\s)(.+?)\*/g, '$1<em>$2</em>');
export function md(src) {
  const out = [];
  let list = null;
  const close = () => { if (list) { out.push(`</${list}>`); list = null; } };
  for (const raw of String(src || '').split('\n')) {
    const l = raw.trim();
    const img = l.match(/^!\[([^\]]*)\]\((\/img\/\d+|https:\/\/[^\s)]+)\)$/);
    if (!l) { close(); continue; }
    if (img) { close(); out.push(`<figure><img src="${esc(img[2])}" alt="${esc(img[1])}" loading="lazy">${img[1] ? `<figcaption>${esc(img[1])}</figcaption>` : ''}</figure>`); continue; }
    if (/^#{2,4}\s/.test(l)) { close(); out.push(`<h4>${inline(l.replace(/^#+\s/, ''))}</h4>`); continue; }
    if (/^>\s?/.test(l)) { close(); out.push(`<blockquote>${inline(l.replace(/^>\s?/, ''))}</blockquote>`); continue; }
    if (/^[-*]\s/.test(l)) { if (list !== 'ul') { close(); out.push('<ul>'); list = 'ul'; } out.push(`<li>${inline(l.slice(2))}</li>`); continue; }
    if (/^\d+[.)]\s/.test(l)) { if (list !== 'ol') { close(); out.push('<ol>'); list = 'ol'; } out.push(`<li>${inline(l.replace(/^\d+[.)]\s/, ''))}</li>`); continue; }
    close(); out.push(`<p>${inline(l)}</p>`);
  }
  close();
  return out.join('');
}

const ST_LABEL = {
  aprobado: ['Aprobado', 'ok'], no_aprobado: ['No aprobado', 'err'], cerrado: ['Cerrado sin presentar', 'err'],
  proximo: ['Próximamente', 'muted'], reintento: ['Segundo intento disponible', 'warn'], listo: ['Listo para evaluación', 'info'], estudiando: ['Por estudiar', 'info'],
};
const stBadge = (e) => { const [l, c] = ST_LABEL[e] || [e, 'muted']; return `<span class="badge ${c}">${l}</span>`; };

export function studyCard(m) {
  if (!m) return '';
  const st = m.st;
  const daysLeft = (() => { const d = new Date(); const ld = new Date(Number(m.mes.slice(0, 4)), Number(m.mes.slice(5)), 0).getDate(); return ld - Number(d.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }).slice(8, 10)); })();
  return `<section class="card study-card"><p class="eyebrow">Módulo de estudio · ${esc(fmonth(m.mes))}</p><div class="row-head"><h2 style="margin:4px 0">${esc(m.titulo)}</h2>${stBadge(st.estado)}</div>
    <p class="muted">${esc(m.objetivo)}</p>${['estudiando', 'listo', 'reintento'].includes(st.estado) ? `<p class="small">Tienes ${daysLeft + 1} día${daysLeft ? 's' : ''} para completarlo · intentos usados ${st.attempts.length} de ${2}</p>` : ''}
    <a class="btn" href="/estudio/${m.id}">${st.estado === 'aprobado' ? 'Repasar' : 'Ir al módulo'}</a></section>`;
}

export function studyList(mods) {
  const visible = mods.filter((m) => m.st.win !== 'proximo');
  const next = mods.find((m) => m.st.win === 'proximo');
  const ok = mods.filter((m) => m.st.passed).length;
  return `<p class="eyebrow">Mi plan de estudio</p><h1>Módulos</h1>
    <p class="muted">Cada mes se habilita un módulo nuevo. Tienes hasta el último día del mes para estudiarlo y presentar la evaluación: 2 intentos, se aprueba con 85%. Al cerrar el mes, la evaluación se bloquea.</p>
    <div class="kpis small"><div class="kpi"><b>${ok}</b><span>módulos aprobados</span></div><div class="kpi"><b>${visible.length}</b><span>módulos habilitados</span></div></div>
    <div class="modules">${visible.slice().reverse().map((m) => `<a class="module ${m.st.estado}" href="/estudio/${m.id}"><p class="eyebrow">${esc(fmonth(m.mes))}</p><h3>${esc(m.titulo)}</h3><p class="muted small">${esc(m.objetivo)}</p><div>${stBadge(m.st.estado)}${m.st.attempts.length ? ` <span class="muted small">Mejor nota: ${m.st.best}%</span>` : ''}</div></a>`).join('') || '<p class="muted">Aún no hay módulos habilitados para tu área.</p>'}</div>
    ${next ? `<p class="muted small">Próximo módulo: <strong>${esc(next.titulo)}</strong>, se habilita en ${esc(fmonth(next.mes))}.</p>` : ''}`;
}

export function studyModule(m, st, last, imgs, isAdmin) {
  const sections = (m.secciones || []).map((x, i) => `<section class="lesson" id="s${i + 1}"><p class="eyebrow">Parte ${i + 1}</p><h2>${esc(x.titulo)}</h2>${md(x.contenido)}</section>`).join('');
  let result = '';
  if (last) {
    const wrong = last.answers.map((a, i) => (a === m.preguntas[i]?.correcta ? null : i + 1)).filter(Boolean);
    const reveal = last.passed || st.attempts.length >= 2;
    result = `<section class="card result ${last.passed ? 'pass' : 'fail'}" id="resultado"><p class="eyebrow">Resultado del intento ${st.attempts.findIndex((a) => a.id === last.id) + 1}</p>
      <h2>${last.score}% · ${last.passed ? '¡Aprobaste el módulo!' : 'No alcanzaste el 85%'}</h2>
      ${last.passed ? '<p>Excelente trabajo. Sigue aplicando lo aprendido en tu día a día.</p>' : st.canTake ? `<p>Te equivocaste en las preguntas ${wrong.join(', ')}. Repasa la teoría y vuelve a intentarlo: te queda 1 intento.</p>` : '<p>Ya usaste tus 2 intentos. El módulo queda registrado como no aprobado; el próximo mes se habilita un nuevo módulo.</p>'}
      ${reveal ? `<details><summary>Ver respuestas y explicaciones</summary><ol class="review">${m.preguntas.map((p, i) => `<li class="${last.answers[i] === p.correcta ? 'ok' : 'bad'}"><p><strong>${esc(p.texto)}</strong></p><p class="small">Correcta: ${esc(p.opciones[p.correcta])}</p><p class="small muted">${esc(p.explicacion)}</p></li>`).join('')}</ol></details>` : ''}</section>`;
  }
  let action = '';
  if (isAdmin) action = `<section class="card"><p class="muted">Vista previa del líder. <a href="/admin/estudio/${m.id}">Editar módulo</a></p></section>`;
  else if (st.estado === 'aprobado') action = `<section class="card" id="evaluacion"><p>${stBadge('aprobado')} Mejor nota: ${st.best}%</p></section>`;
  else if (st.win === 'cerrado' || st.attempts.length >= 2) action = `<section class="card" id="evaluacion"><p>${stBadge(st.estado)} La evaluación de este módulo está cerrada.</p></section>`;
  else if (!st.read) action = `<section class="card" id="evaluacion"><h2 style="margin-top:0">¿Terminaste de estudiar?</h2><p>Cuando hayas leído toda la teoría, márcala como leída para habilitar la evaluación (10 preguntas, 2 intentos, se aprueba con 85%).</p><form method="post" action="/estudio/${m.id}/leido"><button class="btn">Ya estudié la teoría</button></form></section>`;
  else action = `<section class="card" id="evaluacion"><h2 style="margin-top:0">Evaluación del módulo</h2><p>10 preguntas · se aprueba con 85% · intento ${st.attempts.length + 1} de 2. Tienes hasta el último día del mes.</p><a class="btn" href="/estudio/${m.id}/evaluacion">Presentar evaluación</a></section>`;
  return `<p><a href="${isAdmin ? '/admin/estudio?area=' + m.area : '/estudio'}">← Plan de estudio</a></p>
    ${result}
    <section class="card module-head"><p class="eyebrow">Módulo · ${esc(fmonth(m.mes))}</p><h1>${esc(m.titulo)}</h1><p class="lead">${esc(m.objetivo)}</p>
    ${(m.secciones || []).length > 1 ? `<ol class="toc">${m.secciones.map((x, i) => `<li><a href="#s${i + 1}">${esc(x.titulo)}</a></li>`).join('')}</ol>` : ''}</section>
    <article class="card lessons">${sections || '<p class="muted">Este módulo aún no tiene teoría.</p>'}</article>${action}`;
}

export function studyQuiz(m, st) {
  return `<p><a href="/estudio/${m.id}">← Volver a la teoría</a></p>
  <form method="post" action="/estudio/${m.id}/evaluacion" class="card evalform" onsubmit="return confirm('¿Enviar tus respuestas? Este es tu intento ${st.attempts.length + 1} de 2.')">
    <p class="eyebrow">Evaluación · intento ${st.attempts.length + 1} de 2 · se aprueba con 85%</p><h1>${esc(m.titulo)}</h1>
    ${m.preguntas.map((p, i) => `<fieldset class="q"><legend><span class="num">${i + 1}</span>${esc(p.texto)}</legend><div class="opts">${p.opciones.map((o, j) => `<label><input type="radio" name="p${i}" value="${j}" required><span>${esc(o)}</span></label>`).join('')}</div></fieldset>`).join('')}
    <div class="nav"><span></span><button class="btn">Enviar respuestas</button></div></form>`;
}

export function adminStudy(area, mods, staff, mes, error) {
  const nextMes = (() => { const used = new Set(mods.map((m) => m.mes)); let [y, mo] = mes.split('-').map(Number); for (let i = 0; i < 24; i++) { const k = `${y}-${String(mo).padStart(2, '0')}`; if (!used.has(k)) return k; mo++; if (mo > 12) { mo = 1; y++; } } return mes; })();
  return `<p class="eyebrow">Plan de estudio</p><h1>${esc(areaLabel(area))}</h1>
    <div class="tabs">${Object.keys(AREAS).map((k) => `<a href="/admin/estudio?area=${k}" class="${k === area ? 'on' : ''}">${esc(areaName(k))}</a>`).join('')}</div>
    ${error ? `<p class="notice err">${esc(error)}</p>` : ''}
    <section class="card"><h2 style="margin-top:0">Nuevo módulo</h2>
      <form method="post" action="/admin/estudio/generar" class="grid-gen" onsubmit="const b=this.querySelector('[data-ia]');if(event.submitter===b){b.disabled=true;b.textContent='Generando… (1-2 min)';}">
        <input type="hidden" name="area" value="${area}"><label>Mes<input type="month" name="mes" value="${nextMes}" required></label>
        <label>Tema (opcional)<input name="tema" placeholder="Si lo dejas vacío, la IA lo elige según los resultados del área"></label>
        <button class="btn" name="modo" value="ia" data-ia>Generar con IA</button><button class="btn ghost" name="modo" value="manual" formnovalidate>Crear vacío</button></form>
      <p class="muted small">La IA arma la teoría (4-6 partes) y una evaluación de 10 preguntas con base en el rol del área, las oportunidades de mejora de sus evaluaciones y los módulos anteriores. Luego tú lo revisas, le subes imágenes y lo publicas.</p></section>
    <section class="card"><table class="tbl"><thead><tr><th>Mes</th><th>Módulo</th><th>Estado</th><th>Aprobados</th><th>Presentaron</th><th></th></tr></thead><tbody>
    ${mods.length ? mods.map((m) => `<tr><td><strong>${esc(fmonth(m.mes))}</strong><br><span class="muted small">${{ abierto: 'Abierto', proximo: 'Próximo', cerrado: 'Cerrado' }[windowStateView(m.mes, mes)]}</span></td><td>${esc(m.titulo)}<br><span class="muted small">${m.npreg} preguntas</span></td>
      <td>${m.published ? '<span class="badge ok">Publicado</span>' : '<span class="badge warn">Borrador</span>'}</td><td>${m.aprobados}/${staff}</td><td>${m.presentaron}</td><td><a href="/admin/estudio/${m.id}">Editar</a> · <a href="/estudio/${m.id}">Ver</a></td></tr>`).join('') : '<tr><td colspan="6" class="muted">Aún no hay módulos para esta área.</td></tr>'}
    </tbody></table></section>`;
}
const windowStateView = (mes, now) => (mes === now ? 'abierto' : mes > now ? 'proximo' : 'cerrado');

export function adminStudyEdit(m, imgs, results, attempted, ok) {
  const secs = [...(m.secciones || []), { titulo: '', contenido: '', imagen_sugerida: '' }];
  const pregs = [...(m.preguntas || []), { texto: '', opciones: [], correcta: 0, explicacion: '' }];
  return `<p><a href="/admin/estudio?area=${m.area}">← ${esc(areaLabel(m.area))}</a></p>
    ${ok ? '<p class="notice ok">Cambios guardados.</p>' : ''}
    <div class="row-head"><div><p class="eyebrow">${esc(fmonth(m.mes))} · ${esc(areaName(m.area))}</p><h1>${esc(m.titulo)}</h1></div>
      <div class="actions"><a class="btn ghost" href="/estudio/${m.id}" target="_blank">Vista previa</a>
      <form method="post" action="/admin/estudio/${m.id}" class="inline"><input type="hidden" name="accion" value="publicar"><button class="btn ${m.published ? 'ghost' : ''}">${m.published ? 'Despublicar' : 'Publicar'}</button></form></div></div>
    ${m.published ? '<p class="notice ok">Publicado: el equipo del área lo verá durante su mes. El día 1 reciben el aviso por correo y desde el día 24 un recordatorio.</p>' : '<p class="notice warn">Borrador: el equipo aún no lo ve.</p>'}
    <section class="card"><h2 style="margin-top:0">Imágenes</h2>
      <p class="muted small">Sube una imagen y copia su código en la parte de la teoría donde quieras que aparezca.</p>
      <input type="file" accept="image/png,image/jpeg,image/webp" id="upimg" data-module="${m.id}" multiple><p id="upmsg" class="muted small"></p>
      <div class="imgs">${imgs.map((i) => `<div class="imgitem"><img src="/img/${i.id}" alt=""><input class="copy" readonly value="![${esc(i.nombre)}](/img/${i.id})" onclick="this.select()"></div>`).join('')}</div></section>
    <form method="post" action="/admin/estudio/${m.id}" class="stack">
      <section class="card"><div class="grid3"><label>Título<input name="titulo" value="${esc(m.titulo)}" required></label><label>Mes<input type="month" name="mes" value="${m.mes}"></label><span></span></div>
        <label>Objetivo<textarea name="objetivo" rows="2">${esc(m.objetivo)}</textarea></label></section>
      <section class="card"><h2 style="margin-top:0">Teoría</h2><p class="muted small">Formato: párrafos, listas con "- ", subtítulos con "### ", **negrita**, citas con "> " e imágenes con el código de arriba. Deja una parte vacía para eliminarla.</p>
        ${secs.map((x, i) => `<div class="secedit"><p class="eyebrow">${i < secs.length - 1 ? `Parte ${i + 1}` : 'Nueva parte'}</p><label>Título<input name="s_titulo" value="${esc(x.titulo)}"></label>
        ${x.imagen_sugerida ? `<p class="muted small">Imagen sugerida: ${esc(x.imagen_sugerida)}</p>` : ''}<input type="hidden" name="s_imagen" value="${esc(x.imagen_sugerida)}">
        <label>Contenido<textarea name="s_contenido" rows="${x.contenido ? 12 : 4}">${esc(x.contenido)}</textarea></label></div>`).join('')}</section>
      <section class="card"><h2 style="margin-top:0">Evaluación (${(m.preguntas || []).length} preguntas)</h2>
        ${attempted ? '<p class="notice warn">Ya hay intentos presentados: las preguntas quedaron fijas para que los resultados sean comparables.</p>' : '<p class="muted small">Opciones una por línea; respuesta correcta = número de la opción. Deja una pregunta vacía para eliminarla.</p>'}
        ${pregs.map((p, i) => `<fieldset class="qedit2" ${attempted ? 'disabled' : ''}><p class="eyebrow">${i < pregs.length - 1 ? `Pregunta ${i + 1}` : 'Nueva pregunta'}</p><label>Pregunta<textarea name="p_texto" rows="2">${esc(p.texto)}</textarea></label>
          <div class="grid2"><label>Opciones<textarea name="p_opciones" rows="4">${esc((p.opciones || []).join('\n'))}</textarea></label><div><label>Correcta (número)<input name="p_correcta" type="number" min="1" value="${p.texto ? p.correcta + 1 : ''}"></label><label>Explicación<textarea name="p_explicacion" rows="2">${esc(p.explicacion)}</textarea></label></div></div></fieldset>`).join('')}</section>
      <div class="nav"><span></span><button class="btn">Guardar cambios</button></div></form>
    <section class="card"><h2 style="margin-top:0">Resultados del equipo</h2><table class="tbl"><thead><tr><th>Profesional</th><th>Teoría</th><th>Intentos</th><th>Mejor nota</th><th>Estado</th></tr></thead><tbody>
      ${results.map((r) => `<tr><td><a href="/admin/personas/${r.id}">${esc(r.name)}</a><br><span class="muted small">${esc(r.sede)}</span></td><td>${r.leyo ? 'Leída' : '—'}</td><td>${r.intentos}/2</td><td>${r.mejor ?? '—'}${r.mejor != null ? '%' : ''}</td><td>${r.aprobado ? stBadge('aprobado') : r.intentos >= 2 ? stBadge('no_aprobado') : r.intentos ? stBadge('reintento') : '<span class="muted">Pendiente</span>'}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">No hay personas en esta área.</td></tr>'}</tbody></table></section>
    ${attempted ? '' : `<form method="post" action="/admin/estudio/${m.id}" onsubmit="return confirm('¿Eliminar este módulo?')"><input type="hidden" name="accion" value="borrar"><button class="link">Eliminar módulo</button></form>`}
    <script src="/upload.js"></script>`;
}
