// Catálogo compartido con el frontend (se sirve en /api/bootstrap).
// `prompt` se inyecta en TODAS las generaciones del proyecto para mantener una estética uniforme.

export const STYLES = [
  { id: 'cinematic3d', name: 'Animación 3D cinematográfica', description: 'Render 3D de largometraje: iluminación volumétrica, materiales detallados y cámara de cine.',
    prompt: 'cinematic 3D animated film still, high-end CGI render, volumetric lighting, subsurface scattering, detailed materials, shallow depth of field' },
  { id: 'anim2d', name: 'Animación 2D', description: 'Dibujo animado clásico con líneas limpias, colores planos y fondos pintados a mano.',
    prompt: 'classic 2D hand-drawn animation, clean ink outlines, flat cel-shaded colors, painted backgrounds' },
  { id: 'caricature', name: 'Caricatura', description: 'Rasgos exagerados y expresivos: cabezas grandes, gestos extremos y humor visual.',
    prompt: 'caricature illustration, exaggerated facial features and proportions, expressive humorous poses, bold colors' },
  { id: 'pixarlike', name: 'Estilo Pixar-like', description: 'Animación 3D familiar, cálida y expresiva, con personajes originales y redondeados (sin copiar personajes protegidos).',
    prompt: 'family-friendly stylized 3D animation, warm soft lighting, rounded appealing character design, big expressive eyes, original characters, polished feature-film look' },
  { id: 'anime', name: 'Anime', description: 'Estética japonesa: ojos grandes, sombreado cel, fondos detallados y líneas de acción.',
    prompt: 'anime style, cel shading, large expressive eyes, detailed painted background, dynamic framing, vibrant palette' },
  { id: 'cinematic', name: 'Realismo cinematográfico', description: 'Imagen de película real: óptica anamórfica, grano de film y etalonaje de cine.',
    prompt: 'photorealistic cinematic film still, anamorphic lens, natural film grain, professional color grading, realistic skin and fabrics' },
  { id: 'hyperreal', name: 'Hiperrealismo', description: 'Detalle extremo, poros, texturas y luz natural; indistinguible de una fotografía.',
    prompt: 'hyperrealistic, ultra detailed, 8k photography, visible skin pores and textures, natural lighting, sharp focus' },
  { id: 'stopmotion', name: 'Stop motion', description: 'Muñecos y atrezo físicos: texturas de plastilina o fieltro y movimiento “a saltos”.',
    prompt: 'stop-motion animation, handmade clay and felt puppets, visible fingerprints and textures, miniature set, tactile look' },
  { id: 'lowpoly', name: 'Low poly', description: 'Geometría facetada con pocos polígonos, colores limpios y atmósfera minimalista.',
    prompt: 'low poly 3D art, faceted geometry, flat shaded polygons, minimal clean palette, isometric diorama feel' },
  { id: 'videogame', name: 'Estilo videojuego', description: 'Look de juego moderno: HUD discreto, efectos de partículas y diseño de personaje jugable.',
    prompt: 'modern video game cinematic, real-time engine look, game character design, particle effects, dramatic rim lighting' },
  { id: 'comic', name: 'Cómic', description: 'Viñetas con tinta gruesa, tramas de puntos y colores saturados.',
    prompt: 'comic book art, bold ink linework, halftone dots, saturated flat colors, dynamic panel composition' },
  { id: 'kids', name: 'Animación infantil', description: 'Formas simples y redondeadas, colores brillantes y tono tierno para peques.',
    prompt: "children's animation, simple rounded shapes, bright cheerful colors, soft friendly characters, picture-book look" },
  { id: 'surreal', name: 'Estilo surrealista', description: 'Imágenes oníricas: escalas imposibles, objetos flotantes y paletas de ensueño.',
    prompt: 'surrealist dreamlike imagery, impossible scale and floating objects, melting forms, dreamy palette, Dali-inspired atmosphere' },
  { id: 'cartoon', name: 'Estilo cartoon', description: 'Dibujos animados de TV: colores vivos, contornos gruesos y movimientos elásticos.',
    prompt: 'saturated TV cartoon style, thick outlines, squash and stretch, vivid flat colors, playful backgrounds' },
];

export const OPTIONS = {
  aspects: [
    { id: '9:16', name: 'Vertical 9:16', hint: 'TikTok · Reels · Shorts', w: 1080, h: 1920 },
    { id: '16:9', name: 'Horizontal 16:9', hint: 'YouTube', w: 1920, h: 1080 },
    { id: '1:1', name: 'Cuadrado 1:1', hint: 'Feed · Instagram', w: 1080, h: 1080 },
  ],
  qualities: [
    { id: 'draft', name: 'Borrador', hint: 'Rápido y barato, para probar', multiplier: 0.5, scale: 0.5 },
    { id: 'standard', name: 'Estándar', hint: 'Equilibrio calidad/coste', multiplier: 1, scale: 0.75 },
    { id: 'high', name: 'Alta', hint: 'Máxima calidad', multiplier: 2, scale: 1 },
  ],
  cameras: ['Plano fijo', 'Travelling lateral', 'Zoom in lento', 'Zoom out', 'Cámara en mano', 'Panorámica', 'Plano cenital', 'Dolly in', 'Órbita alrededor', 'Contrapicado', 'Plano subjetivo'],
  lightings: ['Luz natural', 'Hora dorada', 'Noche con neón', 'Luz de estudio suave', 'Contraluz dramático', 'Luz cálida de interior', 'Luz fría azulada', 'Penumbra / claroscuro'],
  ambiences: ['Alegre', 'Tenso', 'Misterioso', 'Cómico', 'Romántico', 'Épico', 'Nostálgico', 'Tranquilo', 'Terrorífico', 'Mágico'],
  musicTypes: ['Sin música', 'Orquestal épica', 'Pop alegre', 'Lo-fi relajante', 'Electrónica', 'Jazz de cafetería', 'Rock', 'Suspense', 'Cómica / divertida', 'Infantil', 'Acústica / guitarra'],
  sfxLevels: ['Sin efectos', 'Ambiente sutil', 'Efectos destacados'],
  emotions: ['Neutra', 'Alegre', 'Triste', 'Enfadada', 'Sorprendida', 'Susurro', 'Sarcástica', 'Entusiasta', 'Nerviosa'],
  characterSlots: [
    { id: 'front', name: 'Vista frontal' },
    { id: 'back', name: 'Vista trasera' },
    { id: 'left', name: 'Perfil izquierdo' },
    { id: 'right', name: 'Perfil derecho' },
    { id: 'face', name: 'Primer plano del rostro' },
    { id: 'expression', name: 'Expresión facial', multiple: true },
    { id: 'pose', name: 'Pose', multiple: true },
    { id: 'external', name: 'Referencia de otra IA', multiple: true },
  ],
};

// Coste en créditos por tipo de generación (se multiplica por la calidad en imagen/vídeo).
export const CREDIT_COST = { storyboard: 1, image: 2, video: 10, voice: 1, music: 5, sfx: 2, lipsync: 6, export: 0 };

export const CATEGORIES = {
  llm: 'Modelos de lenguaje (guiones y escenas)',
  image: 'Generación de imágenes',
  video: 'Generación de vídeo',
  voice: 'Generación de voces',
  lipsync: 'Sincronización labial',
  music: 'Generación de música',
  sfx: 'Efectos de sonido',
};
