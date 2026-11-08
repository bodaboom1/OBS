import { Router } from 'express';
import fs from 'node:fs';
import { all, get, run } from '../db.js';
import { HttpError, wrap, str } from '../util.js';
import { STYLES, OPTIONS, CATEGORIES, CREDIT_COST } from '../catalog.js';
import { ADAPTERS } from '../providers/adapters.js';
import { publicProviders, saveConfig, deleteConfig, setActive, activeProvider, loadConfig } from '../providers/store.js';
import { balance, grant, charge, jobCost } from '../credits.js';
import { enqueueJob, cancelJob, jobDto } from '../jobs.js';
import { upload, listAssets, createAsset, kindOfMime, removeFileIfOrphan, assetDto } from '../media.js';
import { IS_PROD } from '../config.js';

export const router = Router();

router.get('/bootstrap', (req, res) => {
  const u = req.user.id;
  res.json({
    user: { id: u, name: req.user.name, credits: balance(u) },
    styles: STYLES, options: OPTIONS, categories: CATEGORIES, creditCost: CREDIT_COST,
    ...publicProviders(u),
    stats: {
      projects: get('SELECT COUNT(*) n FROM projects WHERE user_id=?', u).n, characters: get('SELECT COUNT(*) n FROM characters WHERE user_id=?', u).n,
      images: get(`SELECT COUNT(*) n FROM assets WHERE user_id=? AND kind='image'`, u).n, videos: get(`SELECT COUNT(*) n FROM assets WHERE user_id=? AND kind='video'`, u).n,
      jobsActive: get(`SELECT COUNT(*) n FROM jobs WHERE user_id=? AND status IN ('queued','running')`, u).n,
    },
    devCredits: !IS_PROD,
  });
});

// ----- Proveedores (las claves son de solo escritura: nunca se devuelven) -----
router.put('/providers/:id', wrap((req, res) => {
  const a = ADAPTERS[req.params.id];
  if (!a) throw new HttpError(404, 'NOT_FOUND', 'Proveedor desconocido.');
  const patch = { models: {} };
  for (const f of a.fields) if (typeof req.body?.[f.key] === 'string' && req.body[f.key].trim()) patch[f.key] = req.body[f.key].trim();
  for (const [cat, m] of Object.entries(req.body?.models || {})) if (a.categories.includes(cat)) patch.models[cat] = str(m, 200).trim();
  saveConfig(req.user.id, a.id, patch);
  res.json(publicProviders(req.user.id));
}));
router.delete('/providers/:id', wrap((req, res) => { deleteConfig(req.user.id, req.params.id); res.json(publicProviders(req.user.id)); }));
router.post('/providers/:id/test', wrap(async (req, res) => {
  const a = ADAPTERS[req.params.id];
  const cfg = loadConfig(req.user.id, req.params.id);
  if (!a || !cfg?.apiKey) throw new HttpError(409, 'PROVIDER_NOT_CONFIGURED', 'Guarda primero la clave de este proveedor.');
  try { await a.test(cfg); res.json({ ok: true }); } catch (e) { res.status(200).json({ ok: false, message: String(e.message).slice(0, 300) }); }
}));
router.put('/active-providers', wrap((req, res) => {
  for (const [cat, id] of Object.entries(req.body || {})) if (cat in CATEGORIES) setActive(req.user.id, cat, id && ADAPTERS[id]?.categories.includes(cat) ? id : null);
  res.json(publicProviders(req.user.id));
}));

// ----- Voces -----
const DEFAULT_PRESETS = [];
router.get('/voices', wrap(async (req, res) => {
  const p = activeProvider(req.user.id, 'voice');
  if (!p) return res.json({ connected: false, provider: null, voices: DEFAULT_PRESETS });
  try { res.json({ connected: true, provider: p.id, voices: await p.listVoices(loadConfig(req.user.id, p.id)) }); }
  catch (e) { res.json({ connected: true, provider: p.id, voices: [], error: `No se pudo obtener el catálogo de voces: ${e.message}` }); }
}));

// ----- Trabajos (generación asíncrona) -----
router.post('/jobs', wrap((req, res) => {
  const { kind, ...params } = req.body || {};
  res.status(202).json({ job: enqueueJob(req.user.id, kind, params), credits: balance(req.user.id) });
}));
router.get('/jobs', (req, res) => {
  const where = ['user_id=?']; const args = [req.user.id];
  if (req.query.projectId) { where.push('project_id=?'); args.push(String(req.query.projectId)); }
  if (req.query.kind) { where.push('kind=?'); args.push(String(req.query.kind)); }
  if (req.query.status) { where.push('status=?'); args.push(String(req.query.status)); }
  const rows = all(`SELECT * FROM jobs WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT ${Math.min(300, Number(req.query.limit) || 100)}`, ...args);
  res.json({ jobs: rows.map(jobDto), credits: balance(req.user.id) });
});
router.post('/jobs/:id/cancel', wrap((req, res) => res.json({ job: cancelJob(req.user.id, req.params.id), credits: balance(req.user.id) })));

// ----- Mejorar prompt (botón «Enhance») -----
router.post('/prompt/enhance', wrap(async (req, res) => {
  const prompt = String(req.body?.prompt || '').trim().slice(0, 3000);
  if (!prompt) throw new HttpError(400, 'EMPTY_PROMPT', 'Escribe primero un prompt.');
  const p = activeProvider(req.user.id, 'llm');
  if (!p) throw new HttpError(409, 'PROVIDER_NOT_CONFIGURED', 'Mejorar el prompt requiere un modelo de lenguaje conectado en Configuración → Proveedores.', { category: 'llm' });
  const cost = jobCost('storyboard');
  charge(req.user.id, cost, 'Mejorar prompt');
  try {
    const refs = (req.body?.aliases || []).filter((a) => typeof a === 'string').slice(0, 8);
    const raw = await p.chat(loadConfig(req.user.id, p.id), {
      system: 'Eres un director de fotografía que reescribe prompts para generación de vídeo con IA. Mejora el prompt: describe sujeto, acción, entorno, iluminación, movimiento de cámara y ambiente de forma concreta y cinematográfica, en 2-4 frases, en el mismo idioma. CONSERVA exactamente las menciones @alias existentes (' + (refs.map((a) => '@' + a).join(', ') || 'ninguna') + ') sin traducirlas ni quitarlas, y no inventes personajes nuevos. Responde SOLO con JSON: {"prompt": "..."}',
      user: prompt, maxTokens: 800,
    });
    const t = raw.replace(/```json|```/g, ''); const j = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1));
    if (!j.prompt) throw new Error('respuesta vacía');
    res.json({ prompt: String(j.prompt), credits: balance(req.user.id) });
  } catch (e) { grant(req.user.id, cost, 'Reembolso (mejorar prompt)'); throw new HttpError(502, 'LLM_ERROR', `No se pudo mejorar el prompt: ${e.message}`); }
}));

// ----- Créditos -----
router.get('/credits', (req, res) => res.json({ balance: balance(req.user.id), ledger: all('SELECT * FROM credit_ledger WHERE user_id=? ORDER BY id DESC LIMIT 100', req.user.id) }));
router.post('/credits/dev-grant', wrap((req, res) => {
  if (IS_PROD) throw new HttpError(403, 'FORBIDDEN', 'No disponible en producción: conecta aquí tu pasarela de pago.');
  grant(req.user.id, 100, 'Créditos de prueba (desarrollo)');
  res.json({ balance: balance(req.user.id) });
}));

// ----- Biblioteca de recursos -----
router.get('/assets', (req, res) => res.json({ assets: listAssets(req.user.id, ['image', 'video', 'audio'].includes(req.query.kind) ? req.query.kind : null) }));
router.post('/assets', upload.array('files', 20), wrap(async (req, res) => {
  if (!req.files?.length) throw new HttpError(400, 'NO_FILE', 'Selecciona al menos un archivo.');
  const out = [];
  for (const f of req.files) out.push(await createAsset({ userId: req.user.id, kind: kindOfMime(f.mimetype), file: f.filename, mime: f.mimetype, name: str(Buffer.from(f.originalname, 'latin1').toString('utf8'), 120), projectId: req.body.projectId || null }));
  res.status(201).json({ assets: out });
}));
router.patch('/assets/:id', wrap((req, res) => {
  const a = get('SELECT * FROM assets WHERE id=? AND user_id=?', req.params.id, req.user.id);
  if (!a) throw new HttpError(404, 'NOT_FOUND', 'Recurso no encontrado.');
  run('UPDATE assets SET name=? WHERE id=?', str(req.body?.name, 120), a.id);
  res.json({ asset: assetDto(get('SELECT * FROM assets WHERE id=?', a.id)) });
}));
router.delete('/assets/:id', wrap((req, res) => {
  const a = get('SELECT * FROM assets WHERE id=? AND user_id=?', req.params.id, req.user.id);
  if (!a) throw new HttpError(404, 'NOT_FOUND', 'Recurso no encontrado.');
  run('DELETE FROM assets WHERE id=?', a.id);
  removeFileIfOrphan(a.file);
  res.json({ ok: true });
}));
