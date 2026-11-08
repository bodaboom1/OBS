
import { NavLink, Route, Routes, Link, useLocation } from 'react-router-dom';
import { Home, Plus, FolderOpen, Users, Library as LibIcon, Activity, Settings as Cog, Coins, Sparkles, Loader2 } from 'lucide-react';
import { useApp } from './store.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Create from './pages/Create.jsx';
import ReferenceVideo from './pages/ReferenceVideo.jsx';
import Projects from './pages/Projects.jsx';
import ProjectEditor from './pages/ProjectEditor.jsx';
import Characters from './pages/Characters.jsx';
import CharacterEditor from './pages/CharacterEditor.jsx';
import Library from './pages/Library.jsx';
import Voices from './pages/Voices.jsx';
import HistoryPage from './pages/History.jsx';
import Settings from './pages/Settings.jsx';

const LIB = ['/images', '/videos', '/voices'];
export default function App() {
  const { boot, error, refresh, activeJobs } = useApp();
  const loc = useLocation();
  const inLib = LIB.some((x) => loc.pathname.startsWith(x));

  if (error && !boot) return <div className="page"><div className="banner err">No se puede conectar con el servidor: {error}. <button className="btn sm" onClick={refresh}>Reintentar</button></div></div>;
  if (!boot) return <div className="page muted"><Loader2 className="spin" /> Cargando estudio…</div>;

  return (
    <div className="shell">
      <aside className="side">
        <Link to="/" className="brand"><span className="logo"><Sparkles size={19} /></span>Lumio</Link>
        <Link to="/create" className="create-btn"><Plus size={19} /> Crear vídeo</Link>
        <nav className="nav">
          <NavLink to="/" end><Home size={19} />Inicio</NavLink>
          <NavLink to="/projects"><FolderOpen size={19} />Mis vídeos</NavLink>
          <NavLink to="/characters"><Users size={19} />Personajes</NavLink>
          <NavLink to="/images" className={inLib ? 'active' : ''}><LibIcon size={19} />Biblioteca</NavLink>
        </nav>
        <div className="spacer" />
        <nav className="nav" style={{ marginBottom: 12 }}>
          <NavLink to="/history"><Activity size={19} />Actividad{activeJobs > 0 && <span className="chip acc" style={{ marginLeft: 'auto' }}><Loader2 size={11} className="spin" />{activeJobs}</span>}</NavLink>
          <NavLink to="/settings"><Cog size={19} />Ajustes</NavLink>
        </nav>
        <Link to="/settings?tab=credits" className="creditbox"><span className="coin"><Coins size={17} /></span><span><b>{boot.user.credits}</b><span className="small muted">créditos</span></span></Link>
      </aside>
      <div className="main">
        <div className="topbar">
          <Link to="/" className="brand" style={{ padding: 0, fontSize: 17 }}><span className="logo" style={{ width: 30, height: 30, borderRadius: 9 }}><Sparkles size={16} /></span>Lumio</Link>
          <span style={{ flex: 1 }} />
          {activeJobs > 0 && <Link to="/history" className="chip acc"><Loader2 size={11} className="spin" />{activeJobs}</Link>}
          <Link to="/settings?tab=credits" className="chip warn"><Coins size={12} /> {boot.user.credits}</Link>
          <Link to="/settings" className="btn ghost icon" aria-label="Ajustes"><Cog size={19} /></Link>
        </div>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/create" element={<Create />} />
          <Route path="/reference-to-video" element={<ReferenceVideo />} />
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
      <nav className="bottomnav" aria-label="Navegación">
        <NavLink to="/" end><Home size={21} />Inicio</NavLink>
        <NavLink to="/projects"><FolderOpen size={21} />Vídeos</NavLink>
        <NavLink to="/create" className="fab"><Plus size={24} />Crear</NavLink>
        <NavLink to="/characters"><Users size={21} />Personajes</NavLink>
        <NavLink to="/images" className={inLib ? 'active' : ''}><LibIcon size={21} />Biblioteca</NavLink>
      </nav>
    </div>
  );
}
