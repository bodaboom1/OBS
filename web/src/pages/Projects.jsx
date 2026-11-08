import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FolderOpen, Plus, Trash2, Film } from 'lucide-react';
import { api, fmtDate } from '../api.js';
import { useApp } from '../store.jsx';
import { Empty, PageHead, confirmAsk } from '../components/ui.jsx';

export default function Projects() {
  const { toast, boot } = useApp();
  const [list, setList] = useState(null);
  const nav = useNavigate();
  const load = () => api.get('/projects').then((r) => setList(r.projects)).catch((e) => toast(e.message, 'error'));
  useEffect(() => { load(); }, []); // eslint-disable-line
  const remove = async (e, p) => {
    e.preventDefault(); e.stopPropagation();
    if (!confirmAsk(`¿Eliminar «${p.title}»?`)) return;
    await api.del(`/projects/${p.id}`); toast('Eliminado', 'ok'); load();
  };
  return (
    <div className="page">
      <PageHead title="Mis vídeos" sub="Todo se guarda solo.">
        <button className="btn primary" onClick={() => nav('/create')}><Plus size={17} /> Nuevo vídeo</button>
      </PageHead>
      {list && list.length === 0 && <Empty icon={FolderOpen} title="Aún no hay vídeos" text="Tu primer vídeo está a un par de clics."><Link className="btn primary" to="/create">Crear mi primer vídeo</Link></Empty>}
      <div className="tile-grid">
        {(list || []).map((p) => {
          const style = boot.styles.find((s) => s.id === p.settings.style);
          return (
            <Link key={p.id} to={`/projects/${p.id}`} className="card hover proj">
              <div className="cover">{p.thumbnail ? <img src={p.thumbnail} alt="" /> : <Film size={34} />}<span className={`chip tag ${p.status === 'exported' ? 'ok' : ''}`}>{p.status === 'exported' ? 'Exportado' : 'Borrador'}</span></div>
              <div className="body">
                <div className="row between" style={{ flexWrap: 'nowrap' }}><b style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</b><button className="btn ghost icon sm danger" onClick={(e) => remove(e, p)} aria-label="Eliminar"><Trash2 size={15} /></button></div>
                <div className="small muted">{style?.name} · {p.sceneCount} escenas · {p.settings.aspect}</div>
                <div className="small faint">{fmtDate(p.updatedAt)}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
