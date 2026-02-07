import { Database } from 'bun:sqlite';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { mkdirSync, existsSync } from 'node:fs';

const DATA_DIR = join(import.meta.dir, '..', '..', 'data');
const DB_PATH = join(DATA_DIR, 'ai-summary-cache.sqlite');

let db: Database | null = null;

function getDb(): Database {
  if (!db) {
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
    }
    db = new Database(DB_PATH, { create: true });
    db.run(`
      CREATE TABLE IF NOT EXISTS ai_summary_cache (
        checksum TEXT PRIMARY KEY,
        summary TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `);
  }
  return db;
}

/** SHA-256 hex digest of code; same content => same key; file change => new key. */
export function checksum(code: string): string {
  return createHash('sha256').update(code, 'utf8').digest('hex');
}

/** Return cached summary for this checksum, or null if missing. */
export function get(checksumKey: string): string | null {
  const row = getDb().query<{ summary: string }, [string]>(
    'SELECT summary FROM ai_summary_cache WHERE checksum = ?'
  ).get(checksumKey);
  return row?.summary ?? null;
}

/** Store summary for this checksum. Keeps all rows; never deletes so reverting code reuses cache. */
export function set(checksumKey: string, summary: string): void {
  getDb().run(
    'INSERT OR REPLACE INTO ai_summary_cache (checksum, summary, created_at) VALUES (?, ?, unixepoch())',
    [checksumKey, summary]
  );
}
