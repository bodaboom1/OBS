import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, ChevronDown, ChevronUp, Copy, Film, GripVertical, ImageIcon, Mic, Music, Play, Plus, RefreshCw, Trash2, Wand2, Volume2, Sparkles, Scissors, Download, Plug, Upload, Wand, Clapperboard, Captions, X, Pause, ArrowRight, Settings as Cog } from 'lucide-react';
import { api, form, uid, fmtTime } from '../api.js';
import { useApp } from '../store.jsx';
import { Field, Spinner, StatusChip, NeedsConnection, confirmAsk, Modal, useFilePicker } from '../components/ui.jsx';

const blankScene = () => ({ id: uid('sc'), title: 'Nueva escena', visual: '', characters: [], dialogues: [], expressions: '', movements: '', camera: 'Plano fijo', sounds: '', duration: 5, trimIn: 0, trimOut: null, sfxVolume: 0.8, media: {} });
const GAP = 0.25;

/** Tiempos de una escena: misma lógica que la exportación del servidor (export.js). */
export function sceneTiming(sc, assets) {
  const vid = assets[sc.media?.videoAssetId];
  let len = sc.duration || 5;
  if (vid?.meta?.duration) { const s = Math.min(sc.trimIn || 0, vid.meta.duration - 0.1); len = Math.max(0.5, Math.min(sc.trimOut || vid.meta.duration, vid.meta.duration) - s); }
  let t = 0.2;
  const lines = (sc.dialogues || []).filter((d) => d.text?.trim()).map((d) => {
    const a = assets[sc.media?.audio?.[d.id]];
    const dur = a?.meta?.duration || Math.max(1.2, d.text.trim().split(/\s+/).length / 2.6);
    const l = { d, start: t, end: t + dur, audio: a?.url };
    t += dur + GAP;
    return l;
  });
  const audioEnd = lines.length ? lines[lines.length - 1].end + 0.3 : 0;
  return { len: Math.max(len, audioEnd), lines, vid };
}

export default function ProjectEditor() {
  const { id } = useParams();
  const loc = useLocation();
  const nav = useNavigate();
  const { boot, toast, onJobDone, jobs, generate, connected } = useApp();
  const [p, setP] = useState(null);
  const [assets, setAssets] = useState({});
  const [chars, setChars] = useState([]);
  const [tab, setTab] = useState('scenes');
  const [save, setSave] = useState('saved');
  const [notice, setNotice] = useState(loc.state?.notice || null);
  const [showSettings, setShowSettings] = useState(false);
  const dirty = useRef(false);
  const timer = useRef();
  const pRef = useRef();
  pRef.current = p;

  const loadAssets = useCallback(async () => {
    const r = await api.get('/assets');
    setAssets(Object.fromEntries(r.assets.map((a) => [a.id, a])));
  }, []);
  const reloadMedia = useCallback(async () => {
    try {
      const r = await api.get(`/projects/${id}`);
      await loadAssets();
      setP((cur) => {
        if (!cur) return r.project;
        const m = new Map(r.project.scenes.map((s) => [s.id, s.media]));
        return { ...cur, media: r.project.media, scenes: cur.scenes.map((s) => ({ ...s, media: m.get(s.id) || s.media })) };
      });
    } catch { /* ignore */ }
  }, [id, loadAssets]);

  useEffect(() => {
    api.get(`/projects/${id}`).then((r) => setP(r.project)).catch(() => { toast('Proyecto no encontrado', 'error'); nav('/projects'); });
    api.get('/characters').then((r) => setChars(r.characters));
    loadAssets();
  }, [id]); // eslint-disable-line
  useEffect(() => onJobDone((j) => { if (j.projectId === id) reloadMedia(); }), [onJobDone, id, reloadMedia]);

  // Autoguardado con debounce
  const flush = useCallback(async () => {
    const cur = pRef.current;
    if (!cur || !dirty.current) return;
    dirty.current = false; setSave('saving');
    try {
      await api.put(`/projects/${id}`, { title: cur.title, settings: cur.settings, characterIds: cur.characterIds, editor: cur.editor, scenes: cur.scenes });
      setSave(dirty.current ? 'saving' : 'saved');
    } catch (e) { dirty.current = true; setSave('error'); toast(`No se pudo guardar: ${e.message}`, 'error'); }
  }, [id, toast]);
  const mutate = useCallback((fn) => {
    setP((cur) => fn(cur)); dirty.current = true; setSave('saving');
    clearTimeout(timer.current); timer.current = setTimeout(flush, 900);
  }, [flush]);
  useEffect(() => () => { clearTimeout(timer.current); flush(); }, [flush]);
  useEffect(() => { const h = (e) => { if (dirty.current) { e.preventDefault(); e.returnValue = ''; } }; window.addEventListener('beforeunload', h); return () => window.removeEventListener('beforeunload', h); }, []);

  if (!p) return <div className="page"><Spinner /></div>;
  const upScene = (sid, patch) => mutate((c) => ({ ...c, scenes: c.scenes.map((s) => (s.id === sid ? { ...s, ...patch } : s)) }));
  const projJobs = jobs.filter((j) => j.projectId === id);
  const ctx = { p, mutate, upScene, assets, chars, setP, reloadMedia, flush, projJobs, id, loadAssets };
  const style = boot.styles.find((s) => s.id === p.settings.style);

  return (
    <div className="page">
      <div className="page-head" style={{ marginBottom: 14 }}>
        <div className="row" style={{ flex: 1, minWidth: 260 }}>
          <Link to="/projects" className="btn ghost icon" aria-label="Volver"><ArrowLeft size={18} /></Link>
          <input type="text" aria-label="Título" value={p.title} onChange={(e) => mutate((c) => ({ ...c, title: e.target.value }))} style={{ fontSize: 22, fontWeight: 800, background: 'transparent', border: '1.5px solid transparent', maxWidth: 520 }} />
        </div>
        <div className="row">
          <span className="chip acc">{style?.name}</span><span className="chip">{p.settings.aspect}</span>
          <button className="btn sm" onClick={() => setShowSettings(true)}><Cog size={14} /> Ajustes</button>
          <span className={`chip ${save === 'error' ? 'err' : save === 'saved' ? 'ok' : ''}`}>{save === 'saving' ? <><Spinner size={12} /> Guardando…</> : save === 'error' ? 'Error al guardar' : <><Check size={12} /> Guardado</>}</span>
        </div>
      </div>
      {notice && <div className="banner" style={{ marginBottom: 14 }}><Plug size={18} /><div style={{ flex: 1 }}>{notice}</div><button className="btn ghost icon sm" onClick={() => setNotice(null)}><X size={14} /></button></div>}
      <div className="pbar" role="tablist">
        {[['scenes', 'Escenas', 'Revisa la historia'], ['produce', 'Generar', 'Imágenes, vídeo y voz'], ['edit', 'Montar y exportar', 'Línea de tiempo y MP4']].map(([k, l, d], i) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}><i>{i + 1}</i><span>{l}<span className="small faint" style={{ display: 'block', fontWeight: 500 }}>{d}</span></span></button>
        ))}
      </div>
      {tab === 'scenes' && <ScenesTab {...ctx} setNotice={setNotice} />}
      {tab === 'produce' && <ProduceTab {...ctx} />}
      {tab === 'edit' && <EditTab {...ctx} />}
      {tab !== 'edit' && (
        <div className="nextbar">
          <span className="small muted">{tab === 'scenes' ? 'Cuando las escenas te gusten, pasa a generarlas.' : 'Genera lo que falte (o sube tus propios archivos) y monta el vídeo.'}</span>
          <button className="btn primary" onClick={() => { setTab(tab === 'scenes' ? 'produce' : 'edit'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>{tab === 'scenes' ? 'Siguiente: Generar' : 'Siguiente: Montar'} <ArrowRight size={16} /></button>
        </div>
      )}
      {showSettings && <Modal title="Ajustes del vídeo" wide onClose={() => setShowSettings(false)}><SettingsTab {...ctx} /></Modal>}
    </div>
  );
}

/* ---------------- ESCENAS ---------------- */
function ScenesTab({ p, mutate, upScene, chars, id, setP, setNotice, flush }) {
  const { boot, toast } = useApp();
  const [open, setOpen] = useState(() => new Set(p.scenes.slice(0, 1).map((s) => s.id)));
  const [drag, setDrag] = useState(null);
  const [over, setOver] = useState(null);
  const [regen, setRegen] = useState(false);
  const [busy, setBusy] = useState(false);
  const toggle = (sid) => setOpen((o) => { const n = new Set(o); n.has(sid) ? n.delete(sid) : n.add(sid); return n; });
  const move = (from, to) => { if (to < 0 || to >= p.scenes.length || from === to) return; mutate((c) => { const a = [...c.scenes]; const [x] = a.splice(from, 1); a.splice(to, 0, x); return { ...c, scenes: a }; }); };
  const add = () => { const s = blankScene(); mutate((c) => ({ ...c, scenes: [...c.scenes, s] })); setOpen((o) => new Set(o).add(s.id)); };
  const dup = (i) => mutate((c) => { const a = [...c.scenes]; a.splice(i + 1, 0, { ...JSON.parse(JSON.stringify(a[i])), id: uid('sc'), title: `${a[i].title} (copia)`, media: {}, dialogues: a[i].dialogues.map((d) => ({ ...d, id: uid('dlg') })) }); return { ...c, scenes: a }; });
  const del = (i) => { if (confirmAsk('¿Eliminar esta escena?')) mutate((c) => ({ ...c, scenes: c.scenes.filter((_, j) => j !== i) })); };
  const [brief, setBrief] = useState(p.brief || '');

  const regenerate = async () => {
    setBusy(true);
    try {
      await flush();
      const r = await api.post(`/projects/${id}/storyboard`, { text: brief });
      setP(r.project); setNotice(r.warning); setRegen(false); toast('Escenas regeneradas', 'ok');
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  const total = p.scenes.reduce((a, s) => a + (s.duration || 0), 0);

  return (
    <div className="col">
      <div className="row between">
        <span className="muted">{p.scenes.length} escenas · ~{total}s · arrastra <GripVertical size={13} style={{ verticalAlign: -2 }} /> para reordenar</span>
        <div className="row"><button className="btn" onClick={() => setRegen(true)}><RefreshCw size={15} /> Regenerar escenas</button><button className="btn primary" onClick={add}><Plus size={15} /> Añadir escena</button></div>
      </div>
      {p.scenes.length === 0 && <div className="empty">No hay escenas. Añade una o regenera desde tu idea.</div>}
      {p.scenes.map((s, i) => (
        <div key={s.id} className={`scene ${over === i && drag !== null && drag !== i ? 'over' : ''} ${drag === i ? 'dragging' : ''}`}
          onDragOver={(e) => { if (drag !== null) { e.preventDefault(); setOver(i); } }} onDrop={(e) => { e.preventDefault(); move(drag, i); setDrag(null); setOver(null); }}>
          <div className="scene-head" onClick={() => toggle(s.id)}>
            <span className="grab" draggable onDragStart={(e) => { setDrag(i); e.dataTransfer.effectAllowed = 'move'; }} onDragEnd={() => { setDrag(null); setOver(null); }} onClick={(e) => e.stopPropagation()} aria-label="Arrastrar"><GripVertical size={18} /></span>
            <span className="num">{i + 1}</span>
            <div style={{ flex: 1, minWidth: 0 }}><b>{s.title || 'Sin título'}</b><div className="small muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.visual || 'Sin descripción visual'}</div></div>
            <span className="chip">{s.duration}s</span>
            <span className="row" onClick={(e) => e.stopPropagation()} style={{ gap: 2 }}>
              <button className="btn ghost icon sm" aria-label="Subir" disabled={i === 0} onClick={() => move(i, i - 1)}><ChevronUp size={16} /></button>
              <button className="btn ghost icon sm" aria-label="Bajar" disabled={i === p.scenes.length - 1} onClick={() => move(i, i + 1)}><ChevronDown size={16} /></button>
              <button className="btn ghost icon sm" aria-label="Duplicar" onClick={() => dup(i)}><Copy size={15} /></button>
              <button className="btn ghost icon sm danger" aria-label="Eliminar" onClick={() => del(i)}><Trash2 size={15} /></button>
            </span>
          </div>
          {open.has(s.id) && <SceneForm s={s} up={(patch) => upScene(s.id, patch)} chars={chars} projectChars={p.characterIds} options={boot.options} />}
        </div>
      ))}
      {regen && (
        <Modal title="Regenerar escenas" onClose={() => setRegen(false)}>
          <div className="col">
            <div className="banner"><Wand size={18} /><div>Se <b>sustituirán todas las escenas actuales</b> (y sus imágenes/vídeos/voces asociados quedarán desvinculados).</div></div>
            <Field label="Idea / guion / prompt"><textarea value={brief} onChange={(e) => setBrief(e.target.value)} style={{ minHeight: 160 }} /></Field>
            <button className="btn primary" disabled={busy || !brief.trim()} onClick={regenerate}>{busy ? <Spinner /> : <RefreshCw size={15} />} Regenerar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function SceneForm({ s, up, chars, projectChars, options }) {
  const pool = chars.filter((c) => projectChars.includes(c.id) || s.characters.includes(c.id));
  const available = pool.length ? pool : chars;
  const toggleChar = (cid) => up({ characters: s.characters.includes(cid) ? s.characters.filter((x) => x !== cid) : [...s.characters, cid] });
  const upD = (did, patch) => up({ dialogues: s.dialogues.map((d) => (d.id === did ? { ...d, ...patch } : d)) });
  return (
    <div className="scene-body">
      <div className="grid2">
        <Field label="Título de la escena"><input type="text" value={s.title} onChange={(e) => up({ title: e.target.value })} /></Field>
        <Field label="Duración (s)"><input type="number" min={1} max={60} value={s.duration} onChange={(e) => up({ duration: Math.max(1, Math.min(60, +e.target.value || 1)) })} /></Field>
      </div>
      <Field label="Descripción visual" hint="Qué se ve: lugar, acción, composición. Se envía al generador de imagen/vídeo."><textarea value={s.visual} onChange={(e) => up({ visual: e.target.value })} /></Field>
      <div>
        <div className="small muted" style={{ marginBottom: 6 }}>Personajes presentes</div>
        <div className="pills">{available.length === 0 && <span className="small faint">No hay personajes en tu biblioteca.</span>}{available.map((c) => <button type="button" key={c.id} className={`pill ${s.characters.includes(c.id) ? 'on' : ''}`} onClick={() => toggleChar(c.id)}>{c.name}</button>)}</div>
      </div>
      <div className="col" style={{ gap: 8 }}>
        <div className="row between"><span className="small muted">Diálogos</span><button className="btn sm" onClick={() => up({ dialogues: [...s.dialogues, { id: uid('dlg'), characterId: s.characters[0] || null, speaker: '', text: '', emotion: 'Neutra' }] })}><Plus size={13} /> Diálogo</button></div>
        {s.dialogues.map((d) => (
          <div key={d.id} className="dlg">
            <select aria-label="Personaje que habla" value={d.characterId || ''} onChange={(e) => { const c = chars.find((x) => x.id === e.target.value); upD(d.id, { characterId: c?.id || null, speaker: c?.name || d.speaker }); }}>
              <option value="">{d.speaker ? `${d.speaker} (sin personaje)` : 'Narrador / otro'}</option>{chars.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <textarea aria-label="Texto" style={{ minHeight: 40 }} value={d.text} onChange={(e) => upD(d.id, { text: e.target.value })} placeholder="Texto del diálogo" />
            <select aria-label="Emoción" value={d.emotion} onChange={(e) => upD(d.id, { emotion: e.target.value })}>{options.emotions.map((x) => <option key={x}>{x}</option>)}</select>
            <button className="btn ghost icon danger" aria-label="Quitar diálogo" onClick={() => up({ dialogues: s.dialogues.filter((x) => x.id !== d.id) })}><Trash2 size={15} /></button>
          </div>
        ))}
      </div>
      <details className="more">
        <summary>Más detalles <span className="faint" style={{ fontWeight: 500 }}>expresiones, movimientos, cámara, sonidos</span></summary>
        <div className="col">
      <div className="grid2">
        <Field label="Expresiones faciales"><input type="text" value={s.expressions} onChange={(e) => up({ expressions: e.target.value })} placeholder="Sorpresa, ceño fruncido…" /></Field>
        <Field label="Movimientos corporales"><input type="text" value={s.movements} onChange={(e) => up({ movements: e.target.value })} placeholder="Golpea la mesa, señala la cuenta…" /></Field>
      </div>
          <Field label="Movimiento de cámara"><select value={s.camera} onChange={(e) => up({ camera: e.target.value })}>{!options.cameras.includes(s.camera) && <option>{s.camera}</option>}{options.cameras.map((c) => <option key={c}>{c}</option>)}</select></Field>
      <Field label="Sonidos / efectos" hint="Ambiente y efectos (ej.: murmullo de cafetería, golpe de taza)."><input type="text" value={s.sounds} onChange={(e) => up({ sounds: e.target.value })} /></Field>
        </div>
      </details>
    </div>
  );
}

/* ---------------- PRODUCCIÓN ---------------- */
function ProduceTab({ p, assets, chars, upScene, projJobs, reloadMedia, id, mutate }) {
  const { generate, connected, boot, toast } = useApp();
  const [target, setTarget] = useState(null);
  const [pickFor, setPickFor] = useState(null);
  const cats = ['image', 'video', 'voice', 'sfx'];
  const cost = (k) => Math.max(1, Math.round(boot.creditCost[k] * (k === 'image' || k === 'video' ? boot.options.qualities.find((q) => q.id === p.settings.quality).multiplier : 1)));
  const busy = (sid, kind) => projJobs.some((j) => j.sceneId === sid && j.kind === kind && ['queued', 'running'].includes(j.status));
  const run = (kind, sid, extra = {}) => generate(kind, { projectId: id, sceneId: sid, ...extra });
  const voices = (s) => s.dialogues.filter((d) => d.text.trim());
  const setMedia = async (sid, patch) => { await api.patch(`/projects/${id}/media`, { scenes: { [sid]: patch } }); await reloadMedia(); };

  const generateAll = async (kind) => {
    let n = 0;
    for (const s of p.scenes) {
      if (kind === 'image' && !s.media.imageAssetId && s.visual) { if (await run('image', s.id)) n++; }
      if (kind === 'video' && !s.media.videoAssetId && (s.media.imageAssetId || s.visual)) { if (await run('video', s.id)) n++; }
      if (kind === 'voice') for (const d of voices(s)) if (!s.media.audio?.[d.id]) { if (await run('voice', s.id, { dialogueId: d.id })) n++; }
    }
    if (n) toast(`${n} trabajos en cola`, 'ok'); else toast('Nada pendiente de generar (o falta conectar el proveedor).', 'warn');
  };
  const upload = async (sid, kind, files) => {
    try { const r = await api.post('/assets', form(files, { projectId: id })); await setMedia(sid, { [kind === 'image' ? 'imageAssetId' : 'videoAssetId']: r.assets[0].id }); toast('Archivo asociado a la escena', 'ok'); } catch (e) { toast(e.message, 'error'); }
  };

  return (
    <div className="col">
      {['image', 'video', 'voice'].some((k) => !connected(k)) && (
        <div className="banner"><Plug size={18} /><div><b>Falta conectar la IA</b> para generar {['image', 'video', 'voice'].filter((k) => !connected(k)).map((k) => ({ image: 'imágenes', video: 'vídeo', voice: 'voces' }[k])).join(', ')}. Mientras tanto puedes subir tus propios archivos. <Link to="/settings">Conectar →</Link></div></div>
      )}
      <div className="card row between">
        <div><b>Generar todo de una vez</b><div className="small muted">Aplica tu estilo y tus personajes. También puedes ir escena a escena.</div></div>
        <div className="row">
          <button className="btn" onClick={() => generateAll('image')}><ImageIcon size={15} /> Imágenes</button>
          <button className="btn" onClick={() => generateAll('video')}><Film size={15} /> Vídeos</button>
          <button className="btn" onClick={() => generateAll('voice')}><Mic size={15} /> Voces</button>
        </div>
      </div>
      {p.scenes.map((s, i) => {
        const img = assets[s.media.imageAssetId]; const vid = assets[s.media.videoAssetId];
        const vs = voices(s); const doneV = vs.filter((d) => s.media.audio?.[d.id]).length;
        const sceneChars = chars.filter((c) => s.characters.includes(c.id));
        const noRefs = sceneChars.length > 0 && sceneChars.every((c) => c.images.length === 0);
        return (
          <div key={s.id} className="card prod">
            <div className="thumb">{vid ? <video src={vid.url} muted controls preload="metadata" /> : img ? <img src={img.url} alt="" /> : <span className="small">Sin medios</span>}</div>
            <div className="col" style={{ gap: 10 }}>
              <div className="row between"><b>{i + 1}. {s.title}</b><div className="row">
                
              </div></div>
              {noRefs && <div className="small" style={{ color: 'var(--warn)' }}>Los personajes de esta escena no tienen imágenes de referencia: la consistencia visual será baja.</div>}
              {projJobs.filter((j) => j.sceneId === s.id && ['queued', 'running'].includes(j.status)).map((j) => <div key={j.id}><div className="small muted">{j.kind} · {j.status === 'queued' ? 'en cola' : 'generando…'}</div><div className="progress"><i style={{ width: `${Math.max(8, j.progress)}%` }} /></div></div>)}
              <div className="stepper">
                <GenBtn on={connected('image')} busy={busy(s.id, 'image')} done={!!img} onClick={() => run('image', s.id)} icon={ImageIcon} cost={cost('image')}>{img ? 'Imagen lista' : '1 · Imagen'}</GenBtn>
                <GenBtn on={connected('video')} busy={busy(s.id, 'video')} done={!!vid} onClick={() => run('video', s.id)} icon={Film} cost={cost('video')}>{vid ? 'Vídeo listo' : '2 · Vídeo'}</GenBtn>
                <GenBtn on={connected('voice')} busy={busy(s.id, 'voice')} disabled={!vs.length} done={vs.length > 0 && doneV === vs.length} onClick={async () => { for (const d of vs) await run('voice', s.id, { dialogueId: d.id }); }} icon={Mic} cost={cost('voice') * vs.length}>{vs.length && doneV === vs.length ? 'Voz lista' : '3 · Voz'}</GenBtn>
              </div>
              <details className="more" style={{ padding: '0 14px' }}>
                <summary style={{ padding: '8px 0', fontSize: 13 }}>Más opciones <span className="faint" style={{ fontWeight: 500 }}>subir archivos, efectos, sincronía labial</span></summary>
                <div className="row" style={{ paddingBottom: 12 }}>
                  <UploadBtn label="Subir imagen" accept="image/png,image/jpeg,image/webp" onFile={(f) => upload(s.id, 'image', f)} />
                  <UploadBtn label="Subir vídeo" accept="video/mp4,video/webm,video/quicktime" onFile={(f) => upload(s.id, 'video', f)} />
                  <button className="btn sm ghost" onClick={() => setPickFor(s.id)}>Elegir de la biblioteca</button>
                  <GenBtn on={connected('sfx')} busy={busy(s.id, 'sfx')} disabled={!s.sounds} onClick={() => run('sfx', s.id)} icon={Volume2} cost={cost('sfx')}>Efecto de sonido</GenBtn>
                  {vid && vs.length > 0 && <GenBtn on={connected('lipsync')} busy={busy(s.id, 'lipsync')} onClick={() => run('lipsync', s.id)} icon={Sparkles} cost={boot.creditCost.lipsync}>Sincronía labial</GenBtn>}
                  {img && <button className="btn sm ghost danger" onClick={() => setMedia(s.id, { imageAssetId: null })}>Quitar imagen</button>}
                  {vid && <button className="btn sm ghost danger" onClick={() => setMedia(s.id, { videoAssetId: null })}>Quitar vídeo</button>}
                </div>
              </details>
            </div>
          </div>
        );
      })}
      {pickFor && <LibraryPicker assets={assets} onClose={() => setPickFor(null)} onPick={(a) => { setMedia(pickFor, { [a.kind === 'image' ? 'imageAssetId' : 'videoAssetId']: a.id }); setPickFor(null); }} />}
    </div>
  );
}
function GenBtn({ on, busy, onClick, icon: I, cost, children, disabled, done }) {
  const { toast } = useApp();
  return (
    <button className={`btn sm ${on ? '' : 'locked'} ${done ? 'done' : ''}`} disabled={busy || disabled} onClick={on ? onClick : () => toast('Requiere conectar un proveedor en Configuración → Proveedores.', 'warn')} title={on ? `${cost} créditos` : 'Requiere conexión'}>
      {busy ? <Spinner size={14} /> : done ? <Check size={14} /> : on ? <I size={14} /> : <Plug size={14} />}{children}{on && !done && <span className="faint">· {cost}</span>}
    </button>
  );
}
function UploadBtn({ label, accept, onFile }) {
  const [open, input] = useFilePicker(onFile, accept);
  return <><button className="btn sm ghost" onClick={open}><Upload size={13} /> {label}</button>{input}</>;
}
function LibraryPicker({ assets, onPick, onClose }) {
  const list = Object.values(assets).filter((a) => a.kind !== 'audio');
  return (
    <Modal title="Biblioteca" onClose={onClose} wide>
      {list.length === 0 ? <div className="empty">Tu biblioteca está vacía.</div> : <div className="media-grid">{list.map((a) => <button key={a.id} className="media" style={{ padding: 0, cursor: 'pointer', textAlign: 'left' }} onClick={() => onPick(a)}><div className="m">{a.kind === 'image' ? <img src={a.url} alt="" /> : <video src={a.url} muted preload="metadata" />}</div><div className="cap"><span>{a.name || a.kind}</span></div></button>)}</div>}
    </Modal>
  );
}

/* ---------------- EDITOR + TIMELINE ---------------- */
function EditTab({ p, assets, upScene, mutate, id, reloadMedia, projJobs, flush }) {
  const { generate, connected, toast, boot } = useApp();
  const [sel, setSel] = useState(p.scenes[0]?.id || null);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [dragI, setDragI] = useState(null);
  const [overI, setOverI] = useState(null);
  const [musicPrompt, setMusicPrompt] = useState(p.settings.music && p.settings.music !== 'Sin música' ? p.settings.music : '');
  const [showLib, setShowLib] = useState(false);

  const timing = useMemo(() => {
    let off = 0;
    return p.scenes.map((s) => { const tm = sceneTiming(s, assets); const r = { s, start: off, ...tm }; off += tm.len; return r; });
  }, [p.scenes, assets]);
  const total = timing.length ? timing[timing.length - 1].start + timing[timing.length - 1].len : 0;
  const cur = timing.find((x) => t >= x.start && t < x.start + x.len) || timing[timing.length - 1];
  const selScene = p.scenes.find((s) => s.id === sel);
  const music = assets[p.media.musicAssetId];

  // Reproductor
  const vidRef = useRef(); const musicRef = useRef(); const tRef = useRef(0); const fired = useRef(new Set()); const audios = useRef(new Map());
  tRef.current = t;
  useEffect(() => {
    if (!playing) { vidRef.current?.pause(); musicRef.current?.pause(); audios.current.forEach((a) => a.pause()); return undefined; }
    let raf; let last = performance.now();
    if (musicRef.current && music) { musicRef.current.volume = p.editor?.musicVolume ?? 0.25; musicRef.current.currentTime = tRef.current % (music.meta.duration || 1); musicRef.current.play().catch(() => {}); }
    const loop = (now) => {
      const dt = (now - last) / 1000; last = now;
      const nt = tRef.current + dt;
      if (nt >= total) { setPlaying(false); setT(0); fired.current.clear(); return; }
      setT(nt); tRef.current = nt;
      for (const x of timing) {
        if (nt >= x.start && nt < x.start + x.len) {
          x.lines.forEach((l) => { const k = `${x.s.id}:${l.d.id}`; if (l.audio && !fired.current.has(k) && nt - x.start >= l.start) { fired.current.add(k); const a = new Audio(l.audio); a.currentTime = Math.max(0, nt - x.start - l.start); a.play().catch(() => {}); audios.current.set(k, a); } });
          const sk = `${x.s.id}:sfx`; const sfx = assets[x.s.media?.sfxAssetId];
          if (sfx && !fired.current.has(sk)) { fired.current.add(sk); const a = new Audio(sfx.url); a.volume = x.s.sfxVolume ?? 0.8; a.play().catch(() => {}); audios.current.set(sk, a); }
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, total]); // eslint-disable-line
  // Sincroniza el <video> de la escena actual
  useEffect(() => {
    const v = vidRef.current; if (!v || !cur?.vid) return;
    const want = (cur.s.trimIn || 0) + (t - cur.start);
    if (!playing || Math.abs(v.currentTime - want) > 0.4) v.currentTime = Math.max(0, want);
    if (playing && v.paused) v.play().catch(() => {});
  }, [cur?.s.id, playing, Math.floor(t * 2)]); // eslint-disable-line
  const seek = (nt) => { fired.current.clear(); audios.current.forEach((a) => a.pause()); setT(nt); if (musicRef.current && music) musicRef.current.currentTime = nt % (music.meta.duration || 1); };
  const sub = p.editor?.subtitles?.enabled && cur ? cur.lines.find((l) => t - cur.start >= l.start && t - cur.start < l.end + 0.3) : null;
  const img = cur && assets[cur.s.media?.imageAssetId];

  const setEditor = (patch) => mutate((c) => ({ ...c, editor: { ...c.editor, ...patch, subtitles: { enabled: false, position: 'bottom', size: 'medium', ...c.editor?.subtitles, ...(patch.subtitles || {}) } } }));
  const reorder = (from, to) => { if (from === to || from == null) return; mutate((c) => { const a = [...c.scenes]; const [x] = a.splice(from, 1); a.splice(to, 0, x); return { ...c, scenes: a }; }); };
  const setMusic = async (aid) => { await api.patch(`/projects/${id}/media`, { project: { musicAssetId: aid } }); reloadMedia(); };
  const uploadMusic = async (files) => { try { const r = await api.post('/assets', form(files, { projectId: id })); await setMusic(r.assets[0].id); toast('Música añadida', 'ok'); } catch (e) { toast(e.message, 'error'); } };
  const [pickMusic, musicInput] = useFilePicker(uploadMusic, 'audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/aac');
  const [pickSfx, sfxInput] = useFilePicker(async (files) => { try { const r = await api.post('/assets', form(files, { projectId: id })); await api.patch(`/projects/${id}/media`, { scenes: { [sel]: { sfxAssetId: r.assets[0].id } } }); await reloadMedia(); toast('Efecto añadido', 'ok'); } catch (e) { toast(e.message, 'error'); } }, 'audio/mpeg,audio/wav,audio/ogg');
  const exporting = projJobs.find((j) => j.kind === 'export' && ['queued', 'running'].includes(j.status));
  const lastExport = projJobs.find((j) => j.kind === 'export' && j.status === 'succeeded');
  const doExport = async () => { await flush(); const j = await generate('export', { projectId: id }); if (j) toast('Exportación iniciada', 'ok'); };
  const PX = 60; // píxeles por segundo
  const W = Math.max(total * PX, 300);
  const aspectCls = { '9:16': 'a916', '16:9': 'a169', '1:1': 'a11' }[p.settings.aspect];
  const dlgAudio = selScene && selScene.dialogues.filter((d) => d.text.trim());
  const ticks = Array.from({ length: Math.floor(total / 5) + 1 }, (_, i) => i * 5);

  return (
    <div className="editor">
      <div>
        <div className={`player ${aspectCls}`}>
          {cur?.vid ? <video ref={vidRef} src={cur.vid.url} muted playsInline /> : img ? <img src={img.url} alt="" /> : <div className="ph">{cur ? <>Escena {timing.indexOf(cur) + 1} sin imagen ni vídeo.<br />Genera o sube uno en “Producción”.</> : 'Sin escenas'}</div>}
          {sub && <div className={`sub ${p.editor?.subtitles?.position || 'bottom'}`}>{sub.d.text}</div>}
        </div>
        {music && <audio ref={musicRef} src={music.url} loop preload="auto" />}
        <div className="transport">
          <button className="btn primary icon" aria-label={playing ? 'Pausa' : 'Reproducir'} disabled={!total} onClick={() => { if (!playing && t >= total - 0.1) seek(0); setPlaying(!playing); }}>{playing ? <Pause size={18} /> : <Play size={18} />}</button>
          <input className="seek" type="range" min={0} max={Math.max(total, 0.1)} step={0.05} value={t} onChange={(e) => seek(+e.target.value)} aria-label="Posición" />
          <span className="small muted" style={{ minWidth: 76, textAlign: 'right' }}>{fmtTime(t)} / {fmtTime(total)}</span>
        </div>
        <div className="card col" style={{ marginTop: 14 }}>
          <div className="row between"><b>Exportar vídeo</b><span className="small muted">{p.settings.aspect} · {boot.options.qualities.find((q) => q.id === p.settings.quality).name}</span></div>
          <button className="btn primary" disabled={!!exporting || !p.scenes.length} onClick={doExport}>{exporting ? <><Spinner /> Exportando… {exporting.progress}%</> : <><Download size={16} /> Exportar MP4</>}</button>
          {lastExport?.output?.asset && <div className="col" style={{ gap: 8 }}>
            <video src={lastExport.output.asset.url} controls style={{ width: '100%', borderRadius: 10, maxHeight: 280 }} />
            <a className="btn" href={lastExport.output.asset.url} download={`${p.title}.mp4`}><Download size={15} /> Descargar</a>
            {lastExport.output.warnings?.map((w) => <div key={w} className="small" style={{ color: 'var(--warn)' }}>{w}</div>)}
          </div>}
          {projJobs.find((j) => j.kind === 'export' && j.status === 'failed') && !exporting && !lastExport && <div className="banner err small">{projJobs.find((j) => j.kind === 'export' && j.status === 'failed').error}</div>}
          <p className="small faint">La exportación se monta en el servidor con ffmpeg a partir de las imágenes, vídeos, voces, SFX y música de cada escena.</p>
        </div>
      </div>

      <div className="col" style={{ minWidth: 0 }}>
        <div className="timeline" aria-label="Línea de tiempo">
          <div className="tl-inner" style={{ width: W + 64 }}>
            <div className="tl-ruler" style={{ marginLeft: 64 }}>{ticks.map((s) => <span key={s} style={{ left: s * PX }}>{fmtTime(s)}</span>)}</div>
            <div className="tl-track"><div className="tl-label">Vídeo</div><div className="tl-lane" style={{ width: W, flex: 'none' }} onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); seek(Math.min(total, (e.clientX - r.left) / PX)); }}>
              {timing.map((x, i) => { const im = assets[x.s.media?.imageAssetId]; return (
                <div key={x.s.id} className={`tl-block ${sel === x.s.id ? 'sel' : ''} ${overI === i && dragI !== null && dragI !== i ? 'over' : ''}`} draggable
                  style={{ left: x.start * PX + 1, width: x.len * PX - 2, backgroundImage: im ? `linear-gradient(#0000,#000a), url(${im.url})` : undefined }}
                  onClick={(e) => { e.stopPropagation(); setSel(x.s.id); }} onDragStart={() => setDragI(i)} onDragEnd={() => { setDragI(null); setOverI(null); }}
                  onDragOver={(e) => { e.preventDefault(); setOverI(i); }} onDrop={(e) => { e.preventDefault(); reorder(dragI, i); setDragI(null); setOverI(null); }} title="Arrastra para reordenar">
                  {i + 1}. {x.s.title}
                </div>); })}
            </div></div>
            <div className="tl-track thin"><div className="tl-label">Voz</div><div className="tl-lane" style={{ width: W, flex: 'none' }}>
              {timing.flatMap((x) => x.lines.map((l) => <div key={x.s.id + l.d.id} className="tl-block voice" style={{ left: (x.start + l.start) * PX, width: Math.max(8, (l.end - l.start) * PX), opacity: l.audio ? 1 : 0.35 }} title={l.audio ? l.d.text : `${l.d.text} (voz sin generar)`}>{l.audio ? '🔊' : '·'} {l.d.speaker || ''}</div>))}
            </div></div>
            <div className="tl-track thin"><div className="tl-label">SFX</div><div className="tl-lane" style={{ width: W, flex: 'none' }}>
              {timing.filter((x) => x.s.media?.sfxAssetId).map((x) => <div key={x.s.id} className="tl-block sfx" style={{ left: x.start * PX, width: Math.max(24, Math.min(x.len, assets[x.s.media.sfxAssetId]?.meta?.duration || 3) * PX) }}>SFX</div>)}
            </div></div>
            <div className="tl-track thin"><div className="tl-label">Música</div><div className="tl-lane" style={{ width: W, flex: 'none' }}>{music && <div className="tl-block music" style={{ left: 0, width: W }}>♪ {music.name}</div>}</div></div>
            <div className="tl-track thin"><div className="tl-label">Subt.</div><div className="tl-lane" style={{ width: W, flex: 'none' }}>
              {p.editor?.subtitles?.enabled && timing.flatMap((x) => x.lines.map((l) => <div key={x.s.id + l.d.id} className="tl-block sub" style={{ left: (x.start + l.start) * PX, width: Math.max(8, (l.end - l.start) * PX) }}>{l.d.text}</div>))}
            </div></div>
            <div className="tl-playhead" style={{ left: 64 + t * PX }} />
          </div>
        </div>

        {selScene && (
          <div className="card col">
            <div className="row between"><h3>Escena {p.scenes.indexOf(selScene) + 1}: {selScene.title}</h3>
              <div className="row">
                <button className="btn sm" disabled={!connected('image')} onClick={() => generate('image', { projectId: id, sceneId: selScene.id })}><RefreshCw size={13} /> Regenerar imagen</button>
                <button className="btn sm" disabled={!connected('video')} onClick={() => generate('video', { projectId: id, sceneId: selScene.id })}><RefreshCw size={13} /> Regenerar vídeo</button>
              </div></div>
            {(!connected('image') || !connected('video')) && <div className="small" style={{ color: 'var(--warn)' }}><Plug size={12} /> Regenerar requiere proveedores de imagen/vídeo conectados.</div>}
            <div className="grid2">
              <Field label={`Duración: ${selScene.duration}s`} hint={assets[selScene.media?.videoAssetId] ? 'Con vídeo, la duración la marca el recorte.' : 'Se usa para imágenes sin vídeo.'}><input type="range" min={1} max={30} value={selScene.duration} onChange={(e) => upScene(selScene.id, { duration: +e.target.value })} /></Field>
              {assets[selScene.media?.videoAssetId]?.meta?.duration && (() => { const vd = assets[selScene.media.videoAssetId].meta.duration; return (
                <div className="col" style={{ gap: 6 }}>
                  <Field label={`Recorte: inicio ${selScene.trimIn.toFixed(1)}s`}><input type="range" min={0} max={vd - 0.5} step={0.1} value={selScene.trimIn} onChange={(e) => upScene(selScene.id, { trimIn: Math.min(+e.target.value, (selScene.trimOut || vd) - 0.5) })} /></Field>
                  <Field label={`Recorte: fin ${(selScene.trimOut || vd).toFixed(1)}s de ${vd}s`}><input type="range" min={0.5} max={vd} step={0.1} value={selScene.trimOut || vd} onChange={(e) => upScene(selScene.id, { trimOut: Math.max(+e.target.value, selScene.trimIn + 0.5) })} /></Field>
                </div>); })()}
            </div>
            <div className="small muted"><Scissors size={12} /> Edita diálogos aquí (ajusta subtítulos y voz tras regenerar):</div>
            {dlgAudio.map((d) => {
              const au = assets[selScene.media?.audio?.[d.id]];
              return (
                <div key={d.id} className="audio-row" style={{ flexWrap: 'wrap' }}>
                  <b className="small" style={{ minWidth: 80 }}>{d.speaker || 'Narrador'}</b>
                  <input type="text" style={{ flex: 1, minWidth: 180 }} value={d.text} onChange={(e) => upScene(selScene.id, { dialogues: selScene.dialogues.map((x) => (x.id === d.id ? { ...x, text: e.target.value } : x)) })} />
                  {au ? <audio src={au.url} controls preload="none" /> : <span className="chip">sin voz</span>}
                  <button className="btn sm" disabled={!connected('voice')} onClick={() => generate('voice', { projectId: id, sceneId: selScene.id, dialogueId: d.id })} title={connected('voice') ? 'Generar voz' : 'Requiere proveedor de voz'}><Mic size={13} /> {au ? 'Regenerar' : 'Generar'}</button>
                </div>
              );
            })}
            <div className="row"><button className="btn sm" onClick={pickSfx}><Volume2 size={13} /> {selScene.media?.sfxAssetId ? 'Cambiar' : 'Añadir'} efecto de sonido (archivo)</button>{sfxInput}
              <button className="btn sm" disabled={!connected('sfx') || !selScene.sounds} onClick={() => generate('sfx', { projectId: id, sceneId: selScene.id })}><Sparkles size={13} /> Generar SFX con IA</button>
              {selScene.media?.sfxAssetId && <button className="btn sm ghost danger" onClick={async () => { await api.patch(`/projects/${id}/media`, { scenes: { [selScene.id]: { sfxAssetId: null } } }); reloadMedia(); }}>Quitar SFX</button>}</div>
          </div>
        )}

        <div className="grid2">
          <div className="card col">
            <h3><Music size={15} /> Música</h3>
            {music ? <><audio src={music.url} controls preload="none" style={{ width: '100%' }} /><div className="small muted">{music.name}</div>
              <Field label={`Volumen: ${Math.round((p.editor?.musicVolume ?? 0.25) * 100)}%`}><input type="range" min={0} max={1} step={0.05} value={p.editor?.musicVolume ?? 0.25} onChange={(e) => setEditor({ musicVolume: +e.target.value })} /></Field>
              <button className="btn sm danger" onClick={() => setMusic(null)}>Quitar música</button></> : <div className="small muted">Sin música. Sube un archivo o genérala con IA.</div>}
            <div className="row"><button className="btn sm" onClick={pickMusic}><Upload size={13} /> Subir audio</button>{musicInput}<button className="btn sm" onClick={() => setShowLib(true)}>Biblioteca</button></div>
            <div className="col" style={{ gap: 8 }}><input type="text" placeholder="Describe la música (ej.: jazz suave de cafetería)" value={musicPrompt} onChange={(e) => setMusicPrompt(e.target.value)} />
              <button className="btn sm" disabled={!connected('music') || !musicPrompt.trim()} onClick={() => generate('music', { projectId: id, prompt: musicPrompt, duration: Math.max(10, Math.round(total)) })}>{connected('music') ? <Sparkles size={13} /> : <Plug size={13} />} Generar</button></div>
            {!connected('music') && <div className="small" style={{ color: 'var(--warn)' }}>Generar música requiere un proveedor de música conectado.</div>}
          </div>
          <div className="card col">
            <h3><Captions size={15} /> Subtítulos</h3>
            <label className="row"><input type="checkbox" checked={!!p.editor?.subtitles?.enabled} onChange={(e) => setEditor({ subtitles: { enabled: e.target.checked } })} /> Grabar subtítulos en el vídeo exportado</label>
            <div className="grid2">
              <Field label="Posición"><select value={p.editor?.subtitles?.position || 'bottom'} onChange={(e) => setEditor({ subtitles: { position: e.target.value } })}><option value="bottom">Abajo</option><option value="middle">Centro</option><option value="top">Arriba</option></select></Field>
              <Field label="Tamaño"><select value={p.editor?.subtitles?.size || 'medium'} onChange={(e) => setEditor({ subtitles: { size: e.target.value } })}><option value="small">Pequeño</option><option value="medium">Medio</option><option value="large">Grande</option></select></Field>
            </div>
            <a className="btn sm" href={`/api/projects/${id}/subtitles.srt`} download><Download size={13} /> Descargar .srt</a>
            <p className="small faint">Los subtítulos salen de los diálogos de las escenas.</p>
          </div>
        </div>
      </div>
      {showLib && <Modal title="Elegir audio" wide onClose={() => setShowLib(false)}><AudioPicker onPick={(a) => { setMusic(a.id); setShowLib(false); }} /></Modal>}
    </div>
  );
}
function AudioPicker({ onPick }) {
  const [l, setL] = useState(null);
  useEffect(() => { api.get('/assets?kind=audio').then((r) => setL(r.assets)); }, []);
  if (!l) return <Spinner />;
  return l.length === 0 ? <div className="empty">No hay audios en tu biblioteca.</div> : <div className="col">{l.map((a) => <div key={a.id} className="audio-row"><span style={{ flex: 1 }} className="small">{a.name || 'Audio'}</span><audio src={a.url} controls preload="none" /><button className="btn sm" onClick={() => onPick(a)}>Usar</button></div>)}</div>;
}

/* ---------------- AJUSTES ---------------- */
function SettingsTab({ p, mutate, chars }) {
  const { boot } = useApp();
  const S = p.settings; const o = boot.options;
  const setS = (k, v) => mutate((c) => ({ ...c, settings: { ...c.settings, [k]: v } }));
  return (
    <div className="col" style={{ maxWidth: 860 }}>
      <div className="card col">
        <h3>Estilo visual</h3>
        <p className="small muted">Se aplica a las próximas generaciones. Las imágenes ya generadas no cambian: regenéralas para adoptar el nuevo estilo.</p>
        <select value={S.style} onChange={(e) => setS('style', e.target.value)}>{boot.styles.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        <div className="grid3">
          <Field label="Formato"><select value={S.aspect} onChange={(e) => setS('aspect', e.target.value)}>{o.aspects.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
          <Field label="Calidad"><select value={S.quality} onChange={(e) => setS('quality', e.target.value)}>{o.qualities.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
          <Field label="Iluminación"><select value={S.lighting} onChange={(e) => setS('lighting', e.target.value)}><option value="">Automática</option>{o.lightings.map((a) => <option key={a}>{a}</option>)}</select></Field>
          <Field label="Ambiente"><select value={S.ambience} onChange={(e) => setS('ambience', e.target.value)}><option value="">Automático</option>{o.ambiences.map((a) => <option key={a}>{a}</option>)}</select></Field>
        </div>
      </div>
      <div className="card col">
        <h3>Personajes del proyecto</h3>
        <div className="pills">{chars.length === 0 && <span className="small faint">Sin personajes en la biblioteca.</span>}{chars.map((c) => <button key={c.id} className={`pill ${p.characterIds.includes(c.id) ? 'on' : ''}`} onClick={() => mutate((x) => ({ ...x, characterIds: x.characterIds.includes(c.id) ? x.characterIds.filter((i) => i !== c.id) : [...x.characterIds, c.id] }))}>{c.name} · {c.images.length} refs</button>)}</div>
      </div>
    </div>
  );
}
