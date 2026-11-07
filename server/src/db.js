import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { DATA_DIR, SIGNUP_CREDITS } from './config.js';
import { now } from './util.js';

export const db = new DatabaseSync(process.env.DB_FILE || path.join(DATA_DIR, 'lumio.db'));
db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, email TEXT, name TEXT, credits INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS characters (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL, description TEXT DEFAULT '',
  personality TEXT DEFAULT '', appearance TEXT DEFAULT '', voice_type TEXT DEFAULT '',
  apparent_age TEXT DEFAULT '', special_features TEXT DEFAULT '', visual_style TEXT DEFAULT '',
  favorite_voice TEXT DEFAULT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_char_user ON characters(user_id);
CREATE TABLE IF NOT EXISTS character_images (
  id TEXT PRIMARY KEY, character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL, slot TEXT NOT NULL, label TEXT DEFAULT '', file TEXT NOT NULL, mime TEXT,
  source TEXT DEFAULT 'upload', created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cimg_char ON character_images(character_id);
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL, mode TEXT NOT NULL DEFAULT 'idea',
  status TEXT NOT NULL DEFAULT 'draft', brief TEXT DEFAULT '', settings TEXT NOT NULL DEFAULT '{}',
  character_ids TEXT NOT NULL DEFAULT '[]', editor TEXT NOT NULL DEFAULT '{}', media TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_proj_user ON projects(user_id);
CREATE TABLE IF NOT EXISTS scenes (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  position INTEGER NOT NULL, data TEXT NOT NULL DEFAULT '{}', media TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_scene_proj ON scenes(project_id, position);
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, kind TEXT NOT NULL, name TEXT DEFAULT '', file TEXT NOT NULL,
  mime TEXT, size INTEGER DEFAULT 0, source TEXT DEFAULT 'upload', provider TEXT, meta TEXT DEFAULT '{}',
  project_id TEXT, scene_id TEXT, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_asset_user ON assets(user_id, kind);
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, project_id TEXT, scene_id TEXT, kind TEXT NOT NULL,
  provider TEXT, status TEXT NOT NULL DEFAULT 'queued', progress INTEGER DEFAULT 0,
  input TEXT DEFAULT '{}', state TEXT DEFAULT '{}', output TEXT DEFAULT '{}', error TEXT, cost INTEGER DEFAULT 0,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_job_user ON jobs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_job_status ON jobs(status);
CREATE TABLE IF NOT EXISTS credit_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, delta INTEGER NOT NULL, reason TEXT,
  job_id TEXT, balance INTEGER NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS provider_configs (
  user_id TEXT NOT NULL, provider TEXT NOT NULL, data TEXT NOT NULL, updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, provider)
);
CREATE TABLE IF NOT EXISTS settings (
  user_id TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY (user_id, key)
);
`);

export const all = (sql, ...p) => db.prepare(sql).all(...p);
export const get = (sql, ...p) => db.prepare(sql).get(...p);
export const run = (sql, ...p) => db.prepare(sql).run(...p);
export function tx(fn) {
  db.exec('BEGIN IMMEDIATE');
  try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; }
}

export const LOCAL_USER_ID = 'usr_local';
if (!get('SELECT id FROM users WHERE id=?', LOCAL_USER_ID)) {
  run('INSERT INTO users (id,email,name,credits,created_at) VALUES (?,?,?,?,?)', LOCAL_USER_ID, null, 'Creador', SIGNUP_CREDITS, now());
  run('INSERT INTO credit_ledger (user_id,delta,reason,balance,created_at) VALUES (?,?,?,?,?)', LOCAL_USER_ID, SIGNUP_CREDITS, 'Créditos de bienvenida', SIGNUP_CREDITS, now());
}

export function getSetting(userId, key, fallback = null) {
  const r = get('SELECT value FROM settings WHERE user_id=? AND key=?', userId, key);
  if (!r) return fallback;
  try { return JSON.parse(r.value); } catch { return fallback; }
}
export function setSetting(userId, key, value) {
  run('INSERT INTO settings (user_id,key,value) VALUES (?,?,?) ON CONFLICT(user_id,key) DO UPDATE SET value=excluded.value', userId, key, JSON.stringify(value));
}
