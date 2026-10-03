import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import pg from 'pg';

// Works from both src/scripts (tsx) and dist/scripts (compiled): db/ sits two levels up.
const dbDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../db');

async function sqlFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir);
  return entries.filter((name) => name.endsWith('.sql')).sort();
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set');
  const withSeed = process.argv.includes('--seed');

  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )`);
    // Serialize concurrent deploys.
    await client.query('SELECT pg_advisory_lock(727001)');

    const applied = new Set(
      (await client.query<{ name: string }>('SELECT name FROM schema_migrations')).rows.map((row) => row.name),
    );
    const migrationsDir = path.join(dbDir, 'migrations');
    let count = 0;
    for (const file of await sqlFiles(migrationsDir)) {
      if (applied.has(file)) continue;
      const sql = await readFile(path.join(migrationsDir, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${file} failed: ${(error as Error).message}`);
      }
      console.log(`applied ${file}`);
      count += 1;
    }
    console.log(count === 0 ? 'migrations: up to date' : `migrations: applied ${count}`);

    if (withSeed) {
      const seedsDir = path.join(dbDir, 'seeds');
      for (const file of await sqlFiles(seedsDir)) {
        await client.query('BEGIN');
        try {
          await client.query(await readFile(path.join(seedsDir, file), 'utf8'));
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          throw new Error(`Seed ${file} failed: ${(error as Error).message}`);
        }
        console.log(`seeded ${file}`);
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock(727001)').catch(() => undefined);
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
