import { useEffect, useRef, useState } from 'react';
import { AtSign, Wand2, Sparkles, X, Film, Plug, Users, Upload, Loader2 } from 'lucide-react';
import { api, form, fmtDate } from '../api.js';
import { useApp } from '../store.jsx';
import { Drop, Field, NeedsConnection, PageHead, Spinner, StatusChip } from '../components/ui.jsx';

const TEMPLATES = [
  ['Producto', 'El @ref1 gira lentamente sobre un pedestal con luz de estudio suave, reflejos cuidados y cámara en órbita.'],
  ['Personaje', 'El personaje de @ref1 camina por una calle al atardecer, mira a cámara y sonríe. Travelling lateral, hora dorada.'],
  ['Escena', 'Plano amplio de @ref1 con niebla matinal que se disipa, la cámara avanza despacio hacia delante.'],
  ['Dos referencias', '@ref1 y @ref2 comparten el plano: se miran, @ref1 entrega algo a @ref2. Plano medio, luz cálida de interior.'],
];
const clean = (s) => s.replace(/[^\p{L}\p{N}_-]/gu, '').slice(0, 30);

export default function ReferenceVideo() {
  const { boot, toast, connected, generate, jobs } = useApp();
  const [refs, setRefs] = useState([]);      // {asset, alias}
  const [chars, setChars] = useState([]);
  const [charIds, setCharIds] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [aspect, setAspect] = useState('adaptive');
  const [duration, setDuration] = useState(5);
  const [quality, setQuality] = useState('standard');
  const [style, setStyle] = useState('');
  const [model, setModel] = useState('');
  const [custom, setCustom] = useState('');
  const [menu, setMenu] = useState(false);
  const [busy, setBusy] = useState(false);
  const [enh, setEnh] = useState(false);
  const ta = useRef();
  useEffect(() => { api.get('/characters').then((r) => setChars(r.characters)).catch(() => {}); }, []);

  const vcat = boot.categories.find((c) => c.id === 'video');
  const vprov = boot.providers.find((p) => p.id === vcat?.active);
  const options = [...new Set([vprov?.models?.video, vprov?.defaultModels?.video, ...(vprov?.modelOptions?.video || [])].filter(Boolean))];
  const chosenModel = model === '__custom' ? custom.trim() : model;
  const aliases = [...refs.map((r) => r.alias), ...chars.filter((c) => charIds.includes(c.id)).map((c) => c.name.replace(/\s+/g, ''))].filter(Boolean);
  const hasVideoRef = refs.some((r) => r.asset.kind === 'video');
  const nImages = refs.filter((r) => r.asset.kind === 'image').length + charIds.length;

  const upload = async (files) => {
    try {
      const r = await api.post('/assets', form(files));
      setRefs((cur) => {
        let n = cur.length; const used = new Set(cur.map((x) => x.alias));
        return [...cur, ...r.assets.map((a) => { let al; do { al = `ref${++n}`; } while (used.has(al)); used.add(al); return { asset: a, alias: al }; })].slice(0, 8);
      });
    } catch (e) { toast(e.message, 'error'); }
  };
  const insert = (alias) => {
    const el = ta.current; const pos = el?.selectionStart ?? prompt.length;
    const text = `@${alias} `;
    setPrompt(prompt.slice(0, pos) + text + prompt.slice(el?.selectionEnd ?? pos));
    setMenu(false);
    setTimeout(() => { el?.focus(); el?.setSelectionRange(pos + text.length, pos + text.length); }, 0);
  };
  const enhance = async () => {
    setEnh(true);
    try { const r = await api.post('/prompt/enhance', { prompt, aliases }); setPrompt(r.prompt); toast('Prompt mejorado', 'ok'); }
    catch (e) { toast(e.message, e.code === 'PROVIDER_NOT_CONFIGURED' ? 'warn' : 'error'); } finally { setEnh(false); }
  };
  const missing = aliases.filter((a) => !new RegExp(`@${a}(?![\\p{L}\\p{N}_-])`, 'iu').test(prompt));
  const unknown = [...prompt.matchAll(/@([\p{L}\p{N}_-]+)/gu)].map((m) => m[1]).filter((m) => !aliases.some((a) => a.toLowerCase() === m.toLowerCase()));
  const go = async () => {
    if (!prompt.trim() && !nImages) return toast('Describe la escena o sube una referencia.', 'warn');
    setBusy(true);
    const j = await generate('video', { prompt, refs: refs.map((r) => ({ assetId: r.asset.id, alias: r.alias })), characterIds: charIds, aspect, duration, quality, style: style || undefined, model: chosenModel || undefined });
    setBusy(false);
    if (j) toast('Vídeo en cola: aparecerá abajo al terminar.', 'ok');
  };
  const cost = Math.max(1, Math.round(boot.creditCost.video * boot.options.qualities.find((q) => q.id === quality).multiplier));
  const results = jobs.filter((j) => j.kind === 'video' && !j.projectId).slice(0, 8);

  return (
    <div className="page">
      <PageHead title="Vídeo con referencias" sub="Sube tus imágenes, cítalas con @ en la descripción y genera un vídeo guiado por ellas." />
      <NeedsConnection category="video">Elige OpenAI (Sora), fal.ai o Replicate y añade tu clave.</NeedsConnection>
      <div className="grid2" style={{ gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,1fr)', alignItems: 'start', marginTop: 14 }}>
        <div className="col">
          <div className="card col">
            <div className="row between"><h3>1 · Tus referencias</h3><span className="small faint">{refs.length + charIds.length}/8 · imágenes o vídeo</span></div>
            <Drop multiple accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime" onFiles={upload}><Upload size={22} /><div>Subir archivos (fotos de producto, personajes, ilustraciones…)</div></Drop>
            {refs.length > 0 && (
              <div className="slot-grid">
                {refs.map((r, i) => (
                  <div key={r.asset.id} className="slot">
                    <div className="imgbox" style={{ cursor: 'default' }}>
                      {r.asset.kind === 'image' ? <img src={r.asset.url} alt={r.alias} /> : <video src={r.asset.url} muted preload="metadata" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
                      <button className="mini-x" aria-label="Quitar" onClick={() => setRefs(refs.filter((x) => x !== r))}><X size={14} /></button>
                    </div>
                    <div className="lbl"><span className="faint">@</span><input type="text" aria-label="Alias" style={{ padding: '3px 6px' }} value={r.alias} onChange={(e) => setRefs(refs.map((x) => (x === r ? { ...x, alias: clean(e.target.value) } : x)))} /></div>
                  </div>
                ))}
              </div>
            )}
            {chars.length > 0 && <div><div className="small muted" style={{ margin: '4px 0 6px' }}><Users size={12} /> O usa tus personajes (sus imágenes y descripción se envían como referencia)</div>
              <div className="pills">{chars.map((c) => <button key={c.id} className={`pill ${charIds.includes(c.id) ? 'on' : ''}`} onClick={() => setCharIds(charIds.includes(c.id) ? charIds.filter((x) => x !== c.id) : [...charIds, c.id])}>{c.name}</button>)}</div></div>}
            {hasVideoRef && <div className="small" style={{ color: 'var(--warn)' }}>Las referencias en vídeo se guardan, pero ninguno de los proveedores integrados las usa todavía: solo se emplean las imágenes.</div>}
          </div>

          <div className="card col">
            <div className="row between"><h3>2 · Describe qué pasa</h3>
              <div className="row" style={{ position: 'relative' }}>
                <button className="btn sm" disabled={!aliases.length} onClick={() => setMenu(!menu)}><AtSign size={14} /> Añadir referencia</button>
                {menu && <div className="card col" style={{ position: 'absolute', right: 0, top: '110%', zIndex: 20, gap: 4, padding: 8, minWidth: 160 }}>{aliases.map((a) => <button key={a} className="btn ghost sm" style={{ justifyContent: 'flex-start' }} onClick={() => insert(a)}>@{a}</button>)}</div>}
                <button className={`btn sm ${connected('llm') ? '' : 'locked'}`} disabled={enh || !prompt.trim()} onClick={enhance} title={connected('llm') ? 'Reescribe el prompt con un modelo de lenguaje' : 'Requiere un modelo de lenguaje conectado'}>{enh ? <Loader2 size={14} className="spin" /> : connected('llm') ? <Sparkles size={14} /> : <Plug size={14} />} Mejorar prompt</button>
              </div></div>
            <textarea ref={ta} style={{ minHeight: 140 }} value={prompt} maxLength={3000} onChange={(e) => setPrompt(e.target.value)} placeholder="Ej.: El @ref1 gira lentamente mientras @ref2 lo observa. Cámara en órbita, luz de estudio." />
            <div className="pills">{TEMPLATES.map(([t, v]) => <button key={t} className="pill" onClick={() => setPrompt(v)}>{t}</button>)}</div>
            {missing.length > 0 && prompt.trim() && <div className="small faint">Aún no citas: {missing.map((m) => `@${m}`).join(', ')} (se envían igualmente como referencia).</div>}
            {unknown.length > 0 && <div className="small" style={{ color: 'var(--warn)' }}>Mención sin referencia: {unknown.map((m) => `@${m}`).join(', ')}</div>}
          </div>
        </div>

        <div className="col">
          <div className="card col">
            <h3>3 · Formato</h3>
            <Field label="Modelo" hint={vprov ? `Proveedor: ${vprov.name}` : 'Sin proveedor de vídeo conectado'}>
              <select value={model} onChange={(e) => setModel(e.target.value)}>
                <option value="">Por defecto{vprov?.models?.video || vprov?.defaultModels?.video ? ` (${vprov.models.video || vprov.defaultModels.video})` : ''}</option>
                {options.map((m) => <option key={m} value={m}>{m}</option>)}<option value="__custom">Otro modelo…</option>
              </select>
            </Field>
            {model === '__custom' && <input type="text" placeholder="identificador del modelo" value={custom} onChange={(e) => setCustom(e.target.value)} />}
            <div className="grid2">
              <Field label="Relación de aspecto" hint={aspect === 'adaptive' ? 'Se adapta a la primera imagen de referencia' : undefined}>
                <select value={aspect} onChange={(e) => setAspect(e.target.value)}><option value="adaptive">Adaptativo</option>{boot.options.aspects.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
              </Field>
              <Field label="Duración"><select value={duration} onChange={(e) => setDuration(+e.target.value)}>{[4, 5, 8, 10, 12].map((d) => <option key={d} value={d}>{d} s</option>)}</select></Field>
              <Field label="Calidad"><select value={quality} onChange={(e) => setQuality(e.target.value)}>{boot.options.qualities.map((q) => <option key={q.id} value={q.id}>{q.name}</option>)}</select></Field>
              <Field label="Estilo (opcional)"><select value={style} onChange={(e) => setStyle(e.target.value)}><option value="">Según referencias</option>{boot.styles.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
            </div>
            <button className={`btn primary lg ${connected('video') ? '' : 'locked'}`} disabled={busy || !connected('video')} onClick={go}>{busy ? <Spinner /> : <Film size={18} />} Generar vídeo · {cost} créditos</button>
            <p className="small faint">La duración y el formato exactos dependen de cada modelo (p. ej. Sora admite 4/8/12 s y no 1:1); si no los admite, verás el error y se devuelven los créditos.</p>
          </div>
          <div className="card col">
            <h3>Resultados</h3>
            {results.length === 0 && <p className="small muted">Tus vídeos generados aparecerán aquí (y en la biblioteca de vídeos).</p>}
            {results.map((j) => (
              <div key={j.id} className="col" style={{ gap: 6 }}>
                <div className="row between"><span className="small muted" style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.summary}</span><StatusChip status={j.status} /></div>
                {['queued', 'running'].includes(j.status) && <div className="progress"><i style={{ width: `${Math.max(8, j.progress)}%` }} /></div>}
                {j.status === 'failed' && <div className="small" style={{ color: 'var(--err)' }}>{j.error}</div>}
                {j.output.asset && <><video src={j.output.asset.url} controls style={{ width: '100%', borderRadius: 10, maxHeight: 320 }} /><a className="btn sm" href={j.output.asset.url} download>Descargar</a></>}
                <span className="small faint">{fmtDate(j.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
