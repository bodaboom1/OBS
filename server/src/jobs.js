import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { all, get, run } from './db.js';
import { HttpError, uid, now, parseJSON } from './util.js';
import { ADAPTERS } from './providers/adapters.js';
import { activeProvider, loadConfig } from './providers/store.js';
import { charge, grant, jobCost } from './credits.js';
import { createAsset, saveBuffer, uploadPath, getAsset, assetDto, EXT_MIME, MIME_EXT } from './media.js';
import { getProjectRow, projectDto, listCharacters, mergeSceneMedia, mergeProjectMedia, sceneDto } from './models.js';
import { scenePrompt, pickReferences, styleById } from './prompts.js';
import { exportProject } from './export.js';

const execFileP = promisify(execFile);
const KINDS = ['image', 'video', 'voice', 'music', 'sfx', 'lipsync', 'export'];

export const jobDto = (j) => {
  const input = parseJSON(j.input, {}); const output = parseJSON(j.output, {});
  return {
    id: j.id, kind: j.kind, provider: j.provider, status: j.status, progress: j.progress, error: j.error, cost: j.cost,
    projectId: j.project_id, sceneId: j.scene_id, createdAt: j.created_at, updatedAt: j.updated_at,
    summary: input.summary || '', output: { ...output, asset: output.assetId ? assetDto(get('SELECT * FROM assets WHERE id=?', output.assetId)) : null },
  };
};

/** Crea el trabajo, valida proveedor y créditos. No simula nada: sin proveedor => 409 PROVIDER_NOT_CONFIGURED. */
export function enqueueJob(userId, kind, params = {}) {
  if (!KINDS.includes(kind)) throw new HttpError(400, 'BAD_KIND', 'Tipo de generación no válido.');
  let provider = null;
  if (kind !== 'export') {
    provider = activeProvider(userId, kind);
    if (!provider) throw new HttpError(409, 'PROVIDER_NOT_CONFIGURED', `Necesitas conectar un proveedor de “${kind}” en Configuración → Proveedores para generar esto.`, { category: kind });
  }
  const input = buildInput(userId, kind, params);
  const id = uid('job');
  const cost = jobCost(kind, { quality: input.quality });
  charge(userId, cost, `Generación ${kind}`, id);
  run('INSERT INTO jobs (id,user_id,project_id,scene_id,kind,provider,status,input,cost,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    id, userId, input.projectId || null, input.sceneId || null, kind, provider?.id || 'local', 'queued', JSON.stringify(input), cost, now(), now());
  setImmediate(tick);
  return jobDto(get('SELECT * FROM jobs WHERE id=?', id));
}

/** Resuelve prompts, referencias y parámetros a partir del proyecto/escena (consistencia de personajes incluida). */
function buildInput(userId, kind, p) {
  const input = { kind, quality: p.quality || 'standard', projectId: p.projectId || null, sceneId: p.sceneId || null };
  const prow = p.projectId ? getProjectRow(userId, p.projectId) : null;
  if (p.projectId && !prow) throw new HttpError(404, 'NOT_FOUND', 'Proyecto no encontrado.');
  const project = prow ? projectDto(prow) : null;
  const scene = project && p.sceneId ? project.scenes.find((s) => s.id === p.sceneId) : null;
  if (p.sceneId && !scene) throw new HttpError(404, 'NOT_FOUND', 'Escena no encontrada.');
  if (project) input.quality = p.quality || project.settings.quality || 'standard';

  if (kind === 'image' || kind === 'video') {
    let chars = [];
    if (scene) chars = listCharacters(userId, scene.characters?.length ? scene.characters : project.characterIds);
    else if (p.characterIds?.length) chars = listCharacters(userId, p.characterIds);
    const base = project && scene ? scenePrompt({ project, scene, chars, purpose: kind }) : [styleById(p.style).prompt, p.prompt].filter(Boolean).join('. ');
    input.prompt = (p.prompt && scene ? `${p.prompt}\n` : '') + base;
    if (!(p.prompt || scene?.visual)) throw new HttpError(400, 'EMPTY_PROMPT', 'Describe la escena antes de generar.');
    input.aspect = project?.settings.aspect || p.aspect || '16:9';
    input.references = kind === 'image' ? pickReferences(chars, 6).map((i) => ({ file: i.file, mime: i.mime })) : [];
    input.duration = scene?.duration || p.duration || 5;
    if (kind === 'video') input.startAssetId = scene?.media?.imageAssetId || p.assetId || null;
    input.summary = (scene ? `Escena: ${scene.title || ''}` : p.prompt || '').slice(0, 140);
  } else if (kind === 'voice') {
    let text = p.text; let emotion = p.emotion; let charId = p.characterId;
    if (scene && p.dialogueId) {
      const d = scene.dialogues.find((x) => x.id === p.dialogueId);
      if (!d) throw new HttpError(404, 'NOT_FOUND', 'Diálogo no encontrado.');
      text = d.text; emotion = p.emotion || d.emotion; charId = d.characterId;
      input.dialogueId = d.id;
    }
    if (!String(text || '').trim()) throw new HttpError(400, 'EMPTY_TEXT', 'No hay texto que locutar.');
    let voice = p.voice;
    if (!voice && charId) voice = listCharacters(userId, [charId])[0]?.favoriteVoice;
    if (!voice?.id) throw new HttpError(400, 'NO_VOICE', 'Elige una voz (o guarda una voz favorita en el personaje).');
    Object.assign(input, { text: String(text).slice(0, 4000), emotion: emotion || 'Neutra', voiceId: voice.id, voiceProvider: voice.provider, speed: Number(p.speed) || 1, pitch: Number(p.pitch) || 0, language: p.language || 'español' });
    input.summary = `“${input.text.slice(0, 80)}”`;
  } else if (kind === 'music' || kind === 'sfx') {
    input.prompt = String(p.prompt || (scene ? scene.sounds : '') || '').trim();
    if (!input.prompt) throw new HttpError(400, 'EMPTY_PROMPT', 'Describe el sonido o la música que quieres.');
    input.duration = Number(p.duration) || (kind === 'music' ? 30 : scene?.duration || 4);
    input.summary = input.prompt.slice(0, 120);
  } else if (kind === 'lipsync') {
    if (!scene?.media?.videoAssetId) throw new HttpError(400, 'NEEDS_VIDEO', 'Primero genera o sube el vídeo de la escena.');
    const dl = scene.dialogues.find((d) => scene.media.audio?.[d.id]);
    if (!dl) throw new HttpError(400, 'NEEDS_AUDIO', 'Primero genera la voz de un diálogo de la escena.');
    input.videoAssetId = scene.media.videoAssetId; input.audioAssetId = scene.media.audio[dl.id];
    input.summary = `Sincronía labial · ${scene.title || ''}`;
  } else if (kind === 'export') {
    if (!project) throw new HttpError(400, 'NO_PROJECT', 'Falta el proyecto.');
    input.summary = `Exportar “${project.title}”`;
  }
  return input;
}

// ---------- ejecución ----------
const inflight = new Set();
const MAX_CONCURRENT = 3;
let timer = null;

const patchJob = (id, f) => {
  const sets = Object.keys(f).map((k) => `${k}=?`).join(',');
  run(`UPDATE jobs SET ${sets}, updated_at=? WHERE id=?`, ...Object.values(f), now(), id);
};

async function loadRequest(job, input) {
  const req = { ...input };
  const readRef = (file, mime) => ({ buffer: fs.readFileSync(uploadPath(file)), mime: mime || EXT_MIME[path.extname(file).slice(1)] || 'image/png' });
  if (input.references?.length) req.references = input.references.map((r) => readRef(r.file, r.mime));
  if (job.kind === 'video' && input.startAssetId) {
    const a = getAsset(job.user_id, input.startAssetId);
    if (a) req.startImage = readRef(a.file, a.mime);
  }
  if (job.kind === 'lipsync') {
    const v = getAsset(job.user_id, input.videoAssetId); const a = getAsset(job.user_id, input.audioAssetId);
    req.video = readRef(v.file, v.mime); req.audio = readRef(a.file, a.mime);
  }
  return req;
}

async function finish(job, input, res) {
  const kindMap = { image: 'image', video: 'video', lipsync: 'video', voice: 'audio', music: 'audio', sfx: 'audio' };
  const assetKind = kindMap[job.kind];
  let firstId = null;
  for (const f of res.files) {
    let buffer = f.buffer; const mime = f.mime || { image: 'image/png', video: 'video/mp4', audio: 'audio/mpeg' }[assetKind];
    const ext = MIME_EXT[mime] || { image: 'png', video: 'mp4', audio: 'mp3' }[assetKind];
    let file = saveBuffer(buffer, ext);
    if (job.kind === 'voice' && input.pitch) file = await shiftPitch(file, input.pitch);
    const asset = await createAsset({
      userId: job.user_id, kind: assetKind, file, mime: EXT_MIME[path.extname(file).slice(1)] || mime,
      name: (input.summary || job.kind).slice(0, 100), source: 'generated', provider: job.provider,
      meta: { jobId: job.id, prompt: input.prompt || input.text || null, voiceId: input.voiceId || null }, projectId: job.project_id, sceneId: job.scene_id,
    });
    firstId ||= asset.id;
  }
  const sid = job.scene_id;
  if (sid) {
    if (job.kind === 'image') mergeSceneMedia(sid, { imageAssetId: firstId });
    else if (job.kind === 'video') mergeSceneMedia(sid, { videoAssetId: firstId });
    else if (job.kind === 'lipsync') mergeSceneMedia(sid, { rawVideoAssetId: input.videoAssetId, videoAssetId: firstId });
    else if (job.kind === 'sfx') mergeSceneMedia(sid, { sfxAssetId: firstId });
    else if (job.kind === 'voice' && input.dialogueId) mergeSceneMedia(sid, { audio: { [input.dialogueId]: firstId } });
  }
  if (job.kind === 'music' && job.project_id) mergeProjectMedia(job.project_id, { musicAssetId: firstId });
  patchJob(job.id, { status: 'succeeded', progress: 100, output: JSON.stringify({ assetId: firstId }), state: '{}' });
}

async function shiftPitch(file, semitones) {
  const f = 2 ** (semitones / 12);
  const out = `${uid('gen')}.mp3`;
  try {
    await execFileP('ffmpeg', ['-y', '-i', uploadPath(file), '-af', `asetrate=44100*${f},aresample=44100,atempo=${1 / f}`, uploadPath(out)], { timeout: 60000 });
    fs.rmSync(uploadPath(file), { force: true });
    return out;
  } catch { return file; }
}

function fail(job, err) {
  const cur = get('SELECT status FROM jobs WHERE id=?', job.id);
  if (!cur || cur.status === 'canceled') return;
  console.error(`[job ${job.id}] ${job.kind} falló:`, err.message);
  patchJob(job.id, { status: 'failed', error: String(err.message || err).slice(0, 800) });
  if (job.cost) grant(job.user_id, job.cost, `Reembolso (${job.kind} fallido)`, job.id);
}

async function processJob(job) {
  const input = parseJSON(job.input, {});
  const state = parseJSON(job.state, {});
  try {
    if (job.kind === 'export') {
      patchJob(job.id, { status: 'running' });
      const out = await exportProject(job.user_id, job.project_id, (p) => patchJob(job.id, { progress: Math.round(p) }));
      patchJob(job.id, { status: 'succeeded', progress: 100, output: JSON.stringify(out) });
      return;
    }
    const adapter = ADAPTERS[job.provider];
    const cfg = loadConfig(job.user_id, job.provider);
    if (!adapter || !cfg?.apiKey) throw new Error('El proveedor ya no está configurado.');
    const handler = adapter.handlers[job.kind];
    let res;
    if (state.pending) res = await handler.poll(cfg, state.pending);
    else { patchJob(job.id, { status: 'running', progress: 5 }); res = await handler.start(cfg, await loadRequest(job, input)); }
    if (get('SELECT status FROM jobs WHERE id=?', job.id)?.status === 'canceled') return;
    if (res.status === 'pending') patchJob(job.id, { status: 'running', progress: res.progress || 10, state: JSON.stringify({ pending: res.state, polledAt: Date.now() }) });
    else await finish(job, input, res);
  } catch (e) { fail(job, e); }
}

export function tick() {
  const jobs = all(`SELECT * FROM jobs WHERE status IN ('queued','running') ORDER BY created_at LIMIT 50`);
  for (const job of jobs) {
    if (inflight.size >= MAX_CONCURRENT) break;
    if (inflight.has(job.id)) continue;
    const st = parseJSON(job.state, {});
    if (job.status === 'running' && !st.pending) continue;
    if (job.status === 'running' && st.pending && Date.now() - (st.polledAt || 0) < 3000) continue;
    inflight.add(job.id);
    processJob(job).finally(() => inflight.delete(job.id));
  }
}
export function startWorker() {
  // Tras un reinicio, los trabajos “running” sin estado externo se reencolan (sus créditos ya estaban cobrados).
  run(`UPDATE jobs SET status='queued' WHERE status='running' AND state NOT LIKE '%pending%'`);
  timer ||= setInterval(tick, 2000);
  tick();
}

export function cancelJob(userId, id) {
  const j = get('SELECT * FROM jobs WHERE id=? AND user_id=?', id, userId);
  if (!j) throw new HttpError(404, 'NOT_FOUND', 'Trabajo no encontrado.');
  if (!['queued', 'running'].includes(j.status)) return jobDto(j);
  patchJob(id, { status: 'canceled', error: 'Cancelado por el usuario' });
  if (j.cost) grant(userId, j.cost, 'Reembolso (cancelado)', id);
  return jobDto(get('SELECT * FROM jobs WHERE id=?', id));
}
