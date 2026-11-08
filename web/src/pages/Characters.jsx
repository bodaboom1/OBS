import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Users, User } from 'lucide-react';
import { api } from '../api.js';
import { useApp } from '../store.jsx';
import { Empty, PageHead, Modal, Field } from '../components/ui.jsx';

export function consistency(images) {
  const slots = new Set(images.map((i) => i.slot));
  const core = ['front', 'back', 'left', 'right', 'face'].filter((s) => slots.has(s)).length;
  const extra = Math.min(2, images.filter((i) => ['expression', 'pose', 'external'].includes(i.slot)).length);
  const score = core + extra;
  return { score, max: 7, label: score >= 5 ? 'Alta' : score >= 3 ? 'Media' : score >= 1 ? 'Baja' : 'Sin referencias' };
}

export default function Characters() {
  const { toast } = useApp();
  const nav = useNavigate();
  const [list, setList] = useState(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  useEffect(() => { api.get('/characters').then((r) => setList(r.characters)).catch((e) => toast(e.message, 'error')); }, [toast]);
  const create = async (e) => {
    e.preventDefault();
    try { const r = await api.post('/characters', { name }); nav(`/characters/${r.character.id}`); } catch (er) { toast(er.message, 'error'); }
  };
  return (
    <div className="page">
      <PageHead title="Personajes" sub="Guárdalos una vez y úsalos en todos tus vídeos, siempre con la misma cara y ropa.">
        <button className="btn primary" onClick={() => setCreating(true)}><Plus size={17} /> Nuevo personaje</button>
      </PageHead>
      {list && list.length === 0 && <Empty icon={Users} title="Crea tu primer personaje" text="Sube varias vistas (frontal, perfiles, rostro) y la IA lo mantendrá igual en cada escena."><button className="btn primary" onClick={() => setCreating(true)}>Crear mi primer personaje</button></Empty>}
      <div className="tile-grid">
        {(list || []).map((c) => {
          const cover = c.images.find((i) => i.slot === 'front') || c.images.find((i) => i.slot === 'face') || c.images[0];
          const k = consistency(c.images);
          return (
            <Link key={c.id} to={`/characters/${c.id}`} className="card hover char-card">
              <div className="cover">{cover ? <img src={cover.url} alt={c.name} loading="lazy" /> : <User size={54} />}</div>
              <div className="body">
                <h3>{c.name}</h3>
                <p className="small muted" style={{ minHeight: 20, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.description || 'Sin descripción'}</p>
                <div className="row between" style={{ marginTop: 8 }}><span className="small faint">{c.images.length} imágenes</span><span className={`chip ${k.score >= 5 ? 'ok' : k.score >= 3 ? 'warn' : ''}`}>{k.label}</span></div>
              </div>
            </Link>
          );
        })}
      </div>
      {creating && (
        <Modal title="Nuevo personaje" onClose={() => setCreating(false)}>
          <form className="col" onSubmit={create}>
            <Field label="Nombre del personaje"><input type="text" autoFocus required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej.: Don Álvaro" /></Field>
            <p className="small muted">En el siguiente paso completarás la ficha y subirás las imágenes de referencia.</p>
            <button className="btn primary" disabled={!name.trim()}>Crear y continuar</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
