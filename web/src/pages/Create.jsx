import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Wand2, ScrollText, ImagePlus, Terminal, Check, ArrowLeft, ArrowRight, User, Layers, Plug, Sparkles } from 'lucide-react';
import { api, form } from '../api.js';
import { useApp } from '../store.jsx';
import { Drop, Field, Spinner } from '../components/ui.jsx';
import StyleArt from '../components/StyleArt.jsx';

const MODES = [
  ['idea', 'Idea', Wand2, 'Tu idea', 'Un caballero elegante entra en una cafetería, pide un café y descubre que cuesta 8 euros. Se enfada con el camarero.', 'Cuéntala con tus palabras: la IA la convierte en escenas.'],
  ['script', 'Guion', ScrollText, 'Tu guion', 'ESCENA 1: Entrada\nDon Álvaro entra en la cafetería.\nDon Álvaro: Buenos días, un café solo.\n\nESCENA 2: La cuenta\nCAMARERO: Son 8 euros.', 'Pégalo y lo dividimos en escenas con sus diálogos.'],
  ['image', 'Imagen', ImagePlus, '¿Qué debe pasar?', 'La mujer sonríe, el viento mueve su pelo y la cámara se acerca lentamente.', 'Sube una foto o ilustración y la animamos.'],
  ['prompt', 'Prompt', Terminal, 'Lo que quieres ver', 'Un dragón de cristal sobrevuela una ciudad futurista al amanecer.', 'Describe directamente lo que aparece en pantalla.'],
];
const STEPS = ['Historia', 'Estilo', 'Formato'];
const SHAPES = { '9:16': [28, 50], '16:9': [52, 30], '1:1': [38, 38] };

export default function Create() {
  const { boot, toast, connected } = useApp();
  const nav = useNavigate();
  const loc = useLocation();
  const o = boot.options;
  const [step, setStep] = useState(0);
  const [chars, setChars] = useState([]);
  const [busy, setBusy] = useState(false);
  const [imgFile, setImgFile] = useState(null);
  const [f, setF] = useState(() => ({
    mode: loc.state?.mode || 'idea', title: '', text: loc.state?.idea || '', characterIds: [],
    settings: { style: 'cinematic3d', aspect: '9:16', quality: 'standard', duration: 30, sceneCount: 5, camera: '', lighting: '', ambience: '', music: 'Sin música', sfx: 'Ambiente sutil', language: 'español' },
  }));
  useEffect(() => { api.get('/characters').then((r) => setChars(r.characters)).catch(() => {}); }, []);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const setS = (k, v) => setF((x) => ({ ...x, settings: { ...x.settings, [k]: v } }));
  const S = f.settings;
  const mode = MODES.find((m) => m[0] === f.mode);
  const llm = connected('llm');
  const [imgUrl, setImgUrl] = useState(null);
  useEffect(() => { if (!imgFile) return setImgUrl(null); const u = URL.createObjectURL(imgFile); setImgUrl(u); return () => URL.revokeObjectURL(u); }, [imgFile]);

  const problem = () => {
    if (f.mode === 'image' && !imgFile) return 'Sube una imagen para animar.';
    if (f.mode !== 'image' && !f.text.trim()) return 'Escribe tu historia para continuar.';
    return null;
  };
  const next = () => { if (step === 0) { const p = problem(); if (p) return toast(p, 'warn'); } setStep(step + 1); };
  const toggleChar = (id) => set('characterIds', f.characterIds.includes(id) ? f.characterIds.filter((x) => x !== id) : [...f.characterIds, id]);

  const generate = async () => {
    const p = problem(); if (p) { setStep(0); return toast(p, 'warn'); }
    setBusy(true);
    try {
      let sourceAssetId;
      if (f.mode === 'image') sourceAssetId = (await api.post('/assets', form([imgFile]))).assets[0].id;
      const { project } = await api.post('/projects', { title: f.title || 'Vídeo sin título', mode: f.mode, brief: f.text, settings: S, characterIds: f.characterIds, sourceAssetId });
      const r = await api.post(`/projects/${project.id}/storyboard`, { text: f.text });
      nav(`/projects/${project.id}`, { state: { notice: r.warning, source: r.source } });
    } catch (e) { toast(e.message, 'error'); setBusy(false); }
  };

  return (
    <div className="page" style={{ maxWidth: 980 }}>
      <div className="wizard-head">
        <button className="btn ghost icon" aria-label="Atrás" onClick={() => (step ? setStep(step - 1) : nav(-1))}><ArrowLeft size={20} /></button>
        <div className="wbar">{STEPS.map((t, i) => <button key={t} className={i === step ? 'on' : i < step ? 'done' : ''} onClick={() => i <= step && setStep(i)}><i />{i + 1}. {t}</button>)}</div>
      </div>

      {step === 0 && (
        <div className="col" style={{ gap: 22 }}>
          <div><h1>¿Qué historia quieres contar?</h1><p className="muted" style={{ marginTop: 6 }}>{mode[5]}</p></div>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div className="seg" role="tablist">{MODES.map(([id, label, I]) => <button key={id} role="tab" className={f.mode === id ? 'on' : ''} onClick={() => set('mode', id)}><I size={16} />{label}</button>)}</div>
            <Link to="/reference-to-video" className="btn sm"><Layers size={15} /> Con imágenes de referencia</Link>
          </div>
          <div className="card col">
            {f.mode === 'image' && (imgFile
              ? <div className="row"><img src={imgUrl} alt="" style={{ height: 150, borderRadius: 14 }} /><button className="btn sm" onClick={() => setImgFile(null)}>Cambiar imagen</button></div>
              : <Drop onFiles={(fs) => setImgFile(fs[0])}><ImagePlus size={26} /><div style={{ fontWeight: 600 }}>Arrastra una imagen o haz clic</div></Drop>)}
            <textarea aria-label={mode[3]} style={{ minHeight: f.mode === 'script' ? 240 : 130, fontSize: 16 }} value={f.text} onChange={(e) => set('text', e.target.value)} placeholder={mode[4]} maxLength={12000} />
            {!llm && f.mode === 'idea' && <div className="banner small"><Plug size={16} /><div>Sin IA conectada creamos una <b>plantilla de escenas</b> que podrás editar. <Link to="/settings">Conectar IA</Link></div></div>}
          </div>
          <div>
            <div className="row between" style={{ marginBottom: 10 }}><h3>Personajes <span className="faint" style={{ fontWeight: 500 }}>(opcional)</span></h3>{chars.length > 0 && <span className="small muted">Mantienen su aspecto en todas las escenas</span>}</div>
            {chars.length === 0
              ? <div className="card row between"><span className="muted small">Guarda personajes para reutilizarlos con la misma cara y ropa.</span><Link to="/characters" className="btn sm">Crear personaje</Link></div>
              : <div className="row" style={{ gap: 12, flexWrap: 'nowrap', overflowX: 'auto', padding: '4px 2px 10px' }}>
                {chars.map((c) => {
                  const cover = c.images.find((i) => i.slot === 'front') || c.images[0]; const on = f.characterIds.includes(c.id);
                  return (
                    <button key={c.id} onClick={() => toggleChar(c.id)} className="card hover" style={{ padding: 8, width: 108, flex: 'none', textAlign: 'center', borderColor: on ? 'var(--accent)' : undefined, boxShadow: on ? '0 0 0 4px #6c4cf122' : undefined }}>
                      <div style={{ position: 'relative', aspectRatio: '1', borderRadius: 12, overflow: 'hidden', background: 'var(--accent-soft)', display: 'grid', placeItems: 'center', color: 'var(--accent)' }}>
                        {cover ? <img src={cover.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={28} />}
                        {on && <span className="sel" style={{ width: 24, height: 24 }}><Check size={14} /></span>}
                      </div>
                      <div className="small" style={{ fontWeight: 700, marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                    </button>
                  );
                })}
              </div>}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="col" style={{ gap: 22 }}>
          <div><h1>Elige el estilo</h1><p className="muted" style={{ marginTop: 6 }}>Se aplica a todo el vídeo para que se vea uniforme.</p></div>
          <div className="style-grid">
            {boot.styles.map((s) => (
              <button key={s.id} className={`style-card ${S.style === s.id ? 'on' : ''}`} onClick={() => setS('style', s.id)} aria-pressed={S.style === s.id}>
                <StyleArt id={s.id} /><span className="tick"><Check size={16} /></span>
                <span className="info"><b>{s.name}</b><span>{s.description}</span></span>
              </button>
            ))}
          </div>
          <p className="small faint">Las miniaturas son ilustraciones orientativas del estilo.</p>
        </div>
      )}

      {step === 2 && (
        <div className="col" style={{ gap: 22 }}>
          <div><h1>¿Dónde lo vas a publicar?</h1><p className="muted" style={{ marginTop: 6 }}>Elige formato y duración. El resto ya está listo.</p></div>
          <div className="grid3">
            {o.aspects.map((a) => (
              <button key={a.id} className={`pick ${S.aspect === a.id ? 'on' : ''}`} onClick={() => setS('aspect', a.id)} style={{ alignItems: 'center', textAlign: 'center', padding: 20 }}>
                <span style={{ height: 64, display: 'grid', placeItems: 'center' }}><span style={{ width: SHAPES[a.id][0], height: SHAPES[a.id][1], borderRadius: 7, background: S.aspect === a.id ? 'var(--grad)' : 'var(--line2)', transition: '.2s' }} /></span>
                <b style={{ justifyContent: 'center' }}>{a.id}</b><span>{a.hint}</span>
              </button>
            ))}
          </div>
          <div><h3 style={{ marginBottom: 10 }}>Duración</h3>
            <div className="pills">{[15, 30, 45, 60, 90].map((d) => <button key={d} className={`pill ${S.duration === d ? 'on' : ''}`} onClick={() => setS('duration', d)}>{d} s</button>)}</div></div>
          <details className="more">
            <summary>Más opciones <span className="faint" style={{ fontWeight: 500 }}>calidad, escenas, cámara, música…</span></summary>
            <div className="col">
              <div className="grid2">
                <Field label="Calidad"><select value={S.quality} onChange={(e) => setS('quality', e.target.value)}>{o.qualities.map((q) => <option key={q.id} value={q.id}>{q.name} · {q.hint}</option>)}</select></Field>
                <Field label={`Número de escenas: ${S.sceneCount}`}><input type="range" min={1} max={15} value={S.sceneCount} onChange={(e) => setS('sceneCount', +e.target.value)} /></Field>
                <Field label="Movimiento de cámara"><Sel value={S.camera} onChange={(v) => setS('camera', v)} items={o.cameras} empty="Automático" /></Field>
                <Field label="Iluminación"><Sel value={S.lighting} onChange={(v) => setS('lighting', v)} items={o.lightings} empty="Automática" /></Field>
                <Field label="Ambiente"><Sel value={S.ambience} onChange={(v) => setS('ambience', v)} items={o.ambiences} empty="Automático" /></Field>
                <Field label="Música"><Sel value={S.music} onChange={(v) => setS('music', v)} items={o.musicTypes} /></Field>
                <Field label="Efectos de sonido"><Sel value={S.sfx} onChange={(v) => setS('sfx', v)} items={o.sfxLevels} /></Field>
                <Field label="Título"><input type="text" maxLength={160} value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="Vídeo sin título" /></Field>
              </div>
            </div>
          </details>
          <div className="card row between" style={{ background: 'var(--accent-soft)', borderColor: '#d9ceff' }}>
            <div className="row" style={{ gap: 8 }}><span className="chip acc">{boot.styles.find((s) => s.id === S.style).name}</span><span className="chip acc">{S.aspect}</span><span className="chip acc">{S.duration} s</span>{f.characterIds.length > 0 && <span className="chip acc">{f.characterIds.length} personaje(s)</span>}</div>
            <span className="small muted"><Sparkles size={13} /> {llm ? 'La IA escribirá las escenas' : 'Plantilla de escenas editable'}</span>
          </div>
        </div>
      )}

      <div className="nextbar" style={{ position: 'static', background: 'transparent', border: 0, boxShadow: 'none', padding: '0', marginTop: 28 }}>
        <button className="btn" disabled={busy} onClick={() => (step ? setStep(step - 1) : nav(-1))}><ArrowLeft size={16} /> Atrás</button>
        {step < 2 ? <button className="btn primary lg" onClick={next}>Continuar <ArrowRight size={18} /></button>
          : <button className="btn primary lg" disabled={busy} onClick={generate}>{busy ? <><Spinner /> Creando escenas…</> : <><Wand2 size={18} /> Crear mi vídeo</>}</button>}
      </div>
    </div>
  );
}

function Sel({ value, onChange, items, empty }) {
  return <select value={value} onChange={(e) => onChange(e.target.value)}>{empty !== undefined && <option value="">{empty}</option>}{items.map((i) => <option key={i}>{i}</option>)}</select>;
}
