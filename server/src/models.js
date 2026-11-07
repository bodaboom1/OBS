import { all, get, run, tx } from './db.js';
import { parseJSON, now, uid } from './util.js';

export const imageDto = (i) => ({ id: i.id, slot: i.slot, label: i.label, url: `/files/${i.file}`, file: i.file, mime: i.mime, source: i.source });

export function characterDto(c, images) {
  return {
    id: c.id, name: c.name, description: c.description, personality: c.personality, appearance: c.appearance,
    voiceType: c.voice_type, apparentAge: c.apparent_age, specialFeatures: c.special_features, visualStyle: c.visual_style,
    favoriteVoice: parseJSON(c.favorite_voice, null), createdAt: c.created_at, updatedAt: c.updated_at,
    images: (images || all('SELECT * FROM character_images WHERE character_id=? ORDER BY created_at', c.id)).map(imageDto),
  };
}
export function listCharacters(userId, ids) {
  const rows = ids ? (ids.length ? all(`SELECT * FROM characters WHERE user_id=? AND id IN (${ids.map(() => '?').join(',')})`, userId, ...ids) : [])
    : all('SELECT * FROM characters WHERE user_id=? ORDER BY updated_at DESC', userId);
  const imgs = rows.length ? all(`SELECT * FROM character_images WHERE character_id IN (${rows.map(() => '?').join(',')}) ORDER BY created_at`, ...rows.map((r) => r.id)) : [];
  return rows.map((c) => characterDto(c, imgs.filter((i) => i.character_id === c.id)));
}
export const getCharacter = (userId, id) => listCharacters(userId, [id])[0] || null;

export function sceneDto(s) {
  return { id: s.id, ...parseJSON(s.data, {}), media: parseJSON(s.media, {}) };
}
export function projectDto(p, { scenes = true } = {}) {
  const dto = {
    id: p.id, title: p.title, mode: p.mode, status: p.status, brief: p.brief, settings: parseJSON(p.settings, {}),
    characterIds: parseJSON(p.character_ids, []), editor: parseJSON(p.editor, {}), media: parseJSON(p.media, {}),
    createdAt: p.created_at, updatedAt: p.updated_at,
  };
  const rows = all('SELECT * FROM scenes WHERE project_id=? ORDER BY position', p.id);
  dto.sceneCount = rows.length;
  if (scenes) dto.scenes = rows.map(sceneDto);
  else dto.thumbnailSceneMedia = rows.map((r) => parseJSON(r.media, {})).find((m) => m.imageAssetId)?.imageAssetId || null;
  return dto;
}
export const getProjectRow = (userId, id) => get('SELECT * FROM projects WHERE id=? AND user_id=?', id, userId);

/** Fusiona medios generados en una escena (propiedad del servidor: el autoguardado del cliente no los pisa). */
export function mergeSceneMedia(sceneId, patch) {
  const r = get('SELECT media FROM scenes WHERE id=?', sceneId);
  if (!r) return;
  const cur = parseJSON(r.media, {});
  const next = { ...cur, ...patch };
  if (patch.audio) next.audio = { ...(cur.audio || {}), ...patch.audio };
  for (const k of Object.keys(next)) if (next[k] === null) delete next[k];
  for (const k of Object.keys(next.audio || {})) if (next.audio[k] === null) delete next.audio[k];
  run('UPDATE scenes SET media=? WHERE id=?', JSON.stringify(next), sceneId);
}
export function mergeProjectMedia(projectId, patch) {
  const r = get('SELECT media FROM projects WHERE id=?', projectId);
  if (!r) return;
  const next = { ...parseJSON(r.media, {}), ...patch };
  for (const k of Object.keys(next)) if (next[k] === null) delete next[k];
  run('UPDATE projects SET media=?, updated_at=? WHERE id=?', JSON.stringify(next), now(), projectId);
}

const SCENE_FIELDS = ['title', 'visual', 'characters', 'dialogues', 'expressions', 'movements', 'camera', 'sounds', 'duration', 'trimIn', 'trimOut', 'sfxVolume'];
export function normalizeScene(raw = {}) {
  const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
  const out = {};
  for (const k of SCENE_FIELDS) if (raw[k] !== undefined) out[k] = raw[k];
  out.title = String(out.title || '').slice(0, 200);
  out.visual = String(out.visual || '').slice(0, 4000);
  out.expressions = String(out.expressions || '').slice(0, 1000);
  out.movements = String(out.movements || '').slice(0, 1000);
  out.camera = String(out.camera || '').slice(0, 200);
  out.sounds = String(out.sounds || '').slice(0, 1000);
  out.duration = Math.min(60, Math.max(1, num(out.duration, 5)));
  out.trimIn = Math.max(0, num(out.trimIn, 0));
  out.trimOut = out.trimOut == null || out.trimOut === '' ? null : Math.max(0, num(out.trimOut, 0));
  out.sfxVolume = Math.min(1, Math.max(0, num(out.sfxVolume, 0.8)));
  out.characters = Array.isArray(out.characters) ? out.characters.filter((x) => typeof x === 'string').slice(0, 12) : [];
  out.dialogues = (Array.isArray(out.dialogues) ? out.dialogues : []).slice(0, 40).map((d) => ({
    id: String(d.id || uid('dlg')), characterId: d.characterId || null, speaker: String(d.speaker || '').slice(0, 100),
    text: String(d.text || '').slice(0, 2000), emotion: String(d.emotion || 'Neutra').slice(0, 40),
  }));
  return out;
}

/** Reemplaza las escenas de un proyecto conservando los medios de las que ya existían. */
export function replaceScenes(projectId, scenes, { resetMedia = false } = {}) {
  tx(() => {
    const old = new Map(all('SELECT id, media FROM scenes WHERE project_id=?', projectId).map((r) => [r.id, r.media]));
    const keep = new Set();
    scenes.forEach((raw, i) => {
      const id = typeof raw.id === 'string' && raw.id ? raw.id : uid('sc');
      keep.add(id);
      const data = JSON.stringify(normalizeScene(raw));
      if (old.has(id)) run('UPDATE scenes SET position=?, data=? WHERE id=?', i, data, id);
      else run('INSERT INTO scenes (id,project_id,position,data,media) VALUES (?,?,?,?,?)', id, projectId, i, data, '{}');
    });
    for (const id of old.keys()) if (!keep.has(id)) run('DELETE FROM scenes WHERE id=?', id);
    run('UPDATE projects SET updated_at=? WHERE id=?', now(), projectId);
  });
}
