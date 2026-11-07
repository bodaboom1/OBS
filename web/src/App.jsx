import { Fragment, useEffect, useState } from 'react';
import { NavLink, Route, Routes, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Clapperboard, FolderKanban, Users, Image, Film, Mic, History, Settings as Cog, Menu, Coins, Sparkles, Loader2 } from 'lucide-react';
import { useApp } from './store.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Create from './pages/Create.jsx';
import Projects from './pages/Projects.jsx';
import ProjectEditor from './pages/ProjectEditor.jsx';
import Characters from './pages/Characters.jsx';
import CharacterEditor from './pages/CharacterEditor.jsx';
import Library from './pages/Library.jsx';
import Voices from './pages/Voices.jsx';
import HistoryPage from './pages/History.jsx';
import Settings from './pages/Settings.jsx';

const NAV = [
  ['/', 'Panel principal', LayoutDashboard, true],
  ['/create', 'Crear nuevo vídeo', Clapperboard],
  ['/projects', 'Mis proyectos', FolderKanban],
  ['/characters', 'Mis personajes', Users],
  ['/images', 'Biblioteca de imágenes', Image],
  ['/videos', 'Biblioteca de vídeos', Film],
  ['/voices', 'Generación de voces', Mic],
  ['/history', 'Historial de creaciones', History],
  ['/settings', 'Configuración', Cog],
];

export default function App() {
  const { boot, error, refresh, activeJobs } = useApp();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);

  if (error && !boot) return <div className="page"><div className="banner err">No se puede conectar con el servidor: {error}. <button className="btn sm" onClick={refresh}>Reintentar</button></div></div>;
  if (!boot) return <div className="page muted"><Loader2 className="spin" /> Cargando estudio…</div>;

  return (
    <div className="shell">
      <aside className={`side ${open ? 'open' : ''}`}>
        <Link to="/" className="brand"><span className="logo"><Sparkles size={18} /></span>Lumio Studio</Link>
        <nav className="nav">
          {NAV.map(([to, label, Icon, end], i) => (
            <Fragment key={to}>
              {i === 1 || i === 8 ? <div className="sep" /> : null}
              <NavLink to={to} end={end}><Icon size={18} />{label}</NavLink>
            </Fragment>
          ))}
        </nav>
        <div className="spacer" />
        {activeJobs > 0 && <Link to="/history" className="chip acc" style={{ alignSelf: 'flex-start' }}><Loader2 size={12} className="spin" /> {activeJobs} generando</Link>}
        <Link to="/settings?tab=credits" className="creditbox">
          <div className="small muted row"><Coins size={14} /> Créditos</div>
          <b>{boot.user.credits}</b>
        </Link>
      </aside>
      <div className={`scrim ${open ? 'show' : ''}`} onClick={() => setOpen(false)} />
      <div className="main">
        <div className="topbar">
          <button className="btn ghost icon" aria-label="Menú" onClick={() => setOpen(true)}><Menu size={20} /></button>
          <b>Lumio Studio</b>
          <span style={{ flex: 1 }} />
          <span className="chip"><Coins size={12} /> {boot.user.credits}</span>
        </div>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/create" element={<Create />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectEditor />} />
          <Route path="/characters" element={<Characters />} />
          <Route path="/characters/:id" element={<CharacterEditor />} />
          <Route path="/images" element={<Library kind="image" />} />
          <Route path="/videos" element={<Library kind="video" />} />
          <Route path="/voices" element={<Voices />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<div className="page"><h1>Página no encontrada</h1><Link className="btn" to="/">Volver al panel</Link></div>} />
        </Routes>
      </div>
    </div>
  );
}
