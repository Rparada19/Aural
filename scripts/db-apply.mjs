// Aplica archivos .sql contra la base de Supabase.
// La contraseña vive en .env.db (fuera de git); el resto de la conexión va aquí.
import { readFileSync } from 'node:fs';
import pg from 'pg';

const HOST = 'aws-1-sa-east-1.pooler.supabase.com';
const USER = 'postgres.fazwfnbikqkarzgwiwpr';

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('uso: node scripts/db-apply.mjs <archivo.sql> [...]');
  process.exit(1);
}

const password = readFileSync('.env.db', 'utf8').match(/PGPASSWORD=(.*)/)[1].trim();
const client = new pg.Client({
  host: HOST, port: 5432, user: USER, password, database: 'postgres',
  ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000,
});

await client.connect();
for (const file of files) {
  const sql = readFileSync(file, 'utf8');
  try {
    await client.query(sql);
    console.log('OK  ', file);
  } catch (err) {
    console.error('FALLA', file, '\n ', err.message);
    await client.end();
    process.exit(1);
  }
}
await client.end();
