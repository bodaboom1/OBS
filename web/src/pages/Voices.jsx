import { useEffect, useRef, useState } from 'react';
import { Mic, Wand2, Star, Plug, Play } from 'lucide-react';
import { api } from '../api.js';
import { useApp } from '../store.jsx';
import { PageHead, LibraryTabs, Field, NeedsConnection, Spinner } from '../components/ui.jsx';

const GENDER = { male: 'Masculina', female: 'Femenina', neutral: 'Neutra' };

export default function Voices() {
  const { boot, toast, connected, generate, onJobDone } = useApp();
  const [v, setV] = useState(null);
  const [chars, setChars] = useState([]);
  const [audios, setAudios] = useState([]);
  const [gender, setGender] = useState('all');
  const [f, setF] = useState({ text: '', voiceId: '', emotion: 'Neutra', speed: 1, pitch: 0 });
  const prev = useRef();
  const loadAudio = () => api.get('/assets?kind=audio').then((r) => setAudios(r.assets.filter((a) => a.meta?.voiceId)));
  useEffect(() => { api.get('/voices').then(setV); api.get('/characters').then((r) => setChars(r.characters)); loadAudio(); }, []);
  useEffect(() => onJobDone((j) => { if (j.kind === 'voice') loadAudio(); }), [onJobDone]);

  const voices = (v?.voices || []).filter((x) => gender === 'all' || x.gender === gender);
  const chosen = v?.voices.find((x) => x.id === f.voiceId);
  const go = async () => {
    const j = await generate('voice', { text: f.text, voice: chosen, emotion: f.emotion, speed: f.speed, pitch: f.pitch });
    if (j) toast('Generando voz… aparecerá abajo al terminar.', 'ok');
  };
  const setFav = async (cid) => { if (!chosen) return; await api.put(`/characters/${cid}`, { favoriteVoice: chosen }); toast(`${chosen.name} es ahora la voz favorita de ${chars.find((c) => c.id === cid).name}`, 'ok'); api.get('/characters').then((r) => setChars(r.characters)); };

  return (
    <div className="page">
      <PageHead title="Biblioteca" sub="Elige una voz, ajusta el tono y la emoción, y genera locuciones. En tus vídeos, cada personaje usa su voz favorita." />
      <LibraryTabs />
      <NeedsConnection category="voice">Las voces las ofrece OpenAI o ElevenLabs.</NeedsConnection>
      {!v ? <Spinner /> : (
        <div className="grid2" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.1fr)', alignItems: 'start', marginTop: 14 }}>
          <div className="card col">
            <div className="row between"><h3>Catálogo de voces</h3><select style={{ width: 150 }} value={gender} onChange={(e) => setGender(e.target.value)}><option value="all">Todas</option><option value="female">Femeninas</option><option value="male">Masculinas</option><option value="neutral">Neutras</option></select></div>
            {v.error && <div className="banner err small">{v.error}</div>}
            {voices.length === 0 && <p className="muted small">{v.connected ? 'No hay voces para este filtro.' : 'Conecta un proveedor de voz para ver el catálogo.'}</p>}
            <div className="col" style={{ gap: 6, maxHeight: 460, overflow: 'auto' }}>
              {voices.map((x) => (
                <div key={x.id} className={`pick ${f.voiceId === x.id ? 'on' : ''}`} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }} role="button" tabIndex={0} onClick={() => setF({ ...f, voiceId: x.id })} onKeyDown={(e) => e.key === 'Enter' && setF({ ...f, voiceId: x.id })}>
                  <div><b>{x.name}</b><span>{GENDER[x.gender] || x.gender}{x.accent ? ` · ${x.accent}` : ''}{x.age ? ` · ${x.age}` : ''}</span></div>
                  {x.preview && <button className="btn sm ghost" onClick={(e) => { e.stopPropagation(); prev.current?.pause(); prev.current = new Audio(x.preview); prev.current.play(); }}><Play size={13} /> Muestra</button>}
                </div>
              ))}
            </div>
          </div>
          <div className="col">
            <div className="card col">
              <h3>Locución</h3>
              <Field label="Texto"><textarea value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} maxLength={4000} placeholder="Escribe lo que debe decir la voz…" /></Field>
              <div className="grid2">
                <Field label="Emoción"><select value={f.emotion} onChange={(e) => setF({ ...f, emotion: e.target.value })}>{boot.options.emotions.map((x) => <option key={x}>{x}</option>)}</select></Field>
                <Field label="Voz"><input type="text" disabled value={chosen ? chosen.name : 'Selecciona una del catálogo'} /></Field>
                <Field label={`Velocidad: ${f.speed.toFixed(2)}×`}><input type="range" min={0.7} max={1.3} step={0.05} value={f.speed} onChange={(e) => setF({ ...f, speed: +e.target.value })} /></Field>
                <Field label={`Tono: ${f.pitch > 0 ? '+' : ''}${f.pitch} semitonos`}><input type="range" min={-6} max={6} step={1} value={f.pitch} onChange={(e) => setF({ ...f, pitch: +e.target.value })} /></Field>
              </div>
              <button className="btn primary" disabled={!f.text.trim() || !chosen || !connected('voice')} onClick={go}>{connected('voice') ? <Wand2 size={16} /> : <Plug size={16} />} Generar voz ({boot.creditCost.voice} crédito)</button>
              {chosen && chars.length > 0 && <div className="row"><Star size={14} /><select style={{ width: 'auto', flex: 1 }} defaultValue="" onChange={(e) => e.target.value && setFav(e.target.value)}><option value="">Guardar “{chosen.name}” como voz favorita de…</option>{chars.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>}
              <p className="small faint">El tono se aplica con ffmpeg tras la generación. La sincronía labial se solicita por escena en Producción cuando hay un proveedor de lipsync conectado.</p>
            </div>
            <div className="card col">
              <h3>Voces generadas</h3>
              {audios.length === 0 && <p className="muted small">Aún no has generado voces.</p>}
              {audios.slice(0, 12).map((a) => <div key={a.id} className="audio-row"><span className="small" style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span><audio src={a.url} controls preload="none" /></div>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
