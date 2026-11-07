import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, '..');
export const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, 'data');
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
export const TMP_DIR = path.join(DATA_DIR, 'tmp');
export const WEB_DIST = path.resolve(ROOT, '..', 'web', 'dist');
export const PORT = Number(process.env.PORT || 8787);
export const IS_PROD = process.env.NODE_ENV === 'production';
// Si se define, todas las rutas /api exigen "Authorization: Bearer <token>" (punto de enganche para auth real).
export const ACCESS_TOKEN = process.env.APP_ACCESS_TOKEN || '';
export const SIGNUP_CREDITS = Number(process.env.SIGNUP_CREDITS || 200);

for (const d of [DATA_DIR, UPLOAD_DIR, TMP_DIR]) fs.mkdirSync(d, { recursive: true });

/** Clave maestra para cifrar las API keys de los proveedores (AES-256-GCM). Nunca sale del backend. */
function loadMasterKey() {
  if (process.env.APP_SECRET) return crypto.createHash('sha256').update(process.env.APP_SECRET).digest();
  const f = path.join(DATA_DIR, '.secret');
  if (!fs.existsSync(f)) fs.writeFileSync(f, crypto.randomBytes(32).toString('hex'), { mode: 0o600 });
  return Buffer.from(fs.readFileSync(f, 'utf8').trim(), 'hex');
}
export const MASTER_KEY = loadMasterKey();
