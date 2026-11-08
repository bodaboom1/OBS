import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import multer from 'multer';
import { UPLOAD_DIR } from './config.js';
import { all, get, run } from './db.js';
import { HttpError, uid, now, parseJSON } from './util.js';

const execFileP = promisify(execFile);

export const MIME_EXT = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif',
  'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
  'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'audio/aac': 'aac', 'audio/webm': 'webm',
};
export const EXT_MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4', aac: 'audio/aac' };
// SVG y HTML se rechazan a propósito: servidos desde el mismo origen serían un vector de XSS.
export const kindOfMime = (m = '') => (m.startsWith('image/') ? 'image' : m.startsWith('video/') ? 'video' : m.startsWith('audio/') ? 'audio' : null);

export const uploadPath = (file) => path.join(UPLOAD_DIR, path.basename(file));

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (_req, file, cb) => cb(null, `${uid('up')}.${MIME_EXT[file.mimetype] || 'bin'}`),
});
export const upload = multer({
  storage,
  limits: { fileSize: 300 * 1024 * 1024, files: 20 },
  fileFilter: (_req, file, cb) => {
    if (MIME_EXT[file.mimetype]) return cb(null, true);
    cb(new HttpError(415, 'UNSUPPORTED_TYPE', `Tipo de archivo no admitido: ${file.mimetype}. Usa PNG, JPG, WebP, GIF, MP4, WebM, MP3 o WAV.`));
  },
});

export async function probe(file) {
  try {
    const { stdout } = await execFileP('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', uploadPath(file)], { timeout: 30000 });
    const j = JSON.parse(stdout);
    const v = j.streams?.find((s) => s.codec_type === 'video');
    return {
      duration: j.format?.duration ? Number(Number(j.format.duration).toFixed(2)) : null,
      hasAudio: !!j.streams?.some((s) => s.codec_type === 'audio'),
      hasVideo: !!v, width: v?.width || null, height: v?.height || null,
    };
  } catch {
    return {};
  }
}

export async function createAsset({ userId, kind, file, mime, name = '', source = 'upload', provider = null, meta = {}, projectId = null, sceneId = null }) {
  const size = fs.statSync(uploadPath(file)).size;
  Object.assign(meta, await probe(file));
  const id = uid('ast');
  run('INSERT INTO assets (id,user_id,kind,name,file,mime,size,source,provider,meta,project_id,scene_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
    id, userId, kind, name, file, mime, size, source, provider, JSON.stringify(meta), projectId, sceneId, now());
  return assetDto(get('SELECT * FROM assets WHERE id=?', id));
}

export function saveBuffer(buffer, ext) {
  const file = `${uid('gen')}.${ext}`;
  fs.writeFileSync(uploadPath(file), buffer);
  return file;
}

export const assetDto = (a) => a && ({
  id: a.id, kind: a.kind, name: a.name, url: `/files/${a.file}`, mime: a.mime, size: a.size, source: a.source,
  provider: a.provider, meta: parseJSON(a.meta, {}), projectId: a.project_id, sceneId: a.scene_id, createdAt: a.created_at,
});

export const getAsset = (userId, id) => (id ? get('SELECT * FROM assets WHERE id=? AND user_id=?', id, userId) : null);
export const listAssets = (userId, kind) =>
  all(`SELECT * FROM assets WHERE user_id=? ${kind ? 'AND kind=?' : ''} ORDER BY created_at DESC LIMIT 500`, ...(kind ? [userId, kind] : [userId])).map(assetDto);

/** Borra el archivo físico solo si nadie más lo referencia. */
export function removeFileIfOrphan(file) {
  const used = get('SELECT 1 x FROM assets WHERE file=? UNION SELECT 1 FROM character_images WHERE file=?', file, file);
  if (!used) fs.rmSync(uploadPath(file), { force: true });
}

import { execFileSync } from 'node:child_process';
export function imageAspect(file) {
  try {
    const o = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', uploadPath(file)], { timeout: 15000 }).toString().trim().split(',').map(Number);
    const r = o[0] / o[1];
    return r > 1.2 ? '16:9' : r < 0.83 ? '9:16' : '1:1';
  } catch { return '16:9'; }
}

export function toDataUri(file, mime) {
  return `data:${mime || EXT_MIME[path.extname(file).slice(1)] || 'application/octet-stream'};base64,${fs.readFileSync(uploadPath(file)).toString('base64')}`;
}
