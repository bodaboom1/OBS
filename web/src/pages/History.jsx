import { useState } from 'react';
import { Link } from 'react-router-dom';
import { History, X } from 'lucide-react';
import { api, fmtDate } from '../api.js';
import { useApp } from '../store.jsx';
import { Empty, PageHead, StatusChip, Modal } from '../components/ui.jsx';

const KIND = { image: 'Imagen', video: 'Vídeo', voice: 'Voz', music: 'Música', sfx: 'Efecto', lipsync: 'Sincronía labial', export: 'Exportación' };

export default function HistoryPage() {
  const { jobs, loadJobs, toast } = useApp();
  const [filter, setFilter] = useState('all');
  const [view, setView] = useState(null);
  const shown = jobs.filter((j) => filter === 'all' || j.status === filter);
  const cancel = async (j) => { try { await api.post(`/jobs/${j.id}/cancel`); toast('Cancelado y créditos devueltos', 'ok'); loadJobs(); } catch (e) { toast(e.message, 'error'); } };
  return (
    <div className="page">
      <PageHead title="Historial de creaciones" sub="Todas tus generaciones, con su estado, coste y resultado." />
      <div className="row" style={{ marginBottom: 14 }}>
        {[['all', 'Todas'], ['running', 'En curso'], ['succeeded', 'Completadas'], ['failed', 'Fallidas']].map(([k, l]) => <button key={k} className={`pill ${filter === k ? 'on' : ''}`} onClick={() => setFilter(k)}>{l}</button>)}
      </div>
      {shown.length === 0 ? <Empty icon={History} title="Sin actividad" text="Cuando generes imágenes, vídeos, voces o exportes un proyecto, aparecerán aquí." /> : (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="t">
            <thead><tr><th>Tipo</th><th>Detalle</th><th>Proveedor</th><th>Estado</th><th>Coste</th><th>Fecha</th><th /></tr></thead>
            <tbody>
              {shown.map((j) => (
                <tr key={j.id}>
                  <td><b>{KIND[j.kind] || j.kind}</b></td>
                  <td style={{ maxWidth: 280 }}><div className="small" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.summary || '—'}</div>{j.error && <div className="small" style={{ color: 'var(--err)' }}>{j.error.slice(0, 140)}</div>}{j.status === 'running' && <div className="progress" style={{ marginTop: 4 }}><i style={{ width: `${j.progress}%` }} /></div>}</td>
                  <td className="small muted">{j.provider}</td>
                  <td><StatusChip status={j.status} /></td>
                  <td className="small">{j.status === 'failed' || j.status === 'canceled' ? 'devuelto' : j.cost}</td>
                  <td className="small muted">{fmtDate(j.createdAt)}</td>
                  <td className="row" style={{ flexWrap: 'nowrap' }}>
                    {j.output.asset && <button className="btn sm" onClick={() => setView(j.output.asset)}>Ver</button>}
                    {j.projectId && <Link className="btn sm ghost" to={`/projects/${j.projectId}`}>Proyecto</Link>}
                    {['queued', 'running'].includes(j.status) && <button className="btn sm ghost danger" onClick={() => cancel(j)}><X size={13} /> Cancelar</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {view && <Modal title={view.name || 'Resultado'} wide onClose={() => setView(null)}>
        {view.kind === 'image' && <img src={view.url} alt="" style={{ width: '100%', borderRadius: 12 }} />}
        {view.kind === 'video' && <video src={view.url} controls style={{ width: '100%', borderRadius: 12 }} />}
        {view.kind === 'audio' && <audio src={view.url} controls style={{ width: '100%' }} />}
      </Modal>}
    </div>
  );
}
