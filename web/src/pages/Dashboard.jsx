import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Wand2, ScrollText, Layers, Users, CheckCircle2, Circle, Film } from 'lucide-react';
import { api } from '../api.js';
import { useApp } from '../store.jsx';

export default function Dashboard() {
  const { boot } = useApp();
  const nav = useNavigate();
  const [projects, setProjects] = useState(null);
  const [idea, setIdea] = useState('');
  useEffect(() => { api.get('/projects').then((r) => setProjects(r.projects.slice(0, 4))).catch(() => setProjects([])); }, []);
  const s = boot.stats;
  const connectedAny = boot.categories.some((c) => c.connected);
  const go = () => nav('/create', { state: { idea: idea.trim() } });

  const starts = [
    ['c1', Wand2, 'Desde una idea', 'Cuéntala en una frase', () => nav('/create', { state: { mode: 'idea' } })],
    ['c2', ScrollText, 'Desde un guion', 'Pégalo y lo dividimos en escenas', () => nav('/create', { state: { mode: 'script' } })],
    ['c3', Layers, 'Con referencias', 'Tus imágenes guían el vídeo', () => nav('/reference-to-video')],
    ['c4', Users, 'Con mis personajes', s.characters ? `${s.characters} guardados` : 'Crea el primero', () => nav(s.characters ? '/create' : '/characters')],
  ];
  const checklist = [
    [s.characters > 0, 'Crea un personaje', '/characters'],
    [s.projects > 0, 'Crea tu primer vídeo', '/create'],
    [connectedAny, 'Conecta una IA para generar', '/settings'],
  ];

  return (
    <div className="page">
      <div className="hero">
        <h1>¿Qué vídeo quieres crear hoy?</h1>
        <p>Escribe tu idea. Lumio la convierte en escenas, voces y un vídeo listo para publicar.</p>
        <div className="quick">
          <textarea aria-label="Tu idea" value={idea} onChange={(e) => setIdea(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) go(); }} placeholder="Un caballero elegante entra en una cafetería y descubre que el café cuesta 8 euros…" />
          <button className="btn primary lg" onClick={go}>Empezar <ArrowRight size={18} /></button>
        </div>
      </div>

      <div className="section-title"><h2>O empieza de otra forma</h2></div>
      <div className="tile-grid starts">
        {starts.map(([c, Icon, t, d, fn]) => (
          <button key={t} className="start-card" onClick={fn}><span className={`ico ${c}`}><Icon size={22} /></span><div><h3>{t}</h3><p className="small muted">{d}</p></div></button>
        ))}
      </div>

      {projects && projects.length > 0 && <>
        <div className="section-title"><h2>Continúa donde lo dejaste</h2><Link to="/projects" className="btn ghost sm">Ver todos <ArrowRight size={14} /></Link></div>
        <div className="tile-grid">
          {projects.map((p) => (
            <Link key={p.id} to={`/projects/${p.id}`} className="card hover proj">
              <div className="cover">{p.thumbnail ? <img src={p.thumbnail} alt="" /> : <Film size={34} />}<span className={`chip tag ${p.status === 'exported' ? 'ok' : ''}`}>{p.status === 'exported' ? 'Exportado' : 'Borrador'}</span></div>
              <div className="body"><b>{p.title}</b><div className="small muted">{p.sceneCount} escenas · {p.settings.aspect}</div></div>
            </Link>
          ))}
        </div>
      </>}

      {(projects && projects.length === 0) || !connectedAny ? (
        <>
          <div className="section-title"><h2>Primeros pasos</h2></div>
          <div className="card col" style={{ gap: 6 }}>
            {checklist.map(([done, label, to]) => (
              <Link key={label} to={to} className="row" style={{ padding: '10px 4px', gap: 12, fontWeight: 600, color: done ? 'var(--faint)' : 'var(--text)' }}>
                {done ? <CheckCircle2 size={22} color="var(--mint)" /> : <Circle size={22} color="var(--line2)" />}
                <span style={{ textDecoration: done ? 'line-through' : 'none', flex: 1 }}>{label}</span>{!done && <ArrowRight size={16} color="var(--accent)" />}
              </Link>
            ))}
          </div>
        </>
      ) : null}

      <div className="section-title"><h2>Cómo funciona</h2></div>
      <div className="how">
        {[['1', 'Cuenta tu idea', 'Una frase, un guion o tus imágenes.'], ['2', 'Elige personajes y estilo', 'Para que todo se vea igual de principio a fin.'], ['3', 'Genera y exporta', 'Revisa las escenas y descarga tu vídeo.']].map(([n, t, d]) => (
          <div key={n} className="card step"><span className="n">{n}</span><div><h3>{t}</h3><p className="small muted">{d}</p></div></div>
        ))}
      </div>
    </div>
  );
}
