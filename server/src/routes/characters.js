import { Router } from 'express';
import { get, run, all } from '../db.js';
import { HttpError, wrap, uid, now, str } from '../util.js';
import { listCharacters, getCharacter } from '../models.js';
import { upload, removeFileIfOrphan, kindOfMime } from '../media.js';
import { OPTIONS } from '../catalog.js';
import fs from 'node:fs';
import { uploadPath } from '../media.js';

export const router = Router();
const SLOTS = new Set(OPTIONS.characterSlots.map((s) => s.id));
const FIELDS = { name: 'name', description: 'description', personality: 'personality', appearance: 'appearance', voiceType: 'voice_type', apparentAge: 'apparent_age', specialFeatures: 'special_features', visualStyle: 'visual_style' };

function fromBody(b) {
  const o = {};
  for (const [k, col] of Object.entries(FIELDS)) if (b[k] !== undefined) o[col] = str(b[k], col === 'name' ? 120 : 3000).trim();
  return o;
}

router.get('/', (req, res) => res.json({ characters: listCharacters(req.user.id) }));

router.post('/', wrap((req, res) => {
  const f = fromBody(req.body);
  if (!f.name) throw new HttpError(400, 'NAME_REQUIRED', 'El personaje necesita un nombre.');
  const id = uid('chr');
  const cols = Object.keys(f);
  run(`INSERT INTO characters (id,user_id,${cols.join(',')},created_at,updated_at) VALUES (?,?,${cols.map(() => '?').join(',')},?,?)`, id, req.user.id, ...Object.values(f), now(), now());
  res.status(201).json({ character: getCharacter(req.user.id, id) });
}));

const own = (req) => {
  const c = getCharacter(req.user.id, req.params.id);
  if (!c) throw new HttpError(404, 'NOT_FOUND', 'Personaje no encontrado.');
  return c;
};

router.get('/:id', wrap((req, res) => res.json({ character: own(req) })));

router.put('/:id', wrap((req, res) => {
  own(req);
  const f = fromBody(req.body);
  if ('name' in f && !f.name) throw new HttpError(400, 'NAME_REQUIRED', 'El nombre no puede estar vacío.');
  if (req.body.favoriteVoice !== undefined) {
    const v = req.body.favoriteVoice;
    f.favorite_voice = v && v.id ? JSON.stringify({ id: String(v.id), name: str(v.name, 100), provider: str(v.provider, 40), gender: str(v.gender, 20) }) : null;
  }
  const cols = Object.keys(f);
  if (cols.length) run(`UPDATE characters SET ${cols.map((c) => `${c}=?`).join(',')}, updated_at=? WHERE id=? AND user_id=?`, ...Object.values(f), now(), req.params.id, req.user.id);
  res.json({ character: getCharacter(req.user.id, req.params.id) });
}));

router.delete('/:id', wrap((req, res) => {
  own(req);
  const files = all('SELECT file FROM character_images WHERE character_id=?', req.params.id).map((r) => r.file);
  run('DELETE FROM characters WHERE id=? AND user_id=?', req.params.id, req.user.id);
  files.forEach(removeFileIfOrphan);
  res.json({ ok: true });
}));

// Subida de imágenes de referencia: campo "files" (varios), "slot", "source" (upload | external_ai), "label"
router.post('/:id/images', upload.array('files', 12), wrap((req, res) => {
  const cleanup = () => (req.files || []).forEach((f) => fs.rmSync(f.path, { force: true }));
  try {
    own(req);
    const slot = SLOTS.has(req.body.slot) ? req.body.slot : 'external';
    if (!req.files?.length) throw new HttpError(400, 'NO_FILE', 'Selecciona al menos una imagen.');
    if (req.files.some((f) => kindOfMime(f.mimetype) !== 'image')) throw new HttpError(415, 'NOT_IMAGE', 'Las referencias de personaje deben ser imágenes.');
    const def = OPTIONS.characterSlots.find((s) => s.id === slot);
    if (!def.multiple) { // los huecos únicos (frontal, trasera…) se reemplazan
      const old = all('SELECT id,file FROM character_images WHERE character_id=? AND slot=?', req.params.id, slot);
      old.forEach((o) => run('DELETE FROM character_images WHERE id=?', o.id));
      old.forEach((o) => removeFileIfOrphan(o.file));
    }
    const source = req.body.source === 'external_ai' || slot === 'external' ? 'external_ai' : 'upload';
    for (const f of def.multiple ? req.files : req.files.slice(0, 1)) {
      run('INSERT INTO character_images (id,character_id,user_id,slot,label,file,mime,source,created_at) VALUES (?,?,?,?,?,?,?,?,?)', uid('cim'), req.params.id, req.user.id, slot, str(req.body.label, 100), f.filename, f.mimetype, source, now());
    }
    if (!def.multiple) req.files.slice(1).forEach((f) => fs.rmSync(f.path, { force: true }));
    run('UPDATE characters SET updated_at=? WHERE id=?', now(), req.params.id);
    res.status(201).json({ character: getCharacter(req.user.id, req.params.id) });
  } catch (e) { cleanup(); throw e; }
}));

router.delete('/:id/images/:imageId', wrap((req, res) => {
  own(req);
  const img = get('SELECT * FROM character_images WHERE id=? AND character_id=?', req.params.imageId, req.params.id);
  if (!img) throw new HttpError(404, 'NOT_FOUND', 'Imagen no encontrada.');
  run('DELETE FROM character_images WHERE id=?', img.id);
  removeFileIfOrphan(img.file);
  res.json({ character: getCharacter(req.user.id, req.params.id) });
}));
