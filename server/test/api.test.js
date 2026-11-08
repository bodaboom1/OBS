import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumio-'));
process.env.DATA_DIR = dir;
process.env.NODE_ENV = 'test';
const { app } = await import('../src/index.js');
const { ADAPTERS } = await import('../src/providers/adapters.js');
const { startWorker } = await import('../src/jobs.js');
startWorker();

let base; let server;
test.before(async () => { await new Promise((r) => { server = app.listen(0, r); }); base = `http://localhost:${server.address().port}`; });
test.after(() => { server.close(); process.exit(0); });

const api = async (m, p, body) => {
  const r = await fetch(base + p, { method: m, headers: body && !(body instanceof FormData) ? { 'content-type': 'application/json' } : {}, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined });
  return { status: r.status, json: await r.json().catch(() => null) };
};
const ff = (...a) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...a]);
const png = path.join(dir, 'a.png'); const mp4 = path.join(dir, 'a.mp4'); const mp3 = path.join(dir, 'a.mp3');
ff('-f', 'lavfi', '-i', 'color=c=red:s=320x240', '-frames:v', '1', png);
ff('-f', 'lavfi', '-i', 'testsrc=s=320x240:d=2:r=30', '-f', 'lavfi', '-i', 'sine=d=2', '-shortest', '-pix_fmt', 'yuv420p', mp4);
ff('-f', 'lavfi', '-i', 'sine=frequency=300:d=1.5', mp3);
const fileForm = (file, mime, extra = {}) => { const fd = new FormData(); for (const [k, v] of Object.entries(extra)) fd.set(k, v); fd.append('files', new Blob([fs.readFileSync(file)], { type: mime }), path.basename(file)); return fd; };
const waitJob = async (id) => { for (let i = 0; i < 60; i++) { const j = (await api('GET', '/api/jobs')).json.jobs.find((x) => x.id === id); if (['succeeded', 'failed', 'canceled'].includes(j.status)) return j; await new Promise((r) => setTimeout(r, 500)); } throw new Error('timeout'); };

let charId; let projectId; let scenes;

test('personajes: crear, subir referencias, reemplazar hueco único, rechazar SVG', async () => {
  const c = await api('POST', '/api/characters', { name: 'Don Álvaro', appearance: 'caballero con sombrero' });
  assert.equal(c.status, 201); charId = c.json.character.id;
  assert.equal((await api('POST', '/api/characters', { name: '' })).status, 400);
  let r = await api('POST', `/api/characters/${charId}/images`, fileForm(png, 'image/png', { slot: 'front' }));
  assert.equal(r.json.character.images.length, 1);
  r = await api('POST', `/api/characters/${charId}/images`, fileForm(png, 'image/png', { slot: 'front' }));
  assert.equal(r.json.character.images.length, 1, 'el hueco frontal se reemplaza');
  r = await api('POST', `/api/characters/${charId}/images`, fileForm(png, 'image/png', { slot: 'expression' }));
  r = await api('POST', `/api/characters/${charId}/images`, fileForm(png, 'image/png', { slot: 'external', source: 'external_ai' }));
  assert.equal(r.json.character.images.length, 3);
  const fd = new FormData(); fd.append('files', new Blob(['<svg onload=alert(1)/>'], { type: 'image/svg+xml' }), 'x.svg');
  assert.equal((await api('POST', `/api/characters/${charId}/images`, fd)).status, 415);
  r = await api('PUT', `/api/characters/${charId}`, { favoriteVoice: { id: 'alloy', name: 'Alloy', provider: 'openai' } });
  assert.equal(r.json.character.favoriteVoice.id, 'alloy');
});

test('proyecto desde guion sin LLM: segmentación local etiquetada', async () => {
  const p = await api('POST', '/api/projects', { title: 'Café', mode: 'script', characterIds: [charId], settings: { style: 'anime', aspect: '9:16' } });
  projectId = p.json.project.id;
  const script = `ESCENA 1: Entrada\nDon Álvaro entra en la cafetería.\nDon Álvaro: Buenos días, un café.\n\nESCENA 2: El precio\nEl camarero sonríe.\nCAMARERO: Son 8 euros.\nDon Álvaro: ¡¿Ocho euros?!`;
  const r = await api('POST', `/api/projects/${projectId}/storyboard`, { text: script });
  assert.equal(r.status, 200); assert.equal(r.json.source, 'script-parse');
  scenes = r.json.project.scenes;
  assert.equal(scenes.length, 2);
  assert.equal(scenes[0].dialogues[0].characterId, charId);
  assert.equal(scenes[1].dialogues.length, 2);
});

test('sin proveedor no se simula: 409 PROVIDER_NOT_CONFIGURED y sin cobro', async () => {
  const before = (await api('GET', '/api/credits')).json.balance;
  const r = await api('POST', '/api/jobs', { kind: 'image', projectId, sceneId: scenes[0].id });
  assert.equal(r.status, 409); assert.equal(r.json.error.code, 'PROVIDER_NOT_CONFIGURED');
  assert.equal((await api('GET', '/api/credits')).json.balance, before);
});

test('claves: se guardan cifradas y nunca se devuelven', async () => {
  const r = await api('PUT', '/api/providers/openai', { apiKey: 'sk-secret-ABCD1234' });
  const txt = JSON.stringify(r.json);
  assert.ok(!txt.includes('sk-secret'));
  assert.equal(r.json.providers.find((p) => p.id === 'openai').fields[0].hint, '••••1234');
  assert.ok(!fs.readFileSync(path.join(dir, 'lumio.db')).includes('sk-secret-ABCD1234'));
  await api('DELETE', '/api/providers/openai');
  assert.equal((await api('GET', '/api/bootstrap')).json.providers.find((p) => p.id === 'openai').configured, false);
});

test('pipeline de trabajos con proveedor de prueba: cobra, adjunta a la escena y reembolsa si falla', async () => {
  let fail = false;
  ADAPTERS.mock = { id: 'mock', name: 'Mock', categories: ['image'], fields: [{ key: 'apiKey', secret: true }], handlers: { image: { async start(cfg, req) {
    if (fail) throw new Error('boom');
    assert.ok(req.references.length >= 1, 'recibe referencias del personaje');
    assert.match(req.prompt, /Don Álvaro/); assert.match(req.prompt, /anime/i);
    return { status: 'done', files: [{ buffer: fs.readFileSync(png), mime: 'image/png' }] };
  } } } };
  await api('PUT', '/api/providers/mock', { apiKey: 'x' }).catch(() => {});
  const { saveConfig } = await import('../src/providers/store.js'); saveConfig('usr_local', 'mock', { apiKey: 'k' });
  const b0 = (await api('GET', '/api/credits')).json.balance;
  let r = await api('POST', '/api/jobs', { kind: 'image', projectId, sceneId: scenes[0].id, quality: 'high' });
  assert.equal(r.status, 202);
  const j = await waitJob(r.json.job.id);
  assert.equal(j.status, 'succeeded');
  assert.equal((await api('GET', '/api/credits')).json.balance, b0 - 4);
  const p = (await api('GET', `/api/projects/${projectId}`)).json.project;
  assert.ok(p.scenes[0].media.imageAssetId);
  fail = true;
  r = await api('POST', '/api/jobs', { kind: 'image', projectId, sceneId: scenes[1].id });
  const j2 = await waitJob(r.json.job.id);
  assert.equal(j2.status, 'failed');
  assert.equal((await api('GET', '/api/credits')).json.balance, b0 - 4, 'reembolso tras fallo');
});

test('autoguardado conserva medios; exportación real con ffmpeg (vídeo + imagen + voz + música + subtítulos)', async () => {
  let p = (await api('GET', `/api/projects/${projectId}`)).json.project;
  const keepImg = p.scenes[0].media.imageAssetId;
  const sc = p.scenes.map((s) => ({ ...s, duration: 3 }));
  p = (await api('PUT', `/api/projects/${projectId}`, { scenes: sc, editor: { subtitles: { enabled: true }, musicVolume: 0.3 } })).json.project;
  assert.equal(p.scenes[0].media.imageAssetId, keepImg, 'el autoguardado no pisa medios');
  const vid = (await api('POST', '/api/assets', fileForm(mp4, 'video/mp4'))).json.assets[0];
  const aud = (await api('POST', '/api/assets', fileForm(mp3, 'audio/mpeg'))).json.assets[0];
  assert.ok(vid.meta.duration > 1.5 && aud.meta.duration > 1);
  const d0 = p.scenes[0].dialogues[0].id;
  await api('PATCH', `/api/projects/${projectId}/media`, { project: { musicAssetId: aud.id }, scenes: { [p.scenes[0].id]: { audio: { [d0]: aud.id } }, [p.scenes[1].id]: { videoAssetId: vid.id } } });
  const r = await api('POST', '/api/jobs', { kind: 'export', projectId });
  const j = await waitJob(r.json.job.id);
  assert.equal(j.status, 'succeeded', j.error);
  assert.equal(j.output.asset.kind, 'video'); assert.ok(j.output.asset.meta.duration > 4);
  assert.equal(j.output.asset.meta.width, 810); // 1080*0.75 vertical
  const srt = await fetch(`${base}/api/projects/${projectId}/subtitles.srt`).then((x) => x.text());
  assert.match(srt, /-->/);
});

test('exportar con escena sin medios falla con mensaje claro', async () => {
  const p = (await api('POST', '/api/projects', { title: 'vacío' })).json.project;
  await api('PUT', `/api/projects/${p.id}`, { scenes: [{ title: 'x', visual: 'y' }] });
  const j = await waitJob((await api('POST', '/api/jobs', { kind: 'export', projectId: p.id })).json.job.id);
  assert.equal(j.status, 'failed'); assert.match(j.error, /no tiene imagen ni vídeo/);
});

test('referencia a vídeo: @menciones, aspecto adaptativo, modelo elegido y Enhance sin LLM', async () => {
  let seen;
  ADAPTERS.mockv = { id: 'mockv', name: 'MockV', categories: ['video'], fields: [{ key: 'apiKey', secret: true }], handlers: { video: { async start(cfg, req) { seen = req; return { status: 'done', files: [{ buffer: fs.readFileSync(mp4), mime: 'video/mp4' }] }; } } } };
  const { saveConfig } = await import('../src/providers/store.js'); saveConfig('usr_local', 'mockv', { apiKey: 'k' });
  const a1 = (await api('POST', '/api/assets', fileForm(png, 'image/png'))).json.assets[0];
  assert.ok(a1.meta.width > 0, 'las imágenes guardan dimensiones');
  const r = await api('POST', '/api/jobs', { kind: 'video', prompt: 'El @producto gira mientras @DonÁlvaro lo mira', refs: [{ assetId: a1.id, alias: 'producto' }], characterIds: [charId], aspect: 'adaptive', model: 'mi/modelo', duration: 8 });
  assert.equal(r.status, 202);
  const j = await waitJob(r.json.job.id);
  assert.equal(j.status, 'succeeded', j.error);
  assert.match(seen.prompt, /reference image 1/); assert.doesNotMatch(seen.prompt, /@producto/);
  assert.equal(seen.model, 'mi/modelo'); assert.equal(seen.aspect, '1:1'); assert.equal(seen.duration, 8);
  assert.ok(seen.references.length >= 2 && seen.startImage);
  assert.equal(j.output.asset.kind, 'video');
  const e = await api('POST', '/api/prompt/enhance', { prompt: 'algo' });
  assert.equal(e.status, 409); assert.equal(e.json.error.code, 'PROVIDER_NOT_CONFIGURED');
});
