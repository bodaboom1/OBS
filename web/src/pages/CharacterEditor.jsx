import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, X, Save, Star, Plug } from 'lucide-react';
import { api, form } from '../api.js';
import { useApp } from '../store.jsx';
import { Field, Spinner, confirmAsk } from '../components/ui.jsx';
import { consistency } from './Characters.jsx';

const TEXT = [
  ['description', 'Descripción', 'Quién es, a qué se dedica, contexto…', true],
  ['personality', 'Personalidad', 'Carácter, forma de hablar, manías…', true],
  ['appearance', 'Apariencia física', 'Rasgos, pelo, ojos, complexión, ropa habitual (esto se envía a la IA en cada escena)', true],
  ['specialFeatures', 'Características especiales', 'Cicatrices, accesorios, rasgos fantásticos…', false],
];

export default function CharacterEditor() {
  const { id } = useParams();
  const nav = useNavigate();
  const { boot, toast } = useApp();
  const [c, setC] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [voices, setVoices] = useState({ connected: false, voices: [] });
  const slots = boot.options.characterSlots;

  useEffect(() => {
    api.get(`/characters/${id}`).then((r) => setC(r.character)).catch(() => nav('/characters'));
    api.get('/voices').then(setVoices).catch(() => {});
  }, [id, nav]);

  if (!c) return <div className="page"><Spinner /></div>;
  const set = (k, v) => { setC((x) => ({ ...x, [k]: v })); setDirty(true); };
  const save = async () => {
    setSaving(true);
    try {
      const { character } = await api.put(`/characters/${id}`, c);
      setC(character); setDirty(false); toast('Ficha guardada', 'ok');
    } catch (e) { toast(e.message, 'error'); } finally { setSaving(false); }
  };
  const upload = async (slot, files, source) => {
    try { const r = await api.post(`/characters/${id}/images`, form(files, { slot, source })); setC((x) => ({ ...x, images: r.character.images })); toast('Imagen subida', 'ok'); }
    catch (e) { toast(e.message, 'error'); }
  };
  const removeImg = async (img) => { const r = await api.del(`/characters/${id}/images/${img.id}`); setC((x) => ({ ...x, images: r.character.images })); };
  const remove = async () => {
    if (!confirmAsk(`¿Eliminar a ${c.name} y todas sus imágenes?`)) return;
    await api.del(`/characters/${id}`); toast('Personaje eliminado', 'ok'); nav('/characters');
  };
  const k = consistency(c.images);
  const fav = c.favoriteVoice;

  return (
    <div className="page">
      <div className="page-head">
        <div className="row"><Link to="/characters" className="btn ghost icon" aria-label="Volver"><ArrowLeft size={18} /></Link><div><h1>{c.name}</h1><p>Ficha de personaje</p></div></div>
        <div className="row">
          <button className="btn danger" onClick={remove}><Trash2 size={16} /> Eliminar</button>
          <button className="btn primary" onClick={save} disabled={saving || !dirty}>{saving ? <Spinner /> : <Save size={16} />} Guardar cambios</button>
        </div>
      </div>

      <div className="grid2" style={{ gridTemplateColumns: 'minmax(280px,1fr) minmax(0,1.5fr)', alignItems: 'start' }}>
        <div className="card col">
          <Field label="Nombre"><input type="text" value={c.name} maxLength={120} onChange={(e) => set('name', e.target.value)} /></Field>
          <div className="grid2">
            <Field label="Edad aparente"><input type="text" value={c.apparentAge} placeholder="Ej.: 45 años" onChange={(e) => set('apparentAge', e.target.value)} /></Field>
            <Field label="Tipo de voz"><input type="text" value={c.voiceType} placeholder="Grave, cálida, nasal…" onChange={(e) => set('voiceType', e.target.value)} /></Field>
          </div>
          {TEXT.map(([key, label, hint]) => <Field key={key} label={label} hint={hint}><textarea value={c[key]} onChange={(e) => set(key, e.target.value)} /></Field>)}
          <Field label="Estilo visual preferido" hint="Opcional. El estilo del vídeo manda al crear un proyecto.">
            <select value={c.visualStyle} onChange={(e) => set('visualStyle', e.target.value)}>
              <option value="">Sin preferencia</option>{boot.styles.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <div>
            <div className="small muted" style={{ marginBottom: 6 }}>Voz favorita</div>
            {voices.connected && voices.voices.length > 0 ? (
              <select value={fav?.id || ''} onChange={(e) => { const v = voices.voices.find((x) => x.id === e.target.value); api.put(`/characters/${id}`, { favoriteVoice: v || null }).then((r) => { setC((x) => ({ ...x, favoriteVoice: r.character.favoriteVoice })); toast(v ? `Voz favorita: ${v.name}` : 'Voz favorita quitada', 'ok'); }); }}>
                <option value="">Sin voz favorita</option>
                {voices.voices.map((v) => <option key={v.id} value={v.id}>{v.name} · {v.gender}</option>)}
              </select>
            ) : (
              <div className="banner small"><Plug size={16} /><span>{fav ? <>Voz guardada: <b>{fav.name}</b>. </> : null}Conecta un proveedor de voz en <Link to="/settings" style={{ textDecoration: 'underline' }}>Configuración</Link> para elegir una voz favorita.</span></div>
            )}
            {fav && <p className="small muted" style={{ marginTop: 6 }}><Star size={12} /> Se usará automáticamente en los diálogos de {c.name}.</p>}
          </div>
        </div>

        <div className="col">
          <div className="card">
            <div className="row between"><h3>Imágenes de referencia</h3>
              <div className="row"><span className="small muted">Consistencia: <b style={{ color: 'var(--text)' }}>{k.label}</b></span><span className="meter" aria-hidden>{Array.from({ length: k.max }, (_, i) => <i key={i} className={i < k.score ? 'on' : ''} />)}</span></div>
            </div>
            <p className="small muted" style={{ margin: '6px 0 14px' }}>Cuantas más vistas subas, más fielmente mantendrá la IA su cara, ropa y proporciones. Se envían como referencia en cada escena donde aparezca.</p>
            <div className="slot-grid">
              {slots.filter((s) => !s.multiple).map((s) => <Slot key={s.id} def={s} images={c.images.filter((i) => i.slot === s.id)} onUpload={upload} onRemove={removeImg} />)}
            </div>
          </div>
          {slots.filter((s) => s.multiple).map((s) => (
            <div key={s.id} className="card">
              <div className="row between"><h3>{{ expression: 'Expresiones faciales', pose: 'Poses', external: 'Referencias de otras IAs' }[s.id] || s.name}</h3><span className="small faint">{s.id === 'external' ? 'Imágenes generadas en otras herramientas de IA' : 'Varias permitidas'}</span></div>
              <div className="slot-grid" style={{ marginTop: 12 }}>
                {c.images.filter((i) => i.slot === s.id).map((img) => <Slot key={img.id} def={s} images={[img]} onUpload={upload} onRemove={removeImg} single />)}
                <AddTile onFiles={(f) => upload(s.id, f, s.id === 'external' ? 'external_ai' : 'upload')} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AddTile({ onFiles }) {
  const ref = useRef();
  return (
    <div className="slot">
      <div className="imgbox" role="button" tabIndex={0} onClick={() => ref.current.click()} onKeyDown={(e) => e.key === 'Enter' && ref.current.click()}>
        <input ref={ref} type="file" hidden multiple accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => { const f = [...e.target.files]; e.target.value = ''; if (f.length) onFiles(f); }} />
        <div><Plus size={22} /><div>Añadir imágenes</div></div>
      </div>
    </div>
  );
}

function Slot({ def, images, onUpload, onRemove, single }) {
  const ref = useRef();
  const img = images[0];
  return (
    <div className="slot">
      <div className="imgbox" role="button" tabIndex={0} onClick={() => ref.current.click()} onKeyDown={(e) => e.key === 'Enter' && ref.current.click()}
        onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = [...e.dataTransfer.files]; if (f.length) onUpload(def.id, f); }}>
        <input ref={ref} type="file" hidden accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => { const f = [...e.target.files]; e.target.value = ''; if (f.length) onUpload(def.id, f, def.id === 'external' ? 'external_ai' : 'upload'); }} />
        {img ? <img src={img.url} alt={def.name} loading="lazy" /> : <div><Plus size={22} /><div>Subir</div></div>}
        {img && <button className="mini-x" aria-label="Quitar imagen" onClick={(e) => { e.stopPropagation(); onRemove(img); }}><X size={14} /></button>}
      </div>
      <div className="lbl"><span>{single ? def.name : def.name}</span>{img?.source === 'external_ai' && <span className="chip acc" style={{ padding: '1px 7px' }}>IA ext.</span>}</div>
    </div>
  );
}
