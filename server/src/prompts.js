import { STYLES } from './catalog.js';

export const styleById = (id) => STYLES.find((s) => s.id === id) || STYLES[0];

const REF_ORDER = ['front', 'face', 'left', 'right', 'back', 'external', 'expression', 'pose'];

/** Bloque de consistencia: descripción canónica de cada personaje presente en la escena. */
export function characterBlock(chars) {
  return chars.map((c) => {
    const bits = [c.appearance, c.description, c.apparentAge && `apparent age: ${c.apparentAge}`, c.specialFeatures && `distinctive features: ${c.specialFeatures}`].filter(Boolean).join('; ');
    return `Character "${c.name}": ${bits}. Keep EXACTLY the same face, hairstyle, outfit, colors and body proportions as in the reference images.`;
  }).join('\n');
}

/** Selecciona las imágenes de referencia más útiles (máx. n) priorizando frontal > rostro > perfiles. */
export function pickReferences(chars, n = 6) {
  const out = [];
  const perChar = Math.max(1, Math.floor(n / Math.max(1, chars.length)));
  for (const c of chars) {
    const sorted = [...c.images].sort((a, b) => REF_ORDER.indexOf(a.slot) - REF_ORDER.indexOf(b.slot));
    out.push(...sorted.slice(0, perChar));
  }
  return out.slice(0, n);
}

export function scenePrompt({ project, scene, chars, purpose }) {
  const s = project.settings || {};
  const style = styleById(s.style);
  const parts = [
    `${style.prompt}.`,
    scene.visual && `Scene: ${scene.visual}.`,
    scene.expressions && `Facial expressions: ${scene.expressions}.`,
    scene.movements && `Body action: ${scene.movements}.`,
    scene.camera && `Camera: ${scene.camera}.`,
    s.lighting && `Lighting: ${s.lighting}.`,
    s.ambience && `Mood: ${s.ambience}.`,
    chars.length ? characterBlock(chars) : '',
    `Aspect ratio ${s.aspect || '16:9'}. Consistent art direction across the entire video. No text, no watermark, no subtitles.`,
  ];
  if (purpose === 'video') parts.splice(1, 0, 'Animate this shot with natural, smooth motion.');
  return parts.filter(Boolean).join('\n');
}
