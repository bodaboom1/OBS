import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FolderKanban, Plus, Trash2 } from 'lucide-react';
import { api, fmtDate } from '../api.js';
import { useApp } from '../store.jsx';
import { Empty, PageHead, confirmAsk } from '../components/ui.jsx';

export default function Projects() {
  const { toast, boot } = useApp();
  const [list, setList] = useState(null);
  const nav = useNavigate();
  const load = () => api.get('/projects').then((r) => setList(r.projects)).catch((e) => toast(e.message, 'error'));
  useEffect(() => { load(); }, []); // eslint-disable-line
  const remove = async (p) => {
    if (!confirmAsk(`¿Eliminar el proyecto «${p.title}»? Se borrarán sus escenas (los archivos siguen en tu biblioteca).`)) return;
    await api.del(`/projects/${p.id}`); toast('Proyecto eliminado', 'ok'); load();
  };
  return (
    <div className="page">
      <PageHead title="Mis proyectos" sub="Todos tus vídeos, con guardado automático.">
        <button className="btn primary" onClick={() => nav('/create')}><Plus size={16} /> Nuevo vídeo</button>
      </PageHead>
      {list && list.length === 0 && <Empty icon={FolderKanban} title="Aún no tienes proyectos" text="Crea tu primer vídeo a partir de una idea, un guion o una imagen."><Link className="btn primary" to="/create">Crear vídeo</Link></Empty>}
      <div className="tile-grid">
        {(list || []).map((p) => {
          const style = boot.styles.find((s) => s.id === p.settings.style);
          return (
            <div key={p.id} className="card tile">
              <Link to={`/projects/${p.id}`} className="tile" style={{ gap: 6 }}>
                <h3>{p.title}</h3>
                <div className="row"><span className="chip acc">{style?.name || 'Sin estilo'}</span><span className="chip">{p.settings.aspect}</span><span className="chip">{p.sceneCount} escenas</span></div>
                <p className="small muted">Editado {fmtDate(p.updatedAt)}</p>
              </Link>
              <div className="row between">
                <span className={`chip ${p.status === 'exported' ? 'ok' : ''}`}>{p.status === 'exported' ? 'Exportado' : 'Borrador'}</span>
                <button className="btn ghost sm danger" onClick={() => remove(p)} aria-label="Eliminar"><Trash2 size={15} /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
