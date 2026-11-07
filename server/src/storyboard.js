import { activeProvider, loadConfig } from './providers/store.js';
import { styleById } from './prompts.js';
import { normalizeScene } from './models.js';
import { uid } from './util.js';
import { OPTIONS } from './catalog.js';

const SYSTEM = `Eres un guionista y director de storyboard para vídeos cortos generados con IA.
Convierte la petición del usuario en una lista de escenas. Responde SOLO con JSON válido con esta forma exacta:
{"title": string, "scenes": [{"title": string, "visual": string, "characters": [string], "dialogues": [{"speaker": string, "text": string, "emotion": string}], "expressions": string, "movements": string, "camera": string, "sounds": string, "duration": number}]}
Reglas:
- "visual" describe con detalle lo que se ve (lugar, acciones, composición) SIN incluir texto en pantalla.
- "characters" y "speaker" deben usar exactamente los nombres de los personajes proporcionados (si hay).
- "emotion" ∈ ${OPTIONS.emotions.join(', ')}.
- "camera" ∈ ${OPTIONS.cameras.join(', ')}.
- "duration" en segundos (entero 2-15) y la suma debe aproximarse a la duración total pedida.
- Diálogos breves y naturales, en el idioma pedido. Si no hay diálogo, deja la lista vacía.
- Estructura narrativa clara: presentación, desarrollo, giro, reacción y remate.`;

function extractJSON(text) {
  const t = text.replace(/```json|```/g, '');
  const a = t.indexOf('{'); const b = t.lastIndexOf('}');
  if (a < 0 || b < 0) throw new Error('El modelo no devolvió JSON');
  return JSON.parse(t.slice(a, b + 1));
}

function linkCharacters(scene, chars) {
  const byName = (n) => chars.find((c) => c.name.toLowerCase() === String(n || '').trim().toLowerCase());
  const ids = new Set((scene.characters || []).map((n) => byName(n)?.id).filter(Boolean));
  const dialogues = (scene.dialogues || []).map((d) => {
    const c = byName(d.speaker);
    if (c) ids.add(c.id);
    return { ...d, id: uid('dlg'), characterId: c?.id || null };
  });
  return normalizeScene({ ...scene, id: uid('sc'), characters: [...ids], dialogues });
}

async function viaLLM(userId, { chars, params, style, provider }) {
  const cfg = loadConfig(userId, provider.id);
  const modeHint = { idea: 'Es una IDEA breve: desarróllala en una historia completa.', script: 'Es un GUION completo: respétalo y divídelo en escenas conservando los diálogos.',
    prompt: 'Es un PROMPT directo de lo que debe aparecer: crea las escenas mínimas necesarias.', image: 'Hay una imagen inicial que se animará: describe cómo evoluciona la acción a partir de ella.', characters: 'Incorpora los personajes seleccionados a la historia.' }[params.mode] || '';
  const user = [
    modeHint,
    `Idioma: ${params.language || 'español'}.`,
    `Número de escenas: ${params.sceneCount || 5}. Duración total aproximada: ${params.totalDuration || 30} s.`,
    `Estilo visual del vídeo: ${style.name} (${style.description}).`,
    params.ambience && `Ambiente: ${params.ambience}.`,
    chars.length ? `Personajes disponibles:\n${chars.map((c) => `- ${c.name}: ${[c.description, c.personality && 'personalidad: ' + c.personality, c.appearance].filter(Boolean).join('. ')}`).join('\n')}` : 'No hay personajes guardados: crea los necesarios.',
    `Material del usuario:\n"""\n${params.text}\n"""`,
  ].filter(Boolean).join('\n');
  const raw = await provider.chat(cfg, { system: SYSTEM, user, maxTokens: 6000 });
  const j = extractJSON(raw);
  if (!Array.isArray(j.scenes) || !j.scenes.length) throw new Error('El modelo no devolvió escenas');
  return { title: j.title, scenes: j.scenes.slice(0, 30).map((s) => linkCharacters(s, chars)) };
}

/** Segmentación local de un guion (no es IA: reglas de formato). */
export function parseScript(text, chars, count = 5, total = 30) {
  const norm = text.replace(/\r/g, '').trim();
  const head = /^\s*(?:ESCENA|SCENE|ESC\.?)\s*\d*\s*[:.\-–—]?\s*(.*)$/i;
  let blocks = [];
  let cur = null;
  for (const line of norm.split('\n')) {
    const m = line.match(head);
    if (m) { cur = { title: m[1].trim(), lines: [] }; blocks.push(cur); } else if (cur) cur.lines.push(line); else if (line.trim()) { cur = { title: '', lines: [line] }; blocks.push(cur); }
  }
  if (blocks.length <= 1) {
    const paras = norm.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    if (paras.length > 1) blocks = paras.map((p) => ({ title: '', lines: p.split('\n') }));
    else {
      const sentences = norm.split(/(?<=[.!?])\s+/).filter(Boolean);
      const n = Math.max(1, Math.min(count, sentences.length));
      blocks = Array.from({ length: n }, (_, i) => ({ title: '', lines: [sentences.slice(Math.floor((i * sentences.length) / n), Math.floor(((i + 1) * sentences.length) / n)).join(' ')] }));
    }
  }
  const dur = Math.min(15, Math.max(2, Math.round(total / blocks.length)));
  const dlgRe = /^\s*([A-Za-zÁÉÍÓÚÑáéíóúñ][\wÁÉÍÓÚÑáéíóúñ .'-]{0,30}?)\s*(?:\([^)]*\))?\s*:\s*[«"“]?(.+?)[»"”]?\s*$/;
  return blocks.slice(0, 30).map((b, i) => {
    const dialogues = []; const visual = [];
    for (const l of b.lines) {
      const m = l.match(dlgRe);
      const known = m && chars.find((c) => c.name.toLowerCase() === m[1].trim().toLowerCase());
      if (m && (known || m[1] === m[1].toUpperCase())) dialogues.push({ speaker: known?.name || m[1].trim(), text: m[2].trim(), emotion: 'Neutra' });
      else if (l.trim()) visual.push(l.trim());
    }
    return linkCharacters({ title: b.title || `Escena ${i + 1}`, visual: visual.join(' '), dialogues, duration: dur, camera: 'Plano fijo' }, chars);
  });
}

const TEMPLATE = ['Presentación del personaje', 'El personaje entra en un lugar', 'Sucede algo inesperado', 'Reacción del personaje', 'Remate final'];
function template(text, chars, count, total) {
  const dur = Math.min(15, Math.max(2, Math.round(total / count)));
  return Array.from({ length: count }, (_, i) => {
    const t = TEMPLATE[i] || `Escena extra ${i + 1}`;
    return linkCharacters({ title: t, visual: `[${t}] Describe aquí lo que se ve. Idea original: ${text.slice(0, 300)}`, characters: chars.map((c) => c.name), duration: dur, camera: OPTIONS.cameras[i % OPTIONS.cameras.length] }, chars);
  });
}

/** Punto de entrada. Devuelve siempre `source` para que la UI sea transparente sobre qué se ha usado. */
export async function buildStoryboard({ userId, params, chars }) {
  const style = styleById(params.style);
  const count = Math.min(20, Math.max(1, Number(params.sceneCount) || 5));
  const total = Math.min(300, Math.max(3, Number(params.totalDuration) || 30));
  params = { ...params, sceneCount: count, totalDuration: total };
  const text = String(params.text || '').trim();
  if (!text && params.mode !== 'image') throw Object.assign(new Error('Escribe una idea, un guion o un prompt.'), { status: 400, code: 'EMPTY_INPUT' });

  const provider = activeProvider(userId, 'llm');
  if (provider) {
    const r = await viaLLM(userId, { chars, params: { ...params, text: text || 'Anima la imagen proporcionada.' }, style, provider });
    return { ...r, source: 'llm', provider: provider.id };
  }
  const warning = 'No hay un modelo de lenguaje conectado: no se puede generar la historia con IA. Conecta uno en Configuración → Proveedores.';
  if (params.mode === 'script') return { scenes: parseScript(text, chars, count, total), source: 'script-parse', warning: 'Guion dividido localmente por formato (sin IA). Conecta un LLM para mejorar la división y el desarrollo.' };
  if (params.mode === 'prompt' || params.mode === 'image') {
    return { scenes: [linkCharacters({ title: 'Escena 1', visual: text || 'Animación de la imagen proporcionada', characters: chars.map((c) => c.name), duration: Math.min(15, total), camera: 'Zoom in lento' }, chars)], source: 'template', warning: params.mode === 'prompt' ? 'Prompt convertido en una única escena.' : 'Una escena con tu imagen inicial; edita la acción antes de generar.' };
  }
  return { scenes: template(text, chars, count, total), source: 'template', warning: `${warning} Se ha creado una plantilla de 5 pasos editable.` };
}
