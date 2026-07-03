import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

function createDb(dbPath: string): Database.Database {
  const dir = path.dirname(dbPath);
  if (dir !== '.' && !fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      instructions TEXT NOT NULL DEFAULT '',
      knowledge TEXT NOT NULL DEFAULT '[]',
      enabled_tools TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      messages TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  return db;
}

export function openDb(dbPath: string): Database.Database {
  return createDb(dbPath);
}

let defaultDb: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!defaultDb) {
    const dbPath = process.env.STUDIO_DB_PATH || path.join(process.cwd(), 'data', 'studio.db');
    defaultDb = createDb(dbPath);
  }
  return defaultDb;
}

export function resetDbForTests(): void {
  defaultDb = null;
}
