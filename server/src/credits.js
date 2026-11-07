import { get, run, tx } from './db.js';
import { HttpError, now } from './util.js';
import { CREDIT_COST, OPTIONS } from './catalog.js';

export const balance = (userId) => get('SELECT credits FROM users WHERE id=?', userId)?.credits ?? 0;

export function jobCost(kind, params = {}) {
  const q = OPTIONS.qualities.find((x) => x.id === params.quality) || OPTIONS.qualities[1];
  const base = CREDIT_COST[kind] ?? 0;
  const scaled = ['image', 'video'].includes(kind) ? base * q.multiplier : base;
  return Math.max(base ? 1 : 0, Math.round(scaled));
}

/** Descuenta créditos de forma atómica; lanza 402 si no hay saldo suficiente. */
export function charge(userId, amount, reason, jobId = null) {
  if (!amount) return;
  tx(() => {
    const bal = balance(userId);
    if (bal < amount) throw new HttpError(402, 'INSUFFICIENT_CREDITS', `Créditos insuficientes: necesitas ${amount} y tienes ${bal}.`, { needed: amount, balance: bal });
    run('UPDATE users SET credits=credits-? WHERE id=?', amount, userId);
    run('INSERT INTO credit_ledger (user_id,delta,reason,job_id,balance,created_at) VALUES (?,?,?,?,?,?)', userId, -amount, reason, jobId, bal - amount, now());
  });
}
export function grant(userId, amount, reason, jobId = null) {
  if (!amount) return;
  tx(() => {
    const bal = balance(userId);
    run('UPDATE users SET credits=credits+? WHERE id=?', amount, userId);
    run('INSERT INTO credit_ledger (user_id,delta,reason,job_id,balance,created_at) VALUES (?,?,?,?,?,?)', userId, amount, reason, jobId, bal + amount, now());
  });
}
