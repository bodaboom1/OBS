import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lightbulb, ScrollText, ImagePlus, Users, Terminal, Check, ArrowLeft, ArrowRight, Wand2, User, Plug, Coins } from 'lucide-react';
import { api, form } from '../api.js';
import { useApp } from '../store.jsx';
import { Drop, Field, PageHead, Spinner } from '../components/ui.jsx';
import StyleArt from '../components/StyleArt.jsx';

const MODES = [
  ['idea', 'Desde una idea', 'Describe una situación y la IA la convierte en un vídeo estructurado.', Lightbulb],
  ['script', 'Desde un guion', 'Pega un guion completo y se divide en escenas con sus diálogos.', ScrollText],
  ['image', 'Desde una imagen', 'Sube una foto o ilustración y conviértela en animación.', ImagePlus],
  ['characters', 'Con mis personajes', 'Elige personajes de tu biblioteca e intégralos en la historia.', Users],
  ['prompt', 'Desde un prompt', 'Escribe directamente lo que debe aparecer en pantalla.', Terminal],
];
const COPY = {
  idea: ['Tu idea', 'Un caballero elegante entra en una cafetería, pide un café y descubre que cuesta 8 euros. Se enfada y empieza a discutir con el camarero.'],
  script: ['Tu guion', 'ESCENA 1: Entrada\nDon Álvaro entra en la cafetería.\nDon Álvaro: Buenos días, un café solo.\n\nESCENA 2: La cuenta\nCAMARERO: Son 8 euros.\nDon Álvaro: ¡¿Ocho euros?!'],
  image: ['¿Qué debe ocurrir en la animación?', 'La mujer sonríe, el viento mueve su pelo y la cámara se acerca lentamente.'],
  characters: ['La historia de tus personajes', 'Marta y su perro Bruno descubren un mapa del tesoro en el desván.'],
  prompt: ['Prompt', 'Un dragón de cristal sobrevuela una ciudad futurista al amanecer.'],
};
const STEPS = ['Tipo', 'Contenido', 'Personajes', 'Estilo', 'Formato', 'Generar'];

export default function Create() {
  const { boot, toast, connected } = useApp();
  const nav = useNavigate();
  const o = boot.options;
  const [step, setStep] = useState(0);
  const [chars, setChars] = useState([]);
  const [busy, setBusy] = useState(false);
  const [imgFile, setImgFile] = useState(null);
  const [f, setF] = useState({
    mode: 'idea', title: '', text: '', characterIds: [],
    settings: { style: 'cinematic3d', aspect: '9:16', quality: 'standard', duration: 30, sceneCount: 5, camera: '', lighting: '', ambience: '', music: 'Sin música', sfx: 'Ambiente sutil', language: 'español' },
  });
  useEffect(() => { api.get('/characters').then((r) => setChars(r.characters)).catch(() => {}); }, []);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const setS = (k, v) => setF((x) => ({ ...x, settings: { ...x.settings, [k]: v } }));
  const preview = imgFile && URL.createObjectURL(imgFile);

  const problem = (s) => {
    if (s === 1) {
      if (f.mode === 'image' && !imgFile) return 'Sube una imagen para animar.';
      if (f.mode !== 'image' && !f.text.trim()) return 'Escribe el contenido para continuar.';
    }
    if (s === 2 && f.mode === 'characters' && f.characterIds.length === 0) return 'Selecciona al menos un personaje (o cambia el tipo de vídeo).';
    return null;
  };
  const go = (n) => {
    for (let s = 0; s < n; s++) { const p = problem(s); if (p && n > s) { toast(p, 'warn'); setStep(s); return; } }
    setStep(n);
  };
  const toggleChar = (id) => set('characterIds', f.characterIds.includes(id) ? f.characterIds.filter((x) => x !== id) : [...f.characterIds, id]);

  const generate = async () => {
    for (let s = 0; s < 5; s++) { const p = problem(s); if (p) { toast(p, 'warn'); setStep(s); return; } }
    setBusy(true);
    try {
      let sourceAssetId;
      if (f.mode === 'image') sourceAssetId = (await api.post('/assets', form([imgFile]))).assets[0].id;
      const { project } = await api.post('/projects', { title: f.title || 'Vídeo sin título', mode: f.mode, brief: f.text, settings: f.settings, characterIds: f.characterIds, sourceAssetId });
      const r = await api.post(`/projects/${project.id}/storyboard`, { text: f.text });
      nav(`/projects/${project.id}`, { state: { notice: r.warning, source: r.source } });
    } catch (e) {
      toast(e.message, 'error');
      setBusy(false);
    }
  };

  const llm = connected('llm');
  const [label, ph] = COPY[f.mode];
  const S = f.settings;

  return (
    <div className="page">
      <PageHead title="Crear nuevo vídeo" sub="Cuéntanos qué quieres contar; nosotros organizamos las escenas." />
      <div className="steps">
        {STEPS.map((t, i) => <button key={t} className={`${i === step ? 'on' : ''} ${i < step ? 'done' : ''}`} onClick={() => go(i)}><i>{i < step ? <Check size={13} /> : i + 1}</i>{t}</button>)}
      </div>

      {step === 0 && (
        <div className="tile-grid">
          {MODES.map(([id, t, d, Icon]) => (
            <button key={id} className={`pick ${f.mode === id ? 'on' : ''}`} onClick={() => { set('mode', id); setStep(1); }}>
              <b><Icon size={18} /> {t}</b><span>{d}</span>
            </button>
          ))}
        </div>
      )}

      {step === 1 && (
        <div className="card col" style={{ maxWidth: 820 }}>
          <Field label="Título del proyecto (opcional)"><input type="text" maxLength={160} value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="Vídeo sin título" /></Field>
          {f.mode === 'image' && (
            <Field label="Imagen inicial">
              {imgFile ? (
                <div className="row"><img src={preview} alt="" style={{ height: 150, borderRadius: 10 }} /><button className="btn sm" onClick={() => setImgFile(null)}>Cambiar</button></div>
              ) : <Drop onFiles={(fs) => setImgFile(fs[0])}>Arrastra una foto o ilustración, o haz clic</Drop>}
            </Field>
          )}
          <Field label={label} hint={f.mode === 'script' ? 'Usa “ESCENA 1: …” y “NOMBRE: diálogo” para un resultado más preciso.' : undefined}>
            <textarea style={{ minHeight: f.mode === 'script' ? 260 : 140 }} value={f.text} onChange={(e) => set('text', e.target.value)} placeholder={ph} maxLength={12000} />
          </Field>
          {!llm && f.mode !== 'script' && f.mode !== 'prompt' && f.mode !== 'image' && (
            <div className="banner"><Plug size={18} /><div><b>Sin modelo de lenguaje conectado.</b> Se creará una plantilla de escenas editable (sin IA). Para que la IA escriba y divida la historia, <Link to="/settings" style={{ textDecoration: 'underline' }}>conecta un LLM</Link>.</div></div>
          )}
        </div>
      )}

      {step === 2 && (
        <div>
          <p className="muted" style={{ marginBottom: 14 }}>Los personajes elegidos usan sus imágenes y descripción como referencia para mantener su aspecto en todas las escenas. {f.characterIds.length} seleccionado(s).</p>
          {chars.length === 0 ? (
            <div className="empty">Aún no tienes personajes. <Link to="/characters" style={{ textDecoration: 'underline' }}>Crear uno</Link> (o continúa sin personajes).</div>
          ) : (
            <div className="tile-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' }}>
              {chars.map((c) => {
                const cover = c.images.find((i) => i.slot === 'front') || c.images[0];
                const on = f.characterIds.includes(c.id);
                return (
                  <button key={c.id} className={`card hover char-card`} style={{ padding: 0, textAlign: 'left', borderColor: on ? 'var(--accent)' : undefined }} onClick={() => toggleChar(c.id)}>
                    <div className="cover">{cover ? <img src={cover.url} alt="" /> : <User size={40} />}{on && <span className="sel"><Check size={16} /></span>}</div>
                    <div className="body"><b>{c.name}</b><div className="small faint">{c.images.length} refs</div></div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div>
          <p className="muted" style={{ marginBottom: 14 }}>El estilo se aplica a todo el vídeo para mantener una estética uniforme.</p>
          <div className="style-grid">
            {boot.styles.map((s) => (
              <button key={s.id} className={`style-card ${S.style === s.id ? 'on' : ''}`} onClick={() => setS('style', s.id)}>
                <StyleArt id={s.id} />
                <span className="tick"><Check size={15} /></span>
                <span className="info"><b>{s.name}</b><span>{s.description}</span></span>
              </button>
            ))}
          </div>
          <p className="small faint" style={{ marginTop: 10 }}>Las miniaturas son ilustraciones orientativas del estilo, no resultados de un modelo.</p>
        </div>
      )}

      {step === 4 && (
        <div className="col" style={{ maxWidth: 900 }}>
          <div className="card col">
            <h3>Formato</h3>
            <div className="grid3">{o.aspects.map((a) => <button key={a.id} className={`pick ${S.aspect === a.id ? 'on' : ''}`} onClick={() => setS('aspect', a.id)}><b>{a.name}</b><span>{a.hint}</span></button>)}</div>
            <h3 style={{ marginTop: 6 }}>Calidad de generación</h3>
            <div className="grid3">{o.qualities.map((a) => <button key={a.id} className={`pick ${S.quality === a.id ? 'on' : ''}`} onClick={() => setS('quality', a.id)}><b>{a.name}</b><span>{a.hint} · ×{a.multiplier} créditos</span></button>)}</div>
          </div>
          <div className="card grid2">
            <Field label={`Duración total: ${S.duration} s`}><input type="range" min={5} max={120} step={5} value={S.duration} onChange={(e) => setS('duration', +e.target.value)} /></Field>
            <Field label={`Número de escenas: ${S.sceneCount}`}><input type="range" min={1} max={15} value={S.sceneCount} onChange={(e) => setS('sceneCount', +e.target.value)} /></Field>
            <Field label="Movimiento de cámara"><Sel value={S.camera} onChange={(v) => setS('camera', v)} items={o.cameras} empty="Automático (por escena)" /></Field>
            <Field label="Iluminación"><Sel value={S.lighting} onChange={(v) => setS('lighting', v)} items={o.lightings} empty="Automática" /></Field>
            <Field label="Ambiente"><Sel value={S.ambience} onChange={(v) => setS('ambience', v)} items={o.ambiences} empty="Automático" /></Field>
            <Field label="Tipo de música"><Sel value={S.music} onChange={(v) => setS('music', v)} items={o.musicTypes} /></Field>
            <Field label="Efectos de sonido"><Sel value={S.sfx} onChange={(v) => setS('sfx', v)} items={o.sfxLevels} /></Field>
            <Field label="Personajes en el vídeo"><input type="text" disabled value={f.characterIds.length ? `${f.characterIds.length} de tu biblioteca` : 'Ninguno seleccionado (la IA creará los necesarios)'} /></Field>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="card col" style={{ maxWidth: 760 }}>
          <h3>Resumen</h3>
          <div className="row">
            <span className="chip acc">{MODES.find((m) => m[0] === f.mode)[1]}</span>
            <span className="chip">{boot.styles.find((s) => s.id === S.style).name}</span><span className="chip">{S.aspect}</span>
            <span className="chip">{S.duration} s · {S.sceneCount} escenas</span><span className="chip">{o.qualities.find((q) => q.id === S.quality).name}</span>
            {f.characterIds.length > 0 && <span className="chip">{f.characterIds.length} personajes</span>}
          </div>
          <p className="muted" style={{ whiteSpace: 'pre-wrap' }}>{f.text.slice(0, 280) || '(imagen inicial)'}{f.text.length > 280 ? '…' : ''}</p>
          {llm
            ? <div className="banner info"><Wand2 size={18} /><div>Un modelo de lenguaje ({boot.providers.find((p) => p.id === boot.categories.find((c) => c.id === 'llm').active)?.name}) escribirá las escenas. Coste: <b><Coins size={12} /> {boot.creditCost.storyboard} crédito</b>.</div></div>
            : <div className="banner"><Plug size={18} /><div>Sin LLM conectado: {f.mode === 'script' ? 'tu guion se dividirá por formato (sin IA).' : 'se creará una plantilla editable de escenas (sin IA).'} Después podrás generar imágenes, vídeo y voz cuando conectes esos proveedores.</div></div>}
          <button className="btn primary lg" disabled={busy} onClick={generate}>{busy ? <><Spinner /> Creando escenas…</> : <><Wand2 size={18} /> Generar escenas</>}</button>
        </div>
      )}

      <div className="row between" style={{ marginTop: 24, maxWidth: 900 }}>
        <button className="btn" disabled={step === 0 || busy} onClick={() => setStep(step - 1)}><ArrowLeft size={16} /> Atrás</button>
        {step > 0 && step < 5 && <button className="btn primary" onClick={() => go(step + 1)}>Siguiente <ArrowRight size={16} /></button>}
      </div>
    </div>
  );
}

function Sel({ value, onChange, items, empty }) {
  return <select value={value} onChange={(e) => onChange(e.target.value)}>{empty !== undefined && <option value="">{empty}</option>}{items.map((i) => <option key={i}>{i}</option>)}</select>;
}
