import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { PORT, UPLOAD_DIR, WEB_DIST, ACCESS_TOKEN } from './config.js';
import { db, get, LOCAL_USER_ID } from './db.js';
import { HttpError } from './util.js';
import { startWorker } from './jobs.js';
import { router as characters } from './routes/characters.js';
import { router as projects } from './routes/projects.js';
import { router as misc } from './routes/misc.js';

export const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));
app.use((req, res, next) => { res.set('X-Content-Type-Options', 'nosniff'); next(); });

// Archivos subidos/generados. En SaaS: sustituir por URLs firmadas / S3.
app.use('/files', express.static(UPLOAD_DIR, { maxAge: '1h', fallthrough: false, setHeaders: (r) => r.set('Content-Security-Policy', "default-src 'none'; sandbox") }));

// Autenticación: punto único de enganche. Hoy, un usuario local; con APP_ACCESS_TOKEN se exige Bearer.
app.use('/api', (req, res, next) => {
  if (ACCESS_TOKEN && req.get('authorization') !== `Bearer ${ACCESS_TOKEN}`) return next(new HttpError(401, 'UNAUTHORIZED', 'Falta o es inválido el token de acceso.'));
  req.user = get('SELECT * FROM users WHERE id=?', LOCAL_USER_ID);
  next();
});
app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/characters', characters);
app.use('/api/projects', projects);
app.use('/api', misc);

if (fs.existsSync(WEB_DIST)) {
  app.use(express.static(WEB_DIST));
  app.use((req, res, next) => (req.method === 'GET' && !req.path.startsWith('/api') ? res.sendFile(path.join(WEB_DIST, 'index.html')) : next()));
}

app.use('/api', (_req, _res, next) => next(new HttpError(404, 'NOT_FOUND', 'Ruta no encontrada.')));
app.use((err, _req, res, _next) => {
  if (err.code === 'LIMIT_FILE_SIZE') err = new HttpError(413, 'FILE_TOO_LARGE', 'El archivo supera el límite de 300 MB.');
  if (err.name === 'MulterError') err = new HttpError(400, 'UPLOAD_ERROR', err.message);
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: { code: err.code || 'INTERNAL', message: status >= 500 && !err.code ? 'Error interno del servidor.' : err.message, ...(err.extra || {}) } });
});

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  startWorker();
  app.listen(PORT, () => console.log(`Lumio Studio API escuchando en http://localhost:${PORT}`));
}
