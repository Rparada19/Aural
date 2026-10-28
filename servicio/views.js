import { AREAS, areaLabel } from './areas.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const STATUS = {
  pendiente: ['Pendiente', 'muted'],
  en_curso: ['En curso', 'warn'],
  enviada: ['Enviada', 'info'],
  analizando: ['Analizando', 'info'],
  analizada: ['Informe listo', 'ok'],
  hecho: ['Hecho', 'ok'],
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

const V = Date.now().toString(36);
const ICON = {
  panel: '<path d="M4 13h6V4H4zM14 20h6V11h-6zM4 20h6v-4H4zM14 4v4h6V4z"/>',
  equipo: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c.6-3.4 3-5.2 6-5.2s5.4 1.8 6 5.2M16 11.5a2.8 2.8 0 1 0 0-5.6M17.5 14.6c2 .5 3.2 2.2 3.5 5.4"/>',
  solicitudes: '<path d="M4 6h16v12H4z"/><path d="m4 7 8 6 8-6"/>',
  evaluaciones: '<path d="M7 4h10v16H7z"/><path d="M10 9h4M10 13h4M10 17h2"/>',
  aprendizaje: '<circle cx="5" cy="12" r="2"/><circle cx="12" cy="5" r="2"/><circle cx="12" cy="19" r="2"/><circle cx="19" cy="12" r="2"/><path d="M7 11l3.5-4.5M7 13l3.5 4.5M14 6.5 17.5 11M14 17.5l3.5-4.5M7 12h10"/>',
  estudio: '<path d="M3 6.5 12 3l9 3.5-9 3.5z"/><path d="M7 8.5V14c0 1.6 2.2 3 5 3s5-1.4 5-3V8.5M21 6.5V12"/>',
  mensajes: '<path d="M4 5h16v11H9l-5 4z"/>',
  preguntas: '<path d="M9.2 9a2.9 2.9 0 1 1 4.2 2.6c-.9.5-1.4 1.1-1.4 2.1V14"/><circle cx="12" cy="17.6" r=".6"/><circle cx="12" cy="12" r="9"/>',
  inicio: '<path d="M4 11 12 4l8 7v9h-5v-6H9v6H4z"/>',
  ranking: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3"/>',
  salir: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>',
};
const icon = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true" class="ico">${ICON[k]}</svg>`;

// Punto con ondas de sonido hacia la derecha (inspirado en el símbolo de Aural)
export const arcs = (cls = '') => `<svg class="arcs ${cls}" viewBox="0 0 400 400" aria-hidden="true">
  <circle cx="56" cy="200" r="20" class="dot"/>${[78, 138, 198, 258, 318].map((r, i) => `<path d="M${(56 + r * Math.cos(-0.82)).toFixed(1)} ${(200 + r * Math.sin(-0.82)).toFixed(1)} A ${r} ${r} 0 0 1 ${(56 + r * Math.cos(0.82)).toFixed(1)} ${(200 + r * Math.sin(0.82)).toFixed(1)}" style="--i:${i}"/>`).join('')}</svg>`;

export function layout(title, body, user, { wide = false, path = '', bare = false } = {}) {
  const head = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · Aural Servicio</title><link rel="icon" href="/logo-aural-simbolo.png"><link rel="stylesheet" href="/style.css?v=${V}"></head>`;
  if (bare) return `${head}<body class="bare-body">${body}</body></html>`;
  if (!user) return `${head}<body class="auth-body"><main class="auth">${body}</main></body></html>`;
  const salir = `<form method="post" action="/salir"><button class="navlink as-btn">${icon('salir')}<span>Salir</span></button></form>`;
  if (user.role === 'admin') {
    const items = [['/admin', 'Panel', 'panel'], ['/admin/equipo', 'Equipo', 'equipo'], ['/admin/lideres', 'Líderes', 'equipo'], ['/admin/evaluaciones', 'Evaluaciones', 'evaluaciones'], ['/admin/solicitudes', 'Solicitudes', 'solicitudes'], ['/admin/estudio', 'Estudio', 'estudio'], ['/ranking', 'Ranking', 'ranking'], ['/admin/aprendizaje', 'Aprendizaje', 'aprendizaje'], ['/ia', 'IA en vivo', 'aprendizaje'], ['/admin/mensajes', 'Mensajes', 'mensajes'], ['/admin/preguntas', 'Preguntas', 'preguntas']];
    const on = (h) => (h === '/admin' ? path === '/admin' || path.startsWith('/admin/personas') : path.startsWith(h));
    return `${head}<body class="admin-body"><aside class="side"><a href="/admin" class="side-brand"><img src="/logo-aural-blanco.png" alt="Aural"><span>Servicio</span></a>
      <nav class="side-nav">${items.map(([h, l, k]) => `<a href="${h}" class="navlink ${on(h) ? 'on' : ''}">${icon(k)}<span>${l}</span></a>`).join('')}</nav>
      <div class="side-foot"><p class="who">${esc(user.email)}</p>${salir}</div></aside>
      <main class="content ${wide ? 'wide' : ''}">${body}</main></body></html>`;
  }
  return `${head}<body class="staff-body"><header class="top"><a href="${user.lider ? '/lider' : '/'}" class="brand"><img src="/logo-aural.png" alt="Aural"><span>Servicio</span></a>
    <nav class="top-nav">${user.lider ? `<a href="/lider" class="navlink ${path.startsWith('/lider') ? 'on' : ''}">${icon('equipo')}<span>Mi equipo</span></a>` : ''}<a href="${user.lider ? '/mi' : '/'}" class="navlink ${path === '/' || path === '/mi' ? 'on' : ''}">${icon('inicio')}<span>Mi espacio</span></a><a href="/estudio" class="navlink ${path.startsWith('/estudio') ? 'on' : ''}">${icon('estudio')}<span>Estudio</span></a><a href="/ranking" class="navlink ${path.startsWith('/ranking') ? 'on' : ''}">${icon('ranking')}<span>Ranking</span></a>${salir}</nav></header>
    <main class="content staff ${wide ? 'wide' : ''}">${body}</main></body></html>`;
}

const initials = (n) => esc(String(n || '?').trim().split(/\s+/).slice(0, 2).map((x) => x[0]).join('').toUpperCase());
export const avatar = (u, cls = '') => (u.has_photo ? `<img class="avatar ${cls}" src="/foto/${u.id}" alt="${esc(u.name)}">` : `<span class="avatar initials ${cls}" aria-hidden="true">${initials(u.name)}</span>`);

const photoWidget = (mode, endpoint = '') => `<div class="photo-widget" ${mode !== 'registro' ? `data-endpoint="${endpoint || '/perfil/foto'}"` : ''}>
  <div class="photo-row"><span class="photo-preview"><svg viewBox="0 0 24 24" class="ico"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg></span>
    <div class="photo-actions"><p class="photo-text"><strong>${mode === 'admin' ? 'Foto de la persona' : 'Tu foto'}</strong><span class="muted small">Aparecerá en el ranking del equipo.</span></p>
      <div class="actions"><button type="button" class="btn small photo-cam">Tomar foto con la cámara</button>
      <label class="btn ghost small photo-up">Subir una foto<input type="file" accept="image/jpeg,image/png,image/webp,image/*" class="photo-input"></label></div></div></div>
  <div class="photo-live" hidden><video playsinline muted autoplay></video><div class="actions"><button type="button" class="btn small photo-shot">Tomar foto</button><button type="button" class="btn ghost small photo-cancel">Cancelar</button></div></div>
  <input type="hidden" name="photo" class="photo-data"><p class="photo-err small" role="alert"></p>
  <label class="check consent"><input type="checkbox" name="consent" class="photo-consent"> ${mode === 'admin' ? 'La persona autorizó que su nombre y su foto se muestren en el ranking interno de Aural.' : 'Autorizo que mi nombre y mi foto se muestren en el ranking interno de Aural.'}</label>
  ${mode !== 'registro' ? '<button type="button" class="btn small photo-save" disabled>Guardar foto</button><p class="photo-msg muted small"></p>' : ''}
</div>`;

const authArt = (title, text) => `<aside class="auth-art"><img src="/logo-aural-blanco.png" alt="Aural" class="auth-logo">
  <div class="auth-copy"><h1>${title}</h1><p>${text}</p></div>${arcs('draw')}</aside>`;

export const loginPage = (msg = '', err = '') => `<div class="split">
${authArt('Cada atención cuenta.', 'Tu evaluación, tu plan de trabajo y tu ruta de estudio en un solo lugar.')}
<section class="auth-panel"><div class="auth-form">
  <h2>Entra a tu espacio</h2>
  <p class="muted">Escribe tu correo y te enviamos un enlace de acceso. No necesitas contraseña.</p>
  ${msg ? `<p class="notice ok">${esc(msg)}</p>` : ''}${err ? `<p class="notice err">${esc(err)}</p>` : ''}
  <form method="post" action="/login" class="stack">
    <label>Correo<input type="email" name="email" required autocomplete="email" placeholder="tu@correo.com"></label>
    <button class="btn block">Enviarme el enlace</button>
  </form>
  <p class="muted small switch">¿Aún no tienes cuenta? <a href="/registro">Regístrate</a></p>
</div></section></div>`;

export const enterPage = (t) => `<div class="split">${authArt('Bienvenido.', 'Estás a un paso de entrar a tu espacio.')}
<section class="auth-panel"><div class="auth-form"><h2>Entra a tu espacio</h2><p class="muted">Toca el botón para iniciar sesión en este dispositivo.</p>
<form method="post" action="/entrar/${esc(t)}"><button class="btn block">Entrar</button></form></div></section></div>`;

export const registerPage = (sedes, err = '', b = {}) => `<div class="split">
${authArt('Crece con nosotros en cada atención.', 'Una evaluación personal, un plan de trabajo mensual a tu medida, acompañamiento uno a uno con tu líder y un módulo de estudio cada mes.')}
<section class="auth-panel"><div class="auth-form">
  <h2>Regístrate</h2>
  <p class="muted">Tu líder aprueba la solicitud y te llega un correo para entrar.</p>
  ${err ? `<p class="notice err">${esc(err)}</p>` : ''}
  <form method="post" action="/registro" class="stack">
    <label>Nombre completo<input name="name" required value="${esc(b.name)}" autocomplete="name"></label>
    <label>Correo<input type="email" name="email" required value="${esc(b.email)}" autocomplete="email"></label>
    <div class="grid2"><label>Celular<input name="telefono" value="${esc(b.telefono)}" autocomplete="tel" placeholder="Opcional"></label><label>Cargo<input name="cargo" value="${esc(b.cargo)}" placeholder="Opcional"></label></div>
    <label>Área<select name="area" required><option value="">Selecciona tu área</option>${AREA_OPTS(b.area)}</select></label>
    <label>Sede${sedeField(sedes, b.sede)}</label>
    ${photoWidget('registro')}
    <input name="website" tabindex="-1" autocomplete="off" class="hp" aria-hidden="true">
    <button class="btn block">Enviar solicitud</button>
  </form><script src="/photo.js?v=${V}"></script>
  <p class="muted small switch">¿Ya tienes cuenta? <a href="/login">Entra aquí</a></p>
</div></section></div>`;

export const registerDone = (msg = '') => `<div class="split">${authArt('Solicitud recibida.', 'Gracias por sumarte al programa de servicio Aural.')}
<section class="auth-panel"><div class="auth-form"><h2>¡Listo!</h2><p>${esc(msg || 'Tu líder revisará tu solicitud. Cuando la apruebe te llegará un correo con el enlace para entrar a tu espacio.')}</p><a class="btn ghost" href="/login">Ir a la página de acceso</a></div></section></div>`;

// ---------- Profesional ----------

const greet = (user, m) => `<section class="greet"><div class="greet-copy"><p class="hello">Hola, ${esc((user.name || '').split(' ')[0])}</p>
  ${m ? `<h1>${esc(m.titulo)}</h1><p class="greet-msg">${esc(m.mensaje)}</p>${m.tip ? `<div class="greet-tip"><strong>${m.tipo === 'manual' ? 'De tu líder' : 'Tip para hoy'}</strong><p>${esc(m.tip)}</p></div>` : ''}` : `<h1>Tu espacio de crecimiento</h1><p class="greet-msg">Aquí encuentras tu evaluación, tu plan del mes y tu módulo de estudio.</p>`}</div>${arcs('draw')}</section>`;

const ESTADOS = { pendiente: 'Pendiente', en_curso: 'En curso', hecho: 'Hecho' };

function monthlyPlanStaff(plan) {
  const done = plan.items.filter((i) => i.estado === 'hecho').length;
  return `<section class="card" id="plan"><p class="eyebrow">Mi plan de ${esc(fmonth(plan.mes))}</p><h2 class="plan-title">${esc(plan.objetivo || 'Plan del mes')}</h2>
    ${plan.mensaje ? `<p class="lead">${esc(plan.mensaje)}</p>` : ''}
    <div class="progress-row"><div class="bar"><span style="width:${pct(done, plan.items.length)}%"></span></div><span class="muted small">${done} de ${plan.items.length} acciones</span></div>
    <div class="items">${plan.items.map((i) => `<form method="post" action="/plan/items/${i.id}" class="item ${i.estado}">
      <div><p class="accion">${esc(i.accion)}</p>${i.indicador ? `<p class="muted small">Cómo se mide: ${esc(i.indicador)}</p>` : ''}
      <input name="nota" value="${esc(i.nota)}" placeholder="¿Cómo te fue? (opcional)"></div>
      <div class="item-actions"><select name="estado">${Object.entries(ESTADOS).map(([k, v]) => `<option value="${k}" ${i.estado === k ? 'selected' : ''}>${v}</option>`).join('')}</select><button class="btn ghost small">Guardar</button></div></form>`).join('')}</div></section>`;
}

const pulseCard = (pulse) => (pulse ? `<section class="card pulse"><p class="eyebrow">Pulso del mes · 1 minuto</p><h2>¿Cómo vivimos el servicio este mes?</h2>
  <p class="muted small">Tus respuestas se muestran de forma agregada y sin tu nombre.</p>
  <form method="post" action="/pulso" class="stack">${pulse.map(([k, t]) => `<fieldset class="q"><legend>${esc(t)}</legend><div class="scale">${['Muy bajo', 'Bajo', 'Regular', 'Bueno', 'Excelente'].map((o, i) => `<label><input type="radio" name="${k}" value="${i + 1}" required><span><b>${i + 1}</b>${o}</span></label>`).join('')}</div></fieldset>`).join('')}
  <label>¿Qué fue lo que más ayudó o afectó el servicio este mes?<textarea name="comentario" rows="3" placeholder="Opcional"></textarea></label>
  <div><button class="btn">Enviar pulso</button></div></form></section>` : '');

export function staffHome(user, ev, plan, msg, pulse, mod) {
  const first = esc((user.name || '').split(' ')[0]);
  const top = greet(user, msg) + (user.has_photo ? '' : `<section class="card photo-card"><h2>Tu foto para el ranking</h2>${photoWidget('perfil')}</section><script src="/photo.js?v=${V}"></script>`) + studyCard(mod) + (ev && ['enviada', 'analizando', 'analizada'].includes(ev.status) ? pulseCard(pulse) : '');
  if (!ev) return `${top}<section class="card"><h2>Tu evaluación</h2><p class="muted">Aún no tienes una evaluación asignada. Tu líder te avisará cuando esté lista.</p></section>`;
  if (ev.plan_published && ev.report) {
    return `${top}${plan ? monthlyPlanStaff(plan) : ''}${plan ? `<details class="card"><summary><h2>Mi ruta de 8 semanas</h2></summary>${planView(user, ev.report)}</details>` : planView(user, ev.report)}`;
  }
  if (['enviada', 'analizando', 'analizada'].includes(ev.status)) {
    return `${top}<section class="card"><p class="eyebrow">Evaluación enviada</p><h2>¡Gracias${first ? `, ${first}` : ''}!</h2>
      <p>Recibimos tus respuestas el ${fdate(ev.submitted_at)}. Tu líder revisará los resultados y en los próximos días tendrás aquí tu plan de trabajo personal.</p></section>`;
  }
  const total = ev.questions.length;
  const done = Object.keys(ev.answers || {}).filter((k) => !empty(ev.answers[k])).length;
  if (ev.status === 'pendiente' || done === 0) {
    const mods = [...new Set(ev.questions.map((x) => x.module))];
    return `${top}<section class="card"><p class="eyebrow">${esc(areaLabel(ev.area))}</p><h2>Tu evaluación de servicio</h2>
      <p>Esta evaluación nos ayuda a conocer cómo atiendes hoy, reconocer lo que haces bien y construir contigo un plan de crecimiento que trabajaremos uno a uno.</p>
      <ul class="facts"><li><strong>${total}</strong> preguntas</li><li><strong>~40</strong> minutos</li><li>Se guarda sola</li></ul>
      <p class="muted">Responde con sinceridad y con tus propias palabras: no hay respuestas "para quedar bien", y lo importante es cómo trabajas en la realidad.</p>
      <ol class="modlist">${mods.map((m) => `<li>${esc(m)}</li>`).join('')}</ol>
      <a class="btn" href="/evaluacion">Comenzar</a></section>`;
  }
  return `${top}<section class="card"><h2>Continúa tu evaluación</h2><p>Llevas ${done} de ${total} preguntas respondidas.</p>
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
    ${steps}<p id="err" class="notice err" hidden></p></form><script src="/eval.js?v=${V}"></script>`;
}

export function planView(user, r) {
  const p = r.plan || {};
  return `<section class="card plain"><p class="eyebrow">Mi plan de trabajo</p><h1>${esc(p.objetivo || 'Plan de trabajo')}</h1>
    ${p.mensaje ? `<p class="lead">${esc(p.mensaje)}</p>` : ''}
    <div class="focus"><div class="focus-col good"><h3>Lo que haces muy bien</h3><ul>${(r.fortalezas || []).map((f) => `<li>${esc(f.titulo)}</li>`).join('')}</ul></div>
      <div class="focus-col grow"><h3>Lo que vamos a reforzar</h3><ul>${(r.oportunidades || []).map((f) => `<li><strong>${esc(f.titulo)}</strong><span>${esc(f.impacto || '')}</span></li>`).join('')}</ul></div></div>
    <h2>Cómo veremos tu avance</h2><ul class="measure">${(p.semanas || []).map((s) => `<li><span>${esc(s.semana)}</span>${esc(s.indicador)}</li>`).join('')}</ul>
    <h2>Ruta de 8 semanas</h2><div class="weeks">${(p.semanas || []).map((s) => `<div class="week"><p class="eyebrow">${esc(s.semana)}</p><h3>${esc(s.foco)}</h3><ul>${(s.acciones || []).map((a) => `<li>${esc(a)}</li>`).join('')}</ul><p class="muted small"><strong>Cómo lo mediremos:</strong> ${esc(s.indicador)}</p></div>`).join('')}</div>
    <h2>Temas de nuestras sesiones uno a uno</h2><ul class="topics">${(p.sesiones_1a1 || []).map((s) => `<li>${esc(s.tema)}</li>`).join('')}</ul></section>`;
}

// ---------- Admin ----------

export function adminHome(people, mailOk, sedes = []) {
  const row = (p) => `<tr><td><a href="/admin/personas/${p.id}"><strong>${esc(p.name)}</strong></a><br><span class="muted small">${esc(p.email)}${p.cargo ? ` · ${esc(p.cargo)}` : ''}</span></td>
    <td>${esc(p.sede)}</td><td>${p.status ? badge(p.status) : '<span class="muted">Sin evaluación</span>'}${p.plan_published ? ' <span class="badge ok">Plan publicado</span>' : ''}</td>
    <td>${p.score ?? '—'}</td><td>${fdate(p.submitted_at)}</td><td>${p.sessions || 0}</td>
    <td class="row-actions">${p.last_seen ? '<span class="badge ok">Ya entró</span>' : '<span class="badge warn">No ha entrado</span>'}
      <form method="post" action="/admin/personas/${p.id}/enlace" class="inline"><button class="link">Ver enlace</button></form>
      ${p.telefono ? `<form method="post" action="/admin/personas/${p.id}/whatsapp" class="inline" target="_blank"><button class="link">WhatsApp</button></form>` : ''}
      <a href="/admin/personas/${p.id}">Ficha</a></td></tr>`;
  const groups = Object.entries(AREAS).map(([k, a]) => {
    const list = people.filter((p) => p.area === k);
    const done = list.filter((p) => ['enviada', 'analizando', 'analizada'].includes(p.status)).length;
    return `<section class="card"><div class="row-head"><h2>${esc(a.label)}</h2><span class="muted small">${list.length} personas · ${done} evaluaciones enviadas</span></div>
      <table class="tbl"><thead><tr><th>Profesional</th><th>Sede</th><th>Estado</th><th>Puntaje</th><th>Enviada</th><th>1:1</th><th>Acceso</th></tr></thead><tbody>
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
    ${ev.report ? `<a class="btn ghost" href="/admin/personas/${person.id}/informe.pdf?ev=${ev.id}">Descargar PDF</a>` : ''}` : '';
  return `<p><a href="/admin">← Panel</a></p>${error ? `<p class="notice err">${esc(error)}</p>` : ''}${person.active ? '' : '<p class="notice warn">Esta persona está desactivada: no puede entrar ni recibe mensajes.</p>'}
  <div class="row-head"><div><p class="eyebrow">${esc(areaLabel(person.area))}${person.cargo ? ` · ${esc(person.cargo)}` : ''}${person.sede ? ` · ${esc(person.sede)}` : ''}</p><div class="person-id">${avatar(person, 'lg')}<div><h1>${esc(person.name)}</h1><p class="muted">${esc(person.email)}</p></div></div></div>
    <div class="actions"><form method="post" action="/admin/personas/${person.id}/enlace" class="inline"><button class="btn ghost">${mailOk ? 'Reenviar enlace' : 'Generar enlace'}</button></form>
    ${person.telefono ? `<form method="post" action="/admin/personas/${person.id}/whatsapp" class="inline" target="_blank"><button class="btn ghost">Enviar enlace por WhatsApp</button></form>` : ''}
    <form method="post" action="/admin/personas/${person.id}/evaluacion" class="inline" onsubmit="return confirm('¿Asignar una nueva evaluación? La anterior queda en el historial.')"><button class="btn ghost">Nueva evaluación</button></form>
    <form method="post" action="/admin/personas/${person.id}/desactivar" class="inline" onsubmit="return confirm('¿Cambiar el estado de esta persona?')"><button class="btn ghost">${person.active ? 'Desactivar' : 'Reactivar'}</button></form>
    ${person.has_photo ? `<form method="post" action="/admin/personas/${person.id}/foto" class="inline" onsubmit="return confirm('¿Quitar la foto de esta persona?')"><button class="btn ghost">Quitar foto</button></form>` : ''}</div></div>
  ${inviteLink ? `<div class="notice ok">Enlace de acceso (vence en 7 días): <input class="copy" readonly value="${esc(inviteLink)}" onclick="this.select()"></div>` : ''}
  ${ev ? `<section class="card"><div class="row-head"><div>${badge(ev.status)} <span class="muted small">Asignada ${fdate(ev.created_at)} · Enviada ${fdate(ev.submitted_at)}</span></div><div class="actions">${actions}</div></div>
    ${ev.status === 'analizando' ? '<p class="notice info">Analizando respuestas… recarga en un minuto.</p><script>setTimeout(()=>location.reload(),15000)</script>' : ''}
    ${ev.report_error ? `<p class="notice err">No se pudo generar el análisis: ${esc(ev.report_error)}</p>` : ''}</section>
    ${ev.report ? reportView(ev) : ''}${Object.keys(ev.answers).length ? answersView(ev) : ''}` : '<section class="card"><p class="muted">Sin evaluación asignada.</p></section>'}
  ${plansAdmin(person, plans, mes, Boolean(ev?.report))}
  <section class="card"><h2>Foto para el ranking</h2>${person.has_photo ? `<div class="person-id">${avatar(person, 'lg')}<p class="muted">Ya tiene foto. Puedes reemplazarla.</p></div>` : ''}${photoWidget('admin', `/admin/personas/${person.id}/foto`)}<script src="/photo.js?v=${V}"></script></section>
  ${oneOnOne(person, sessions, `/admin/personas/${person.id}/sesiones`)}
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
    <details class="monthly"><summary><h3>Detalle por mes</h3></summary><div class="scroll"><table class="tbl"><thead><tr><th>Mes</th>${pulse.map(([k]) => `<th>${labels[k]}</th>`).join('')}<th>Avance planes</th><th>Puntaje eval.</th><th>Aprobación módulos</th><th>Sesiones 1:1</th><th>Pulsos</th></tr></thead><tbody>
    ${series.slice().reverse().map((r) => `<tr><td><strong>${esc(fmonth(r.mes))}</strong></td>${pulse.map(([k]) => `<td>${r[k] ?? '—'}</td>`).join('')}<td>${r.avance != null ? r.avance + '%' : '—'}</td><td>${r.puntaje ?? '—'}</td><td>${r.estudio != null ? r.estudio + '%' : '—'}</td><td>${r.sesiones ?? 0}</td><td>${r.pulsos ?? 0}</td></tr>`).join('')}</tbody></table></div></details>
    ${comments.length ? `<h3>Lo que dice el equipo</h3><ul class="quotes">${comments.slice(0, 6).map((c) => `<li>“${esc(c.comentario)}”<span class="muted small"> — ${esc(areaName(c.area))}, ${esc(fmonth(c.mes))}</span></li>`).join('')}</ul>` : ''}
  </section>`;
}

function improve(insight, area) {
  const d = insight?.data;
  const btn = `<form method="post" action="/admin/recomendaciones" class="inline" onsubmit="const b=this.querySelector('button');b.disabled=true;b.textContent='Analizando datos…'"><input type="hidden" name="area" value="${area}"><button class="btn ${d ? 'ghost' : ''} small">${d ? 'Actualizar análisis' : 'Analizar con IA'}</button></form>`;
  if (!d) return `<section class="card improve" id="mejorar"><div class="row-head"><div><h2>Cómo podemos mejorar</h2><p class="muted">La IA revisa el pulso, los comentarios, las evaluaciones, los planes y los módulos, y propone un plan de acción para ${area ? 'esta área' : 'el equipo'}.</p></div>${btn}</div></section>`;
  return `<section class="card improve" id="mejorar"><div class="row-head"><div><h2>Cómo podemos mejorar</h2><p class="muted small">Análisis del ${fdate(insight.created_at)}</p></div>${btn}</div>
    <p class="lead">${esc(d.diagnostico)}</p>
    <div class="two"><div><h3>Lo que el equipo hace bien</h3><ul class="ev">${(d.fortalezas || []).map((f) => `<li><strong>${esc(f)}</strong></li>`).join('')}</ul></div>
      <div><h3>Brechas a cerrar</h3><ul class="ev">${(d.brechas || []).map((b) => `<li><strong>${esc(b.titulo)}</strong><span>${esc(b.evidencia)}</span></li>`).join('')}</ul></div></div>
    <h3>Plan de acción</h3><div class="scroll"><table class="tbl"><thead><tr><th>Acción</th><th>Responsable</th><th>Plazo</th><th>Cómo medirlo</th></tr></thead><tbody>
      ${(d.acciones || []).map((a) => `<tr><td><strong>${esc(a.accion)}</strong></td><td>${esc(a.responsable)}</td><td>${esc(a.plazo)}</td><td>${esc(a.indicador)}</td></tr>`).join('')}</tbody></table></div>
    ${d.academia ? `<p class="notice info"><strong>Para la Academia:</strong> ${esc(d.academia)}</p>` : ''}</section>`;
}

const peek = (r) => `<tr class="peek-row" id="peek-${r.id}" hidden><td colspan="7"><div class="peek">
  <div class="peek-main">${r.resumen ? `<p class="lead">${esc(r.resumen)}</p>` : `<p class="muted">${r.status ? 'El informe aparecerá cuando termine y se analice la evaluación.' : 'Aún no tiene evaluación.'}</p>`}
    ${r.fortalezas || r.oportunidades ? `<div class="focus"><div class="focus-col good"><h3>Fortalezas</h3><ul>${(r.fortalezas || []).map((f) => `<li>${esc(f)}</li>`).join('')}</ul></div><div class="focus-col grow"><h3>A reforzar</h3><ul>${(r.oportunidades || []).map((f) => `<li>${esc(f)}</li>`).join('')}</ul></div></div>` : ''}</div>
  <div class="peek-side"><h3>Avance del mes</h3>${r.plan_items ? `<p class="small"><strong>${esc(r.plan_objetivo || 'Plan del mes')}</strong></p><ul class="peek-items">${r.plan_items.map((i) => `<li class="${i.estado}">${esc(i.accion)}</li>`).join('')}</ul>` : '<p class="muted small">Sin plan este mes.</p>'}
    <p class="small">Academia: ${r.mod_total ? `${r.mod_ok}/${r.mod_total} módulos aprobados` : 'sin módulos aún'}</p>
    <a class="btn small" href="/admin/personas/${r.id}">Abrir informe completo</a></div></div></td></tr>`;

// ---------- Gráficos del resumen ejecutivo ----------
const COL = { navy: '#041E42', navy3: '#163E73', signal: '#1FA59A', amber: '#E2A03F', info: '#6B8CC7', gray: '#C4CEDB', err: '#C8473E' };

function donut(segs, center, sub) {
  const total = segs.reduce((a, x) => a + x.v, 0);
  const R = 62, r = 42, cx = 80, cy = 80;
  let a0 = -Math.PI / 2;
  const arcs = total ? segs.filter((x) => x.v > 0).map((x) => {
    const a1 = a0 + (x.v / total) * Math.PI * 2 - (x.v === total ? 0.0001 : 0);
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const p = (rad, ang) => `${(cx + rad * Math.cos(ang)).toFixed(2)} ${(cy + rad * Math.sin(ang)).toFixed(2)}`;
    const d = `M${p(R, a0)} A${R} ${R} 0 ${large} 1 ${p(R, a1)} L${p(r, a1)} A${r} ${r} 0 ${large} 0 ${p(r, a0)} Z`;
    a0 = a1;
    return `<path d="${d}" fill="${x.c}"><title>${esc(x.l)}: ${x.v}</title></path>`;
  }).join('') : `<circle cx="${cx}" cy="${cy}" r="${(R + r) / 2}" fill="none" stroke="${COL.gray}" stroke-width="${R - r}"/>`;
  return `<div class="donut"><svg viewBox="0 0 160 160" role="img" aria-label="${esc(sub)}">${arcs}<text x="80" y="80" class="d-num" text-anchor="middle">${esc(center)}</text><text x="80" y="98" class="d-sub" text-anchor="middle">${esc(sub)}</text></svg>
    <ul class="d-legend">${segs.map((x) => `<li><i style="background:${x.c}"></i>${esc(x.l)}<b>${x.v}</b></li>`).join('')}</ul></div>`;
}

function hbars(items, { max = 100, unit = '', empty = 'Sin datos todavía', color = COL.navy3 } = {}) {
  if (!items.length) return `<p class="muted small chart-empty">${empty}</p>`;
  return `<div class="hbars">${items.map((x) => `<div class="hb"><div class="hb-l"><span>${esc(x.l)}</span>${x.note ? `<em>${esc(x.note)}</em>` : ''}</div>
    <div class="hb-t"><span style="width:${x.v == null ? 0 : Math.max(2, Math.min(100, (x.v / max) * 100))}%;background:${x.c || color}"></span></div><b>${x.v == null ? '—' : `${x.v}${unit}`}</b></div>`).join('')}</div>`;
}

function execSummary(list, all, area, series, gaps, clientes, voz) {
  const avg = (xs) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
  const st = (k) => list.filter((r) => (k === 'sin' ? !r.status || r.status === 'pendiente' : k === 'curso' ? r.status === 'en_curso' : k === 'env' ? ['enviada', 'analizando'].includes(r.status) : r.status === 'analizada')).length;
  const done = list.filter((r) => ['enviada', 'analizando', 'analizada'].includes(r.status)).length;
  const evalDonut = donut([
    { l: 'Con informe', v: st('inf'), c: COL.signal }, { l: 'Enviadas', v: st('env'), c: COL.info },
    { l: 'En curso', v: st('curso'), c: COL.amber }, { l: 'Sin empezar', v: st('sin'), c: COL.gray },
  ], list.length ? `${Math.round((done / list.length) * 100)}%` : '—', 'completadas');
  const lv = ['Inicial', 'En desarrollo', 'Competente', 'Destacado'];
  const lvCol = [COL.err, COL.amber, COL.info, COL.signal];
  const levelDonut = donut(lv.map((l, i) => ({ l, v: list.filter((r) => r.nivel === l).length, c: lvCol[i] })), String(list.filter((r) => r.nivel).length), 'con nivel');
  const groups = area ? [] : Object.keys(AREAS).map((k) => ({ k, g: all.filter((r) => r.area === k) })).filter((x) => x.g.length);
  const byScore = groups.map(({ k, g }) => { const s = g.filter((r) => r.score != null).map((r) => r.score); return { l: areaName(k), v: avg(s), note: `${s.length}/${g.length} evaluados`, c: COL.navy3 }; }).sort((a, b) => (b.v ?? -1) - (a.v ?? -1));
  const byProg = groups.map(({ k, g }) => { const p = g.filter((r) => r.items).map((r) => r.prog); return { l: areaName(k), v: avg(p), note: `${p.length} planes`, c: COL.signal }; }).sort((a, b) => (b.v ?? -1) - (a.v ?? -1));
  const peopleScore = area ? list.filter((r) => r.score != null).sort((a, b) => b.score - a.score).map((r) => ({ l: r.name, v: r.score, c: r.score >= 80 ? COL.signal : r.score >= 65 ? COL.info : r.score >= 50 ? COL.amber : COL.err })) : [];
  const last = series[series.length - 1] || {};
  const labels = { servicio: 'Servicio', preparacion: 'Preparación', herramientas: 'Procesos y herramientas', acompanamiento: 'Acompañamiento', motivacion: 'Motivación' };
  const pulseBars = Object.entries(labels).filter(([k]) => last[k] != null).map(([k, l]) => ({ l, v: last[k], c: last[k] >= 4 ? COL.signal : last[k] >= 3.3 ? COL.info : COL.amber }));
  const maxGap = Math.max(1, ...gaps.map((g) => g.n));
  const gapBars = gaps.map((g) => ({ l: g.t, v: g.n, c: COL.amber }));
  return `<section class="exec" aria-label="Resumen ejecutivo">
    <div class="chart-card"><h3>Avance de la evaluación</h3>${evalDonut}</div>
    <div class="chart-card"><h3>Nivel de servicio</h3>${levelDonut}</div>
    <a class="chart-card ai-card" href="/admin/clientes"><h3>Percepción de la IA · clientes en Google</h3>${clientes ? `<p class="ai-score"><b>${clientes.data.promedio.toFixed(1)}</b><span>de 5 · ${clientes.data.resenas} reseñas</span></p>${hbars(clientes.data.dimensiones.map((x) => ({ l: x.l, v: x.v, c: x.v >= 4 ? COL.signal : x.v >= 3 ? COL.info : x.v >= 2.2 ? COL.amber : COL.err })), { max: 5 })}<p class="muted small">Ver análisis completo</p>` : '<p class="muted small">Sin análisis todavía.</p>'}</a>
    <div class="chart-card"><h3>Voz de quienes atendemos · QR</h3>${voz?.tot?.n ? `<p class="ai-score"><b>${voz.tot.prom.toFixed(1)}</b><span>de 5 · ${voz.tot.n} respuestas</span></p>${hbars((area ? voz.people.map((p) => ({ l: p.name, v: p.v })) : voz.areas.map((a) => ({ l: areaName(a.area), v: a.v }))).map((x) => ({ ...x, c: x.v >= 4 ? COL.signal : x.v >= 3 ? COL.amber : COL.err })), { max: 5 })}` : '<p class="muted small">Aparece cuando pacientes, médicos y clientes escaneen los códigos QR del equipo.</p>'}</div>
    <div class="chart-card"><h3>Percepción del equipo${last.mes ? ` · ${esc(fmonth(last.mes).split(' ')[0])}` : ''}</h3>${hbars(pulseBars, { max: 5, empty: 'Aparece cuando el equipo responde el pulso del mes.' })}${pulseBars.length ? '<p class="muted small">Promedio de 1 a 5</p>' : ''}</div>
    ${area ? `<div class="chart-card wide"><h3>Puntaje por persona</h3>${hbars(peopleScore, { empty: 'Aparece cuando haya informes.' })}</div>`
      : `<div class="chart-card wide"><h3>Puntaje promedio por área</h3>${hbars(byScore, { empty: 'Aparece cuando haya informes.' })}</div>`}
    <div class="chart-card wide"><h3>Brechas más frecuentes</h3>${hbars(gapBars, { max: maxGap, unit: '', empty: 'Aparecen con los informes de evaluación.' })}${gapBars.length ? '<p class="muted small">Número de personas con esa oportunidad de mejora</p>' : ''}</div>
    ${area ? '' : `<div class="chart-card wide"><h3>Avance de planes del mes por área</h3>${hbars(byProg, { unit: '%', empty: 'Aparece cuando haya planes mensuales publicados.' })}</div>`}
  </section>`;
}

export function dashboard(rows, mes, area, pending = 0, series = [], comments = [], pulse = [], insight = null, error = '', gaps = [], clientes = null, voz = null) {
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
  const aq = area ? `area=${area}` : '';
  const kpis = [
    ['Personas', list.length, `/admin/equipo`],
    ['Evaluaciones completas', `${list.filter((r) => ['enviada', 'analizando', 'analizada'].includes(r.status)).length}/${list.length}`, `/admin/evaluaciones?${aq}`],
    ['Puntaje promedio', avg(scores) ?? '—', `/admin/evaluaciones?estado=informe&${aq}`],
    ['Avance de planes del mes', progs.length ? `${avg(progs)}%` : '—', '#personas'],
    ['Sesiones 1:1 del mes', list.reduce((a, r) => a + r.sessions_month, 0), '#personas'],
    ['Requieren atención', list.filter((r) => r.flags.some(([, c]) => c === 'err' || c === 'warn')).length, '#atencion'],
  ];
  const byArea = Object.keys(AREAS).map((k) => {
    const g = all.filter((r) => r.area === k);
    const s = g.filter((r) => r.score !== null).map((r) => r.score);
    const pr = g.filter((r) => r.items).map((r) => r.prog);
    return `<a class="areacard ${area === k ? 'on' : ''}" href="/admin?area=${k}"><p class="eyebrow">${esc(areaName(k))}</p><div class="ac-row"><div><b>${g.length}</b><span>personas</span></div><div><b>${avg(s) ?? '—'}</b><span>puntaje</span></div></div><div class="bar" title="Avance de planes"><span style="width:${pr.length ? avg(pr) : 0}%"></span></div><span class="ac-foot">${pr.length ? `Planes al ${avg(pr)}%` : 'Sin planes este mes'}</span></a>`;
  }).join('');
  const trend = (r) => (r.score !== null && r.prev_score !== null ? (r.score > r.prev_score ? ` <span class="up">▲ ${r.score - r.prev_score}</span>` : r.score < r.prev_score ? ` <span class="down">▼ ${r.prev_score - r.score}</span>` : '') : '');
  const attention = list.filter((r) => r.flags.some(([, c]) => c === 'err' || c === 'warn'));
  return `<section class="band"><div class="band-copy"><div class="row-head"><div><p class="band-sub">Panel de ${esc(fmonth(mes))}</p><h1>${area ? esc(areaLabel(area)) : 'Todo el equipo'}</h1></div>
    <div class="actions">${pending ? `<a class="btn light" href="/admin/solicitudes">${pending} solicitud${pending > 1 ? 'es' : ''} por aprobar</a>` : ''}<a class="btn outline-light" href="/admin/equipo">Agregar personas</a></div></div>
  <div class="kpis">${kpis.map(([l, v, h]) => `<a class="kpi" href="${h}"><b>${v}</b><span>${esc(l)}</span></a>`).join('')}</div></div></section>
  ${execSummary(list, all, area, series, gaps, clientes, voz)}
  <div class="areas"><a class="areacard all ${area ? '' : 'on'}" href="/admin"><p class="eyebrow">Todas las áreas</p><div class="ac-row"><div><b>${all.length}</b><span>personas</span></div></div></a>${byArea}</div>
  ${error ? `<p class="notice err">${esc(error)}</p>` : ''}
  ${evolution(series, comments, pulse)}
  ${improve(insight, area)}
  ${attention.length ? `<section class="card" id="atencion"><h2 style="margin-top:0">Requieren atención (${attention.length})</h2><div class="attn">${attention.map((r) => `<a href="/admin/personas/${r.id}" class="attn-item"><strong>${esc(r.name)}</strong><span class="muted small">${esc(areaName(r.area))}${r.sede ? ` · ${esc(r.sede)}` : ''}</span><div>${r.flags.filter(([, c]) => c === 'err' || c === 'warn').map(([l, c]) => `<span class="badge ${c}">${esc(l)}</span>`).join(' ')}</div></a>`).join('')}</div></section>` : ''}
  <section class="card" id="personas"><h2>Personas</h2><p class="muted small">Toca una persona para ver su informe y su avance.</p><table class="tbl dash"><thead><tr><th>Profesional</th><th>Evaluación</th><th>Puntaje</th><th>Plan del mes</th><th>Estudio</th><th>Último 1:1</th><th>Señales</th></tr></thead><tbody>
  ${list.length ? list.map((r) => `<tr class="peek-toggle" data-peek="${r.id}" tabindex="0" aria-expanded="false"><td><div class="who-cell">${avatar(r)}<div><strong>${esc(r.name)}</strong><br><span class="muted small">${esc(areaName(r.area))}${r.sede ? ` · ${esc(r.sede)}` : ''}</span></div></div></td>
    <td>${r.status ? badge(r.status) : '<span class="muted">—</span>'}</td><td>${r.score ?? '—'}${trend(r)}</td>
    <td>${r.plan_id ? `<div class="bar slim"><span style="width:${r.prog}%"></span></div><span class="muted small">${r.done}/${r.items} hechas${r.doing ? ` · ${r.doing} en curso` : ''}</span>` : '<span class="muted">—</span>'}</td>
    <td>${r.mod_total ? `${r.mod_ok}/${r.mod_total} aprobados${r.mod_id ? `<br><span class="small ${r.mod_passed ? 'up' : 'muted'}">${r.mod_passed ? 'Mes aprobado' : `Mes: ${r.mod_attempts}/2 intentos`}</span>` : ''}` : '<span class="muted">—</span>'}</td>
    <td>${r.last_session ? fdate(r.last_session) : '<span class="muted">—</span>'}</td>
    <td>${r.flags.map(([l, c]) => `<span class="badge ${c}">${esc(l)}</span>`).join(' ') || '<span class="badge ok">Al día</span>'}</td></tr>${peek(r)}`).join('') : '<tr><td colspan="7" class="muted">Aún no hay personas en el equipo.</td></tr>'}
  </tbody></table></section>
  <script>document.querySelectorAll('.peek-toggle').forEach((tr)=>{const t=()=>{const p=document.getElementById('peek-'+tr.dataset.peek);p.hidden=!p.hidden;tr.setAttribute('aria-expanded',String(!p.hidden));tr.classList.toggle('open',!p.hidden);};tr.addEventListener('click',(e)=>{if(e.target.closest('a,button'))return;t();});tr.addEventListener('keydown',(e)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();t();}});});</script>`;
}

export function adminRequests(rows, sedes) {
  return `<p class="eyebrow">Registro</p><h1>Solicitudes por aprobar</h1>
    <p class="muted">Comparte la página de registro con tu equipo: <input class="copy" readonly value="${esc((process.env.BASE_URL || '') + '/registro')}" onclick="this.select()" style="max-width:420px"></p>
    ${rows.length ? rows.map((u) => `<section class="card"><div class="row-head"><div class="person-id">${avatar(u, 'lg')}<div><h2 style="margin-top:0">${esc(u.name)}</h2><p class="muted">${esc(u.email)}${u.telefono ? ` · ${esc(u.telefono)}` : ''}${u.cargo ? ` · ${esc(u.cargo)}` : ''} · Solicitó ${fdate(u.created_at)}</p></div></div></div>
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

export function studyList(mods, metodologia = []) {
  const academy = mods.filter((m) => m.numero);
  const ok = (academy.length ? academy : mods).filter((m) => m.st.passed).length;
  const extra = mods.filter((m) => !m.numero && m.st.win !== 'proximo');
  const item = (m) => {
    const locked = m.st.win === 'proximo';
    const tag = locked ? '<span class="badge muted">Próximamente</span>' : stBadge(m.st.estado);
    const inner = `<span class="ac-num">${m.numero || '•'}</span><div><p class="eyebrow">${esc(fmonth(m.mes))}</p><h3>${esc(m.titulo)}</h3><p class="muted small">${esc(m.objetivo)}</p><div>${tag}${m.st.attempts.length ? ` <span class="muted small">Mejor nota: ${m.st.best}%</span>` : ''}</div></div>`;
    return locked ? `<div class="route-step locked">${inner}</div>` : `<a class="route-step ${m.st.estado}" href="/estudio/${m.id}">${inner}</a>`;
  };
  return `<section class="greet academy-hero"><div class="greet-copy"><p class="hello">Academia Aural</p><h1>${academy.length ? `${ok} de ${academy.length} módulos aprobados` : 'Tu ruta de aprendizaje'}</h1>
    <p class="greet-msg">Un módulo por mes, pensado para tu área. Estudias la teoría, presentas la evaluación y avanzas.</p></div>${arcs('draw')}</section>
    <details class="card how-academy" ${ok ? '' : 'open'}><summary><h2>Cómo funciona</h2></summary><ul class="method">${metodologia.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></details>
    ${academy.length ? `<section class="card"><h2>Tu ruta de 12 módulos</h2><div class="route">${academy.map(item).join('')}</div></section>` : ''}
    ${extra.length ? `<section class="card"><h2>${academy.length ? 'Módulos adicionales' : 'Módulos'}</h2><div class="route">${extra.map(item).join('')}</div></section>` : ''}
    ${!academy.length && !extra.length ? '<section class="card"><p class="muted">Tu líder está preparando la ruta de tu área. Te avisaremos por correo cuando se habilite tu primer módulo.</p></section>' : ''}`;
}

export function studyModule(m, st, last, imgs, isAdmin) {
  const sections = (m.secciones || []).map((x, i) => `<section class="lesson" id="s${i + 1}"><p class="eyebrow">Parte ${i + 1}</p><h2>${esc(x.titulo)}</h2>${md(x.contenido)}</section>`).join('');
  let result = '';
  if (last) {
    const ans = (last.answers || []).map((x, i) => (x && typeof x === 'object' ? x : { q: i, a: x }));
    const wrong = ans.map((x, i) => (x.a === m.preguntas[x.q]?.correcta ? null : i + 1)).filter(Boolean);
    const reveal = last.passed || st.attempts.length >= 2;
    result = `<section class="card result ${last.passed ? 'pass' : 'fail'}" id="resultado"><p class="eyebrow">Resultado del intento ${st.attempts.findIndex((a) => a.id === last.id) + 1}</p>
      <h2>${last.score}% · ${last.passed ? '¡Aprobaste el módulo!' : 'No alcanzaste el 85%'}</h2>
      ${last.passed ? '<p>Excelente trabajo. Sigue aplicando lo aprendido en tu día a día.</p>' : st.canTake ? `<p>No elegiste la mejor respuesta en las preguntas ${wrong.join(', ')}. Repasa la teoría y vuelve a intentarlo: te queda 1 intento, con preguntas diferentes.</p>` : '<p>Ya usaste tus 2 intentos. El módulo queda registrado como no aprobado; el próximo mes se habilita un nuevo módulo.</p>'}
      ${reveal ? `<details><summary>Ver respuestas y explicaciones</summary><ol class="review">${ans.map((x) => { const p = m.preguntas[x.q]; if (!p) return ''; const ok = x.a === p.correcta; const valid = !ok && x.a != null && x.a === p.alternativa;
        return `<li class="${ok ? 'ok' : 'bad'}"><p><strong>${esc(p.texto)}</strong></p>${!ok && x.a != null ? `<p class="small">Elegiste: ${esc(p.opciones[x.a])}${valid ? ' <span class="badge warn">Válida, pero no la mejor</span>' : ''}</p>` : ''}<p class="small">Mejor respuesta: ${esc(p.opciones[p.correcta])}</p><p class="small muted">${esc(p.explicacion)}</p></li>`; }).join('')}</ol></details>` : ''}</section>`;
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

export function studyQuiz(m, st, draw) {
  return `<p><a href="/estudio/${m.id}">← Volver a la teoría</a></p>
  <form method="post" action="/estudio/${m.id}/evaluacion" class="card evalform" onsubmit="return confirm('¿Enviar tus respuestas? Este es tu intento ${st.attempts.length + 1} de 2.')">
    <p class="eyebrow">Evaluación · intento ${st.attempts.length + 1} de 2 · se aprueba con 85%</p><h1>${esc(m.titulo)}</h1>
    <p class="muted small">Lee cada caso con calma: varias respuestas pueden ser válidas, elige la mejor. Tus preguntas son distintas a las de tus compañeros.</p>
    ${draw.map(({ qi, order }, i) => { const p = m.preguntas[qi]; return `<fieldset class="q"><legend><span class="num">${i + 1}</span>${esc(p.texto)}</legend><div class="opts">${order.map((j) => `<label><input type="radio" name="q${qi}" value="${j}" required><span>${esc(p.opciones[j])}</span></label>`).join('')}</div></fieldset>`; }).join('')}
    <div class="nav"><span></span><button class="btn">Enviar respuestas</button></div></form>`;
}

export function adminStudy(area, mods, staff, mes, error) {
  const nextMes = (() => { const used = new Set(mods.map((m) => m.mes)); let [y, mo] = mes.split('-').map(Number); for (let i = 0; i < 24; i++) { const k = `${y}-${String(mo).padStart(2, '0')}`; if (!used.has(k)) return k; mo++; if (mo > 12) { mo = 1; y++; } } return mes; })();
  return `<p class="eyebrow">Plan de estudio</p><h1>${esc(areaLabel(area))}</h1>
    <div class="tabs">${Object.keys(AREAS).map((k) => `<a href="/admin/estudio?area=${k}" class="${k === area ? 'on' : ''}">${esc(areaName(k))}</a>`).join('')}</div>
    ${error ? `<p class="notice err">${esc(error)}</p>` : ''}
    ${mods.some((m) => m.numero) ? '' : `<section class="card academy-new"><h2>Crear la Academia de esta área</h2><p>La IA diseña una ruta de 12 módulos, de lo fundamental a lo avanzado, priorizando las oportunidades de mejora del área. Cada módulo queda en un mes. Desde el día 15 de cada mes se prepara el contenido del módulo siguiente y te llega un correo para revisarlo; se publica solo el día 1.</p>
      <form method="post" action="/admin/estudio/academia" class="inline-form" onsubmit="const b=this.querySelector('button');b.disabled=true;b.textContent='Diseñando la ruta…'"><input type="hidden" name="area" value="${area}"><label>Primer mes<input type="month" name="inicio" value="${nextMes}" required></label><button class="btn">Crear ruta de 12 módulos</button></form></section>`}
    <section class="card"><h2 style="margin-top:0">Módulo adicional</h2>
      <form method="post" action="/admin/estudio/generar" class="grid-gen" onsubmit="const b=this.querySelector('[data-ia]');if(event.submitter===b){b.disabled=true;b.textContent='Generando… (1-2 min)';}">
        <input type="hidden" name="area" value="${area}"><label>Mes<input type="month" name="mes" value="${nextMes}" required></label>
        <label>Tema (opcional)<input name="tema" placeholder="Si lo dejas vacío, la IA lo elige según los resultados del área"></label>
        <button class="btn" name="modo" value="ia" data-ia>Generar con IA</button><button class="btn ghost" name="modo" value="manual" formnovalidate>Crear vacío</button></form>
      <p class="muted small">La IA arma la teoría (4-6 partes) y un banco de 18-20 casos (a cada persona se le sortean 10 distintos) con base en el rol del área, las oportunidades de mejora de sus evaluaciones y los módulos anteriores. Luego tú lo revisas, le subes imágenes y lo publicas.</p></section>
    <section class="card"><table class="tbl"><thead><tr><th>Mes</th><th>Módulo</th><th>Estado</th><th>Aprobados</th><th>Presentaron</th><th></th></tr></thead><tbody>
    ${mods.length ? mods.map((m) => `<tr><td><strong>${esc(fmonth(m.mes))}</strong><br><span class="muted small">${{ abierto: 'Abierto', proximo: 'Próximo', cerrado: 'Cerrado' }[windowStateView(m.mes, mes)]}</span></td><td>${m.numero ? `<span class="muted small">Módulo ${m.numero} de 12</span><br>` : ''}${esc(m.titulo)}<br><span class="muted small">${m.nsec ? `${m.nsec} partes · ${m.npreg} preguntas` : 'Contenido pendiente'}</span></td>
      <td>${m.published ? '<span class="badge ok">Publicado</span>' : m.nsec ? `<span class="badge warn">Borrador${m.auto_publish && m.numero ? ' · se publica el día 1' : ''}</span>` : '<span class="badge muted">Por preparar</span>'}</td><td>${m.aprobados}/${staff}</td><td>${m.presentaron}</td><td><a href="/admin/estudio/${m.id}">Editar</a> · <a href="/estudio/${m.id}">Ver</a></td></tr>`).join('') : '<tr><td colspan="6" class="muted">Aún no hay módulos para esta área.</td></tr>'}
    </tbody></table></section>`;
}
const windowStateView = (mes, now) => (mes === now ? 'abierto' : mes > now ? 'proximo' : 'cerrado');

export function adminStudyEdit(m, imgs, results, attempted, ok) {
  const secs = [...(m.secciones || []), { titulo: '', contenido: '', imagen_sugerida: '' }];
  const pregs = [...(m.preguntas || []), { texto: '', opciones: [], correcta: 0, explicacion: '' }];
  return `<p><a href="/admin/estudio?area=${m.area}">← ${esc(areaLabel(m.area))}</a></p>
    ${ok ? '<p class="notice ok">Cambios guardados.</p>' : ''}
    <div class="row-head"><div><p class="eyebrow">${esc(fmonth(m.mes))} · ${esc(areaName(m.area))}</p><h1>${esc(m.titulo)}</h1></div>
      <div class="actions">${attempted ? '' : `<form method="post" action="/admin/estudio/${m.id}/contenido" class="inline" onsubmit="const b=this.querySelector('button');b.disabled=true;b.textContent='Generando… (1-2 min)'"><button class="btn ghost">${(m.secciones || []).length ? 'Regenerar contenido con IA' : 'Generar contenido con IA'}</button></form>`}
      ${m.numero ? `<form method="post" action="/admin/estudio/${m.id}/auto" class="inline"><button class="btn ghost">${m.auto_publish ? 'Desactivar publicación automática' : 'Activar publicación automática'}</button></form>` : ''}
      <a class="btn ghost" href="/estudio/${m.id}" target="_blank">Vista previa</a>
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
    <script src="/upload.js?v=${V}"></script>`;
}

// ---------- Ranking ----------
const PRIZE = 2;
export function rankingPage(rows, mes, cur, months, me) {
  const closed = mes < cur;
  const mine = rows.find((r) => r.id === me.id);
  const areas = Object.keys(AREAS).map((k) => {
    const list = rows.filter((r) => r.area === k);
    if (!list.length) return '';
    const top = list.filter((r) => r.puntos > 0).slice(0, 3);
    const pos = mine && mine.area === k ? list.indexOf(mine) + 1 : 0;
    const slot = (r, place) => r ? `<div class="podium-slot p${place}">
        <div class="pod-avatar">${avatar(r)}<span class="medal">${place}</span></div>
        <p class="pod-name">${esc(r.name)}</p><p class="pod-sede">${esc(r.sede || '')}</p>
        <p class="pod-pts"><b>${r.puntos}</b> pts</p>${place <= PRIZE ? `<span class="prize">${closed ? 'Ganó premio' : 'Va por premio'}</span>` : ''}
        <div class="step">${place}</div></div>` : `<div class="podium-slot p${place} empty"><div class="pod-avatar"><span class="avatar initials">?</span></div><p class="pod-name muted">Puesto libre</p><div class="step">${place}</div></div>`;
    return `<section class="card rank-area ${me.area === k ? 'mine' : ''}"><div class="row-head"><h2>${esc(areaName(k))}</h2><span class="muted small">${list.length} ${list.length === 1 ? 'persona' : 'personas'}</span></div>
      <div class="podium">${slot(top[1], 2)}${slot(top[0], 1)}${slot(top[2], 3)}</div>
      ${pos ? `<p class="my-pos">Vas de <strong>#${pos}</strong> con <strong>${mine.puntos} puntos</strong>${pos > 3 && top[2] ? `, a ${Math.max(0, top[2].puntos - mine.puntos + 1)} del podio` : ''}.</p>` : ''}</section>`;
  }).join('');
  const myBreak = mine ? `<div class="mybreak"><span>Módulo <b>${mine.p_estudio}</b></span><span>Plan <b>${mine.acciones * 10}</b></span><span>1:1 <b>${mine.sesiones * 10}</b></span><span>Pulso <b>${mine.pulso * 10}</b></span><span>Evaluación <b>${mine.evaluacion * 30}</b></span></div>` : '';
  return `<section class="greet rank-hero"><div class="greet-copy"><p class="hello">${closed ? 'Resultados de' : 'Ranking de'} ${esc(fmonth(mes))}</p>
    <h1>${closed ? 'Así cerró el mes' : 'Quién lidera el servicio este mes'}</h1>
    <p class="greet-msg">Los dos primeros de cada área reciben premio. ${closed ? '' : 'El mes cierra el último día; cada acción suma.'}</p>
    ${mine ? `<div class="greet-tip"><strong>Tus puntos: ${mine.puntos}</strong>${myBreak}</div>` : ''}</div>${arcs('draw')}</section>
    <div class="row-head rank-tools"><form method="get" class="inline-form"><label class="sr" for="mes">Mes</label><select id="mes" name="mes" onchange="this.form.submit()">${months.map((m) => `<option value="${m}" ${m === mes ? 'selected' : ''}>${esc(fmonth(m))}</option>`).join('')}</select></form>
      <details class="how"><summary>Cómo se ganan puntos</summary><ul><li>Módulo del mes aprobado: 50 en el primer intento o 30 en el segundo, más la nota dividida entre 10.</li><li>Cada acción del plan del mes hecha: 10.</li><li>Cada sesión uno a uno: 10.</li><li>Pulso del mes respondido: 10.</li><li>Evaluación de servicio enviada: 30.</li></ul><p class="small muted">En empate gana la mejor nota del módulo.</p></details></div>
    <div class="rank-grid">${areas || '<p class="muted">Aún no hay personas registradas.</p>'}</div>`;
}

const EV_FILTERS = [['', 'Todas'], ['revisar', 'Por revisar'], ['informe', 'Con informe'], ['enviada', 'Enviadas sin informe'], ['en_curso', 'En curso'], ['pendiente', 'Sin empezar']];
export function adminEvaluations(rows, estado, area, counts) {
  const qs = (e, a) => `?${[e ? `estado=${e}` : '', a ? `area=${a}` : ''].filter(Boolean).join('&')}`;
  return `<section class="band"><div class="band-copy"><p class="band-sub">Evaluaciones de servicio</p><h1>${area ? esc(areaLabel(area)) : 'Todo el equipo'}</h1>
    <div class="kpis">${[['Asignadas', counts.total], ['Enviadas', counts.enviadas], ['Con informe', counts.informe], ['Por revisar', counts.revisar], ['En curso', counts.en_curso], ['Sin empezar', counts.pendiente]].map(([l, v]) => `<div class="kpi"><b>${v}</b><span>${l}</span></div>`).join('')}</div></div></section>
    ${counts.informe ? `<div class="row-head" style="margin-bottom:12px"><span></span><a class="btn" href="/admin/informes.pdf${area ? `?area=${area}` : ''}">Descargar ${area ? 'los informes del área' : 'todos los informes'} en PDF</a></div>` : ''}
    <div class="tabs">${EV_FILTERS.map(([k, l]) => `<a href="/admin/evaluaciones${qs(k, area)}" class="${k === estado ? 'on' : ''}">${l}</a>`).join('')}</div>
    <div class="tabs small-tabs"><a href="/admin/evaluaciones${qs(estado, '')}" class="${area ? '' : 'on'}">Todas las áreas</a>${Object.keys(AREAS).map((k) => `<a href="/admin/evaluaciones${qs(estado, k)}" class="${k === area ? 'on' : ''}">${esc(areaName(k))}</a>`).join('')}</div>
    <section class="card"><table class="tbl"><thead><tr><th>Profesional</th><th>Estado</th><th>Puntaje</th><th>Resumen</th><th>Enviada</th><th></th></tr></thead><tbody>
    ${rows.length ? rows.map((r) => `<tr><td><div class="who-cell">${avatar(r)}<div><a href="/admin/personas/${r.uid}"><strong>${esc(r.name)}</strong></a><br><span class="muted small">${esc(areaName(r.area))}${r.sede ? ` · ${esc(r.sede)}` : ''}</span></div></div></td>
      <td>${badge(r.status)}${r.status === 'analizada' ? (r.plan_published ? ' <span class="badge ok">Plan publicado</span>' : ' <span class="badge info">Por revisar</span>') : ''}${r.report_error ? ' <span class="badge err">Error en análisis</span>' : ''}</td>
      <td>${r.score != null ? `<strong>${r.score}</strong>${r.nivel ? `<br><span class="muted small">${esc(r.nivel)}</span>` : ''}` : r.status === 'en_curso' ? `<span class="muted small">${r.answered}/${r.total} respuestas</span>` : '—'}</td>
      <td class="small">${r.resumen ? esc(r.resumen.length > 180 ? r.resumen.slice(0, 180) + '…' : r.resumen) : '<span class="muted">—</span>'}</td>
      <td>${fdate(r.submitted_at)}</td><td class="row-actions"><a class="btn ghost small" href="/admin/personas/${r.uid}">${r.score != null ? 'Ver informe' : 'Ver ficha'}</a>${r.score != null ? `<a href="/admin/personas/${r.uid}/informe.pdf">PDF</a>` : ''}</td></tr>`).join('') : '<tr><td colspan="6" class="muted">No hay evaluaciones con este filtro.</td></tr>'}
    </tbody></table></section>`;
}

// ---------- Aprendizaje del equipo ----------
export function learningPage(area, k, people, qs, counts, error) {
  const d = k?.data;
  const temas = d?.temas || [];
  const net = {
    center: areaName(area),
    people: people.map((p) => ({ id: p.id, l: p.name.split(' ')[0], on: ['enviada', 'analizando', 'analizada'].includes(p.status) })),
    questions: qs.map((x) => ({ id: x.id, l: x.text.slice(0, 40) })),
    themes: temas.map((t) => ({ l: t.tema, t: t.tipo, w: t.peso })),
    best: (d?.preguntas || []).flatMap((p) => (p.mejores || []).map((m) => [m.uid, p.id])),
  };
  const sent = counts[area] || 0;
  const fort = temas.filter((t) => t.tipo === 'fortaleza').sort((a, b) => b.peso - a.peso);
  const brec = temas.filter((t) => t.tipo === 'brecha').sort((a, b) => b.peso - a.peso);
  const temaList = (xs, c) => xs.length ? `<div class="hbars">${xs.map((t) => `<div class="hb"><div class="hb-l"><span>${esc(t.tema)}</span><em>${esc(t.detalle)}</em></div><div class="hb-t"><span style="width:${t.peso * 10}%;background:${c}"></span></div><b>${t.peso}/10</b></div>`).join('')}</div>` : '<p class="muted small">Sin temas todavía.</p>';
  return `<section class="band learn-band"><div class="band-copy"><p class="band-sub">Aprendizaje del equipo</p><h1>${esc(areaLabel(area))}</h1>
    <p class="learn-copy">La IA lee las respuestas de todo el equipo, encuentra las mejores, arma la respuesta modelo de cada pregunta y detecta los temas fuertes y débiles. Lo aprendido alimenta la Academia y los planes.</p>
    <div class="kpis"><div class="kpi"><b>${k?.evaluaciones ?? 0}</b><span>evaluaciones leídas</span></div><div class="kpi"><b>${k?.respuestas ?? 0}</b><span>respuestas analizadas</span></div><div class="kpi"><b>${temas.length}</b><span>temas detectados</span></div><div class="kpi"><b>${k ? fdate(k.created_at) : '—'}</b><span>último aprendizaje</span></div></div></div></section>
    <div class="tabs">${Object.keys(AREAS).map((x) => `<a href="/admin/aprendizaje?area=${x}" class="${x === area ? 'on' : ''}">${esc(areaName(x))}${counts[x] ? ` <small>${counts[x]}</small>` : ''}</a>`).join('')}</div>
    ${error ? `<p class="notice err">${esc(error)}</p>` : ''}
    <section class="card net-card"><div class="row-head"><div><h2>Red de conocimiento</h2><p class="muted small">Personas que respondieron, preguntas y temas aprendidos. Las líneas brillantes son las mejores respuestas.</p></div>
      <form method="post" action="/admin/aprendizaje" class="inline" onsubmit="const b=this.querySelector('button');b.disabled=true;b.textContent='Aprendiendo… (1-2 min)';document.querySelector('.net').classList.add('busy')"><input type="hidden" name="area" value="${area}"><button class="btn" ${sent < 2 ? 'disabled title="Se necesitan al menos 2 evaluaciones enviadas"' : ''}>${k ? 'Aprender de nuevo' : 'Aprender de las respuestas'}</button></form></div>
      <canvas class="net" aria-label="Red de conocimiento del área" role="img"></canvas>
      <div class="net-legend"><span><i class="lg-p"></i>Persona que respondió</span><span><i class="lg-q"></i>Pregunta</span><span><i class="lg-f"></i>Fortaleza</span><span><i class="lg-b"></i>Brecha</span></div>
      ${sent < 2 ? `<p class="muted small">Esta área tiene ${sent} evaluación${sent === 1 ? '' : 'es'} enviada${sent === 1 ? '' : 's'}; se necesitan al menos 2 para aprender.</p>` : ''}
      <script type="application/json" id="net-data">${JSON.stringify(net).replace(/</g, '\\u003c')}</script><script src="/net.js?v=${V}"></script></section>
    ${d ? `<section class="card"><h2>Qué aprendimos</h2><p class="lead">${esc(d.resumen)}</p>
      <div class="two"><div><h3>Temas fuertes</h3>${temaList(fort, '#1FA59A')}</div><div><h3>Temas por reforzar</h3>${temaList(brec, '#E2A03F')}</div></div></section>
    <section class="card"><h2>Las mejores respuestas del equipo</h2><p class="muted small">Para cada pregunta abierta: la respuesta modelo construida con lo mejor del equipo, quiénes respondieron mejor y los errores más comunes.</p>
      ${(d.preguntas || []).map((p, i) => `<details class="qbest" ${i ? '' : 'open'}><summary><span class="muted small">${esc(p.modulo)} · ${p.respuestas} respuestas</span><strong>${esc(p.pregunta)}</strong></summary>
        <div class="model"><p class="eyebrow">Respuesta modelo</p><p>${esc(p.respuesta_modelo)}</p></div>
        ${(p.mejores || []).length ? `<div class="bests">${p.mejores.map((m) => `<figure class="best"><blockquote>“${esc(m.text)}”</blockquote><figcaption><a href="/admin/personas/${m.uid}">${esc(m.name)}</a> · ${esc(m.por_que)}</figcaption></figure>`).join('')}</div>` : ''}
        ${(p.errores_comunes || []).length ? `<p class="small"><strong>Errores comunes:</strong> ${p.errores_comunes.map(esc).join(' · ')}</p>` : ''}</details>`).join('')}</section>` : ''}`;
}

// ---------- Percepción de clientes (Google) ----------
export function customersPage(c, pulse) {
  if (!c) return '<section class="card"><h1>Percepción de clientes</h1><p class="muted">Aún no hay análisis de reseñas.</p></section>';
  const d = c.data;
  const colr = (v) => (v >= 4 ? '#1FA59A' : v >= 3 ? '#6B8CC7' : v >= 2.2 ? '#E2A03F' : '#C8473E');
  const bars = (xs) => hbars(xs, { max: 5 });
  return `<section class="band"><div class="band-copy"><p class="band-sub">Percepción de la IA · reseñas de Google al ${fdate(d.fecha + 'T12:00:00')}</p><h1>Lo que dicen los clientes de Aural</h1>
    <p class="learn-copy">${esc(d.resumen)}</p>
    <div class="kpis"><div class="kpi"><b>${d.promedio.toFixed(1)}</b><span>calificación promedio</span></div><div class="kpi"><b>${d.resenas}</b><span>reseñas en Google</span></div><div class="kpi"><b>${d.tiendas.length}</b><span>sedes analizadas</span></div>
      <div class="kpi"><b>${pulse?.servicio ?? '—'}</b><span>percepción del equipo (pulso)</span></div></div></div></section>
  <div class="exec">
    <div class="chart-card"><h3>Calificación por ciudad</h3>${bars(d.ciudades.map((x) => ({ l: x.l, v: x.v, note: `${x.n} reseñas`, c: colr(x.v) })))}</div>
    <div class="chart-card"><h3>Qué perciben los clientes</h3>${bars(d.dimensiones.map((x) => ({ l: x.l, v: x.v, c: colr(x.v) })))}<p class="muted small">Puntaje de 1 a 5 estimado por la IA a partir de los comentarios</p></div>
    <div class="chart-card"><h3>Equipo frente a clientes</h3>${bars([{ l: 'Percepción del equipo', v: pulse?.servicio ?? null, c: '#163E73', note: pulse ? `pulso de ${fmonth(pulse.mes).split(' ')[0]}` : 'sin pulso' }, { l: 'Clientes en Google', v: d.promedio, c: colr(d.promedio), note: `${d.resenas} reseñas` }])}
      <p class="muted small">${pulse?.servicio && pulse.servicio - d.promedio > 0.5 ? 'El equipo percibe su servicio mejor de lo que lo viven los clientes.' : 'Comparación del servicio percibido por dentro y por fuera.'}</p></div>
  </div>
  <section class="card"><h2>Calificación por sede</h2>${bars(d.tiendas.map((t) => ({ l: t.nombre, v: t.rating, note: `${t.ciudad} · ${t.n} reseñas`, c: colr(t.rating) })))}</section>
  <div class="two">
    <section class="card"><h2>Lo que más valoran</h2><ul class="ev">${d.positivos.map((x) => `<li><strong>${esc(x.t)}</strong><span>${esc(x.d)}</span></li>`).join('')}</ul>
      <h3>Personas reconocidas por los clientes</h3><ul class="recog">${d.reconocidos.map((x) => `<li><strong>${esc(x.nombre)}</strong><span>${esc(x.sede)}</span></li>`).join('')}</ul></section>
    <section class="card"><h2>Lo que más les duele</h2><ul class="ev neg">${d.negativos.map((x) => `<li><strong>${esc(x.t)}</strong><span>${esc(x.d)}</span></li>`).join('')}</ul></section>
  </div>
  <section class="card"><h2>Acciones recomendadas</h2><div class="scroll"><table class="tbl"><thead><tr><th>Acción</th><th>Área responsable</th></tr></thead><tbody>${d.acciones.map((x) => `<tr><td><strong>${esc(x.a)}</strong></td><td>${esc(areaName(x.area))}</td></tr>`).join('')}</tbody></table></div>
    <p class="muted small">${esc(d.metodo)}</p></section>`;
}

// ---------- IA en vivo (presentación) ----------
export function aiLivePage(n, learned, outs = [], back = '/') {
  const inputs = [
    ['Respuestas de evaluación', n.respuestas], ['Reseñas de clientes', n.resenas], ['Pulsos del equipo', n.pulsos],
    ['Acciones de planes', n.acciones], ['Intentos de módulos', n.intentos], ['Sesiones uno a uno', n.sesiones],
  ];
  const outputs = ['Fortalezas del equipo', 'Brechas por cerrar', 'Respuestas modelo', 'Módulos de la Academia', 'Planes personalizados', 'Recomendaciones'];
  const total = inputs.reduce((a, [, v]) => a + v, 0);
  const data = { outs: outs.map((o) => o.slice(0, 25)), learned: learned.slice(0, 40), taglines: ['Aprende de cada respuesta.', 'Escucha a cada cliente.', 'Encuentra lo que hacemos mejor.', 'Convierte datos en servicio de excelencia.'] };
  return `<div class="wow" id="wow">
    <canvas id="wow-bg" aria-hidden="true"></canvas>
    <header class="wow-top"><img src="/logo-aural-blanco.png" alt="Aural"><div class="wow-actions"><button type="button" id="wow-full" class="wow-btn">Pantalla completa</button><a href="${back}" class="wow-btn ghost">Salir</a></div></header>
    <section class="wow-hero"><p class="wow-kicker"><span class="dot"></span> IA de servicio Aural · en vivo</p>
      <h1 class="wow-title">La inteligencia que aprende<br>de nuestro equipo</h1>
      <p class="wow-tag"><span id="wow-tag"></span><i class="caret"></i></p></section>
    <section class="wow-stage">
      <ul class="wow-col in">${inputs.map(([l, v], i) => `<li class="chip" data-i="${i}"><b data-count="${v}">0</b><span>${esc(l)}</span></li>`).join('')}</ul>
      <div class="wow-core" id="wow-core"><div class="core-glow"></div><div class="core-label"><b data-count="${total}">0</b><span>datos aprendidos</span></div></div>
      <ul class="wow-col out">${outputs.map((l, i) => `<li class="chip out" data-o="${i}"><i></i><div><small>${esc(l)}</small><p class="say">${esc(outs[i]?.[0] || 'Aprendiendo…')}</p></div></li>`).join('')}</ul>
    </section>
    <section class="wow-insight"><p class="wow-insight-k">Lo último que aprendió</p><p class="wow-insight-t" id="wow-insight">&nbsp;</p><p class="wow-insight-s" id="wow-insight-s">&nbsp;</p></section>
    <footer class="wow-stats">${[['Evaluaciones analizadas', n.evaluaciones], ['Informes generados', n.informes], ['Reseñas de clientes', n.resenas], ['Módulos de la Academia', n.modulos]].map(([l, v]) => `<div><b data-count="${v}">0</b><span>${l}</span></div>`).join('')}</footer>
    <div class="wow-ticker" aria-hidden="true"><div class="track">${[...learned, ...learned].slice(0, 60).map((x) => `<span class="${x.k === 'brecha' ? 'gap' : 'str'}">${esc(x.t)}</span>`).join('')}</div></div>
    <p class="wow-note">Visualización ilustrativa con datos reales del programa. La IA analiza la información con modelos de lenguaje.</p>
    <script type="application/json" id="wow-data">${JSON.stringify(data).replace(/</g, '\\u003c')}</script><script src="/ai-live.js?v=${V}"></script>
  </div>`;
}

// ---------- Líderes ----------
const sinceDays = (d) => (d ? Math.floor((Date.now() - new Date(d)) / 86400e3) : null);
function leaderFlags(r) {
  const f = [];
  const day = Number(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }).slice(8, 10));
  if (!r.status || r.status === 'pendiente') f.push(['No ha hecho la evaluación', 'warn']);
  else if (r.status === 'en_curso') f.push(['Evaluación sin terminar', 'warn']);
  if (r.mod_id && !r.aprobado && r.intentos >= 2) f.push(['Perdió el módulo del mes', 'err']);
  else if (r.mod_id && !r.aprobado && day >= 15) f.push(['Módulo del mes pendiente', 'warn']);
  if (!r.uno_mes && day >= 20) f.push(['Sin uno a uno este mes', 'warn']);
  const d = sinceDays(r.last_seen);
  if (d === null || d > 7) f.push([d === null ? 'Nunca ha entrado' : `Sin entrar hace ${d} días`, 'warn']);
  return f;
}
const modCell = (r) => (r.mod_id ? `${r.aprobado ? `<span class="badge ok">Aprobado · ${r.best}%</span>` : r.intentos ? `<span class="badge ${r.intentos >= 2 ? 'err' : 'warn'}">${r.best}% · ${r.intentos}/2 intentos</span>` : r.leido ? '<span class="badge info">Leyó la teoría</span>' : '<span class="badge muted">Sin empezar</span>'}` : '<span class="muted small">Sin módulo este mes</span>');

export function leaderHome(user, rows, mes, base = '/lider/personas', me = null) {
  const avg = (xs) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : '—');
  const withMod = rows.filter((r) => r.mod_id);
  const list = rows.map((r) => ({ ...r, flags: leaderFlags(r) }));
  const attn = list.filter((r) => r.flags.length);
  const kpis = [
    ['Personas a cargo', rows.length],
    ['Evaluaciones con informe', `${rows.filter((r) => r.score != null).length}/${rows.length}`],
    ['Puntaje promedio', avg(rows.filter((r) => r.score != null).map((r) => r.score))],
    ['Módulo del mes aprobado', withMod.length ? `${withMod.filter((r) => r.aprobado).length}/${withMod.length}` : '—'],
    ['Uno a uno del mes', `${rows.filter((r) => r.uno_mes).length}/${rows.length}`],
    ['Requieren atención', attn.length],
  ];
  return `<section class="band"><div class="band-copy"><p class="band-sub">Mi equipo · ${esc(fmonth(mes))}</p><h1>${user.leads_all ? 'Todo el personal' : `Equipo de ${esc(base === '/lider/personas' ? String(user.name).split(' ')[0] : user.name)}`}</h1>
    <div class="kpis">${kpis.map(([l, v]) => `<div class="kpi"><b>${v}</b><span>${esc(l)}</span></div>`).join('')}</div></div></section>
  ${me ? `<section class="card"><div class="row-head"><div><p class="eyebrow">Tu formación como líder</p><h2 style="margin:4px 0 6px">Tú también te formas con tu equipo</h2>
    <p class="muted small">Evaluación: ${me.status ? badge(me.status) : '—'}${me.score != null ? ` · Puntaje <strong>${me.score}</strong>` : ''} · Módulo del mes: ${modCell(me)}${me.publicados ? ` · Academia ${me.aprobados}/${me.publicados} aprobados` : ''}${me.plan_total ? ` · Tu plan ${me.plan_hechos}/${me.plan_total} hechas` : ''}</p></div>
    <div class="actions">${me.status === 'pendiente' || me.status === 'en_curso' ? '<a class="btn" href="/evaluacion">Hacer mi evaluación</a>' : ''}<a class="btn ${me.status === 'pendiente' || me.status === 'en_curso' ? 'ghost' : ''}" href="/estudio">Ir a mi Academia</a><a class="btn ghost" href="/mi">Mi espacio</a></div></div></section>` : ''}
  ${rows.length ? '' : '<section class="card"><p class="muted">Todavía no tienes personas asignadas. El administrador del programa las asigna desde el panel.</p></section>'}
  ${attn.length ? `<section class="card"><h2 style="margin-top:0">Requieren atención (${attn.length})</h2><div class="attn">${attn.map((r) => `<a href="${base}/${r.id}" class="attn-item"><strong>${esc(r.name)}</strong><span class="muted small">${esc(areaName(r.area))}${r.sede ? ` · ${esc(r.sede)}` : ''}</span><div>${r.flags.map(([l, c]) => `<span class="badge ${c}">${esc(l)}</span>`).join(' ')}</div></a>`).join('')}</div></section>` : ''}
  ${rows.length ? `<section class="card"><h2>Personas</h2><table class="tbl dash"><thead><tr><th>Profesional</th><th>Evaluación</th><th>Puntaje</th><th>Plan del mes</th><th>Módulo del mes</th><th>Academia</th><th>Uno a uno</th><th>Voz QR</th><th>Última entrada</th></tr></thead><tbody>
  ${list.map((r) => `<tr><td><div class="who-cell">${avatar(r)}<div><a href="${base}/${r.id}"><strong>${esc(r.name)}</strong></a><br><span class="muted small">${esc(areaName(r.area))}${r.sede ? ` · ${esc(r.sede)}` : ''}</span></div></div></td>
    <td>${r.status ? badge(r.status) : '<span class="muted">—</span>'}</td><td>${r.score ?? '—'}</td>
    <td>${r.plan_total ? `<div class="bar slim"><span style="width:${Math.round((100 * r.plan_hechos) / r.plan_total)}%"></span></div><span class="muted small">${r.plan_hechos}/${r.plan_total} hechas</span>` : '<span class="muted">—</span>'}</td>
    <td>${modCell(r)}</td><td>${r.publicados ? `${r.aprobados}/${r.publicados} aprobados` : '<span class="muted">—</span>'}</td>
    <td>${r.uno_mes ? '<span class="badge ok">Hecho</span>' : '<span class="badge warn">Pendiente</span>'}${r.comp_abiertos ? `<br><span class="muted small">${r.comp_abiertos} compromiso${r.comp_abiertos > 1 ? 's' : ''} abierto${r.comp_abiertos > 1 ? 's' : ''}</span>` : ''}</td>
    <td>${r.voz_n ? `<strong>${r.voz.toFixed(1)}</strong><br><span class="muted small">${r.voz_n} resp.</span>` : '<span class="muted">—</span>'}</td>
    <td>${r.last_seen ? fdate(r.last_seen) : '<span class="muted">Nunca</span>'}</td></tr>`).join('')}
  </tbody></table></section>` : ''}`;
}

export function leaderPerson(person, ev, plans, academy, ctx) {
  const plan = plans[0];
  return `<p><a href="/lider">← Mi equipo</a></p>
  <div class="row-head"><div><p class="eyebrow">${esc(areaLabel(person.area))}${person.cargo ? ` · ${esc(person.cargo)}` : ''}${person.sede ? ` · ${esc(person.sede)}` : ''}</p><div class="person-id">${avatar(person, 'lg')}<div><h1>${esc(person.name)}</h1><p class="muted">${esc(person.email)}</p></div></div></div>
    <div class="actions">${ev?.report ? `<a class="btn ghost" href="/lider/personas/${person.id}/informe.pdf">Descargar informe PDF</a>` : ''}<a class="btn ghost" href="#sesiones">Registrar 1:1</a></div></div>
  <section class="card"><h2 style="margin-top:0">Academia</h2>${academy.length ? `<table class="tbl"><thead><tr><th>Módulo</th><th>Mes</th><th>Teoría</th><th>Mejor nota</th><th>Intentos</th><th>Resultado</th></tr></thead><tbody>
    ${academy.map((m) => `<tr><td><strong>${m.numero ? `${m.numero}. ` : ''}${esc(m.titulo)}</strong></td><td>${esc(fmonth(m.mes))}</td><td>${m.leido ? '<span class="badge ok">Leída</span>' : '<span class="badge muted">Pendiente</span>'}</td>
      <td>${m.best != null ? `${m.best}%` : '—'}</td><td>${m.intentos}/2</td><td>${m.aprobado ? '<span class="badge ok">Aprobado</span>' : m.intentos >= 2 ? '<span class="badge err">No aprobó</span>' : '<span class="badge warn">En curso</span>'}</td></tr>`).join('')}
  </tbody></table>` : '<p class="muted">Aún no hay módulos publicados para su área.</p>'}</section>
  ${plan ? `<section class="card"><h2 style="margin-top:0">Plan de ${esc(fmonth(plan.mes))}</h2>${plan.objetivo ? `<p><strong>${esc(plan.objetivo)}</strong></p>` : ''}<ul class="ev">${plan.items.map((i) => `<li><strong>${esc(i.accion)} ${badge(i.estado)}</strong>${i.indicador ? `<span>Indicador: ${esc(i.indicador)}</span>` : ''}${i.nota ? `<em>${esc(i.nota)}</em>` : ''}</li>`).join('')}</ul></section>` : ''}
  ${ev?.report ? reportView(ev) : `<section class="card"><p class="muted">${ev ? `Evaluación: ${badge(ev.status)} · el informe aparecerá cuando esté analizada.` : 'Sin evaluación asignada.'}</p></section>`}
  ${oneOnOne(person, ctx, `/lider/personas/${person.id}/sesiones`)}`;
}

export function adminLeaders(rows, ok, teams = {}) {
  const avg = (xs) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : '—');
  const summary = rows.filter((r) => r.lider).map((l) => {
    const t = teams[l.id] || [], m = t.filter((r) => r.mod_id), plan = t.filter((r) => r.plan_total);
    return `<a class="areacard" href="/admin/lideres/${l.id}"><p class="eyebrow">${esc(l.name)}</p>
      <div class="ac-row"><div><b>${t.length}</b><span>personas</span></div><div><b>${avg(t.filter((r) => r.score != null).map((r) => r.score))}</b><span>puntaje</span></div><div><b>${m.length ? `${m.filter((r) => r.aprobado).length}/${m.length}` : '—'}</b><span>módulo mes</span></div></div>
      <div class="bar" title="Avance de planes"><span style="width:${plan.length ? avg(plan.map((r) => Math.round((100 * r.plan_hechos) / r.plan_total))) : 0}%"></span></div>
      <span class="ac-foot">${l.leads_all ? 'Ve a todo el personal · ' : ''}${t.filter((r) => r.score != null).length}/${t.length} con informe · Ver equipo →</span></a>`;
  }).join('');
  const leaders = rows.filter((r) => r.lider);
  const count = (id) => rows.filter((r) => r.leader_id === id).length;
  const opts = (sel, self) => `<option value="">Sin líder</option>${leaders.filter((l) => l.id !== self).map((l) => `<option value="${l.id}" ${l.id === sel ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}`;
  return `<section class="band"><div class="band-copy"><p class="band-sub">Seguimiento por líder</p><h1>Líderes</h1></div></section>
  ${ok ? '<p class="notice ok">Cambios guardados.</p>' : ''}
  ${summary ? `<div class="areas leaders">${summary}</div>` : ''}
  <section class="card"><h2 style="margin-top:0">Líderes (${leaders.length})</h2><p class="muted small">Cada líder ve en “Mi equipo” los resultados, informes, planes y avance en la Academia de las personas que tiene asignadas.</p>
    <table class="tbl"><thead><tr><th>Líder</th><th>Alcance</th><th></th></tr></thead><tbody>
    ${leaders.map((l) => `<tr><td><strong>${esc(l.name)}</strong><br><span class="muted small">${esc(l.email)}</span></td><td>${l.leads_all ? '<span class="badge info">Todo el personal</span>' : `${count(l.id)} personas`}</td>
      <td class="row-actions"><form method="post" action="/admin/lideres" class="inline"><button class="btn ghost small" name="todos" value="${l.id}">${l.leads_all ? 'Solo su equipo' : 'Ver todo el personal'}</button></form>
      <form method="post" action="/admin/lideres" class="inline" onsubmit="return confirm('¿Quitar este líder? Su equipo queda sin líder.')"><button class="btn ghost small" name="quitar" value="${l.id}">Quitar</button></form></td></tr>`).join('') || '<tr><td colspan="3" class="muted">Aún no hay líderes.</td></tr>'}
    </tbody></table>
    <form method="post" action="/admin/lideres" class="actions" style="margin-top:14px"><select name="nuevo" required><option value="">Elegir persona…</option>${rows.filter((r) => !r.lider).map((r) => `<option value="${r.id}">${esc(r.name)} · ${esc(areaName(r.area))}</option>`).join('')}</select><button class="btn">Agregar como líder</button></form></section>
  <section class="card"><h2 style="margin-top:0">Asignación del personal</h2>
    <form method="post" action="/admin/lideres"><input type="hidden" name="asignar" value="1"><table class="tbl"><thead><tr><th>Persona</th><th>Área</th><th>Sede</th><th>Líder</th></tr></thead><tbody>
    ${rows.map((r) => `<tr><td>${esc(r.name)}</td><td>${esc(areaName(r.area))}</td><td>${esc(r.sede)}</td><td><select name="l_${r.id}">${opts(r.leader_id, r.id)}</select></td></tr>`).join('')}
    </tbody></table><div class="actions" style="margin-top:14px"><button class="btn">Guardar asignaciones</button></div></form></section>`;
}

// ---------- Uno a uno mensual ----------
const COMP = { pendiente: ['Pendiente', 'muted'], parcial: ['Parcial', 'warn'], cumplido: ['Cumplido', 'ok'], no_cumplido: ['No cumplido', 'err'] };
const compBadge = (e) => { const [l, c] = COMP[e] || [e, 'muted']; return `<span class="badge ${c}">${l}</span>`; };

export function oneOnOne(person, ctx, action) {
  const { sessions, commitments, mod, gaps, mes } = ctx;
  const open = commitments.filter((c) => ['pendiente', 'parcial'].includes(c.estado));
  const done = sessions.find((x) => x.mes_s === mes);
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  const st = mod?.st;
  const modTxt = mod ? `${mod.numero ? `Módulo ${mod.numero}: ` : ''}${esc(mod.titulo)} — ${st?.passed ? `aprobado con ${st.best}%` : st?.n ? `${st.best}% en ${st.n} intento${st.n > 1 ? 's' : ''}, sin aprobar` : 'aún no presenta la evaluación'}` : '';
  const opts = [...(mod ? [`Módulo del mes: ${mod.titulo}`] : []), ...gaps];
  const byS = (id) => commitments.filter((c) => c.session_id === id);
  return `<section class="card" id="sesiones"><div class="row-head"><div><h2 style="margin-top:0">Uno a uno del mes</h2><p class="muted small">Una sesión al mes, de cara al módulo de la Academia: revisan los compromisos anteriores, conversan sobre la brecha y acuerdan nuevos compromisos.</p></div>
    <div>${done ? `<span class="badge ok">Hecho el ${fdate(done.fecha)}</span>` : '<span class="badge warn">Pendiente este mes</span>'}</div></div>
    ${mod ? `<div class="notice info"><strong>Módulo del mes:</strong> ${modTxt}${mod.objetivo ? `<br><span class="small">${esc(mod.objetivo)}</span>` : ''}</div>` : ''}
    <form method="post" action="${action}" class="stack">
      ${open.length ? `<h3 style="margin:6px 0 0">1. Seguimiento a compromisos anteriores</h3>${open.map((c) => `<div class="comp-row"><div><strong>${esc(c.texto)}</strong><br><span class="muted small">Acordado el ${fdate(c.created_at)}${c.fecha_limite ? ` · fecha límite ${fdate(c.fecha_limite)}` : ''}</span></div>
        <select name="st_${c.id}">${Object.entries(COMP).map(([k, [l]]) => `<option value="${k}" ${k === c.estado ? 'selected' : ''}>${l}</option>`).join('')}</select><input name="nt_${c.id}" placeholder="Comentario (opcional)" value="${esc(c.nota)}"></div>`).join('')}` : ''}
      <h3 style="margin:6px 0 0">${open.length ? '2' : '1'}. La sesión</h3>
      <input type="hidden" name="module_id" value="${mod?.id || ''}">
      <div class="grid2"><label>Fecha<input type="date" name="fecha" required value="${today}"></label>
        <label>Brecha que trabajaron<select name="brecha"><option value="">Elegir…</option>${opts.map((o) => `<option>${esc(o)}</option>`).join('')}</select></label></div>
      <label>Otra brecha (opcional)<input name="brecha_otra" placeholder="Si no está en la lista"></label>
      <label>Notas de la sesión<textarea name="notas" rows="3" placeholder="Qué aprendió del módulo, cómo lo está aplicando, qué le cuesta"></textarea></label>
      <h3 style="margin:6px 0 0">${open.length ? '3' : '2'}. Nuevos compromisos para cerrar la brecha</h3>
      ${[1, 2, 3].map((i) => `<div class="grid2 comp-new"><input name="c${i}" placeholder="Compromiso ${i}: acción concreta y medible"><input type="date" name="f${i}" title="Fecha límite"></div>`).join('')}
      <p class="muted small">Si solo actualizas el estado de los compromisos, deja las notas vacías.</p>
      <button class="btn">Guardar</button></form>
    ${sessions.length ? `<h3>Historial</h3>${sessions.map((x) => `<div class="session"><p class="eyebrow">${fdate(x.fecha)}${x.autor ? ` · ${esc(x.autor)}` : ''}${x.modulo ? ` · ${esc(x.modulo)}` : ''}</p>${x.brecha ? `<p><strong>Brecha:</strong> ${esc(x.brecha)}</p>` : ''}<p class="pre">${esc(x.notas)}</p>
      ${x.compromisos ? `<p class="pre"><strong>Compromisos:</strong> ${esc(x.compromisos)}</p>` : ''}${byS(x.id).length ? `<ul class="comp-list">${byS(x.id).map((c) => `<li>${compBadge(c.estado)} ${esc(c.texto)}${c.nota ? ` <span class="muted small">— ${esc(c.nota)}</span>` : ''}</li>`).join('')}</ul>` : ''}</div>`).join('')}` : ''}
  </section>`;
}

export function myCommitments(list) {
  if (!list.length) return '';
  return `<section class="card" id="compromisos"><h2 style="margin-top:0">Mis compromisos del uno a uno</h2><p class="muted small">Lo que acordaste con tu líder. En el próximo uno a uno revisarán cómo te fue.</p>
    <ul class="comp-list">${list.map((c) => `<li>${compBadge(c.estado)} <strong>${esc(c.texto)}</strong>${c.fecha_limite ? ` <span class="muted small">· hasta el ${fdate(c.fecha_limite)}</span>` : ''}</li>`).join('')}</ul></section>`;
}

// ---------- Voz de quienes atendemos ----------
const first = (n) => esc(String(n || '').trim().split(/\s+/)[0] || '');
const scale = (name) => `<div class="fb-scale">${[1, 2, 3, 4, 5].map((v) => `<label><input type="radio" name="${name}" value="${v}" required><span>${v}</span></label>`).join('')}</div><div class="fb-ends"><span>Muy poco</span><span>Totalmente</span></div>`;

export function feedbackForm(u, survey, token, err = '') {
  return `<div class="fb"><header class="fb-head"><img src="/logo-aural.png" alt="Aural" class="fb-logo">
    <div class="fb-who">${avatar({ ...u, has_photo: false }, 'lg')}<div><p class="eyebrow">Califica la atención de</p><h1>${first(u.name)}</h1><p class="muted small">${esc(areaName(u.area))}</p></div></div>
    <p class="fb-lead">Son 5 preguntas y toma menos de un minuto. <strong>Es anónima:</strong> no te pedimos nombre, teléfono ni correo.</p></header>
    ${err ? `<p class="notice err">${esc(err)}</p>` : ''}
    <form method="post" action="/c/${esc(token)}" class="fb-form">
      <fieldset class="fb-q"><legend>Tú eres</legend><div class="fb-chips">${survey.quien.map((x) => `<label><input type="radio" name="quien" value="${esc(x)}"><span>${esc(x)}</span></label>`).join('')}</div></fieldset>
      ${survey.preguntas.map(([k, t], i) => `<fieldset class="fb-q"><legend><span class="num">${i + 1}</span>${esc(t)}</legend>${scale(k)}</fieldset>`).join('')}
      <label class="fb-q">¿Algo que quieras contarnos? <span class="muted small">(opcional)</span><textarea name="comentario" rows="3" maxlength="600" placeholder="Lo que más te gustó o lo que podemos mejorar"></textarea></label>
      <input type="text" name="website" tabindex="-1" autocomplete="off" class="hp" aria-hidden="true">
      <button class="btn fb-send">Enviar mi opinión</button></form></div>`;
}

export const feedbackDone = (msg = '') => `<div class="fb fb-done"><img src="/logo-aural.png" alt="Aural" class="fb-logo">
  ${msg ? `<h1>Código no disponible</h1><p>${esc(msg)}</p>` : '<h1>¡Gracias!</h1><p>Tu opinión nos ayuda a darte cada vez un mejor servicio.</p>'}</div>`;

export function qrCard(u, token, url, survey) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Código QR · ${esc(u.name)}</title><link rel="stylesheet" href="/style.css?v=${V}"></head>
  <body class="qr-body"><div class="qr-card"><img src="/logo-aural.png" alt="Aural" class="qr-logo">
    <p class="qr-k">¿Cómo te atendió</p><h1>${esc(String(u.name).trim().split(/\s+/).slice(0, 2).join(' '))}?</h1>
    <img class="qr-img" src="/qr/${esc(token)}.svg" alt="Código QR">
    <p class="qr-t">Escanea y responde 5 preguntas.<br><strong>Es anónimo y toma menos de un minuto.</strong></p>
    <p class="qr-url">${esc(url)}</p></div>
    <div class="qr-actions"><button class="btn" onclick="print()">Imprimir</button><a class="btn ghost" href="https://wa.me/?text=${encodeURIComponent(`Cuéntanos cómo te atendimos (anónimo, 1 minuto): ${url}`)}" target="_blank" rel="noopener">Compartir por WhatsApp</a><a class="btn ghost" href="javascript:history.back()">Volver</a></div>
    <p class="qr-note muted small">Para ${esc(survey.publico)}.</p></body></html>`;
}

export function voiceCard(person, v, { token = '', base = '', survey, self = false } = {}) {
  const url = token ? `${base}/c/${token}` : '';
  const dims = survey.preguntas.map(([k, t]) => ({ l: t.replace(/^¿|\?$/g, ''), v: v.dims.find((d) => d.k === k)?.v ?? null, c: (v.dims.find((d) => d.k === k)?.v ?? 0) >= 4 ? COL.signal : (v.dims.find((d) => d.k === k)?.v ?? 0) >= 3 ? COL.amber : COL.err }));
  return `<section class="card voice" id="voz"><div class="row-head"><div><p class="eyebrow">Voz de quienes ${self ? 'atiendes' : 'atiende'} · ${esc(survey.publico)}</p><h2 style="margin:4px 0">${self ? 'Así te ven' : 'Cómo lo ven'}</h2></div>
    <div class="actions">${self ? `<a class="btn" href="/tarjeta/${person.id}">Ver e imprimir mi código QR</a>` : `<a class="btn ghost" href="/tarjeta/${person.id}">Código QR</a>`}</div></div>
    ${self ? `<div class="voice-qr"><img src="/qr/${esc(token)}.svg" alt="Tu código QR" width="120" height="120"><div><p>Muestra tu código al terminar cada atención o comparte el enlace. Las respuestas son anónimas.</p><input class="copy" readonly value="${esc(url)}" onclick="this.select()"></div></div>` : ''}
    ${v.closedOnly ? `<p class="notice info">Este mes llevas <strong>${v.n_mes}</strong> respuesta${v.n_mes === 1 ? '' : 's'}. Tus resultados se publican al cierre de cada mes${v.n ? '; abajo ves los de los meses anteriores' : ''}.</p>` : ''}
    ${v.n ? `<p class="ai-score"><b>${v.prom.toFixed(1)}</b><span>de 5 · ${v.n} respuesta${v.n > 1 ? 's' : ''}${v.closedOnly ? ' hasta el mes pasado' : v.n30 ? ` · ${v.n30} en los últimos 30 días` : ''}</span></p>${hbars(dims, { max: 5 })}
      ${v.comments.length ? `<h3>Comentarios recientes</h3><ul class="voice-c">${v.comments.map((c) => `<li><span class="badge ${c.prom >= 4 ? 'ok' : c.prom >= 3 ? 'warn' : 'err'}">${c.prom.toFixed(1)}</span> ${esc(c.comentario)}<span class="muted small"> · ${c.quien ? `${esc(c.quien)} · ` : ''}${fdate(c.created_at)}</span></li>`).join('')}</ul>` : ''}`
      : `<p class="muted">${self ? (v.n_mes ? '' : 'Aún no tienes respuestas. Empieza a compartir tu código hoy.') : 'Aún no tiene respuestas.'}</p>`}
  </section>`;
}
