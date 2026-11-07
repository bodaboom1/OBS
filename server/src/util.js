import crypto from 'node:crypto';
import { MASTER_KEY } from './config.js';

export class HttpError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
export const uid = (p) => `${p}_${crypto.randomBytes(8).toString('hex')}`;
export const now = () => new Date().toISOString();
export const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
export const str = (v, max = 5000) => (typeof v === 'string' ? v.slice(0, max) : '');

export function encrypt(obj) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', MASTER_KEY, iv);
  const enc = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), enc]).toString('base64');
}
export function decrypt(b64) {
  const buf = Buffer.from(b64, 'base64');
  const d = crypto.createDecipheriv('aes-256-gcm', MASTER_KEY, buf.subarray(0, 12));
  d.setAuthTag(buf.subarray(12, 28));
  return JSON.parse(Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString('utf8'));
}
export const parseJSON = (s, fallback) => {
  try { return s ? JSON.parse(s) : fallback; } catch { return fallback; }
};
