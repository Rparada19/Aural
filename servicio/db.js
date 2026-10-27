import pg from 'pg';
import { SEED } from './questions.js';

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: /sslmode=require/.test(process.env.DATABASE_URL || '') ? { rejectUnauthorized: false } : false,
  max: 5,
});

export const q = (text, params) => pool.query(text, params);
export const one = async (text, params) => (await pool.query(text, params)).rows[0];

export async function migrate() {
  await q(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT 'staff',
      cargo TEXT NOT NULL DEFAULT '',
      sede TEXT NOT NULL DEFAULT '',
      active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS login_tokens (
      token_hash TEXT PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id_hash TEXT PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL
    );
    CREATE TABLE IF NOT EXISTS questions (
      id SERIAL PRIMARY KEY,
      module TEXT NOT NULL,
      type TEXT NOT NULL,
      text TEXT NOT NULL,
      options JSONB,
      correct JSONB,
      position INT NOT NULL DEFAULT 0,
      active BOOLEAN NOT NULL DEFAULT true
    );
    CREATE TABLE IF NOT EXISTS evaluations (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pendiente',
      questions JSONB NOT NULL,
      answers JSONB NOT NULL DEFAULT '{}',
      report JSONB,
      report_error TEXT,
      plan_published BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      started_at TIMESTAMPTZ,
      submitted_at TIMESTAMPTZ,
      analyzed_at TIMESTAMPTZ
    );
    CREATE TABLE IF NOT EXISTS sessions_1a1 (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      fecha DATE NOT NULL,
      notas TEXT NOT NULL,
      compromisos TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await q(`
    CREATE TABLE IF NOT EXISTS plans (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      mes TEXT NOT NULL,
      objetivo TEXT NOT NULL DEFAULT '',
      mensaje TEXT NOT NULL DEFAULT '',
      published BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (user_id, mes)
    );
    CREATE TABLE IF NOT EXISTS plan_items (
      id SERIAL PRIMARY KEY,
      plan_id INT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
      accion TEXT NOT NULL,
      indicador TEXT NOT NULL DEFAULT '',
      estado TEXT NOT NULL DEFAULT 'pendiente',
      nota TEXT NOT NULL DEFAULT '',
      position INT NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      area TEXT NOT NULL,
      fecha DATE NOT NULL,
      tipo TEXT NOT NULL DEFAULT 'diario',
      titulo TEXT NOT NULL,
      mensaje TEXT NOT NULL,
      tip TEXT NOT NULL DEFAULT '',
      sent_at TIMESTAMPTZ,
      recipients INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS messages_diario_uniq ON messages (area, fecha) WHERE tipo = 'diario';
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value JSONB NOT NULL);
    CREATE TABLE IF NOT EXISTS study_modules (
      id SERIAL PRIMARY KEY,
      area TEXT NOT NULL,
      mes TEXT NOT NULL,
      titulo TEXT NOT NULL DEFAULT '',
      objetivo TEXT NOT NULL DEFAULT '',
      secciones JSONB NOT NULL DEFAULT '[]',
      preguntas JSONB NOT NULL DEFAULT '[]',
      published BOOLEAN NOT NULL DEFAULT false,
      notified_at TIMESTAMPTZ,
      reminded_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (area, mes)
    );
    CREATE TABLE IF NOT EXISTS study_images (
      id SERIAL PRIMARY KEY,
      module_id INT NOT NULL REFERENCES study_modules(id) ON DELETE CASCADE,
      nombre TEXT NOT NULL DEFAULT '',
      mime TEXT NOT NULL,
      data BYTEA NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS study_reads (
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      module_id INT NOT NULL REFERENCES study_modules(id) ON DELETE CASCADE,
      read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, module_id)
    );
    CREATE TABLE IF NOT EXISTS study_attempts (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      module_id INT NOT NULL REFERENCES study_modules(id) ON DELETE CASCADE,
      answers JSONB NOT NULL,
      score INT NOT NULL,
      passed BOOLEAN NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS pulses (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      area TEXT NOT NULL DEFAULT '',
      mes TEXT NOT NULL,
      answers JSONB NOT NULL,
      comentario TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (user_id, mes)
    );
  `);
  await q("ALTER TABLE users ADD COLUMN IF NOT EXISTS area TEXT NOT NULL DEFAULT ''");
  await q("ALTER TABLE users ADD COLUMN IF NOT EXISTS approved BOOLEAN NOT NULL DEFAULT true");
  await q("ALTER TABLE users ADD COLUMN IF NOT EXISTS telefono TEXT NOT NULL DEFAULT ''");
  await q('ALTER TABLE users ADD COLUMN IF NOT EXISTS photo BYTEA');
  await q("ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_mime TEXT NOT NULL DEFAULT ''");
  await q('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ');
  await q('ALTER TABLE study_modules ADD COLUMN IF NOT EXISTS numero INT');
  await q('ALTER TABLE study_modules ADD COLUMN IF NOT EXISTS auto_publish BOOLEAN NOT NULL DEFAULT true');
  await q("CREATE TABLE IF NOT EXISTS team_insights (id SERIAL PRIMARY KEY, area TEXT NOT NULL DEFAULT '', mes TEXT NOT NULL, data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now())");
  await q("CREATE TABLE IF NOT EXISTS knowledge (id SERIAL PRIMARY KEY, area TEXT NOT NULL, data JSONB NOT NULL, evaluaciones INT NOT NULL DEFAULT 0, respuestas INT NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now())");
  await q('CREATE TABLE IF NOT EXISTS notifications (id SERIAL PRIMARY KEY, key TEXT UNIQUE NOT NULL, sent_at TIMESTAMPTZ NOT NULL DEFAULT now())');
  await q(`CREATE OR REPLACE VIEW users_v AS SELECT id, email, name, role, cargo, sede, active, created_at, area, approved, telefono, (photo IS NOT NULL) AS has_photo FROM users`);
  await q("ALTER TABLE questions ADD COLUMN IF NOT EXISTS area TEXT NOT NULL DEFAULT ''");
  await q("ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS area TEXT NOT NULL DEFAULT ''");
  for (const [area, modules] of Object.entries(SEED)) {
    const { count } = await one('SELECT count(*)::int AS count FROM questions WHERE area = $1', [area]);
    if (count) continue;
    let i = 0;
    for (const [module, items] of modules) {
      for (const s of items) {
        await q('INSERT INTO questions (area, module, type, text, options, correct, position) VALUES ($1,$2,$3,$4,$5,$6,$7)', [
          area, module, s.type, s.text,
          s.options ? JSON.stringify(s.options) : null,
          s.correct === undefined || s.correct === null ? null : JSON.stringify(s.correct),
          (i += 10),
        ]);
      }
    }
  }
}
