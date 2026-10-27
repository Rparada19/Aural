import express from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { q, one, migrate } from './db.js';
import { analyze } from './analysis.js';
import { sendLoginLink, mailConfigured } from './mail.js';
import * as V from './views.js';
import { AREA_KEYS } from './areas.js';

const app = express();
const BASE = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const ADMINS = (process.env.ADMIN_EMAILS || '').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
const COOKIE = 'aural_sid';
const hash = (s) => crypto.createHash('sha256').update(s).digest('hex');
const token = () => crypto.randomBytes(32).toString('base64url');

app.set('trust proxy', 1);
app.use(express.static(path.join(path.dirname(fileURLToPath(import.meta.url)), 'public'), { maxAge: '7d' }));
app.use(express.urlencoded({ extended: false, limit: '200kb' }));
app.use(express.json({ limit: '200kb' }));

// Sesión
app.use(async (req, res, next) => {
  const sid = (req.headers.cookie || '').split(/;\s*/).find((c) => c.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1);
  if (sid) req.user = await one('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id_hash = $1 AND s.expires_at > now() AND u.active', [hash(sid)]);
  next();
});

// Protección CSRF básica: los POST deben venir del mismo sitio
app.use((req, res, next) => {
  if (req.method !== 'POST') return next();
  const origin = req.headers.origin;
  if (origin && origin !== BASE && !origin.startsWith('http://localhost')) return res.status(403).send('Origen no permitido');
  next();
});

const page = (res, title, body, user, opts) => res.send(V.layout(title, body, user, opts));
const needUser = (req, res, next) => (req.user ? next() : res.redirect('/login'));
const needAdmin = (req, res, next) => (req.user?.role === 'admin' ? next() : res.redirect(req.user ? '/' : '/login'));

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
app.get('/login', (req, res) => (req.user ? res.redirect('/') : page(res, 'Entrar', V.loginPage())));

app.post('/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  let user = await one('SELECT * FROM users WHERE email = $1 AND active', [email]);
  if (!user && ADMINS.includes(email)) user = await one("INSERT INTO users (email, name, role) VALUES ($1, $1, 'admin') RETURNING *", [email]);
  if (user && ADMINS.includes(email) && user.role !== 'admin') await q("UPDATE users SET role = 'admin' WHERE id = $1", [user.id]);
  if (user) {
    try { await sendLoginLink(user.email, user.name, await loginLink(user.id)); } catch (e) { console.error('mail', e); return page(res, 'Entrar', V.loginPage('', 'No pudimos enviar el correo. Intenta de nuevo en unos minutos.')); }
  }
  page(res, 'Entrar', V.loginPage('Si tu correo está registrado, te enviamos un enlace de acceso. Revisa también la carpeta de spam.'));
});

app.get('/entrar/:t', async (req, res) => {
  const row = await one('UPDATE login_tokens SET used_at = now() WHERE token_hash = $1 AND expires_at > now() AND used_at IS NULL RETURNING user_id', [hash(req.params.t)]);
  if (!row) return page(res, 'Enlace vencido', V.loginPage('', 'Este enlace ya se usó o venció. Pide uno nuevo.'));
  const sid = token();
  await q("INSERT INTO sessions (id_hash, user_id, expires_at) VALUES ($1, $2, now() + interval '30 days')", [hash(sid), row.user_id]);
  res.setHeader('Set-Cookie', `${COOKIE}=${sid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 86400}${BASE.startsWith('https') ? '; Secure' : ''}`);
  res.redirect('/');
});

app.post('/salir', async (req, res) => {
  const sid = (req.headers.cookie || '').split(/;\s*/).find((c) => c.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1);
  if (sid) await q('DELETE FROM sessions WHERE id_hash = $1', [hash(sid)]);
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; Max-Age=0`);
  res.redirect('/login');
});

// ---------- Profesional ----------
const currentEval = (userId) => one('SELECT * FROM evaluations WHERE user_id = $1 ORDER BY id DESC LIMIT 1', [userId]);

app.get('/', needUser, async (req, res) => {
  if (req.user.role === 'admin') return res.redirect('/admin');
  page(res, 'Mi evaluación', V.staffHome(req.user, await currentEval(req.user.id)), req.user);
});

app.get('/evaluacion', needUser, async (req, res) => {
  const ev = await currentEval(req.user.id);
  if (!ev || !['pendiente', 'en_curso'].includes(ev.status)) return res.redirect('/');
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
  if (!ev || ev.status !== 'en_curso') return res.redirect('/');
  const answers = req.is('json') ? cleanAnswers(ev, req.body.answers || {}) : ev.answers;
  const missing = ev.questions.filter((qu) => { const a = answers[qu.id]; return a === undefined || a === null || a === '' || (Array.isArray(a) && !a.length); });
  if (missing.length) return res.status(400).json({ ok: false, missing: missing.map((m) => m.id) });
  await q("UPDATE evaluations SET answers = $2, status = 'enviada', submitted_at = now() WHERE id = $1", [ev.id, JSON.stringify(answers)]);
  analyze(ev.id);
  res.json({ ok: true });
});

// ---------- Admin ----------
app.get('/admin', needAdmin, async (req, res) => {
  const { rows } = await q(`SELECT u.*, e.status, e.submitted_at, e.plan_published, (e.report->>'puntaje_global')::int AS score,
      (SELECT count(*) FROM sessions_1a1 s WHERE s.user_id = u.id)::int AS sessions
    FROM users u LEFT JOIN LATERAL (SELECT * FROM evaluations WHERE user_id = u.id ORDER BY id DESC LIMIT 1) e ON true
    WHERE u.role = 'staff' ORDER BY u.area, u.name`);
  page(res, 'Equipo', V.adminHome(rows, mailConfigured()), req.user, { wide: true });
});

app.post('/admin/personas', needAdmin, async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const name = String(req.body.name || '').trim();
  const area = AREA_KEYS.includes(req.body.area) ? req.body.area : null;
  if (!email || !name || !area) return res.redirect('/admin');
  const u = await one(`INSERT INTO users (email, name, area, cargo, sede) VALUES ($1,$2,$3,$4,$5)
    ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, area = EXCLUDED.area, cargo = EXCLUDED.cargo, sede = EXCLUDED.sede, active = true RETURNING *`,
  [email, name, area, String(req.body.cargo || '').trim(), String(req.body.sede || '').trim()]);
  const has = await one("SELECT id FROM evaluations WHERE user_id = $1 AND area = $2", [u.id, area]);
  if (!has) await assignEvaluation(u.id);
  const link = await loginLink(u.id);
  let sent = false;
  try { sent = await sendLoginLink(u.email, u.name, link, true); } catch (e) { console.error('mail', e); }
  res.redirect(`/admin/personas/${u.id}${sent ? '' : `?link=${encodeURIComponent(link)}`}`);
});

app.get('/admin/personas/:id', needAdmin, async (req, res) => {
  const person = await one('SELECT * FROM users WHERE id = $1', [req.params.id]);
  if (!person) return res.redirect('/admin');
  const evs = (await q('SELECT * FROM evaluations WHERE user_id = $1 ORDER BY id DESC', [person.id])).rows;
  const sessions = (await q('SELECT * FROM sessions_1a1 WHERE user_id = $1 ORDER BY fecha DESC, id DESC', [person.id])).rows;
  page(res, person.name, V.adminPerson(person, evs, sessions, req.query.link, mailConfigured()), req.user, { wide: true });
});

app.post('/admin/personas/:id/enlace', needAdmin, async (req, res) => {
  const u = await one('SELECT * FROM users WHERE id = $1', [req.params.id]);
  if (!u) return res.redirect('/admin');
  const link = await loginLink(u.id);
  let sent = false;
  try { sent = await sendLoginLink(u.email, u.name, link, true); } catch (e) { console.error('mail', e); }
  res.redirect(`/admin/personas/${u.id}?link=${encodeURIComponent(link)}${sent ? '&sent=1' : ''}`);
});

app.post('/admin/personas/:id/evaluacion', needAdmin, async (req, res) => {
  await assignEvaluation(req.params.id);
  res.redirect(`/admin/personas/${req.params.id}`);
});

app.post('/admin/personas/:id/sesiones', needAdmin, async (req, res) => {
  await q('INSERT INTO sessions_1a1 (user_id, fecha, notas, compromisos) VALUES ($1,$2,$3,$4)', [req.params.id, req.body.fecha, String(req.body.notas || '').trim(), String(req.body.compromisos || '').trim()]);
  res.redirect(`/admin/personas/${req.params.id}`);
});

app.post('/admin/evaluaciones/:id/analizar', needAdmin, async (req, res) => {
  const ev = await one("UPDATE evaluations SET status = 'analizando', report_error = NULL WHERE id = $1 AND status IN ('enviada','analizada') RETURNING user_id", [req.params.id]);
  if (ev) analyze(Number(req.params.id));
  const u = ev || (await one('SELECT user_id FROM evaluations WHERE id = $1', [req.params.id]));
  res.redirect(`/admin/personas/${u?.user_id ?? ''}`);
});

app.post('/admin/evaluaciones/:id/publicar', needAdmin, async (req, res) => {
  const ev = await one('UPDATE evaluations SET plan_published = NOT plan_published WHERE id = $1 AND report IS NOT NULL RETURNING user_id', [req.params.id]);
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
