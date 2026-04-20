import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function runMigrations(): Promise<void> {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  console.error(`[Migrate] Running ${files.length} migration(s)...`);

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    try {
      await pool.query(sql);
      console.error(`[Migrate] ✓ ${file}`);
    } catch (err) {
      console.error(`[Migrate] ✗ ${file}:`, (err as Error).message);
      throw err;
    }
  }

  console.error('[Migrate] All migrations complete.');
  await pool.end();
}

runMigrations().catch((err) => {
  console.error(err);
  process.exit(1);
});
