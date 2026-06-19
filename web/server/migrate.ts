import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

export async function runMigrations(pool: Pool): Promise<void> {
  // Cria tabela de controle se não existir
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(255) UNIQUE NOT NULL,
      executada_em TIMESTAMP DEFAULT NOW()
    )
  `);

  const arquivos = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const arquivo of arquivos) {
    const jaRodou = await pool.query('SELECT id FROM migrations WHERE nome = $1', [arquivo]);
    if (jaRodou.rows.length > 0) continue;

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, arquivo), 'utf-8');
    console.log(`[MIGRATION] Rodando ${arquivo}...`);

    // CONCURRENTLY não pode rodar dentro de transação — roda statement por statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      await pool.query(statement);
    }

    await pool.query('INSERT INTO migrations (nome) VALUES ($1)', [arquivo]);
    console.log(`[MIGRATION] ${arquivo} concluída.`);
  }
}
