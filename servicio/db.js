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
  await q("ALTER TABLE users ADD COLUMN IF NOT EXISTS area TEXT NOT NULL DEFAULT ''");
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
