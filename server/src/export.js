import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { TMP_DIR } from './config.js';
import { get, run } from './db.js';
import { HttpError, uid, now } from './util.js';
import { getProjectRow, projectDto } from './models.js';
import { getAsset, uploadPath, createAsset } from './media.js';
import { OPTIONS } from './catalog.js';

const execFileP = promisify(execFile);
const ff = (args, opts = {}) => execFileP('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { maxBuffer: 1e7, timeout: 15 * 60e3, ...opts });
const GAP = 0.25;

/** Duración estimada de una línea de diálogo: la del audio generado o, si no existe, ~2,6 palabras/seg. */
export function lineDuration(text, audioAsset) {
  if (audioAsset?.meta?.duration) return audioAsset.meta.duration;
  return Math.max(1.2, String(text).trim().split(/\s+/).length / 2.6);
}
export function lineTimings(scene, audioFor) {
  let t = 0.2;
  return (scene.dialogues || []).filter((d) => d.text?.trim()).map((d) => {
    const dur = lineDuration(d.text, audioFor(d));
    const r = { dialogue: d, start: t, end: t + dur };
    t += dur + GAP;
    return r;
  });
}

function loadForExport(userId, projectId) {
  const row = getProjectRow(userId, projectId);
  if (!row) throw new HttpError(404, 'NOT_FOUND', 'Proyecto no encontrado.');
  const project = projectDto(row);
  const parse = (a) => a && { ...a, meta: JSON.parse(a.meta || '{}') };
  const asset = (id) => parse(getAsset(userId, id));
  return { project, asset };
}

function sceneLength(scene, vid) {
  if (vid?.meta?.duration) {
    const start = Math.min(scene.trimIn || 0, Math.max(0, vid.meta.duration - 0.1));
    const end = Math.min(scene.trimOut || vid.meta.duration, vid.meta.duration);
    return { len: Math.max(0.5, end - start), start };
  }
  return { len: scene.duration || 5, start: 0 };
}

export function buildSrt(userId, projectId) {
  const { project, asset } = loadForExport(userId, projectId);
  const fmt = (s) => { const ms = Math.round(s * 1000); const p = (n, l = 2) => String(n).padStart(l, '0'); return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`; };
  let offset = 0; let n = 1; let out = '';
  for (const sc of project.scenes) {
    const vid = asset(sc.media?.videoAssetId);
    const timings = lineTimings(sc, (d) => asset(sc.media?.audio?.[d.id]));
    const audioEnd = timings.length ? timings[timings.length - 1].end + 0.3 : 0;
    const len = Math.max(sceneLength(sc, vid).len, audioEnd);
    for (const t of timings) out += `${n++}\n${fmt(offset + t.start)} --> ${fmt(offset + t.end)}\n${t.dialogue.speaker ? '' : ''}${t.dialogue.text.trim()}\n\n`;
    offset += len;
  }
  return out;
}

async function hasSubtitleFilter() {
  try { const { stdout } = await execFileP('ffmpeg', ['-hide_banner', '-filters']); return /\bsubtitles\b/.test(stdout); } catch { return false; }
}

export async function exportProject(userId, projectId, progress = () => {}) {
  const { project, asset } = loadForExport(userId, projectId);
  if (!project.scenes.length) throw new Error('El proyecto no tiene escenas.');
  const warnings = [];
  const aspect = OPTIONS.aspects.find((a) => a.id === project.settings.aspect) || OPTIONS.aspects[1];
  const q = OPTIONS.qualities.find((x) => x.id === project.settings.quality) || OPTIONS.qualities[1];
  const even = (n) => Math.round(n / 2) * 2;
  const W = even(aspect.w * q.scale); const H = even(aspect.h * q.scale);
  const dir = path.join(TMP_DIR, uid('exp'));
  fs.mkdirSync(dir, { recursive: true });
  try {
    const segs = [];
    for (let i = 0; i < project.scenes.length; i++) {
      const sc = project.scenes[i];
      const vid = asset(sc.media?.videoAssetId); const img = asset(sc.media?.imageAssetId);
      if (!vid && !img) throw new Error(`La escena ${i + 1} («${sc.title || 'sin título'}») no tiene imagen ni vídeo. Genera o sube uno antes de exportar.`);
      const lines = lineTimings(sc, (d) => asset(sc.media?.audio?.[d.id]));
      const audioEnd = lines.length ? lines[lines.length - 1].end + 0.3 : 0;
      const base = vid ? sceneLength(sc, vid) : { len: sc.duration || 5, start: 0 };
      const dur = Math.max(base.len, audioEnd);
      const args = [];
      if (vid) args.push('-ss', String(base.start), '-t', String(base.len), '-i', uploadPath(vid.file));
      else args.push('-loop', '1', '-framerate', '30', '-t', String(dur), '-i', uploadPath(img.file));
      const filters = [`[0:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1,fps=30,tpad=stop_mode=clone:stop_duration=${dur.toFixed(2)},trim=duration=${dur.toFixed(2)},setpts=PTS-STARTPTS,format=yuv420p[v]`];
      const parts = []; let idx = 1;
      const norm = 'aresample=44100,aformat=channel_layouts=stereo';
      lines.forEach((l) => {
        const a = asset(sc.media?.audio?.[l.dialogue.id]);
        if (!a) return;
        args.push('-i', uploadPath(a.file));
        const ms = Math.round(l.start * 1000);
        filters.push(`[${idx}:a]${norm},adelay=${ms}|${ms}[d${idx}]`); parts.push(`[d${idx}]`); idx++;
      });
      const sfx = asset(sc.media?.sfxAssetId);
      if (sfx) { args.push('-i', uploadPath(sfx.file)); filters.push(`[${idx}:a]${norm},volume=${sc.sfxVolume ?? 0.8}[s${idx}]`); parts.push(`[s${idx}]`); idx++; }
      if (!parts.length && vid?.meta?.hasAudio) { filters.push(`[0:a]${norm}[o]`); parts.push('[o]'); }
      const d2 = dur.toFixed(2);
      if (parts.length > 1) filters.push(`${parts.join('')}amix=inputs=${parts.length}:duration=longest:normalize=0,apad,atrim=0:${d2}[a]`);
      else if (parts.length === 1) filters.push(`${parts[0]}apad,atrim=0:${d2}[a]`);
      else filters.push(`anullsrc=r=44100:cl=stereo,atrim=0:${d2}[a]`);
      const out = path.join(dir, `seg${String(i).padStart(3, '0')}.mp4`);
      args.push('-filter_complex', filters.join(';'), '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-c:a', 'aac', '-b:a', '160k', '-ar', '44100', '-r', '30', '-movflags', '+faststart', out);
      try { await ff(args); } catch (e) { throw new Error(`Error de ffmpeg en la escena ${i + 1}: ${String(e.stderr || e.message).slice(-400)}`); }
      segs.push(out);
      progress(((i + 1) / project.scenes.length) * 75);
    }
    fs.writeFileSync(path.join(dir, 'list.txt'), segs.map((s) => `file '${s.replace(/'/g, "'\\''")}'`).join('\n'));
    let current = path.join(dir, 'joined.mp4');
    await ff(['-f', 'concat', '-safe', '0', '-i', path.join(dir, 'list.txt'), '-c', 'copy', current]);
    progress(80);

    const music = asset(project.media?.musicAssetId);
    if (music) {
      const total = (await execFileP('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', current])).stdout.trim();
      const T = Number(total) || 10; const vol = project.editor?.musicVolume ?? 0.25;
      const out = path.join(dir, 'music.mp4');
      await ff(['-i', current, '-stream_loop', '-1', '-i', uploadPath(music.file), '-filter_complex',
        `[1:a]aresample=44100,volume=${vol},afade=t=out:st=${Math.max(0, T - 2).toFixed(2)}:d=2[m];[0:a][m]amix=inputs=2:duration=first:normalize=0[a]`,
        '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-t', String(T), out]);
      current = out;
    }
    progress(90);

    const subs = project.editor?.subtitles;
    if (subs?.enabled) {
      const srt = buildSrt(userId, projectId);
      if (!srt.trim()) warnings.push('Subtítulos activados pero no hay diálogos con texto.');
      else if (!(await hasSubtitleFilter())) warnings.push('Este ffmpeg no incluye el filtro de subtítulos (libass): el vídeo se exportó sin subtítulos grabados. Descarga el .srt desde el editor.');
      else {
        fs.writeFileSync(path.join(dir, 'subs.srt'), srt);
        const size = { small: 14, medium: 18, large: 24 }[subs.size] || 18;
        const al = subs.position === 'middle' ? 10 : subs.position === 'top' ? 6 : 2;
        const style = `FontName=DejaVu Sans,FontSize=${size},Bold=1,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=0,Alignment=${al},MarginV=24`;
        const out = path.join(dir, 'subbed.mp4');
        await ff(['-i', current, '-vf', `subtitles=subs.srt:force_style='${style}'`, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-c:a', 'copy', out], { cwd: dir });
        current = out;
      }
    }
    progress(97);

    const file = `${uid('gen')}.mp4`;
    fs.copyFileSync(current, uploadPath(file));
    const a = await createAsset({ userId, kind: 'video', file, mime: 'video/mp4', name: `${project.title} (exportado)`, source: 'export', meta: { export: true, aspect: aspect.id, width: W, height: H }, projectId });
    run(`UPDATE projects SET status='exported', updated_at=? WHERE id=?`, now(), projectId);
    return { assetId: a.id, warnings, width: W, height: H };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
