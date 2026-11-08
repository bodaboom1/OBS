# Lumio Studio

Estudio web para crear vídeos con IA: biblioteca de personajes con imágenes de referencia, selector de 14 estilos visuales, generador de escenas (idea / guion / imagen / personajes / prompt), producción por escena, voces, editor con línea de tiempo y exportación MP4.

## Arranque

```bash
npm install
npm run dev        # API en :8787 y web en http://localhost:5173
# producción
npm run build && NODE_ENV=production npm start   # sirve web + API en :8787
npm test           # tests del backend (API, cola de trabajos, créditos, exportación con ffmpeg)
```
Requisitos: Node ≥ 22.13 (usa `node:sqlite`) y `ffmpeg`/`ffprobe` en el PATH (exportación, duración de medios, tono de voz).

## Referencia a vídeo
Herramienta nueva (`/reference-to-video`): subes imágenes o vídeo de referencia (o eliges personajes), las citas en el prompt con `@alias` (botón «Añadir referencia»), puedes pulsar «Mejorar prompt» (requiere LLM), elegir modelo, aspecto (incl. *Adaptativo*, que sigue la primera imagen), duración, calidad y estilo, y generar. Las `@menciones` se traducen a «reference image N» antes de enviarse al modelo. Incluye adaptador de Sora (OpenAI `/v1/videos`, sin probar con clave real). Las referencias en vídeo se guardan pero ningún adaptador las usa aún.

## Arquitectura

```
web/      React + Vite (SPA). Sin claves: todo pasa por /api.
server/   Express + SQLite (node:sqlite) + cola de trabajos en proceso
  src/providers/adapters.js  Adaptadores: Anthropic, OpenAI, ElevenLabs, Replicate, fal.ai
  src/providers/store.js     Claves cifradas (AES-256-GCM), proveedor activo por categoría
  src/jobs.js                Cola asíncrona: encola → cobra créditos → ejecuta/sondea → guarda asset → adjunta a la escena (reembolso si falla)
  src/prompts.js             Estilo + bloque de consistencia de personaje + selección de imágenes de referencia
  src/storyboard.js          LLM → escenas JSON (o segmentación local de guion / plantilla, etiquetadas)
  src/export.js              Montaje con ffmpeg (escenas, voces, SFX, música, subtítulos)
  src/credits.js             Saldo, cargos y reembolsos atómicos (libro mayor)
```

- **Sin simulaciones**: si no hay proveedor para una categoría, `POST /api/jobs` responde `409 PROVIDER_NOT_CONFIGURED` y la UI marca “Requiere conexión”. Sin LLM, un guion se divide por formato y una idea genera una plantilla editable, siempre indicado en pantalla.
- **Claves**: se guardan cifradas en el backend (clave maestra en `server/data/.secret` o `APP_SECRET`) y nunca se devuelven al navegador.
- **Consistencia de personajes**: en cada imagen se inyectan descripción/apariencia canónica y hasta 6 imágenes de referencia (frontal > rostro > perfiles > otras) del/los personajes de la escena. El vídeo se genera *desde la imagen clave* de la escena (pipeline image-first).
- **Autoguardado**: el editor guarda con debounce; los medios generados son propiedad del servidor y el autoguardado no los pisa.
- **Añadir un proveedor**: nuevo objeto en `adapters.js` con `categories`, `fields` y `handlers[categoría].start/poll`.

## Hacia SaaS (puntos de enganche)
- Auth: `app.use('/api', …)` en `server/src/index.js` (hoy usuario local; `APP_ACCESS_TOKEN` exige Bearer). Todas las tablas ya llevan `user_id`.
- Archivos: `/files` + `UPLOAD_DIR` → S3/R2 con URLs firmadas. Cola: `jobs.js` → BullMQ/SQS (el estado ya vive en BD).
- Pagos: `credits.js` (`grant`) + sustituir el botón de créditos de prueba.
- SQLite → Postgres: acceso centralizado en `db.js`.

## Estado
Probado: API, subida de imágenes, cola/créditos/reembolso (con proveedor de prueba), exportación real con ffmpeg y flujo completo en navegador (Playwright).
**No probado contra APIs reales**: los adaptadores de OpenAI, Anthropic, ElevenLabs, Replicate y fal.ai están escritos según su documentación pero requieren claves; los modelos por defecto son editables en Configuración. Las miniaturas de estilo son ilustraciones SVG orientativas, no salidas de modelo.
