import { useEffect, useState } from 'react';
import { Image as ImageIcon, Film, Trash2, Upload, Wand2, Plug, Pencil } from 'lucide-react';
import { api, form } from '../api.js';
import { useApp } from '../store.jsx';
import { Empty, PageHead, LibraryTabs, Modal, Field, Spinner, NeedsConnection, useFilePicker, confirmAsk } from '../components/ui.jsx';

export default function Library({ kind }) {
  const { boot, toast, connected, generate, onJobDone } = useApp();
  const [list, setList] = useState(null);
  const [view, setView] = useState(null);
  const [gen, setGen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [g, setG] = useState({ prompt: '', style: 'cinematic3d', aspect: '16:9', characterIds: [], assetId: '' });
  const [chars, setChars] = useState([]);
  const isImg = kind === 'image';
  const load = () => api.get(`/assets?kind=${kind}`).then((r) => setList(r.assets)).catch((e) => toast(e.message, 'error'));
  useEffect(() => { setList(null); load(); api.get('/characters').then((r) => setChars(r.characters)); }, [kind]); // eslint-disable-line
  useEffect(() => onJobDone((j) => { if (j.kind === kind) load(); }), [onJobDone, kind]); // eslint-disable-line

  const upload = async (files) => { try { await api.post('/assets', form(files)); toast(`${files.length} archivo(s) subido(s)`, 'ok'); load(); } catch (e) { toast(e.message, 'error'); } };
  const [pick, input] = useFilePicker(upload, isImg ? 'image/png,image/jpeg,image/webp,image/gif' : 'video/mp4,video/webm,video/quicktime', true);
  const remove = async (a) => { if (!confirmAsk('¿Eliminar este archivo de la biblioteca? Si está en un proyecto, la escena quedará sin él.')) return; await api.del(`/assets/${a.id}`); setView(null); load(); };
  const rename = async (a) => { const name = window.prompt('Nuevo nombre', a.name); if (name == null) return; await api.patch(`/assets/${a.id}`, { name }); load(); };
  const shown = (list || []).filter((a) => filter === 'all' || (filter === 'gen' ? a.source !== 'upload' : a.source === 'upload'));
  const run = async () => { const j = await generate(kind, { prompt: g.prompt, style: g.style, aspect: g.aspect, characterIds: g.characterIds, assetId: g.assetId || undefined }); if (j) { toast('Generación en cola; verás el resultado aquí al terminar.', 'ok'); setGen(false); } };

  return (
    <div className="page">
      <PageHead title="Biblioteca" sub={isImg ? 'Tus imágenes, subidas y generadas.' : 'Tus vídeos, incluidos los exportados.'}>
        <button className="btn" onClick={pick}><Upload size={16} /> Subir archivos</button>{input}
        <button className={`btn primary ${connected(kind) ? '' : 'locked'}`} onClick={() => setGen(true)}>{connected(kind) ? <Wand2 size={16} /> : <Plug size={16} />} Generar con IA</button>
      </PageHead>
      <div className="row between" style={{ marginBottom: 6 }}><LibraryTabs /></div>
      <div className="row" style={{ marginBottom: 18 }}>
        {[['all', 'Todo'], ['up', 'Subidos'], ['gen', 'Creados con IA']].map(([k, l]) => <button key={k} className={`pill ${filter === k ? 'on' : ''}`} onClick={() => setFilter(k)}>{l}</button>)}
      </div>
      {!list ? <Spinner /> : shown.length === 0 ? <Empty icon={isImg ? ImageIcon : Film} title="Todavía no hay nada" text="Sube tus archivos o créalos con IA." /> : (
        <div className="media-grid">
          {shown.map((a) => (
            <div key={a.id} className="media">
              <div className="m" onClick={() => setView(a)}>{isImg ? <img src={a.url} alt={a.name} loading="lazy" /> : <video src={a.url} muted preload="metadata" />}</div>
              <div className="cap"><span title={a.name}>{a.name || 'Sin nombre'}</span>
                <span className="row" style={{ gap: 0 }}><button className="btn ghost icon sm" aria-label="Renombrar" onClick={() => rename(a)}><Pencil size={13} /></button><button className="btn ghost icon sm danger" aria-label="Eliminar" onClick={() => remove(a)}><Trash2 size={13} /></button></span></div>
            </div>
          ))}
        </div>
      )}
      {view && <Modal title={view.name || 'Vista previa'} wide onClose={() => setView(null)}>
        {isImg ? <img src={view.url} alt="" style={{ width: '100%', borderRadius: 12 }} /> : <video src={view.url} controls style={{ width: '100%', borderRadius: 12 }} />}
        <div className="row between" style={{ marginTop: 12 }}><span className="small muted">{view.provider ? `Generado con ${view.provider}` : view.source === 'export' ? 'Exportación' : 'Subido por ti'} {view.meta?.prompt ? `· ${view.meta.prompt.slice(0, 100)}` : ''}</span><a className="btn sm" href={view.url} download>Descargar</a></div>
      </Modal>}
      {gen && (
        <Modal title={isImg ? 'Generar imagen' : 'Generar vídeo'} onClose={() => setGen(false)}>
          <div className="col">
            <NeedsConnection category={kind} />
            <Field label="Prompt"><textarea value={g.prompt} onChange={(e) => setG({ ...g, prompt: e.target.value })} placeholder="Describe lo que quieres ver" /></Field>
            <div className="grid2">
              <Field label="Estilo"><select value={g.style} onChange={(e) => setG({ ...g, style: e.target.value })}>{boot.styles.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
              <Field label="Formato"><select value={g.aspect} onChange={(e) => setG({ ...g, aspect: e.target.value })}>{boot.options.aspects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
            </div>
            {isImg && <div><div className="small muted" style={{ marginBottom: 6 }}>Personajes de referencia (opcional)</div><div className="pills">{chars.map((c) => <button key={c.id} className={`pill ${g.characterIds.includes(c.id) ? 'on' : ''}`} onClick={() => setG({ ...g, characterIds: g.characterIds.includes(c.id) ? g.characterIds.filter((x) => x !== c.id) : [...g.characterIds, c.id] })}>{c.name}</button>)}</div></div>}
            {!isImg && <ImagePick value={g.assetId} onChange={(v) => setG({ ...g, assetId: v })} />}
            <button className="btn primary" disabled={!g.prompt.trim() || !connected(kind)} onClick={run}><Wand2 size={16} /> Generar ({boot.creditCost[kind]} créditos)</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
function ImagePick({ value, onChange }) {
  const [imgs, setImgs] = useState([]);
  useEffect(() => { api.get('/assets?kind=image').then((r) => setImgs(r.assets)); }, []);
  return <Field label="Imagen inicial (opcional)"><select value={value} onChange={(e) => onChange(e.target.value)}><option value="">Solo texto</option>{imgs.map((i) => <option key={i.id} value={i.id}>{i.name || i.id}</option>)}</select></Field>;
}
