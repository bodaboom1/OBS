import { all, get, run } from '../db.js';
import { decrypt, encrypt, now, parseJSON } from '../util.js';
import { getSetting, setSetting } from '../db.js';
import { ADAPTERS } from './adapters.js';
import { CATEGORIES } from '../catalog.js';

export function loadConfig(userId, providerId) {
  const r = get('SELECT data FROM provider_configs WHERE user_id=? AND provider=?', userId, providerId);
  if (!r) return null;
  try { return decrypt(r.data); } catch { return null; }
}
export function saveConfig(userId, providerId, patch) {
  const current = loadConfig(userId, providerId) || {};
  const next = { ...current, ...patch, models: { ...(current.models || {}), ...(patch.models || {}) } };
  for (const k of Object.keys(next)) if (next[k] === '' || next[k] == null) delete next[k];
  run('INSERT INTO provider_configs (user_id,provider,data,updated_at) VALUES (?,?,?,?) ON CONFLICT(user_id,provider) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at',
    userId, providerId, encrypt(next), now());
}
export const deleteConfig = (userId, providerId) => run('DELETE FROM provider_configs WHERE user_id=? AND provider=?', userId, providerId);
export const isConfigured = (userId, providerId) => !!loadConfig(userId, providerId)?.apiKey;

/** Proveedor activo para una categoría: el elegido por el usuario o el primero configurado que la ofrezca. */
export function activeProvider(userId, category) {
  const chosen = getSetting(userId, 'active_providers', {})[category];
  if (chosen && ADAPTERS[chosen]?.categories.includes(category) && isConfigured(userId, chosen)) return ADAPTERS[chosen];
  return Object.values(ADAPTERS).find((a) => a.categories.includes(category) && isConfigured(userId, a.id)) || null;
}
export function setActive(userId, category, providerId) {
  const cur = getSetting(userId, 'active_providers', {});
  if (providerId) cur[category] = providerId; else delete cur[category];
  setSetting(userId, 'active_providers', cur);
}

/** Vista segura para el frontend: nunca incluye los secretos, solo si están configurados y los últimos 4 caracteres. */
export function publicProviders(userId) {
  const active = getSetting(userId, 'active_providers', {});
  const providers = Object.values(ADAPTERS).map((a) => {
    const cfg = loadConfig(userId, a.id) || {};
    return {
      id: a.id, name: a.name, description: a.description, docs: a.docs, categories: a.categories,
      defaultModels: a.defaultModels, configured: !!cfg.apiKey, models: cfg.models || {},
      fields: a.fields.map((f) => ({ ...f, set: !!cfg[f.key], hint: cfg[f.key] ? `••••${String(cfg[f.key]).slice(-4)}` : '' })),
    };
  });
  const categories = Object.entries(CATEGORIES).map(([id, label]) => {
    const act = activeProvider(userId, id);
    return { id, label, active: act?.id || null, chosen: active[id] || null, connected: !!act, options: providers.filter((p) => p.categories.includes(id)).map((p) => ({ id: p.id, name: p.name, configured: p.configured })) };
  });
  return { providers, categories };
}
