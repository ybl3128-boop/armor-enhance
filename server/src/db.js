import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'armor_enhance',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export async function initializeDatabase() {
  try {
    const migrationSQL = fs.readFileSync(path.join(__dirname, 'migrations.sql'), 'utf8');
    const client = await pool.connect();
    try {
      await client.query(migrationSQL);
      console.log('✅ Database initialized successfully');
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('❌ Database initialization error:', err);
    throw err;
  }
}

export async function query(text, params = []) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 100) {
      console.log('⚠️ Slow query:', text.substring(0, 50), `(${duration}ms)`);
    }
    return result;
  } catch (err) {
    console.error('Database query error:', err.message);
    throw err;
  }
}

export async function getClient() {
  return pool.connect();
}

export async function closePool() {
  await pool.end();
}

export default pool;
