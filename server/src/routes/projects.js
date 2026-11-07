import { Router } from 'express';
import { all, get, run } from '../db.js';
import { HttpError, wrap, uid, now, str, parseJSON } from '../util.js';
import { projectDto, getProjectRow, replaceScenes, listCharacters, mergeSceneMedia, mergeProjectMedia, normalizeScene } from '../models.js';
import { buildStoryboard } from '../storyboard.js';
import { charge, grant, jobCost } from '../credits.js';
import { activeProvider } from '../providers/store.js';
import { getAsset } from '../media.js';
import { buildSrt } from '../export.js';
import { OPTIONS, STYLES } from '../catalog.js';

export const router = Router();

const MODES = ['idea', 'script', 'image', 'characters', 'prompt'];
function cleanSettings(s = {}) {
  const pick = (v, list, d) => (list.includes(v) ? v : d);
  return {
    style: pick(s.style, STYLES.map((x) => x.id), 'cinematic3d'),
    aspect: pick(s.aspect, OPTIONS.aspects.map((x) => x.id), '16:9'),
    quality: pick(s.quality, OPTIONS.qualities.map((x) => x.id), 'standard'),
    duration: Math.min(300, Math.max(3, Number(s.duration) || 30)),
    sceneCount: Math.min(20, Math.max(1, Number(s.sceneCount) || 5)),
    camera: str(s.camera, 100), lighting: str(s.lighting, 100), ambience: str(s.ambience, 100),
    music: str(s.music, 100), sfx: str(s.sfx, 100), language: str(s.language || 'español', 40),
  };
}
const own = (req) => {
  const p = getProjectRow(req.user.id, req.params.id);
  if (!p) throw new HttpError(404, 'NOT_FOUND', 'Proyecto no encontrado.');
  return p;
};
const ownedCharIds = (userId, ids) => (Array.isArray(ids) ? listCharacters(userId, ids.filter((x) => typeof x === 'string')).map((c) => c.id) : []);

router.get('/', (req, res) => {
  const rows = all('SELECT * FROM projects WHERE user_id=? ORDER BY updated_at DESC', req.user.id);
  res.json({ projects: rows.map((r) => projectDto(r, { scenes: false })) });
});

router.post('/', wrap((req, res) => {
  const b = req.body || {};
  const mode = MODES.includes(b.mode) ? b.mode : 'idea';
  const id = uid('prj');
  const title = str(b.title, 160).trim() || 'Vídeo sin título';
  const sourceAsset = b.sourceAssetId ? getAsset(req.user.id, b.sourceAssetId) : null;
  run('INSERT INTO projects (id,user_id,title,mode,brief,settings,character_ids,media,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
    id, req.user.id, title, mode, str(b.brief, 12000), JSON.stringify(cleanSettings(b.settings)), JSON.stringify(ownedCharIds(req.user.id, b.characterIds)),
    JSON.stringify(sourceAsset ? { sourceAssetId: sourceAsset.id } : {}), now(), now());
  res.status(201).json({ project: projectDto(getProjectRow(req.user.id, id)) });
}));

router.get('/:id', wrap((req, res) => res.json({ project: projectDto(own(req)) })));

// Autoguardado: título, ajustes, personajes, editor y escenas en una sola llamada (los medios generados NO se tocan).
router.put('/:id', wrap((req, res) => {
  own(req);
  const b = req.body || {};
  const sets = []; const vals = [];
  const add = (c, v) => { sets.push(`${c}=?`); vals.push(v); };
  if (b.title !== undefined) add('title', str(b.title, 160).trim() || 'Vídeo sin título');
  if (b.brief !== undefined) add('brief', str(b.brief, 12000));
  if (b.settings) add('settings', JSON.stringify(cleanSettings(b.settings)));
  if (b.characterIds) add('character_ids', JSON.stringify(ownedCharIds(req.user.id, b.characterIds)));
  if (b.editor) {
    const e = b.editor;
    add('editor', JSON.stringify({
      musicVolume: Math.min(1, Math.max(0, Number(e.musicVolume ?? 0.25))),
      subtitles: { enabled: !!e.subtitles?.enabled, position: ['bottom', 'middle', 'top'].includes(e.subtitles?.position) ? e.subtitles.position : 'bottom', size: ['small', 'medium', 'large'].includes(e.subtitles?.size) ? e.subtitles.size : 'medium' },
    }));
  }
  if (sets.length) run(`UPDATE projects SET ${sets.join(',')}, updated_at=? WHERE id=? AND user_id=?`, ...vals, now(), req.params.id, req.user.id);
  if (Array.isArray(b.scenes)) replaceScenes(req.params.id, b.scenes.slice(0, 60));
  res.json({ project: projectDto(getProjectRow(req.user.id, req.params.id)) });
}));

router.delete('/:id', wrap((req, res) => {
  own(req);
  run('DELETE FROM projects WHERE id=? AND user_id=?', req.params.id, req.user.id);
  res.json({ ok: true });
}));

// Solo los medios (tras generar o al elegir/limpiar manualmente un recurso del editor).
router.patch('/:id/media', wrap((req, res) => {
  own(req);
  const b = req.body || {};
  const check = (id) => { if (id && !getAsset(req.user.id, id)) throw new HttpError(404, 'ASSET_NOT_FOUND', 'Recurso no encontrado.'); return id || null; };
  if (b.project && 'musicAssetId' in b.project) mergeProjectMedia(req.params.id, { musicAssetId: check(b.project.musicAssetId) });
  for (const [sid, m] of Object.entries(b.scenes || {})) {
    if (!get('SELECT 1 x FROM scenes WHERE id=? AND project_id=?', sid, req.params.id)) continue;
    const patch = {};
    for (const k of ['imageAssetId', 'videoAssetId', 'sfxAssetId']) if (k in m) patch[k] = check(m[k]);
    if (m.audio) patch.audio = Object.fromEntries(Object.entries(m.audio).map(([d, a]) => [d, check(a)]));
    mergeSceneMedia(sid, patch);
  }
  res.json({ project: projectDto(getProjectRow(req.user.id, req.params.id)) });
}));

// Generar escenas (LLM si hay uno conectado; si no, segmentación local/plantilla claramente etiquetada).
router.post('/:id/storyboard', wrap(async (req, res) => {
  const row = own(req);
  const project = projectDto(row, { scenes: false });
  const b = req.body || {};
  const chars = listCharacters(req.user.id, project.characterIds);
  const usesLLM = !!activeProvider(req.user.id, 'llm');
  const cost = usesLLM ? jobCost('storyboard') : 0;
  charge(req.user.id, cost, 'Generación de escenas');
  try {
    const out = await buildStoryboard({
      userId: req.user.id, chars,
      params: { mode: project.mode, text: b.text ?? project.brief, style: project.settings.style, sceneCount: b.sceneCount ?? project.settings.sceneCount, totalDuration: b.duration ?? project.settings.duration, language: project.settings.language, ambience: project.settings.ambience },
    });
    if (project.mode === 'image' && project.media.sourceAssetId) out.scenes[0].media = {}; // la imagen se asocia abajo
    replaceScenes(project.id, out.scenes);
    if (project.mode === 'image' && project.media.sourceAssetId) mergeSceneMedia(out.scenes[0].id, { imageAssetId: project.media.sourceAssetId });
    if (out.title && /sin título/i.test(project.title)) run('UPDATE projects SET title=? WHERE id=?', str(out.title, 160), project.id);
    if (b.text !== undefined) run('UPDATE projects SET brief=? WHERE id=?', str(b.text, 12000), project.id);
    res.json({ project: projectDto(getProjectRow(req.user.id, project.id)), source: out.source, provider: out.provider || null, warning: out.warning || null });
  } catch (e) {
    grant(req.user.id, cost, 'Reembolso (escenas)');
    if (e.status) throw new HttpError(e.status, e.code || 'ERROR', e.message);
    throw new HttpError(502, 'LLM_ERROR', `El proveedor de lenguaje falló: ${e.message}`);
  }
}));

router.get('/:id/subtitles.srt', wrap((req, res) => {
  own(req);
  res.type('text/plain; charset=utf-8').set('Content-Disposition', 'attachment; filename="subtitulos.srt"').send(buildSrt(req.user.id, req.params.id));
}));
