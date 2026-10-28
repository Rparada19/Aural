import express from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { q, one, migrate } from './db.js';
import { analyze } from './analysis.js';
import { sendLoginLink, sendMail, mailConfigured } from './mail.js';
import * as V from './views.js';
import { AREA_KEYS } from './areas.js';
import { newDoc, renderReport, footer } from './pdf.js';
import { learnArea, latestKnowledge } from './knowledge.js';
import { generateModule, generateAcademy, userModuleState, grade, drawQuiz, windowState, PASS, MAX_ATTEMPTS } from './study.js';
import { rankingFor } from './ranking.js';
import { qrToken, qrSvg, surveyFor, surveyKey, saveFeedback, voiceOf, metaFor, markStaff, signTs } from './voz.js';
import { notifyPlanPublished, METODOLOGIA } from './notify.js';
import { generateMonthlyPlan, generateInsights, runDaily, sendMessage, getSetting, setSetting, today, thisMonth, PULSE } from './growth.js';

const app = express();
const BASE = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const ADMINS = (process.env.ADMIN_EMAILS || '').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
const COOKIE = 'aural_sid';
const hash = (s) => crypto.createHash('sha256').update(s).digest('hex');
const token = () => crypto.randomBytes(32).toString('base64url');

app.set('trust proxy', 1);
app.use(express.static(path.join(path.dirname(fileURLToPath(import.meta.url)), 'public'), { maxAge: '7d' }));
app.use('/registro', express.urlencoded({ extended: false, limit: '2mb' }));
app.use('/perfil', express.json({ limit: '2mb' }));
app.use('/admin/personas', express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false, limit: '200kb' }));
app.use('/admin/estudio', express.json({ limit: '8mb' }));
app.use(express.json({ limit: '200kb' }));

// Identificador anónimo de dispositivo (sirve para detectar autocalificaciones en la encuesta QR)
const cookieOf = (req, name) => (req.headers.cookie || '').split(/;\s*/).find((c) => c.startsWith(name + '='))?.slice(name.length + 1);
function deviceId(req, res) {
  let d = cookieOf(req, 'aural_d');
  if (!d || !/^[A-Za-z0-9_-]{16,40}$/.test(d)) {
    d = crypto.randomBytes(16).toString('base64url');
    res.append('Set-Cookie', `aural_d=${d}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${730 * 86400}${BASE.startsWith('https') ? '; Secure' : ''}`);
    req.newDevice = true;
  }
  return d;
}

// Sesión
app.use(async (req, res, next) => {
  const sid = (req.headers.cookie || '').split(/;\s*/).find((c) => c.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1);
  if (sid) req.user = await one('SELECT u.id, u.email, u.name, u.role, u.area, u.sede, u.cargo, u.active, u.last_seen, u.lider, u.leads_all, (u.photo IS NOT NULL) AS has_photo FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id_hash = $1 AND s.expires_at > now() AND u.active', [hash(sid)]);
  if (req.user && req.user.role === 'staff' && !req.path.startsWith('/c/')) {
    const dev = deviceId(req, res);
    if (req.newDevice || !req.user.last_seen || Date.now() - new Date(req.user.last_seen) > 3600e3) markStaff(req.user.id, dev, req.ip).catch(() => {});
  }
  if (req.user && (!req.user.last_seen || Date.now() - new Date(req.user.last_seen) > 3600e3)) q('UPDATE users SET last_seen = now() WHERE id = $1', [req.user.id]).catch(() => {});
  next();
});

// Protección CSRF básica: los POST deben venir del mismo sitio
app.use((req, res, next) => {
  if (req.method !== 'POST') return next();
  const origin = req.headers.origin;
  if (origin && origin !== BASE && !origin.startsWith('http://localhost')) return res.status(403).send('Origen no permitido');
  next();
});

const page = (res, title, body, user, opts) => res.send(V.layout(title, body, user, { ...opts, path: res.req.path }));
const needUser = (req, res, next) => (req.user ? next() : res.redirect('/login'));
const needAdmin = (req, res, next) => (req.user?.role === 'admin' ? next() : res.redirect(req.user ? '/' : '/login'));
const home = (req) => (req.user?.lider ? '/mi' : '/');
const needLeader = (req, res, next) => (req.user?.lider ? next() : res.redirect(req.user ? '/' : '/login'));

async function loginLink(userId) {
  const t = token();
  await q("INSERT INTO login_tokens (token_hash, user_id, expires_at) VALUES ($1, $2, now() + interval '7 days')", [hash(t), userId]);
  return `${BASE}/entrar/${t}`;
}

async function assignEvaluation(userId) {
  const { area } = await one('SELECT area FROM users WHERE id = $1', [userId]);
  const { rows } = await q('SELECT id, module, type, text, options, correct FROM questions WHERE active AND area = $1 ORDER BY position, id', [area]);
  if (!rows.length) return null;
  return one('INSERT INTO evaluations (user_id, area, questions) VALUES ($1, $2, $3) RETURNING id', [userId, area, JSON.stringify(rows)]);
}

app.get('/health', (req, res) => res.send('ok'));

// ---------- Acceso ----------
// ---------- Voz de quienes atendemos (QR público y anónimo) ----------
const fbHits = new Map();
const fbLimited = (ip) => {
  const now = Date.now(), h = (fbHits.get(ip) || []).filter((t) => now - t < 3600e3);
  h.push(now); fbHits.set(ip, h);
  if (fbHits.size > 5000) fbHits.clear();
  return h.length > 30;
};
const byToken = (t) => one('SELECT id, name, area, active, (photo IS NOT NULL) AS has_photo FROM users WHERE qr_token = $1 AND active AND approved', [String(t || '')]);

app.get('/c/:t', async (req, res) => {
  const u = await byToken(req.params.t);
  if (!u) return page(res, 'Encuesta', V.feedbackDone('Este código ya no está activo.'), null);
  deviceId(req, res);
  page(res, 'Califica la atención', V.feedbackForm(u, surveyFor(u.area), req.params.t, '', signTs(Date.now())), null);
});

app.post('/c/:t', async (req, res) => {
  const u = await byToken(req.params.t);
  if (!u) return page(res, 'Encuesta', V.feedbackDone('Este código ya no está activo.'), null);
  if (!req.body.website && !fbLimited(req.ip)) {
    const dev = cookieOf(req, 'aural_d');
    if (!(await saveFeedback(u, req.body, { dev: dev && /^[A-Za-z0-9_-]{16,40}$/.test(dev) ? dev : '', ip: req.ip }))) return page(res, 'Califica la atención', V.feedbackForm(u, surveyFor(u.area), req.params.t, 'Por favor responde las 5 preguntas.', req.body.ts), null);
  }
  page(res, 'Gracias', V.feedbackDone(), null);
});

// El líder o el director validan o anulan calificaciones en revisión
app.post('/voz/:id', needUser, async (req, res) => {
  const f = await one('SELECT id, user_id FROM feedback WHERE id = $1', [req.params.id]);
  const ok = f && (req.user.role === 'admin' || (req.user.lider && await inTeam(req.user, f.user_id)));
  if (ok) await q('UPDATE feedback SET estado = $2, revisado_por = $3 WHERE id = $1', [f.id, req.body.accion === 'validar' ? 'valida' : 'anulada', req.user.id]);
  res.redirect(`${req.user.role === 'admin' ? '/admin/personas' : '/lider/personas'}/${f?.user_id || ''}#voz`);
});

app.get('/qr/:t.svg', async (req, res) => {
  if (!(await byToken(req.params.t))) return res.status(404).end();
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(await qrSvg(`${BASE}/c/${req.params.t}`));
});

// Tarjetas imprimibles con el QR: la persona, su líder o el administrador
async function cardData(u) {
  const token = await qrToken(u.id);
  return { ...u, token, url: `${BASE}/c/${token}`, survey: surveyFor(u.area), key: surveyKey(u.area) };
}
app.get('/tarjeta/:id', needUser, async (req, res) => {
  const id = Number(req.params.id);
  const ok = id === req.user.id || req.user.role === 'admin' || (req.user.lider && await inTeam(req.user, id));
  const u = ok && await one('SELECT id, name, area, (photo IS NOT NULL) AS has_photo FROM users WHERE id = $1', [id]);
  if (!u) return res.redirect('/');
  res.send(V.qrCard([await cardData(u)], { title: `Tarjeta QR · ${u.name}`, back: req.get('referer') || '/' }));
});
// Todas las tarjetas de un equipo (líder) o de un área (director)
app.get('/tarjetas', needUser, async (req, res) => {
  let rows;
  if (req.user.role === 'admin') {
    const area = AREA_KEYS.includes(req.query.area) ? req.query.area : '';
    rows = (await q(`SELECT id, name, area, (photo IS NOT NULL) AS has_photo FROM users WHERE role = 'staff' AND active AND approved ${area ? 'AND area = $1' : ''} ORDER BY area, name`, area ? [area] : [])).rows;
  } else if (req.user.lider) rows = await teamOf(req.user);
  else return res.redirect('/');
  const people = [];
  for (const u of rows) people.push(await cardData(u));
  if (!people.length) return res.redirect(req.user.role === 'admin' ? '/admin/lideres' : '/lider');
  res.send(V.qrCard(people, { title: 'Tarjetas QR del equipo', back: req.user.role === 'admin' ? '/admin/lideres' : '/lider' }));
});

app.get('/login', (req, res) => (req.user ? res.redirect('/') : page(res, 'Entrar', V.loginPage())));

app.post('/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  let user = await one('SELECT * FROM users_v WHERE email = $1 AND active', [email]);
  if (!user && ADMINS.includes(email)) user = await one("INSERT INTO users (email, name, role) VALUES ($1, $1, 'admin') RETURNING *", [email]);
  if (user && ADMINS.includes(email) && user.role !== 'admin') await q("UPDATE users SET role = 'admin' WHERE id = $1", [user.id]);
  if (user) {
    try { await sendLoginLink(user.email, user.name, await loginLink(user.id)); } catch (e) { console.error('mail', e); return page(res, 'Entrar', V.loginPage('', 'No pudimos enviar el correo. Intenta de nuevo en unos minutos.')); }
  }
  page(res, 'Entrar', V.loginPage('Si tu correo está registrado, te enviamos un enlace de acceso. Revisa también la carpeta de spam.'));
});

// Los filtros de correo corporativo abren los enlaces para revisarlos; por eso el enlace solo se consume al confirmar.
app.get('/entrar/:t', async (req, res) => {
  const ok = await one('SELECT 1 FROM login_tokens WHERE token_hash = $1 AND expires_at > now() AND used_at IS NULL', [hash(req.params.t)]);
  if (!ok) return page(res, 'Enlace vencido', V.loginPage('', 'Este enlace ya se usó o venció. Pide uno nuevo.'));
  page(res, 'Entrar', V.enterPage(req.params.t));
});

app.post('/entrar/:t', async (req, res) => {
  const row = await one('UPDATE login_tokens SET used_at = now() WHERE token_hash = $1 AND expires_at > now() AND used_at IS NULL RETURNING user_id', [hash(req.params.t)]);
  if (!row) return page(res, 'Enlace vencido', V.loginPage('', 'Este enlace ya se usó o venció. Pide uno nuevo.'));
  const sid = token();
  await q("INSERT INTO sessions (id_hash, user_id, expires_at) VALUES ($1, $2, now() + interval '30 days')", [hash(sid), row.user_id]);
  res.append('Set-Cookie', `${COOKIE}=${sid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 86400}${BASE.startsWith('https') ? '; Secure' : ''}`);
  markStaff(row.user_id, deviceId(req, res), req.ip).catch(() => {});
  res.redirect('/');
});

app.post('/salir', async (req, res) => {
  const sid = (req.headers.cookie || '').split(/;\s*/).find((c) => c.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1);
  if (sid) await q('DELETE FROM sessions WHERE id_hash = $1', [hash(sid)]);
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; Max-Age=0`);
  res.redirect('/login');
});

// ---------- Fotos ----------
function parsePhoto(dataUrl) {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!m) return null;
  const buf = Buffer.from(m[2], 'base64');
  return buf.length && buf.length < 600 * 1024 ? { mime: m[1], buf } : null;
}

app.get('/foto/:id', needUser, async (req, res) => {
  const u = await one('SELECT photo, photo_mime FROM users WHERE id = $1 AND photo IS NOT NULL', [req.params.id]);
  if (!u) return res.status(404).end();
  res.setHeader('Content-Type', u.photo_mime);
  res.setHeader('Cache-Control', 'private, max-age=86400');
  res.send(u.photo);
});

app.post('/perfil/foto', needUser, async (req, res) => {
  const ph = parsePhoto(req.body?.photo);
  if (!ph || req.body?.consent !== true) return res.status(400).json({ ok: false });
  await q('UPDATE users SET photo = $2, photo_mime = $3 WHERE id = $1', [req.user.id, ph.buf, ph.mime]);
  res.json({ ok: true });
});

app.post('/admin/personas/:id/foto', needAdmin, async (req, res) => {
  if (req.is('json')) {
    const ph = parsePhoto(req.body?.photo);
    if (!ph || req.body?.consent !== true) return res.status(400).json({ ok: false });
    await q('UPDATE users SET photo = $2, photo_mime = $3 WHERE id = $1', [req.params.id, ph.buf, ph.mime]);
    return res.json({ ok: true });
  }
  await q("UPDATE users SET photo = NULL, photo_mime = '' WHERE id = $1", [req.params.id]);
  res.redirect(`/admin/personas/${req.params.id}`);
});

// ---------- Registro público ----------
const sedesList = () => getSetting('sedes', []);

app.get('/registro', async (req, res) => page(res, 'Registro', V.registerPage(await sedesList())));

app.post('/registro', async (req, res) => {
  const b = req.body;
  if (b.website) return page(res, 'Registro', V.registerDone());
  const email = String(b.email || '').trim().toLowerCase();
  const name = String(b.name || '').trim().slice(0, 120);
  const area = AREA_KEYS.includes(b.area) ? b.area : null;
  const sede = String(b.sede || '').trim().slice(0, 80);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !name || !area || !sede) return page(res, 'Registro', V.registerPage(await sedesList(), 'Completa todos los campos obligatorios.', b));
  const ph = b.consent === 'on' ? parsePhoto(b.photo) : null;
  const exists = await one('SELECT id, active, approved FROM users WHERE email = $1', [email]);
  if (exists) return page(res, 'Registro', V.registerDone(exists.active ? 'Ya tienes una cuenta activa. Entra con tu correo desde la página de acceso.' : ''));
  const u = await one(`INSERT INTO users (email, name, area, sede, cargo, telefono, active, approved, photo, photo_mime) VALUES ($1,$2,$3,$4,$5,$6,false,false,$7,$8) RETURNING id`,
    [email, name, area, sede, String(b.cargo || '').trim().slice(0, 80), String(b.telefono || '').trim().slice(0, 30), ph?.buf ?? null, ph?.mime ?? '']);
  for (const admin of ADMINS) {
    sendMail(admin, `Nueva solicitud de registro: ${name}`, `${name} (${email}) pidió acceso.\nÁrea: ${area} · Sede: ${sede}\n\nAprueba aquí: ${BASE}/admin/solicitudes`,
      `<div style="font-family:Arial,sans-serif;color:#041E42;max-width:520px;margin:auto;padding:24px"><h2 style="margin-top:0">Nueva solicitud de registro</h2>
      <p><strong>${V.esc(name)}</strong><br>${V.esc(email)}${b.telefono ? `<br>${V.esc(b.telefono)}` : ''}</p>
      <p>Área: ${V.esc(V.areaName(area))}<br>Sede: ${V.esc(sede)}</p>
      <p style="margin:24px 0"><a href="${BASE}/admin/solicitudes" style="background:#041E42;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold">Revisar y aprobar</a></p></div>`)
      .catch((e) => console.error('aviso registro', e.message));
  }
  page(res, 'Registro', V.registerDone());
});

// ---------- Profesional ----------
const currentEval = (userId) => one('SELECT * FROM evaluations WHERE user_id = $1 ORDER BY id DESC LIMIT 1', [userId]);

const todayMessage = (area) => one("SELECT * FROM messages WHERE (area = $1 OR area = 'todas') AND fecha <= $2 ORDER BY fecha DESC, id DESC LIMIT 1", [area, today()]);
async function currentPlan(userId, onlyPublished) {
  const plan = await one(`SELECT * FROM plans WHERE user_id = $1 ${onlyPublished ? 'AND published' : ''} ORDER BY mes DESC LIMIT 1`, [userId]);
  if (plan) plan.items = (await q('SELECT * FROM plan_items WHERE plan_id = $1 ORDER BY position, id', [plan.id])).rows;
  return plan;
}

app.get(['/', '/mi'], needUser, async (req, res) => {
  if (req.user.role === 'admin') return res.redirect('/admin');
  if (req.user.lider && req.path === '/') return res.redirect('/lider');
  const pulseDone = await one('SELECT 1 FROM pulses WHERE user_id = $1 AND mes = $2', [req.user.id, thisMonth()]);
  const mod = await one('SELECT * FROM study_modules WHERE area = $1 AND mes = $2 AND published', [req.user.area, thisMonth()]);
  if (mod) mod.st = await userModuleState(req.user.id, mod);
  const comps = (await q("SELECT * FROM compromisos WHERE user_id = $1 AND (estado IN ('pendiente','parcial') OR updated_at > now() - interval '30 days') ORDER BY created_at DESC, id", [req.user.id])).rows;
  page(res, 'Mi espacio', V.staffHome(req.user, await currentEval(req.user.id), await currentPlan(req.user.id, true), await todayMessage(req.user.area), pulseDone ? null : PULSE, mod) + V.myCommitments(comps) + V.voiceCard(req.user, await voiceOf(req.user.id, true), { token: await qrToken(req.user.id), base: BASE, survey: surveyFor(req.user.area), self: true }), req.user);
});

app.post('/pulso', needUser, async (req, res) => {
  const answers = {};
  for (const [k] of PULSE) { const v = Number(req.body[k]); if (v >= 1 && v <= 5) answers[k] = v; }
  if (Object.keys(answers).length === PULSE.length) {
    await q('INSERT INTO pulses (user_id, area, mes, answers, comentario) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (user_id, mes) DO NOTHING',
      [req.user.id, req.user.area, thisMonth(), JSON.stringify(answers), String(req.body.comentario || '').trim().slice(0, 2000)]);
  }
  res.redirect(home(req));
});

app.post('/plan/items/:id', needUser, async (req, res) => {
  const estado = ['pendiente', 'en_curso', 'hecho'].includes(req.body.estado) ? req.body.estado : 'pendiente';
  await q(`UPDATE plan_items i SET estado = $3, nota = $4, updated_at = now() FROM plans p
    WHERE i.id = $1 AND p.id = i.plan_id AND p.user_id = $2 AND p.published`, [req.params.id, req.user.id, estado, String(req.body.nota || '').slice(0, 1000)]);
  res.redirect(home(req) + '#plan');
});

app.get('/evaluacion', needUser, async (req, res) => {
  const ev = await currentEval(req.user.id);
  if (!ev || !['pendiente', 'en_curso'].includes(ev.status)) return res.redirect(home(req));
  if (ev.status === 'pendiente') await q("UPDATE evaluations SET status = 'en_curso', started_at = now() WHERE id = $1", [ev.id]);
  page(res, 'Evaluación', V.evaluationForm(ev), req.user);
});

function cleanAnswers(ev, input) {
  const out = {};
  for (const qu of ev.questions) {
    let v = input[qu.id];
    if (v === undefined || v === null) continue;
    if (qu.type === 'open') v = String(v).slice(0, 5000);
    else if (qu.type === 'multi') v = [].concat(v).map(Number).filter((n) => n >= 0 && n < qu.options.length);
    else if (qu.type === 'scale') v = Math.min(5, Math.max(1, Number(v))) || null;
    else v = Number.isInteger(Number(v)) && Number(v) >= 0 && Number(v) < qu.options.length ? Number(v) : null;
    out[qu.id] = v;
  }
  return out;
}

app.post('/evaluacion/guardar', needUser, async (req, res) => {
  const ev = await currentEval(req.user.id);
  if (!ev || ev.status !== 'en_curso') return res.status(409).json({ ok: false });
  await q('UPDATE evaluations SET answers = $2 WHERE id = $1', [ev.id, JSON.stringify(cleanAnswers(ev, req.body.answers || {}))]);
  res.json({ ok: true });
});

app.post('/evaluacion/enviar', needUser, async (req, res) => {
  const ev = await currentEval(req.user.id);
  if (!ev || ev.status !== 'en_curso') return res.redirect(home(req));
  const answers = req.is('json') ? cleanAnswers(ev, req.body.answers || {}) : ev.answers;
  const missing = ev.questions.filter((qu) => { const a = answers[qu.id]; return a === undefined || a === null || a === '' || (Array.isArray(a) && !a.length); });
  if (missing.length) return res.status(400).json({ ok: false, missing: missing.map((m) => m.id) });
  await q("UPDATE evaluations SET answers = $2, status = 'enviada', submitted_at = now() WHERE id = $1", [ev.id, JSON.stringify(answers)]);
  analyze(ev.id);
  res.json({ ok: true });
});

// ---------- Admin ----------
app.get('/admin', needAdmin, async (req, res) => {
  const mes = thisMonth();
  const { rows } = await q(`SELECT u.id, u.name, u.area, u.sede, u.cargo, u.created_at, (u.photo IS NOT NULL) AS has_photo,
      e.status, e.started_at, e.submitted_at, e.plan_published, (e.report->>'puntaje_global')::int AS score,
      coalesce(jsonb_array_length(e.report->'alertas'), 0) AS alertas, e.report->>'resumen' AS resumen, e.report->>'nivel' AS nivel,
      (SELECT jsonb_agg(f->>'titulo') FROM jsonb_array_elements(e.report->'fortalezas') f) AS fortalezas,
      (SELECT jsonb_agg(o->>'titulo') FROM jsonb_array_elements(e.report->'oportunidades') o) AS oportunidades,
      (SELECT jsonb_agg(jsonb_build_object('accion', accion, 'estado', estado) ORDER BY position, id) FROM plan_items WHERE plan_id = p.id) AS plan_items, p.objetivo AS plan_objetivo,
      (SELECT (report->>'puntaje_global')::int FROM evaluations WHERE user_id = u.id AND report IS NOT NULL AND id < e.id ORDER BY id DESC LIMIT 1) AS prev_score,
      p.id AS plan_id, p.published AS plan_pub,
      (SELECT count(*) FROM plan_items WHERE plan_id = p.id)::int AS items,
      (SELECT count(*) FROM plan_items WHERE plan_id = p.id AND estado = 'hecho')::int AS done,
      (SELECT count(*) FROM plan_items WHERE plan_id = p.id AND estado = 'en_curso')::int AS doing,
      (SELECT max(fecha) FROM sessions_1a1 WHERE user_id = u.id) AS last_session,
      (SELECT count(*) FROM sessions_1a1 WHERE user_id = u.id AND to_char(fecha, 'YYYY-MM') = $1)::int AS sessions_month,
      (SELECT count(DISTINCT module_id) FROM study_attempts WHERE user_id = u.id AND passed)::int AS mod_ok,
      (SELECT count(*) FROM study_modules WHERE area = u.area AND published AND mes <= $1)::int AS mod_total,
      sm.id AS mod_id,
      (SELECT bool_or(passed) FROM study_attempts WHERE user_id = u.id AND module_id = sm.id) AS mod_passed,
      (SELECT count(*) FROM study_attempts WHERE user_id = u.id AND module_id = sm.id)::int AS mod_attempts
    FROM users u
    LEFT JOIN LATERAL (SELECT * FROM evaluations WHERE user_id = u.id ORDER BY id DESC LIMIT 1) e ON true
    LEFT JOIN plans p ON p.user_id = u.id AND p.mes = $1
    LEFT JOIN study_modules sm ON sm.area = u.area AND sm.mes = $1 AND sm.published
    WHERE u.role = 'staff' AND u.active AND u.approved ORDER BY u.area, u.name`, [mes]);
  const pending = (await one('SELECT count(*)::int AS n FROM users WHERE approved = false')).n;
  const area = AREA_KEYS.includes(req.query.area) ? req.query.area : '';
  const af = area ? 'AND u.area = $2' : '';
  const ap = area ? [area] : [];
  const since = `${Number(mes.slice(0, 4)) - (Number(mes.slice(5)) <= 5 ? 1 : 0)}-${String(((Number(mes.slice(5)) + 6) % 12) + 1).padStart(2, '0')}`;
  const series = {};
  const add = (rs) => rs.forEach((r) => Object.assign((series[r.mes] ||= { mes: r.mes }), r));
  add((await q(`SELECT pu.mes, count(*)::int AS pulsos, ${PULSE.map(([k]) => `round(avg((pu.answers->>'${k}')::numeric), 2)::float AS ${k}`).join(', ')}
    FROM pulses pu JOIN users u ON u.id = pu.user_id WHERE pu.mes >= $1 ${af} GROUP BY pu.mes`, [since, ...ap])).rows);
  add((await q(`SELECT p.mes, round(avg(x.prog))::int AS avance FROM plans p JOIN users u ON u.id = p.user_id
    JOIN LATERAL (SELECT 100.0 * count(*) FILTER (WHERE estado = 'hecho') / nullif(count(*), 0) AS prog FROM plan_items WHERE plan_id = p.id) x ON x.prog IS NOT NULL
    WHERE p.mes >= $1 ${af} GROUP BY p.mes`, [since, ...ap])).rows);
  add((await q(`SELECT to_char(e.analyzed_at AT TIME ZONE 'America/Bogota', 'YYYY-MM') AS mes, round(avg((e.report->>'puntaje_global')::int))::int AS puntaje, count(*)::int AS evaluaciones
    FROM evaluations e JOIN users u ON u.id = e.user_id WHERE e.report IS NOT NULL AND to_char(e.analyzed_at AT TIME ZONE 'America/Bogota', 'YYYY-MM') >= $1 ${af} GROUP BY 1`, [since, ...ap])).rows);
  add((await q(`SELECT to_char(s.fecha, 'YYYY-MM') AS mes, count(*)::int AS sesiones FROM sessions_1a1 s JOIN users u ON u.id = s.user_id
    WHERE to_char(s.fecha, 'YYYY-MM') >= $1 ${af} GROUP BY 1`, [since, ...ap])).rows);
  add((await q(`SELECT mes, round(avg(pct))::int AS estudio FROM (
      SELECT m.mes, 100.0 * (SELECT count(DISTINCT a.user_id) FROM study_attempts a WHERE a.module_id = m.id AND a.passed)
        / nullif((SELECT count(*) FROM users u WHERE u.role = 'staff' AND u.active AND u.approved AND u.area = m.area), 0) AS pct
      FROM study_modules m WHERE m.published AND m.mes >= $1 ${area ? 'AND m.area = $2' : ''}) x
    WHERE pct IS NOT NULL GROUP BY mes`, [since, ...ap])).rows);
  const comments = (await q(`SELECT pu.mes, pu.area, pu.comentario FROM pulses pu JOIN users u ON u.id = pu.user_id
    WHERE pu.comentario <> '' AND pu.mes >= $1 ${af} ORDER BY pu.created_at DESC LIMIT 10`, [since, ...ap])).rows;
  const insight = await one('SELECT * FROM team_insights WHERE area = $1 ORDER BY id DESC LIMIT 1', [area]);
  const gaps = (await q(`SELECT o->>'titulo' AS t, count(*)::int AS n FROM users u JOIN LATERAL (SELECT report FROM evaluations WHERE user_id = u.id AND report IS NOT NULL ORDER BY id DESC LIMIT 1) e ON true,
      jsonb_array_elements(e.report->'oportunidades') o WHERE u.role = 'staff' AND u.active AND u.approved ${area ? 'AND u.area = $1' : ''} GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 7`, area ? [area] : [])).rows;
  const clientes = await one('SELECT * FROM customer_insights ORDER BY id DESC LIMIT 1');
  const voz = { tot: await one(`SELECT count(*)::int AS n, round(avg(promedio), 1)::float AS prom FROM feedback f JOIN users u ON u.id = f.user_id WHERE f.estado = 'valida' ${af.replace('$2', '$1')}`, ap),
    areas: (await q(`SELECT f.area, round(avg(f.promedio), 1)::float AS v, count(*)::int AS n FROM feedback f WHERE f.estado = 'valida' GROUP BY 1 ORDER BY 2 DESC`)).rows,
    people: area ? (await q(`SELECT u.name, round(avg(f.promedio), 1)::float AS v, count(*)::int AS n FROM feedback f JOIN users u ON u.id = f.user_id WHERE u.area = $1 AND f.estado = 'valida' GROUP BY u.id ORDER BY 2 DESC`, [area])).rows : [] };
  page(res, 'Panel', V.dashboard(rows, mes, area, pending, Object.values(series).sort((a, b) => a.mes.localeCompare(b.mes)), comments, PULSE, insight, req.query.error, gaps, clientes, voz), req.user, { wide: true });
});

app.post('/admin/recomendaciones', needAdmin, async (req, res) => {
  const area = AREA_KEYS.includes(req.body.area) ? req.body.area : '';
  const mes = thisMonth();
  const af = area ? 'AND u.area = $1' : '';
  const ap = area ? [area] : [];
  const pul = (await q(`SELECT pu.mes, count(*)::int AS n, ${PULSE.map(([k]) => `round(avg((pu.answers->>'${k}')::numeric), 2)::float AS ${k}`).join(', ')}
    FROM pulses pu JOIN users u ON u.id = pu.user_id WHERE true ${af} GROUP BY pu.mes ORDER BY pu.mes DESC LIMIT 6`, ap)).rows;
  const coms = (await q(`SELECT pu.comentario FROM pulses pu JOIN users u ON u.id = pu.user_id WHERE pu.comentario <> '' ${af} ORDER BY pu.created_at DESC LIMIT 25`, ap)).rows.map((r) => r.comentario);
  const gaps = (await q(`SELECT o->>'titulo' AS t, count(*)::int AS n FROM evaluations e JOIN users u ON u.id = e.user_id, jsonb_array_elements(e.report->'oportunidades') o WHERE e.report IS NOT NULL ${af} GROUP BY 1 ORDER BY 2 DESC LIMIT 12`, ap)).rows;
  const strengths = (await q(`SELECT f->>'titulo' AS t, count(*)::int AS n FROM evaluations e JOIN users u ON u.id = e.user_id, jsonb_array_elements(e.report->'fortalezas') f WHERE e.report IS NOT NULL ${af} GROUP BY 1 ORDER BY 2 DESC LIMIT 8`, ap)).rows;
  const st = (await one(`SELECT count(*)::int AS personas, count(*) FILTER (WHERE e.status IN ('enviada','analizando','analizada'))::int AS evaluadas,
      round(avg((e.report->>'puntaje_global')::int))::int AS puntaje FROM users u LEFT JOIN LATERAL (SELECT * FROM evaluations WHERE user_id = u.id ORDER BY id DESC LIMIT 1) e ON true
    WHERE u.role = 'staff' AND u.active AND u.approved ${af}`, ap));
  const plan = (await one(`SELECT round(avg(x.prog))::int AS avance, count(*)::int AS planes FROM plans p JOIN users u ON u.id = p.user_id
    JOIN LATERAL (SELECT 100.0 * count(*) FILTER (WHERE estado = 'hecho') / nullif(count(*), 0) AS prog FROM plan_items WHERE plan_id = p.id) x ON x.prog IS NOT NULL WHERE p.mes = '${mes}' ${af}`, ap));
  const mods = (await q(`SELECT m.mes, m.titulo, (SELECT count(DISTINCT a.user_id) FROM study_attempts a WHERE a.module_id = m.id AND a.passed)::int AS aprobados,
      (SELECT count(DISTINCT a.user_id) FROM study_attempts a WHERE a.module_id = m.id)::int AS presentaron FROM study_modules m WHERE m.published ${area ? 'AND m.area = $1' : ''} ORDER BY m.mes DESC LIMIT 6`, ap)).rows;
  const ctx = [
    `Mes actual: ${mes}. Personas: ${st.personas}, evaluaciones enviadas: ${st.evaluadas}, puntaje promedio: ${st.puntaje ?? 'sin datos'}.`,
    `Pulso de percepción (1-5) por mes: ${pul.map((r) => `${r.mes} (n=${r.n}): ${PULSE.map(([k]) => `${k} ${r[k]}`).join(', ')}`).join(' | ') || 'sin respuestas'}.`,
    `Comentarios del pulso: ${coms.map((c) => `"${c}"`).join(' ') || 'ninguno'}.`,
    `Oportunidades de mejora más frecuentes en evaluaciones: ${gaps.map((g) => `${g.t} (${g.n})`).join('; ') || 'sin datos'}.`,
    `Fortalezas más frecuentes: ${strengths.map((g) => `${g.t} (${g.n})`).join('; ') || 'sin datos'}.`,
    `Planes del mes: ${plan?.planes || 0} con avance promedio ${plan?.avance ?? 'sin datos'}%.`,
    `Módulos de estudio: ${mods.map((m) => `${m.mes} ${m.titulo}: ${m.aprobados} aprobados de ${m.presentaron} que presentaron`).join(' | ') || 'sin módulos'}.`,
  ].join('\n');
  try { await generateInsights(area, mes, ctx); } catch (e) {
    console.error('recomendaciones', e);
    return res.redirect(`/admin?${area ? `area=${area}&` : ''}error=${encodeURIComponent('No se pudieron generar las recomendaciones: ' + e.message)}#mejorar`);
  }
  res.redirect(`/admin${area ? `?area=${area}` : ''}#mejorar`);
});

app.get('/admin/evaluaciones', needAdmin, async (req, res) => {
  const area = AREA_KEYS.includes(req.query.area) ? req.query.area : '';
  const estado = ['revisar', 'informe', 'enviada', 'en_curso', 'pendiente'].includes(req.query.estado) ? req.query.estado : '';
  const { rows: all } = await q(`SELECT e.id, e.status, e.plan_published, e.submitted_at, e.report_error, (e.report->>'puntaje_global')::int AS score, e.report->>'nivel' AS nivel, e.report->>'resumen' AS resumen,
      jsonb_array_length(e.questions) AS total, (SELECT count(*) FROM jsonb_object_keys(e.answers))::int AS answered,
      u.id AS uid, u.id, u.name, u.area, u.sede, (u.photo IS NOT NULL) AS has_photo
    FROM users u JOIN LATERAL (SELECT * FROM evaluations WHERE user_id = u.id ORDER BY id DESC LIMIT 1) e ON true
    WHERE u.role = 'staff' AND u.active AND u.approved ${area ? 'AND u.area = $1' : ''}
    ORDER BY (e.status = 'analizada' AND NOT e.plan_published) DESC, e.submitted_at DESC NULLS LAST, u.name`, area ? [area] : []);
  const sent = (r) => ['enviada', 'analizando', 'analizada'].includes(r.status);
  const counts = { total: all.length, enviadas: all.filter(sent).length, informe: all.filter((r) => r.score != null).length, revisar: all.filter((r) => r.status === 'analizada' && !r.plan_published).length, en_curso: all.filter((r) => r.status === 'en_curso').length, pendiente: all.filter((r) => r.status === 'pendiente').length };
  const f = { revisar: (r) => r.status === 'analizada' && !r.plan_published, informe: (r) => r.score != null, enviada: (r) => ['enviada', 'analizando'].includes(r.status), en_curso: (r) => r.status === 'en_curso', pendiente: (r) => r.status === 'pendiente' }[estado];
  page(res, 'Evaluaciones', V.adminEvaluations(f ? all.filter(f) : all, estado, area, counts), req.user, { wide: true });
});

const slug = (s) => String(s || 'informe').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
function sendPdf(res, filename, build) {
  const doc = newDoc(filename);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
  doc.pipe(res);
  build(doc);
  footer(doc);
  doc.end();
}

app.get('/admin/personas/:id/informe.pdf', needAdmin, async (req, res) => {
  const person = await one('SELECT * FROM users_v WHERE id = $1', [req.params.id]);
  const ev = person && await one('SELECT * FROM evaluations WHERE user_id = $1 AND report IS NOT NULL AND ($2::int IS NULL OR id = $2) ORDER BY id DESC LIMIT 1', [person.id, req.query.ev ? Number(req.query.ev) : null]);
  if (!ev) return res.redirect(`/admin/personas/${req.params.id}`);
  sendPdf(res, `informe-${slug(person.name)}`, (doc) => renderReport(doc, person, ev));
});

app.get('/admin/informes.pdf', needAdmin, async (req, res) => {
  const area = AREA_KEYS.includes(req.query.area) ? req.query.area : '';
  const { rows } = await q(`SELECT u.id, u.name, u.area, u.sede, u.cargo, e.report, e.submitted_at, e.analyzed_at FROM users u
    JOIN LATERAL (SELECT * FROM evaluations WHERE user_id = u.id AND report IS NOT NULL ORDER BY id DESC LIMIT 1) e ON true
    WHERE u.role = 'staff' AND u.active AND u.approved ${area ? 'AND u.area = $1' : ''} ORDER BY u.area, u.name`, area ? [area] : []);
  if (!rows.length) return res.redirect('/admin/evaluaciones');
  sendPdf(res, `informes-${area || 'equipo'}-${thisMonth()}`, (doc) => rows.forEach((r, i) => { if (i) doc.addPage(); renderReport(doc, r, r); }));
});

app.get('/admin/aprendizaje', needAdmin, async (req, res) => {
  const area = AREA_KEYS.includes(req.query.area) ? req.query.area : AREA_KEYS[0];
  const k = await latestKnowledge(area);
  const people = (await q(`SELECT u.id, u.name, (u.photo IS NOT NULL) AS has_photo, e.status FROM users u
    LEFT JOIN LATERAL (SELECT status FROM evaluations WHERE user_id = u.id ORDER BY id DESC LIMIT 1) e ON true
    WHERE u.role = 'staff' AND u.active AND u.approved AND u.area = $1 ORDER BY u.name`, [area])).rows;
  const qs = (await q("SELECT id, module, text FROM questions WHERE area = $1 AND active AND type = 'open' ORDER BY position", [area])).rows;
  const counts = Object.fromEntries((await q(`SELECT u.area, count(*)::int AS n FROM users u JOIN LATERAL (SELECT status FROM evaluations WHERE user_id = u.id ORDER BY id DESC LIMIT 1) e ON true
    WHERE u.role = 'staff' AND u.approved AND e.status IN ('enviada','analizando','analizada') GROUP BY 1`)).rows.map((r) => [r.area, r.n]));
  page(res, 'Aprendizaje', V.learningPage(area, k, people, qs, counts, req.query.error), req.user, { wide: true });
});

app.post('/admin/aprendizaje', needAdmin, async (req, res) => {
  const area = AREA_KEYS.includes(req.body.area) ? req.body.area : AREA_KEYS[0];
  try { await learnArea(area); } catch (e) {
    console.error('aprendizaje', e);
    return res.redirect(`/admin/aprendizaje?area=${area}&error=${encodeURIComponent(e.message)}`);
  }
  res.redirect(`/admin/aprendizaje?area=${area}`);
});

app.get('/ia', needUser, async (req, res) => {
  const n = await one(`SELECT
      (SELECT coalesce(sum((SELECT count(*) FROM jsonb_object_keys(answers))), 0) FROM evaluations)::int AS respuestas,
      (SELECT count(*) FROM evaluations WHERE status IN ('enviada','analizando','analizada'))::int AS evaluaciones,
      (SELECT count(*) FROM pulses)::int AS pulsos,
      (SELECT count(*) FROM sessions_1a1)::int AS sesiones,
      (SELECT count(*) FROM study_attempts)::int AS intentos,
      (SELECT count(*) FROM plan_items)::int AS acciones,
      (SELECT count(*) FROM evaluations WHERE report IS NOT NULL)::int AS informes,
      (SELECT count(*) FROM study_modules)::int AS modulos`);
  const c = await one('SELECT data FROM customer_insights ORDER BY id DESC LIMIT 1');
  n.resenas = c?.data?.resenas || 0;
  const learned = [];
  for (const k of (await q('SELECT DISTINCT ON (area) area, data FROM knowledge ORDER BY area, id DESC')).rows) for (const t of k.data.temas || []) learned.push({ t: t.tema, k: t.tipo, a: V.areaName(k.area) });
  for (const g of (await q(`SELECT o->>'titulo' AS t, count(*)::int AS n FROM evaluations e, jsonb_array_elements(e.report->'oportunidades') o WHERE e.report IS NOT NULL GROUP BY 1 ORDER BY 2 DESC LIMIT 10`)).rows) learned.push({ t: g.t, k: 'brecha', a: 'Evaluaciones' });
  for (const g of (await q(`SELECT f->>'titulo' AS t, count(*)::int AS n FROM evaluations e, jsonb_array_elements(e.report->'fortalezas') f WHERE e.report IS NOT NULL GROUP BY 1 ORDER BY 2 DESC LIMIT 10`)).rows) learned.push({ t: g.t, k: 'fortaleza', a: 'Evaluaciones' });
  for (const x of c?.data?.negativos || []) learned.push({ t: x.t, k: 'brecha', a: 'Clientes en Google' });
  for (const x of c?.data?.positivos || []) learned.push({ t: x.t, k: 'fortaleza', a: 'Clientes en Google' });
  // Frases completas para cada salida de la IA
  const cut = (t, m = 150) => { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length > m ? t.slice(0, t.lastIndexOf(' ', m)) + '…' : t; };
  const outs = [[], [], [], [], [], []];
  for (const k of (await q('SELECT DISTINCT ON (area) area, data FROM knowledge ORDER BY area, id DESC')).rows) {
    for (const t of k.data.temas || []) outs[t.tipo === 'brecha' ? 1 : 0].push(cut(`${t.tema}: ${t.detalle}`));
    for (const p of k.data.preguntas || []) outs[2].push(cut(p.respuesta_modelo, 160));
  }
  for (const r of (await q(`SELECT f->>'titulo' AS t, f->>'evidencia' AS d FROM evaluations e, jsonb_array_elements(e.report->'fortalezas') f WHERE e.report IS NOT NULL ORDER BY e.id DESC LIMIT 20`)).rows) outs[0].push(cut(`${r.t}: ${r.d || ''}`));
  for (const r of (await q(`SELECT o->>'titulo' AS t, o->>'evidencia' AS d FROM evaluations e, jsonb_array_elements(e.report->'oportunidades') o WHERE e.report IS NOT NULL ORDER BY e.id DESC LIMIT 20`)).rows) outs[1].push(cut(`${r.t}: ${r.d || ''}`));
  for (const x of c?.data?.positivos || []) outs[0].push(cut(`Clientes: ${x.t}. ${x.d}`));
  for (const x of c?.data?.negativos || []) outs[1].push(cut(`Clientes: ${x.t}. ${x.d}`));
  for (const r of (await q("SELECT titulo, objetivo FROM study_modules WHERE titulo <> '' ORDER BY id DESC LIMIT 20")).rows) outs[3].push(cut(r.objetivo ? `${r.titulo}: ${r.objetivo}` : r.titulo));
  for (const r of (await q('SELECT accion FROM plan_items ORDER BY id DESC LIMIT 30')).rows) outs[4].push(cut(r.accion));
  for (const x of c?.data?.acciones || []) outs[5].push(cut(x.a));
  for (const r of (await q(`SELECT DISTINCT a->>'accion' AS t FROM team_insights ti, jsonb_array_elements(coalesce(ti.data->'acciones', '[]'::jsonb)) a LIMIT 15`).catch(() => ({ rows: [] }))).rows) if (r.t) outs[5].push(cut(r.t));
  for (const o of outs) o.sort(() => Math.random() - 0.5);
  page(res, 'IA de servicio en vivo', V.aiLivePage(n, learned, outs, req.user.role === 'admin' ? '/admin' : '/'), req.user, { bare: true });
});

app.get('/admin/clientes', needAdmin, async (req, res) => {
  const c = await one('SELECT * FROM customer_insights ORDER BY id DESC LIMIT 1');
  const last = (await q("SELECT pu.mes, count(*)::int AS n, round(avg((answers->>'servicio')::numeric), 2)::float AS servicio FROM pulses pu GROUP BY pu.mes ORDER BY pu.mes DESC LIMIT 1")).rows[0];
  page(res, 'Percepción de clientes', V.customersPage(c, last), req.user, { wide: true });
});

app.get('/admin/solicitudes', needAdmin, async (req, res) => {
  const { rows } = await q('SELECT * FROM users_v WHERE approved = false ORDER BY created_at');
  page(res, 'Solicitudes', V.adminRequests(rows, await sedesList()), req.user, { wide: true });
});

app.post('/admin/solicitudes/:id', needAdmin, async (req, res) => {
  const u = await one('SELECT * FROM users_v WHERE id = $1 AND approved = false', [req.params.id]);
  if (!u) return res.redirect('/admin/solicitudes');
  if (req.body.decision === 'rechazar') {
    await q('DELETE FROM users WHERE id = $1', [u.id]);
    return res.redirect('/admin/solicitudes');
  }
  const area = AREA_KEYS.includes(req.body.area) ? req.body.area : u.area;
  const sede = String(req.body.sede || u.sede).trim();
  await q('UPDATE users SET approved = true, active = true, area = $2, sede = $3 WHERE id = $1', [u.id, area, sede]);
  await assignEvaluation(u.id);
  try { await sendLoginLink(u.email, u.name, await loginLink(u.id), true); } catch (e) { console.error('mail', e); }
  res.redirect('/admin/solicitudes');
});

app.post('/admin/sedes', needAdmin, async (req, res) => {
  await setSetting('sedes', String(req.body.sedes || '').split('\n').map((x) => x.trim()).filter(Boolean));
  res.redirect('/admin/equipo');
});

app.get('/admin/equipo', needAdmin, async (req, res) => {
  const { rows } = await q(`SELECT u.id, u.email, u.name, u.area, u.cargo, u.sede, u.active, u.telefono, u.last_seen, (u.photo IS NOT NULL) AS has_photo, e.status, e.submitted_at, e.plan_published, (e.report->>'puntaje_global')::int AS score,
      (SELECT count(*) FROM sessions_1a1 s WHERE s.user_id = u.id)::int AS sessions
    FROM users u LEFT JOIN LATERAL (SELECT * FROM evaluations WHERE user_id = u.id ORDER BY id DESC LIMIT 1) e ON true
    WHERE u.role = 'staff' AND u.approved ORDER BY u.area, u.name`);
  page(res, 'Equipo', V.adminHome(rows, mailConfigured(), await sedesList()), req.user, { wide: true });
});

app.post('/admin/personas/:id/desactivar', needAdmin, async (req, res) => {
  await q("UPDATE users SET active = NOT active WHERE id = $1 AND role = 'staff'", [req.params.id]);
  res.redirect(`/admin/personas/${req.params.id}`);
});

app.post('/admin/personas', needAdmin, async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const name = String(req.body.name || '').trim();
  const area = AREA_KEYS.includes(req.body.area) ? req.body.area : null;
  if (!email || !name || !area) return res.redirect('/admin/equipo');
  const u = await one(`INSERT INTO users (email, name, area, cargo, sede) VALUES ($1,$2,$3,$4,$5)
    ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, area = EXCLUDED.area, cargo = EXCLUDED.cargo, sede = EXCLUDED.sede, active = true, approved = true RETURNING *`,
  [email, name, area, String(req.body.cargo || '').trim(), String(req.body.sede || '').trim()]);
  const has = await one("SELECT id FROM evaluations WHERE user_id = $1 AND area = $2", [u.id, area]);
  if (!has) await assignEvaluation(u.id);
  const link = await loginLink(u.id);
  let sent = false;
  try { sent = await sendLoginLink(u.email, u.name, link, true); } catch (e) { console.error('mail', e); }
  res.redirect(`/admin/personas/${u.id}${sent ? '' : `?link=${encodeURIComponent(link)}`}`);
});

app.get('/admin/personas/:id', needAdmin, async (req, res) => {
  const person = await one('SELECT * FROM users_v WHERE id = $1', [req.params.id]);
  if (!person) return res.redirect('/admin');
  const evs = (await q('SELECT * FROM evaluations WHERE user_id = $1 ORDER BY id DESC', [person.id])).rows;
  const sessions = await oneOnOneCtx(person);
  const plans = (await q(`SELECT p.*, coalesce(json_agg(i ORDER BY i.position, i.id) FILTER (WHERE i.id IS NOT NULL), '[]') AS items
    FROM plans p LEFT JOIN plan_items i ON i.plan_id = p.id WHERE p.user_id = $1 GROUP BY p.id ORDER BY p.mes DESC`, [person.id])).rows;
  page(res, person.name, V.adminPerson(person, evs, sessions, req.query.link, mailConfigured(), plans, thisMonth(), req.query.error) + V.voiceCard(person, await voiceOf(person.id), { survey: surveyFor(person.area) }), req.user, { wide: true });
});

app.post('/admin/personas/:id/enlace', needAdmin, async (req, res) => {
  const u = await one('SELECT * FROM users_v WHERE id = $1', [req.params.id]);
  if (!u) return res.redirect('/admin');
  const link = await loginLink(u.id);
  let sent = false;
  try { sent = await sendLoginLink(u.email, u.name, link, true); } catch (e) { console.error('mail', e); }
  res.redirect(`/admin/personas/${u.id}?link=${encodeURIComponent(link)}${sent ? '&sent=1' : ''}`);
});

app.post('/admin/personas/:id/whatsapp', needAdmin, async (req, res) => {
  const u = await one('SELECT id, name, telefono FROM users_v WHERE id = $1', [req.params.id]);
  if (!u) return res.redirect('/admin/equipo');
  const link = await loginLink(u.id);
  let tel = String(u.telefono || '').replace(/\D/g, '');
  if (tel.length === 10) tel = '57' + tel;
  const text = `Hola ${String(u.name).split(' ')[0]}, este es tu enlace personal para entrar al programa de servicio Aural y presentar tu evaluación: ${link}`;
  res.redirect(`https://wa.me/${tel}?text=${encodeURIComponent(text)}`);
});

app.post('/admin/personas/:id/evaluacion', needAdmin, async (req, res) => {
  await assignEvaluation(req.params.id);
  res.redirect(`/admin/personas/${req.params.id}`);
});

app.post('/admin/personas/:id/sesiones', needAdmin, async (req, res) => {
  await saveOneOnOne(Number(req.params.id), req.user.id, req.body);
  res.redirect(`/admin/personas/${req.params.id}#sesiones`);
});

// ---------- Líderes: seguimiento de su equipo ----------
const teamSql = (where) => `SELECT u.id, u.name, u.email, u.area, u.sede, u.cargo, u.last_seen, (u.photo IS NOT NULL) AS has_photo, u.leader_id,
    e.status, e.plan_published, (e.report->>'puntaje_global')::int AS score,
    m.id AS mod_id, m.numero AS mod_num, m.titulo AS mod_titulo, (r.user_id IS NOT NULL) AS leido, a.best, coalesce(a.n, 0)::int AS intentos, coalesce(a.passed, false) AS aprobado,
    ac.publicados, ac.aprobados, pl.total AS plan_total, pl.hechos AS plan_hechos,
    (SELECT max(fecha) FROM sessions_1a1 s WHERE s.user_id = u.id AND to_char(s.fecha, 'YYYY-MM') = $1) AS uno_mes,
    (SELECT count(*) FROM compromisos c WHERE c.user_id = u.id AND c.estado IN ('pendiente','parcial'))::int AS comp_abiertos,
    (SELECT round(avg(promedio), 1)::float FROM feedback f WHERE f.user_id = u.id AND f.estado = 'valida') AS voz,
    (SELECT count(*) FROM feedback f WHERE f.user_id = u.id AND f.estado = 'valida' AND to_char(f.created_at AT TIME ZONE 'America/Bogota', 'YYYY-MM') = $1)::int AS voz_mes,
    (SELECT count(*) FROM feedback f WHERE f.user_id = u.id AND f.estado = 'revision')::int AS voz_rev, u.meta_voz,
    (SELECT round(avg(promedio), 1)::float FROM feedback f WHERE f.user_id = u.id AND f.estado = 'valida' AND to_char(f.created_at AT TIME ZONE 'America/Bogota', 'YYYY-MM') = $1) AS voz_pmes,
    (SELECT round(avg(promedio), 1)::float FROM feedback f WHERE f.user_id = u.id AND f.estado = 'valida' AND to_char(f.created_at AT TIME ZONE 'America/Bogota', 'YYYY-MM') = to_char((to_date($1, 'YYYY-MM') - interval '1 month'), 'YYYY-MM')) AS voz_pprev
  FROM users u
  LEFT JOIN LATERAL (SELECT * FROM evaluations WHERE user_id = u.id ORDER BY id DESC LIMIT 1) e ON true
  LEFT JOIN study_modules m ON m.area = u.area AND m.mes = $1 AND m.published
  LEFT JOIN study_reads r ON r.user_id = u.id AND r.module_id = m.id
  LEFT JOIN LATERAL (SELECT max(score) AS best, count(*) AS n, bool_or(passed) AS passed FROM study_attempts WHERE user_id = u.id AND module_id = m.id) a ON true
  LEFT JOIN LATERAL (SELECT count(*)::int AS publicados, count(*) FILTER (WHERE EXISTS (SELECT 1 FROM study_attempts sa WHERE sa.module_id = sm.id AND sa.user_id = u.id AND sa.passed))::int AS aprobados
    FROM study_modules sm WHERE sm.area = u.area AND sm.published AND sm.mes <= $1) ac ON true
  LEFT JOIN LATERAL (SELECT count(*)::int AS total, count(*) FILTER (WHERE i.estado = 'hecho')::int AS hechos FROM plan_items i JOIN plans p ON p.id = i.plan_id WHERE p.user_id = u.id AND p.mes = $1 AND p.published) pl ON true
  WHERE ${where}
  ORDER BY u.area, u.name`;
const withMeta = (rows) => rows.map((r) => ({ ...r, meta: metaFor(r) }));
const teamOf = async (leader) => withMeta((await q(teamSql("u.role = 'staff' AND u.approved AND u.active AND u.id <> $2 AND ($3 OR u.leader_id = $2)"), [thisMonth(), leader.id, Boolean(leader.leads_all)])).rows);
const selfRow = async (u) => (await q(teamSql('u.id = $2'), [thisMonth(), u.id])).rows[0];
const inTeam = async (leader, id) => one(`SELECT * FROM users_v WHERE id = $1 AND role = 'staff' AND id <> $2 AND ($3 OR leader_id = $2)`, [id, leader.id, Boolean(leader.leads_all)]);

// ---------- Uno a uno mensual: va de cara al módulo, con compromisos y seguimiento ----------
async function oneOnOneCtx(person) {
  const sessions = (await q(`SELECT s.*, to_char(s.fecha, 'YYYY-MM') AS mes_s, a.name AS autor, m.titulo AS modulo FROM sessions_1a1 s LEFT JOIN users a ON a.id = s.autor_id LEFT JOIN study_modules m ON m.id = s.module_id
    WHERE s.user_id = $1 ORDER BY s.fecha DESC, s.id DESC`, [person.id])).rows;
  const commitments = (await q('SELECT * FROM compromisos WHERE user_id = $1 ORDER BY created_at DESC, id', [person.id])).rows;
  const mod = await one('SELECT id, numero, titulo, objetivo FROM study_modules WHERE area = $1 AND mes = $2', [person.area, thisMonth()]);
  if (mod) mod.st = await one('SELECT max(score) AS best, count(*)::int AS n, coalesce(bool_or(passed), false) AS passed FROM study_attempts WHERE user_id = $1 AND module_id = $2', [person.id, mod.id]);
  const ev = await one('SELECT report FROM evaluations WHERE user_id = $1 AND report IS NOT NULL ORDER BY id DESC LIMIT 1', [person.id]);
  const gaps = (ev?.report?.oportunidades || []).map((o) => o.titulo).filter(Boolean);
  return { sessions, commitments, mod, gaps, mes: thisMonth() };
}

async function saveOneOnOne(personId, authorId, b) {
  const notas = String(b.notas || '').trim();
  for (const [k, v] of Object.entries(b)) {
    const m = k.match(/^st_(\d+)$/);
    if (m && ['pendiente', 'parcial', 'cumplido', 'no_cumplido'].includes(v)) await q('UPDATE compromisos SET estado = $3, nota = $4, updated_at = now() WHERE id = $1 AND user_id = $2', [m[1], personId, v, String(b[`nt_${m[1]}`] || '').trim().slice(0, 500)]);
  }
  if (!notas) return;
  const mod = await one('SELECT id FROM study_modules WHERE id = $1', [Number(b.module_id) || 0]);
  const s = await one('INSERT INTO sessions_1a1 (user_id, fecha, notas, compromisos, autor_id, module_id, brecha) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
    [personId, b.fecha, notas, '', authorId, mod?.id || null, String(b.brecha_otra || b.brecha || '').trim().slice(0, 300)]);
  for (const i of [1, 2, 3]) {
    const t = String(b[`c${i}`] || '').trim();
    if (t) await q('INSERT INTO compromisos (user_id, session_id, texto, fecha_limite) VALUES ($1,$2,$3,$4)', [personId, s.id, t.slice(0, 500), b[`f${i}`] || null]);
  }
}

app.get('/lider', needLeader, async (req, res) => {
  page(res, 'Mi equipo', V.leaderHome(req.user, await teamOf(req.user), thisMonth(), '/lider/personas', await selfRow(req.user)), req.user, { wide: true });
});

async function personAcademy(person) {
  return (await q(`SELECT m.id, m.numero, m.mes, m.titulo, (r.user_id IS NOT NULL) AS leido, max(a.score) AS best, count(a.id)::int AS intentos, coalesce(bool_or(a.passed), false) AS aprobado
    FROM study_modules m LEFT JOIN study_reads r ON r.module_id = m.id AND r.user_id = $1 LEFT JOIN study_attempts a ON a.module_id = m.id AND a.user_id = $1
    WHERE m.area = $2 AND m.published AND m.mes <= $3 GROUP BY m.id, r.user_id ORDER BY m.mes, m.numero`, [person.id, person.area, thisMonth()])).rows;
}

app.get('/lider/personas/:id', needLeader, async (req, res) => {
  const person = await inTeam(req.user, req.params.id);
  if (!person) return res.redirect('/lider');
  const ev = await one('SELECT * FROM evaluations WHERE user_id = $1 ORDER BY id DESC LIMIT 1', [person.id]);
  const plans = (await q(`SELECT p.*, coalesce(json_agg(i ORDER BY i.position, i.id) FILTER (WHERE i.id IS NOT NULL), '[]') AS items
    FROM plans p LEFT JOIN plan_items i ON i.plan_id = p.id WHERE p.user_id = $1 AND p.published GROUP BY p.id ORDER BY p.mes DESC LIMIT 3`, [person.id])).rows;
  page(res, person.name, V.leaderPerson(person, ev, plans, await personAcademy(person), await oneOnOneCtx(person)) + V.voiceCard(person, await voiceOf(person.id), { survey: surveyFor(person.area) }), req.user, { wide: true });
});

app.post('/lider/personas/:id/sesiones', needLeader, async (req, res) => {
  const person = await inTeam(req.user, req.params.id);
  if (person) await saveOneOnOne(person.id, req.user.id, req.body);
  res.redirect(`/lider/personas/${req.params.id}#sesiones`);
});

app.get('/lider/personas/:id/informe.pdf', needLeader, async (req, res) => {
  const person = await inTeam(req.user, req.params.id);
  const ev = person && await one('SELECT * FROM evaluations WHERE user_id = $1 AND report IS NOT NULL ORDER BY id DESC LIMIT 1', [person.id]);
  if (!ev) return res.redirect('/lider');
  sendPdf(res, `informe-${slug(person.name)}`, (doc) => renderReport(doc, person, ev));
});

app.get('/admin/lideres', needAdmin, async (req, res) => {
  const { rows } = await q("SELECT id, name, email, area, sede, lider, leads_all, leader_id, meta_voz, (photo IS NOT NULL) AS has_photo FROM users WHERE role = 'staff' AND approved AND active ORDER BY area, name");
  rows.forEach((r) => { r.meta_def = metaFor({ ...r, meta_voz: null }); });
  const teams = {};
  for (const l of rows.filter((r) => r.lider)) teams[l.id] = await teamOf(l);
  page(res, 'Líderes', V.adminLeaders(rows, req.query.ok, teams), req.user, { wide: true });
});

app.get('/admin/lideres/:id', needAdmin, async (req, res) => {
  const l = await one('SELECT * FROM users_v WHERE id = $1 AND lider', [req.params.id]);
  if (!l) return res.redirect('/admin/lideres');
  page(res, `Equipo de ${l.name}`, `<p><a href="/admin/lideres">← Líderes</a></p>${V.leaderHome(l, await teamOf(l), thisMonth(), '/admin/personas')}`, req.user, { wide: true });
});

app.post('/admin/lideres', needAdmin, async (req, res) => {
  const b = req.body;
  if (b.nuevo) await q("UPDATE users SET lider = true WHERE id = $1 AND role = 'staff'", [b.nuevo]);
  if (b.quitar) { await q('UPDATE users SET lider = false, leads_all = false WHERE id = $1', [b.quitar]); await q('UPDATE users SET leader_id = NULL WHERE leader_id = $1', [b.quitar]); }
  if (b.todos) await q('UPDATE users SET leads_all = NOT leads_all WHERE id = $1 AND lider', [b.todos]);
  if (b.asignar) {
    const leaders = new Set((await q('SELECT id FROM users WHERE lider')).rows.map((r) => String(r.id)));
    for (const [k, v] of Object.entries(b)) {
      const m = k.match(/^l_(\d+)$/);
      if (m) await q('UPDATE users SET leader_id = $2 WHERE id = $1', [m[1], leaders.has(String(v)) && v !== m[1] ? Number(v) : null]);
      const mm = k.match(/^m_(\d+)$/);
      if (mm) await q('UPDATE users SET meta_voz = $2 WHERE id = $1', [mm[1], String(v).trim() === '' ? null : Math.max(0, Math.min(500, Number(v) || 0))]);
    }
  }
  res.redirect('/admin/lideres?ok=1');
});

// ---------- Planes mensuales ----------
const MES_RE = /^\d{4}-\d{2}$/;
app.post('/admin/personas/:id/planes', needAdmin, async (req, res) => {
  const mes = MES_RE.test(req.body.mes) ? req.body.mes : thisMonth();
  try {
    if (req.body.modo === 'ia') await generateMonthlyPlan(Number(req.params.id), mes);
    else await q("INSERT INTO plans (user_id, mes, objetivo) VALUES ($1,$2,$3) ON CONFLICT (user_id, mes) DO NOTHING", [req.params.id, mes, String(req.body.objetivo || '').trim()]);
  } catch (e) {
    console.error('plan', e);
    return res.redirect(`/admin/personas/${req.params.id}?error=${encodeURIComponent('No se pudo generar el plan: ' + e.message)}#planes`);
  }
  res.redirect(`/admin/personas/${req.params.id}#planes`);
});

const planOwner = async (planId) => (await one('SELECT user_id FROM plans WHERE id = $1', [planId]))?.user_id;

app.post('/admin/planes/:id', needAdmin, async (req, res) => {
  const b = req.body;
  if (b.accion_tipo === 'publicar') await q('UPDATE plans SET published = NOT published WHERE id = $1', [req.params.id]);
  else if (b.accion_tipo === 'objetivo') await q('UPDATE plans SET objetivo = $2 WHERE id = $1', [req.params.id, String(b.objetivo || '').trim()]);
  else if (b.accion_tipo === 'item' && String(b.accion || '').trim()) {
    await q('INSERT INTO plan_items (plan_id, accion, indicador, position) VALUES ($1,$2,$3,(SELECT coalesce(max(position),0)+10 FROM plan_items WHERE plan_id = $1))', [req.params.id, b.accion.trim(), String(b.indicador || '').trim()]);
  }
  res.redirect(`/admin/personas/${await planOwner(req.params.id)}#planes`);
});

app.post('/admin/items/:id', needAdmin, async (req, res) => {
  const item = await one('SELECT plan_id FROM plan_items WHERE id = $1', [req.params.id]);
  if (!item) return res.redirect('/admin');
  if (req.body.borrar) await q('DELETE FROM plan_items WHERE id = $1', [req.params.id]);
  else {
    const estado = ['pendiente', 'en_curso', 'hecho'].includes(req.body.estado) ? req.body.estado : 'pendiente';
    await q('UPDATE plan_items SET estado = $2, updated_at = now() WHERE id = $1', [req.params.id, estado]);
  }
  res.redirect(`/admin/personas/${await planOwner(item.plan_id)}#planes`);
});

// ---------- Plan de estudio ----------
const loadModule = (id) => one('SELECT * FROM study_modules WHERE id = $1', [id]);
const canSee = (u, m) => u.role === 'admin' || (m.published && m.area === u.area && windowState(m.mes) !== 'proximo');

app.get('/estudio', needUser, async (req, res) => {
  if (req.user.role === 'admin') return res.redirect('/admin/estudio');
  const mods = (await q("SELECT * FROM study_modules WHERE area = $1 AND (published OR (numero IS NOT NULL AND mes > to_char(now() AT TIME ZONE 'America/Bogota', 'YYYY-MM'))) ORDER BY mes", [req.user.area])).rows;
  for (const m of mods) m.st = await userModuleState(req.user.id, m);
  page(res, 'Academia', V.studyList(mods, METODOLOGIA), req.user);
});

app.get('/estudio/:id', needUser, async (req, res) => {
  const m = await loadModule(req.params.id);
  if (!m || !canSee(req.user, m)) return res.redirect('/estudio');
  const imgs = (await q('SELECT id, nombre FROM study_images WHERE module_id = $1', [m.id])).rows;
  const st = req.user.role === 'admin' ? null : await userModuleState(req.user.id, m);
  const last = st && req.query.intento ? await one('SELECT * FROM study_attempts WHERE id = $1 AND user_id = $2 AND module_id = $3', [req.query.intento, req.user.id, m.id]) : null;
  page(res, m.titulo, V.studyModule(m, st, last, imgs, req.user.role === 'admin'), req.user);
});

app.post('/estudio/:id/leido', needUser, async (req, res) => {
  const m = await loadModule(req.params.id);
  if (m && canSee(req.user, m)) await q('INSERT INTO study_reads (user_id, module_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [req.user.id, m.id]);
  res.redirect(`/estudio/${req.params.id}#evaluacion`);
});

app.get('/estudio/:id/evaluacion', needUser, async (req, res) => {
  const m = await loadModule(req.params.id);
  if (!m || !canSee(req.user, m) || req.user.role === 'admin') return res.redirect(`/estudio/${req.params.id}`);
  const st = await userModuleState(req.user.id, m);
  if (!st.canTake) return res.redirect(`/estudio/${m.id}`);
  page(res, `Evaluación · ${m.titulo}`, V.studyQuiz(m, st, drawQuiz(m, req.user.id, st.attempts.length)), req.user);
});

app.post('/estudio/:id/evaluacion', needUser, async (req, res) => {
  const m = await loadModule(req.params.id);
  if (!m || !canSee(req.user, m) || req.user.role === 'admin') return res.redirect('/estudio');
  const st = await userModuleState(req.user.id, m);
  if (!st.canTake) return res.redirect(`/estudio/${m.id}`);
  const g = grade(m, req.body, drawQuiz(m, req.user.id, st.attempts.length));
  const a = await one('INSERT INTO study_attempts (user_id, module_id, answers, score, passed) VALUES ($1,$2,$3,$4,$5) RETURNING id', [req.user.id, m.id, JSON.stringify(g.answers), g.score, g.passed]);
  res.redirect(`/estudio/${m.id}?intento=${a.id}#resultado`);
});

app.get('/img/:id', needUser, async (req, res) => {
  const im = await one('SELECT mime, data FROM study_images WHERE id = $1', [req.params.id]);
  if (!im) return res.status(404).end();
  res.setHeader('Content-Type', im.mime);
  res.setHeader('Cache-Control', 'private, max-age=604800');
  res.send(im.data);
});

app.get('/admin/estudio', needAdmin, async (req, res) => {
  const area = AREA_KEYS.includes(req.query.area) ? req.query.area : AREA_KEYS[0];
  const mods = (await q(`SELECT m.id, m.mes, m.numero, m.titulo, m.published, m.auto_publish, jsonb_array_length(m.secciones) AS nsec, jsonb_array_length(m.preguntas) AS npreg,
      (SELECT count(DISTINCT user_id) FROM study_attempts a WHERE a.module_id = m.id AND a.passed)::int AS aprobados,
      (SELECT count(DISTINCT user_id) FROM study_attempts a WHERE a.module_id = m.id)::int AS presentaron
    FROM study_modules m WHERE m.area = $1 ORDER BY m.mes`, [area])).rows;
  const staff = (await one("SELECT count(*)::int AS n FROM users WHERE role = 'staff' AND active AND approved AND area = $1", [area])).n;
  page(res, 'Plan de estudio', V.adminStudy(area, mods, staff, thisMonth(), req.query.error), req.user, { wide: true });
});

app.post('/admin/estudio/generar', needAdmin, async (req, res) => {
  const area = AREA_KEYS.includes(req.body.area) ? req.body.area : AREA_KEYS[0];
  const mes = MES_RE.test(req.body.mes) ? req.body.mes : thisMonth();
  try {
    if (req.body.modo === 'manual') {
      const m = await one("INSERT INTO study_modules (area, mes, titulo) VALUES ($1,$2,'Nuevo módulo') ON CONFLICT (area, mes) DO UPDATE SET area = EXCLUDED.area RETURNING id", [area, mes]);
      return res.redirect(`/admin/estudio/${m.id}`);
    }
    const m = await generateModule(area, mes, String(req.body.tema || '').trim());
    res.redirect(`/admin/estudio/${m.id}`);
  } catch (e) {
    console.error('modulo', e);
    res.redirect(`/admin/estudio?area=${area}&error=${encodeURIComponent('No se pudo generar el módulo: ' + e.message)}`);
  }
});

app.post('/admin/estudio/academia', needAdmin, async (req, res) => {
  const area = AREA_KEYS.includes(req.body.area) ? req.body.area : AREA_KEYS[0];
  const inicio = MES_RE.test(req.body.inicio) ? req.body.inicio : thisMonth();
  try { await generateAcademy(area, inicio); } catch (e) {
    console.error('academia', e);
    return res.redirect(`/admin/estudio?area=${area}&error=${encodeURIComponent('No se pudo crear la ruta: ' + e.message)}`);
  }
  res.redirect(`/admin/estudio?area=${area}`);
});

app.post('/admin/estudio/:id/contenido', needAdmin, async (req, res) => {
  const m = await loadModule(req.params.id);
  if (!m) return res.redirect('/admin/estudio');
  try { await generateModule(m.area, m.mes); } catch (e) { console.error('modulo', e); }
  res.redirect(`/admin/estudio/${m.id}`);
});

app.post('/admin/estudio/:id/auto', needAdmin, async (req, res) => {
  await q('UPDATE study_modules SET auto_publish = NOT auto_publish WHERE id = $1', [req.params.id]);
  res.redirect(`/admin/estudio/${req.params.id}`);
});

app.get('/admin/estudio/:id', needAdmin, async (req, res) => {
  const m = await loadModule(req.params.id);
  if (!m) return res.redirect('/admin/estudio');
  const imgs = (await q('SELECT id, nombre FROM study_images WHERE module_id = $1 ORDER BY id', [m.id])).rows;
  const results = (await q(`SELECT u.id, u.name, u.sede, count(a.id)::int AS intentos, max(a.score) AS mejor, bool_or(a.passed) AS aprobado,
      (SELECT 1 FROM study_reads r WHERE r.user_id = u.id AND r.module_id = $1) AS leyo
    FROM users u LEFT JOIN study_attempts a ON a.user_id = u.id AND a.module_id = $1
    WHERE u.role = 'staff' AND u.active AND u.approved AND u.area = $2 GROUP BY u.id ORDER BY u.name`, [m.id, m.area])).rows;
  const attempted = (await one('SELECT count(*)::int AS n FROM study_attempts WHERE module_id = $1', [m.id])).n;
  page(res, m.titulo, V.adminStudyEdit(m, imgs, results, attempted, req.query.ok), req.user, { wide: true });
});

app.post('/admin/estudio/:id', needAdmin, async (req, res) => {
  const m = await loadModule(req.params.id);
  if (!m) return res.redirect('/admin/estudio');
  const b = req.body;
  if (b.accion === 'publicar') {
    await q('UPDATE study_modules SET published = NOT published WHERE id = $1', [m.id]);
    return res.redirect(`/admin/estudio/${m.id}`);
  }
  if (b.accion === 'borrar') {
    await q('DELETE FROM study_modules WHERE id = $1 AND NOT EXISTS (SELECT 1 FROM study_attempts WHERE module_id = $1)', [m.id]);
    return res.redirect(`/admin/estudio?area=${m.area}`);
  }
  const arr = (k) => [].concat(b[k] ?? []);
  const secciones = arr('s_titulo').map((t, i) => ({ titulo: String(t).trim(), contenido: String(arr('s_contenido')[i] || '').trim(), imagen_sugerida: String(arr('s_imagen')[i] || '') }))
    .filter((x) => x.titulo || x.contenido);
  const preguntas = arr('p_texto').map((t, i) => {
    const opciones = String(arr('p_opciones')[i] || '').split('\n').map((x) => x.trim()).filter(Boolean);
    const c = parseInt(arr('p_correcta')[i], 10) - 1;
    return { texto: String(t).trim(), opciones, correcta: c >= 0 && c < opciones.length ? c : 0, explicacion: String(arr('p_explicacion')[i] || '').trim() };
  }).filter((x) => x.texto && x.opciones.length >= 2);
  const attempted = (await one('SELECT count(*)::int AS n FROM study_attempts WHERE module_id = $1', [m.id])).n;
  const mes = MES_RE.test(b.mes) ? b.mes : m.mes;
  await q(`UPDATE study_modules SET titulo = $2, objetivo = $3, secciones = $4, mes = $5 ${attempted ? '' : ', preguntas = $6'} WHERE id = $1`,
    attempted ? [m.id, String(b.titulo || '').trim(), String(b.objetivo || '').trim(), JSON.stringify(secciones), mes]
      : [m.id, String(b.titulo || '').trim(), String(b.objetivo || '').trim(), JSON.stringify(secciones), mes, JSON.stringify(preguntas)]);
  res.redirect(`/admin/estudio/${m.id}?ok=1`);
});

app.post('/admin/estudio/:id/imagen', needAdmin, async (req, res) => {
  const { nombre, mime, data } = req.body || {};
  if (!/^image\/(png|jpeg|webp|gif)$/.test(mime || '') || !data) return res.status(400).json({ ok: false });
  const buf = Buffer.from(String(data), 'base64');
  if (buf.length > 4 * 1024 * 1024) return res.status(413).json({ ok: false });
  const im = await one('INSERT INTO study_images (module_id, nombre, mime, data) VALUES ($1,$2,$3,$4) RETURNING id', [req.params.id, String(nombre || '').slice(0, 120), mime, buf]);
  res.json({ ok: true, id: im.id });
});

// ---------- Ranking ----------
app.get('/ranking', needUser, async (req, res) => {
  const cur = thisMonth();
  const mes = MES_RE.test(req.query.mes || '') && req.query.mes <= cur ? req.query.mes : cur;
  const rows = await rankingFor(mes);
  const months = (await q(`SELECT DISTINCT mes FROM (SELECT mes FROM plans UNION SELECT mes FROM pulses UNION SELECT mes FROM study_modules WHERE mes <= $1) x ORDER BY mes DESC LIMIT 12`, [cur])).rows.map((r) => r.mes);
  if (!months.includes(cur)) months.unshift(cur);
  page(res, 'Ranking', V.rankingPage(rows, mes, cur, months, req.user), req.user, { wide: true });
});

// ---------- Mensajes ----------
app.get('/admin/mensajes', needAdmin, async (req, res) => {
  const msgs = (await q("SELECT * FROM messages ORDER BY fecha DESC, id DESC LIMIT 60")).rows;
  const counts = Object.fromEntries((await q("SELECT area, count(*)::int AS n FROM users WHERE role = 'staff' AND active GROUP BY area")).rows.map((r) => [r.area, r.n]));
  page(res, 'Mensajes', V.adminMessages(msgs, await getSetting('mensajes_activos', true), counts, mailConfigured(), req.query.ok, req.query.error), req.user, { wide: true });
});

app.post('/admin/mensajes/config', needAdmin, async (req, res) => {
  await setSetting('mensajes_activos', req.body.activos === 'on');
  res.redirect('/admin/mensajes');
});

app.post('/admin/mensajes/hoy', needAdmin, async (req, res) => {
  try {
    const r = await runDaily();
    res.redirect(`/admin/mensajes?ok=${encodeURIComponent(r.skipped ? 'El envío automático está pausado.' : `Mensajes de hoy listos: ${r.sent} correos enviados.`)}`);
  } catch (e) { console.error('diario', e); res.redirect(`/admin/mensajes?error=${encodeURIComponent(e.message)}`); }
});

app.post('/admin/mensajes', needAdmin, async (req, res) => {
  const area = req.body.area === 'todas' || AREA_KEYS.includes(req.body.area) ? req.body.area : 'todas';
  const titulo = String(req.body.titulo || '').trim();
  const mensaje = String(req.body.mensaje || '').trim();
  if (!titulo || !mensaje) return res.redirect('/admin/mensajes');
  const m = await one("INSERT INTO messages (area, fecha, tipo, titulo, mensaje, tip) VALUES ($1,$2,'manual',$3,$4,$5) RETURNING id", [area, today(), titulo, mensaje, String(req.body.tip || '').trim()]);
  const n = await sendMessage(m.id);
  res.redirect(`/admin/mensajes?ok=${encodeURIComponent(`Mensaje enviado a ${n} personas.`)}`);
});

app.post('/cron/diario', async (req, res) => {
  // Se puede llamar sin secreto solo en la franja de la mañana; el envío es idempotente (una vez por día).
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }));
  const mins = now.getHours() * 60 + now.getMinutes();
  const authorized = process.env.CRON_SECRET && req.headers['x-cron-secret'] === process.env.CRON_SECRET;
  if (!authorized && (now.getDay() === 0 || mins < 330 || mins > 570)) return res.status(403).send('fuera de horario');
  res.status(202).send('ok');
  runDaily().then((r) => console.log('diario', r)).catch((e) => console.error('diario', e));
});

app.post('/admin/evaluaciones/:id/analizar', needAdmin, async (req, res) => {
  const ev = await one("UPDATE evaluations SET status = 'analizando', report_error = NULL WHERE id = $1 AND status IN ('enviada','analizada') RETURNING user_id", [req.params.id]);
  if (ev) analyze(Number(req.params.id));
  const u = ev || (await one('SELECT user_id FROM evaluations WHERE id = $1', [req.params.id]));
  res.redirect(`/admin/personas/${u?.user_id ?? ''}`);
});

app.post('/admin/evaluaciones/:id/publicar', needAdmin, async (req, res) => {
  const ev = await one('UPDATE evaluations SET plan_published = NOT plan_published WHERE id = $1 AND report IS NOT NULL RETURNING user_id, plan_published', [req.params.id]);
  if (ev?.plan_published) notifyPlanPublished(Number(req.params.id)).catch((e) => console.error('plan publicado', e.message));
  res.redirect(`/admin/personas/${ev?.user_id ?? ''}`);
});

app.get('/admin/preguntas', needAdmin, async (req, res) => {
  const area = AREA_KEYS.includes(req.query.area) ? req.query.area : AREA_KEYS[0];
  const { rows } = await q('SELECT * FROM questions WHERE area = $1 ORDER BY active DESC, position, id', [area]);
  page(res, 'Preguntas', V.adminQuestions(rows, area), req.user);
});

app.post('/admin/preguntas/:id', needAdmin, async (req, res) => {
  const b = req.body;
  const type = ['single', 'multi', 'scale', 'open'].includes(b.type) ? b.type : 'open';
  const options = type === 'open' ? null : String(b.options || '').split('\n').map((s) => s.trim()).filter(Boolean);
  const nums = String(b.correct || '').split(',').map((s) => parseInt(s, 10) - 1).filter((n) => n >= 0 && options && n < options.length);
  const correct = !nums.length || type === 'scale' || type === 'open' ? null : type === 'single' ? nums[0] : nums;
  const vals = [b.module.trim(), type, b.text.trim(), options && JSON.stringify(options), correct === null ? null : JSON.stringify(correct), parseInt(b.position, 10) || 999];
  const area = AREA_KEYS.includes(b.area) ? b.area : AREA_KEYS[0];
  if (req.params.id === 'nueva') await q('INSERT INTO questions (module, type, text, options, correct, position, area) VALUES ($1,$2,$3,$4,$5,$6,$7)', [...vals, area]);
  else await q('UPDATE questions SET module=$1, type=$2, text=$3, options=$4, correct=$5, position=$6, active=$8 WHERE id=$7', [...vals, req.params.id, b.active === 'on']);
  res.redirect(`/admin/preguntas?area=${area}`);
});

app.use((err, req, res, next) => { console.error(err); res.status(500).send('Ocurrió un error. Intenta de nuevo.'); });

await migrate();
// Reanuda análisis que quedaron a medias por un reinicio
for (const { id } of (await q("SELECT id FROM evaluations WHERE status = 'analizando'")).rows) analyze(id);
app.listen(process.env.PORT || 3000, () => console.log('Aural Servicio listo en', BASE));
