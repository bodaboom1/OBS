// Adaptadores de proveedores reales. Cada uno declara qué categorías ofrece y cómo se llama a su API.
// Contrato de un handler:  start(cfg, req) -> { status:'done', files:[{buffer|url, mime}] } | { status:'pending', state }
//                          poll(cfg, state) -> igual que start (solo si puede devolver 'pending')
// cfg = { apiKey, ...camposNoSecretos, models:{ [categoría]: modeloId } }
// IMPORTANTE: ninguna clave sale del backend. Si no hay clave, el sistema NO simula resultados.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function http(url, opts = {}, { raw = false, label = 'API' } = {}) {
  const r = await fetch(url, { signal: AbortSignal.timeout(opts.timeout || 120000), ...opts });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    const err = new Error(`${label} respondió ${r.status}: ${t.slice(0, 400)}`);
    err.status = r.status;
    throw err;
  }
  return raw ? r : r.json();
}
const bufOf = async (r) => Buffer.from(await r.arrayBuffer());
async function download(url) {
  const r = await http(url, {}, { raw: true, label: 'Descarga' });
  return { buffer: await bufOf(r), mime: r.headers.get('content-type')?.split(';')[0] || undefined };
}
import { spawnSync } from 'node:child_process';
/** Recorta/escala una imagen a w×h exactos (Sora exige que la referencia coincida con la resolución). */
function fitImage(buffer, w, h) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', 'pipe:0', '-vf', `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}`, '-frames:v', '1', '-f', 'image2', '-c:v', 'mjpeg', 'pipe:1'], { input: buffer, maxBuffer: 3e7 });
  if (r.status !== 0 || !r.stdout.length) throw new Error('No se pudo preparar la imagen de referencia (¿ffmpeg instalado?)');
  return r.stdout;
}
const dataUri = (ref) => `data:${ref.mime};base64,${ref.buffer.toString('base64')}`;

// ---------- Anthropic (LLM) ----------
const anthropic = {
  id: 'anthropic', name: 'Anthropic Claude', categories: ['llm'], docs: 'https://docs.anthropic.com',
  description: 'Guiones y división en escenas. Modelo por defecto editable.',
  fields: [{ key: 'apiKey', label: 'API key', secret: true, placeholder: 'sk-ant-…' }],
  defaultModels: { llm: 'claude-sonnet-5-5' },
  async test(cfg) { await this.chat(cfg, { system: 'Responde solo OK', user: 'ping', maxTokens: 8 }); },
  async chat(cfg, { system, user, maxTokens = 4096 }) {
    const j = await http('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': cfg.apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: cfg.models?.llm || this.defaultModels.llm, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] }),
    }, { label: 'Anthropic' });
    return j.content?.map((c) => c.text || '').join('') || '';
  },
  handlers: {},
};

// ---------- OpenAI (LLM + imagen + voz) ----------
const OPENAI_VOICES = [
  ['alloy', 'Alloy', 'neutral'], ['ash', 'Ash', 'male'], ['ballad', 'Ballad', 'male'], ['coral', 'Coral', 'female'], ['echo', 'Echo', 'male'],
  ['fable', 'Fable', 'male'], ['nova', 'Nova', 'female'], ['onyx', 'Onyx', 'male'], ['sage', 'Sage', 'female'], ['shimmer', 'Shimmer', 'female'], ['verse', 'Verse', 'male'],
].map(([id, name, gender]) => ({ id, name, gender, provider: 'openai' }));

const openai = {
  id: 'openai', name: 'OpenAI', categories: ['llm', 'image', 'voice', 'video'], docs: 'https://platform.openai.com/docs',
  modelOptions: { video: ['sora-2', 'sora-2-pro'], image: ['gpt-image-1'] },
  description: 'LLM (guiones), imágenes con referencias (gpt-image-1) y voces (TTS).',
  fields: [{ key: 'apiKey', label: 'API key', secret: true, placeholder: 'sk-…' }],
  defaultModels: { llm: 'gpt-4o', image: 'gpt-image-1', voice: 'gpt-4o-mini-tts', video: 'sora-2' },
  auth: (cfg) => ({ Authorization: `Bearer ${cfg.apiKey}` }),
  async test(cfg) { await http('https://api.openai.com/v1/models', { headers: this.auth(cfg), timeout: 20000 }, { label: 'OpenAI' }); },
  async chat(cfg, { system, user, maxTokens = 4096 }) {
    const j = await http('https://api.openai.com/v1/chat/completions', {
      method: 'POST', headers: { ...this.auth(cfg), 'content-type': 'application/json' },
      body: JSON.stringify({ model: cfg.models?.llm || this.defaultModels.llm, max_tokens: maxTokens, response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
    }, { label: 'OpenAI' });
    return j.choices?.[0]?.message?.content || '';
  },
  async listVoices() { return OPENAI_VOICES; },
  handlers: {
    image: {
      async start(cfg, req) {
        const model = req.model || cfg.models?.image || 'gpt-image-1';
        const size = req.aspect === '16:9' ? '1536x1024' : req.aspect === '9:16' ? '1024x1536' : '1024x1024';
        const quality = req.quality === 'high' ? 'high' : req.quality === 'draft' ? 'low' : 'medium';
        const A = openai.auth(cfg);
        let j;
        if (req.references?.length) {
          const fd = new FormData();
          fd.set('model', model); fd.set('prompt', req.prompt); fd.set('size', size); fd.set('quality', quality);
          for (const ref of req.references.slice(0, 8)) fd.append('image[]', new Blob([ref.buffer], { type: ref.mime }), `ref.${ref.mime.split('/')[1] || 'png'}`);
          j = await http('https://api.openai.com/v1/images/edits', { method: 'POST', headers: A, body: fd, timeout: 300000 }, { label: 'OpenAI Images' });
        } else {
          j = await http('https://api.openai.com/v1/images/generations', {
            method: 'POST', headers: { ...A, 'content-type': 'application/json' }, timeout: 300000,
            body: JSON.stringify({ model, prompt: req.prompt, size, quality, n: 1 }),
          }, { label: 'OpenAI Images' });
        }
        const d = j.data?.[0];
        if (d?.b64_json) return { status: 'done', files: [{ buffer: Buffer.from(d.b64_json, 'base64'), mime: 'image/png' }] };
        if (d?.url) return { status: 'done', files: [await download(d.url)] };
        throw new Error('OpenAI no devolvió ninguna imagen');
      },
    },
    video: {
      // Sora (API de vídeo de OpenAI): crea un trabajo, se sondea y se descarga el MP4.
      async start(cfg, req) {
        const sizes = { '16:9': '1280x720', '9:16': '720x1280' };
        const size = sizes[req.aspect];
        if (!size) throw new Error('Sora no admite formato 1:1. Elige 16:9 o 9:16.');
        const [w, h] = size.split('x').map(Number);
        const fd = new FormData();
        fd.set('model', req.model || cfg.models?.video || 'sora-2'); fd.set('prompt', req.prompt); fd.set('size', size);
        fd.set('seconds', String(req.duration <= 4 ? 4 : req.duration <= 8 ? 8 : 12));
        const ref = req.startImage || req.references?.[0];
        if (ref) { const fitted = fitImage(ref.buffer, w, h); fd.set('input_reference', new Blob([fitted], { type: 'image/jpeg' }), 'ref.jpg'); }
        const j = await http('https://api.openai.com/v1/videos', { method: 'POST', headers: openai.auth(cfg), body: fd, timeout: 120000 }, { label: 'OpenAI Sora' });
        return { status: 'pending', state: { id: j.id } };
      },
      async poll(cfg, st) {
        const j = await http(`https://api.openai.com/v1/videos/${st.id}`, { headers: openai.auth(cfg), timeout: 30000 }, { label: 'OpenAI Sora' });
        if (j.status === 'failed') throw new Error(`Sora: ${j.error?.message || 'la generación falló'}`);
        if (j.status !== 'completed') return { status: 'pending', state: st, progress: Math.max(10, Math.round(j.progress || 10)) };
        const r = await http(`https://api.openai.com/v1/videos/${st.id}/content`, { headers: openai.auth(cfg), timeout: 300000 }, { raw: true, label: 'OpenAI Sora' });
        return { status: 'done', files: [{ buffer: await bufOf(r), mime: 'video/mp4' }] };
      },
    },
    voice: {
      async start(cfg, req) {
        const r = await http('https://api.openai.com/v1/audio/speech', {
          method: 'POST', headers: { ...openai.auth(cfg), 'content-type': 'application/json' },
          body: JSON.stringify({ model: cfg.models?.voice || 'gpt-4o-mini-tts', voice: req.voiceId || 'alloy', input: req.text,
            speed: Math.min(4, Math.max(0.25, req.speed || 1)), response_format: 'mp3',
            instructions: `Habla en ${req.language || 'español'} con tono ${req.emotion || 'neutro'}.${req.direction ? ' ' + req.direction : ''}` }),
        }, { raw: true, label: 'OpenAI TTS' });
        return { status: 'done', files: [{ buffer: await bufOf(r), mime: 'audio/mpeg' }] };
      },
    },
  },
};

// ---------- ElevenLabs (voz + efectos + música) ----------
const EMOTION_SETTINGS = {
  Neutra: { stability: 0.5, style: 0.1 }, Alegre: { stability: 0.35, style: 0.5 }, Triste: { stability: 0.6, style: 0.3 },
  Enfadada: { stability: 0.25, style: 0.7 }, Sorprendida: { stability: 0.3, style: 0.6 }, Susurro: { stability: 0.7, style: 0.2 },
  Sarcástica: { stability: 0.4, style: 0.5 }, Entusiasta: { stability: 0.25, style: 0.7 }, Nerviosa: { stability: 0.3, style: 0.4 },
};
const elevenlabs = {
  id: 'elevenlabs', name: 'ElevenLabs', categories: ['voice', 'sfx', 'music'], docs: 'https://elevenlabs.io/docs',
  description: 'Voces realistas multilingües, efectos de sonido y música.',
  fields: [{ key: 'apiKey', label: 'API key', secret: true, placeholder: 'xi-…' }],
  defaultModels: { voice: 'eleven_multilingual_v2' },
  hdr: (cfg) => ({ 'xi-api-key': cfg.apiKey }),
  async test(cfg) { await http('https://api.elevenlabs.io/v1/user', { headers: this.hdr(cfg), timeout: 20000 }, { label: 'ElevenLabs' }); },
  async listVoices(cfg) {
    const j = await http('https://api.elevenlabs.io/v1/voices', { headers: this.hdr(cfg), timeout: 30000 }, { label: 'ElevenLabs' });
    return (j.voices || []).map((v) => ({ id: v.voice_id, name: v.name, gender: v.labels?.gender || 'neutral', age: v.labels?.age, accent: v.labels?.accent, preview: v.preview_url, provider: 'elevenlabs' }));
  },
  handlers: {
    voice: {
      async start(cfg, req) {
        const es = EMOTION_SETTINGS[req.emotion] || EMOTION_SETTINGS.Neutra;
        const r = await http(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(req.voiceId)}?output_format=mp3_44100_128`, {
          method: 'POST', headers: { ...elevenlabs.hdr(cfg), 'content-type': 'application/json' },
          body: JSON.stringify({ text: req.text, model_id: cfg.models?.voice || 'eleven_multilingual_v2',
            voice_settings: { stability: es.stability, similarity_boost: 0.8, style: es.style, use_speaker_boost: true, speed: Math.min(1.2, Math.max(0.7, req.speed || 1)) } }),
        }, { raw: true, label: 'ElevenLabs' });
        return { status: 'done', files: [{ buffer: await bufOf(r), mime: 'audio/mpeg' }] };
      },
    },
    sfx: {
      async start(cfg, req) {
        const r = await http('https://api.elevenlabs.io/v1/sound-generation', {
          method: 'POST', headers: { ...elevenlabs.hdr(cfg), 'content-type': 'application/json' },
          body: JSON.stringify({ text: req.prompt, duration_seconds: Math.min(22, Math.max(0.5, req.duration || 4)) }),
        }, { raw: true, label: 'ElevenLabs SFX' });
        return { status: 'done', files: [{ buffer: await bufOf(r), mime: 'audio/mpeg' }] };
      },
    },
    music: {
      async start(cfg, req) {
        const r = await http('https://api.elevenlabs.io/v1/music', {
          method: 'POST', headers: { ...elevenlabs.hdr(cfg), 'content-type': 'application/json' }, timeout: 300000,
          body: JSON.stringify({ prompt: req.prompt, music_length_ms: Math.round(Math.min(300, Math.max(10, req.duration || 30)) * 1000) }),
        }, { raw: true, label: 'ElevenLabs Music' });
        return { status: 'done', files: [{ buffer: await bufOf(r), mime: 'audio/mpeg' }] };
      },
    },
  },
};

// ---------- Replicate (imagen + vídeo + música, modelos configurables) ----------
const replicate = {
  id: 'replicate', modelOptions: { video: ['minimax/video-01'], image: ['black-forest-labs/flux-schnell'] }, name: 'Replicate', categories: ['image', 'video', 'music'], docs: 'https://replicate.com/docs',
  description: 'Catálogo abierto de modelos. Indica el identificador “propietario/modelo” en cada categoría.',
  fields: [{ key: 'apiKey', label: 'API token', secret: true, placeholder: 'r8_…' }],
  defaultModels: { image: 'black-forest-labs/flux-schnell', video: 'minimax/video-01', music: 'meta/musicgen' },
  hdr: (cfg) => ({ Authorization: `Bearer ${cfg.apiKey}`, 'content-type': 'application/json' }),
  async test(cfg) { await http('https://api.replicate.com/v1/account', { headers: this.hdr(cfg), timeout: 20000 }, { label: 'Replicate' }); },
  mk(category, buildInput) {
    return {
      async start(cfg, req) {
        const model = req.model || cfg.models?.[category] || replicate.defaultModels[category];
        const j = await http(`https://api.replicate.com/v1/models/${model}/predictions`, {
          method: 'POST', headers: replicate.hdr(cfg), body: JSON.stringify({ input: buildInput(req) }),
        }, { label: 'Replicate' });
        return { status: 'pending', state: { id: j.id, url: j.urls?.get } };
      },
      async poll(cfg, st) {
        const j = await http(st.url || `https://api.replicate.com/v1/predictions/${st.id}`, { headers: replicate.hdr(cfg), timeout: 30000 }, { label: 'Replicate' });
        if (j.status === 'failed' || j.status === 'canceled') throw new Error(`Replicate: ${j.error || j.status}`);
        if (j.status !== 'succeeded') return { status: 'pending', state: st, progress: j.status === 'processing' ? 50 : 10 };
        const out = Array.isArray(j.output) ? j.output : [j.output];
        return { status: 'done', files: [await download(out[0])] };
      },
    };
  },
};
replicate.handlers = {
  image: replicate.mk('image', (r) => ({ prompt: r.prompt, aspect_ratio: r.aspect, output_format: 'png', ...(r.references?.[0] ? { image: dataUri(r.references[0]) } : {}) })),
  video: replicate.mk('video', (r) => ({ prompt: r.prompt, ...(r.startImage ? { first_frame_image: dataUri(r.startImage) } : {}), duration: r.duration, aspect_ratio: r.aspect })),
  music: replicate.mk('music', (r) => ({ prompt: r.prompt, duration: Math.min(30, r.duration || 15) })),
};

// ---------- fal.ai (imagen + vídeo + lipsync) ----------
const fal = {
  id: 'fal', modelOptions: { video: ['fal-ai/kling-video/v2/master/image-to-video'], image: ['fal-ai/flux/schnell'] }, name: 'fal.ai', categories: ['image', 'video', 'lipsync'], docs: 'https://fal.ai/docs',
  description: 'Modelos rápidos de imagen y vídeo (Kling, Flux…) y sincronización labial.',
  fields: [{ key: 'apiKey', label: 'API key', secret: true, placeholder: 'id:secret' }],
  defaultModels: { image: 'fal-ai/flux/schnell', video: 'fal-ai/kling-video/v2/master/image-to-video', lipsync: 'fal-ai/sync-lipsync' },
  hdr: (cfg) => ({ Authorization: `Key ${cfg.apiKey}`, 'content-type': 'application/json' }),
  async test(cfg) { if (!cfg.apiKey || !cfg.apiKey.includes(':')) throw new Error('La clave de fal.ai tiene el formato “id:secreto”.'); },
  mk(category, buildInput, pick) {
    return {
      async start(cfg, req) {
        const model = req.model || cfg.models?.[category] || fal.defaultModels[category];
        const j = await http(`https://queue.fal.run/${model}`, { method: 'POST', headers: fal.hdr(cfg), body: JSON.stringify(buildInput(req)) }, { label: 'fal.ai' });
        return { status: 'pending', state: { statusUrl: j.status_url, responseUrl: j.response_url } };
      },
      async poll(cfg, st) {
        const s = await http(st.statusUrl, { headers: fal.hdr(cfg), timeout: 30000 }, { label: 'fal.ai' });
        if (s.status !== 'COMPLETED') return { status: 'pending', state: st, progress: s.status === 'IN_PROGRESS' ? 50 : 10 };
        const res = await http(st.responseUrl, { headers: fal.hdr(cfg), timeout: 30000 }, { label: 'fal.ai' });
        const url = pick(res);
        if (!url) throw new Error('fal.ai no devolvió ningún archivo');
        return { status: 'done', files: [await download(url)] };
      },
    };
  },
};
const falSize = { '16:9': 'landscape_16_9', '9:16': 'portrait_16_9', '1:1': 'square_hd' };
fal.handlers = {
  image: fal.mk('image', (r) => ({ prompt: r.prompt, image_size: falSize[r.aspect] || 'square_hd' }), (j) => j.images?.[0]?.url),
  video: fal.mk('video', (r) => ({ prompt: r.prompt, ...(r.startImage ? { image_url: dataUri(r.startImage) } : {}), duration: String(r.duration >= 8 ? 10 : 5), aspect_ratio: r.aspect }), (j) => j.video?.url),
  lipsync: fal.mk('lipsync', (r) => ({ video_url: dataUri(r.video), audio_url: dataUri(r.audio) }), (j) => j.video?.url),
};

export const ADAPTERS = Object.fromEntries([anthropic, openai, elevenlabs, replicate, fal].map((a) => [a.id, a]));
export { sleep };
