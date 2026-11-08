import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layers, Clapperboard, FolderKanban, Users, Image, Film, Mic, Settings, History, Plug, CheckCircle2, ArrowRight } from 'lucide-react';
import { api, fmtDate } from '../api.js';
import { useApp } from '../store.jsx';
import { StatusChip } from '../components/ui.jsx';

export default function Dashboard() {
  const { boot, jobs } = useApp();
  const [projects, setProjects] = useState([]);
  useEffect(() => { api.get('/projects').then((r) => setProjects(r.projects.slice(0, 4))).catch(() => {}); }, []);
  const s = boot.stats;
  const tiles = [
    ['/create', 'Crear nuevo vídeo', 'Idea, guion, imagen o personajes', Clapperboard],
    ['/reference-to-video', 'Referencia a vídeo', 'Imágenes de referencia + @menciones', Layers],
    ['/projects', 'Mis proyectos', `${s.projects} proyectos`, FolderKanban],
    ['/characters', 'Mis personajes', `${s.characters} personajes`, Users],
    ['/images', 'Biblioteca de imágenes', `${s.images} imágenes`, Image],
    ['/videos', 'Biblioteca de vídeos', `${s.videos} vídeos`, Film],
    ['/voices', 'Generación de voces', 'Locuciones con emoción', Mic],
    ['/history', 'Historial de creaciones', 'Trabajos y resultados', History],
    ['/settings', 'Configuración', 'Proveedores y créditos', Settings],
  ];
  const missing = boot.categories.filter((c) => !c.connected);
  return (
    <div className="page">
      <div className="hero">
        <h1>Da vida a tus historias con IA, sin saber de edición.</h1>
        <p className="muted" style={{ margin: '10px 0 20px', maxWidth: 560 }}>Escribe una idea, elige tus personajes y un estilo visual. Lumio divide el vídeo en escenas, las genera y las monta en un editor.</p>
        <Link to="/create" className="btn primary lg"><Clapperboard size={18} /> Crear nuevo vídeo</Link>
      </div>

      <div className="section-title"><h2>Herramientas</h2></div>
      <div className="tile-grid">
        {tiles.map(([to, t, sub, Icon]) => (
          <Link key={to} to={to} className="card hover tile"><span className="ico"><Icon size={22} /></span><div><h3>{t}</h3><p className="muted small">{sub}</p></div></Link>
        ))}
      </div>

      <div className="grid2" style={{ marginTop: 28, alignItems: 'start' }}>
        <div>
          <div className="section-title" style={{ marginTop: 0 }}><h2>Proyectos recientes</h2><Link to="/projects" className="muted small">Ver todos <ArrowRight size={12} /></Link></div>
          <div className="col">
            {projects.length === 0 && <div className="empty">Aún no hay proyectos. ¡Crea el primero!</div>}
            {projects.map((p) => (
              <Link key={p.id} to={`/projects/${p.id}`} className="card hover row between">
                <div><b>{p.title}</b><div className="small muted">{p.sceneCount} escenas · {fmtDate(p.updatedAt)}</div></div>
                <span className={`chip ${p.status === 'exported' ? 'ok' : ''}`}>{p.status === 'exported' ? 'Exportado' : 'Borrador'}</span>
              </Link>
            ))}
          </div>
        </div>
        <div>
          <div className="section-title" style={{ marginTop: 0 }}><h2>Conexiones de IA</h2><Link to="/settings" className="muted small">Gestionar <ArrowRight size={12} /></Link></div>
          <div className="card col" style={{ gap: 10 }}>
            {boot.categories.map((c) => (
              <div key={c.id} className="row between">
                <span className="small">{c.label}</span>
                {c.connected ? <span className="chip ok"><CheckCircle2 size={12} /> {boot.providers.find((p) => p.id === c.active)?.name}</span> : <span className="chip warn"><Plug size={12} /> Sin conectar</span>}
              </div>
            ))}
            {missing.length > 0 && <p className="small faint">Lo que no esté conectado no se simula: te avisaremos al intentar generarlo.</p>}
          </div>
          {jobs.slice(0, 3).length > 0 && <>
            <div className="section-title"><h2>Actividad</h2></div>
            <div className="col">{jobs.slice(0, 3).map((j) => <div key={j.id} className="card row between"><span className="small">{j.kind} · {j.summary || '—'}</span><StatusChip status={j.status} /></div>)}</div>
          </>}
        </div>
      </div>
    </div>
  );
}
