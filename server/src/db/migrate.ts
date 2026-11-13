import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function resolveMigrationsDir(): string {
  const fromCwd = path.resolve(process.cwd(), 'server', 'src', 'db', 'migrations');
  if (fs.existsSync(fromCwd)) {
    return fromCwd;
  }
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const localMigrations = path.resolve(currentDir, 'migrations');
  if (fs.existsSync(localMigrations)) {
    return localMigrations;
  }
  throw new Error(`Migrations directory not found at ${fromCwd} or ${localMigrations}`);
}

export function runMigrations(db: Database.Database, reset = false): string[] {
  if (reset) {
    db.exec(`
      PRAGMA foreign_keys = OFF;
      DROP TABLE IF EXISTS analysis_reports;
      DROP TABLE IF EXISTS chat_messages;
      DROP TABLE IF EXISTS bids;
      DROP TABLE IF EXISTS auction_lots;
      DROP TABLE IF EXISTS room_teams;
      DROP TABLE IF EXISTS rooms;
      DROP TABLE IF EXISTS players;
      DROP TABLE IF EXISTS users;
      DROP TABLE IF EXISTS _migrations;
      PRAGMA foreign_keys = ON;
    `);
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const migrationsDir = resolveMigrationsDir();
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const appliedRows = db
    .prepare('SELECT filename FROM _migrations')
    .all() as { filename: string }[];
  const appliedSet = new Set(appliedRows.map((r) => r.filename));

  const newlyApplied: string[] = [];

  for (const filename of files) {
    if (appliedSet.has(filename)) {
      continue;
    }
    const sql = fs.readFileSync(path.join(migrationsDir, filename), 'utf8');
    const applyTx = db.transaction(() => {
      db.exec(sql);
      db.prepare('INSERT INTO _migrations (filename) VALUES (?)').run(filename);
    });
    applyTx();
    newlyApplied.push(filename);
  }

  return newlyApplied;
}
