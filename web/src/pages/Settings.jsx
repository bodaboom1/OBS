import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Plug, Trash2, ShieldCheck, Coins, ExternalLink, Plus } from 'lucide-react';
import { api, fmtDate } from '../api.js';
import { useApp } from '../store.jsx';
import { PageHead, Field, Spinner } from '../components/ui.jsx';

export default function Settings() {
  const [sp, setSp] = useSearchParams();
  const tab = sp.get('tab') || 'providers';
  return (
    <div className="page">
      <PageHead title="Configuración" sub="Conecta proveedores de IA y gestiona tus créditos." />
      <div className="tabs">
        {[['providers', 'Proveedores de IA', Plug], ['credits', 'Créditos', Coins]].map(([k, l, I]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setSp({ tab: k })}><I size={16} />{l}</button>)}
      </div>
      {tab === 'providers' ? <Providers /> : <Credits />}
    </div>
  );
}

function Providers() {
  const { boot, refresh, toast } = useApp();
  const setAll = () => refresh();
  const setActive = async (cat, id) => { await api.put('/active-providers', { [cat]: id || null }); setAll(); };
  return (
    <div className="col">
      <div className="banner info"><ShieldCheck size={18} /><div>Las claves se envían una sola vez al servidor, se guardan <b>cifradas (AES-256-GCM)</b> y nunca vuelven al navegador: solo verás los 4 últimos caracteres. Todas las llamadas a los proveedores se hacen desde el backend.</div></div>
      <div className="card col">
        <h3>Proveedor activo por función</h3>
        <div className="grid2">
          {boot.categories.map((c) => (
            <Field key={c.id} label={c.label}>
              <select value={c.chosen || ''} onChange={(e) => setActive(c.id, e.target.value)}>
                <option value="">{c.connected ? `Automático (${boot.providers.find((p) => p.id === c.active)?.name})` : 'Sin conectar'}</option>
                {c.options.filter((o) => o.configured).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </Field>
          ))}
        </div>
      </div>
      <div className="tile-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
        {boot.providers.map((p) => <Provider key={p.id} p={p} onChange={setAll} toast={toast} cats={boot.categories} />)}
      </div>
    </div>
  );
}

function Provider({ p, onChange, toast, cats }) {
  const [vals, setVals] = useState({});
  const [models, setModels] = useState(p.models || {});
  const [busy, setBusy] = useState(false);
  const label = (c) => cats.find((x) => x.id === c)?.label || c;
  const save = async () => {
    setBusy(true);
    try { await api.put(`/providers/${p.id}`, { ...vals, models }); setVals({}); toast(`${p.name} guardado`, 'ok'); onChange(); } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); }
  };
  const test = async () => { setBusy(true); try { const r = await api.post(`/providers/${p.id}/test`); toast(r.ok ? `${p.name}: conexión correcta` : `${p.name}: ${r.message}`, r.ok ? 'ok' : 'error'); } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); } };
  const remove = async () => { if (!window.confirm(`¿Eliminar la clave de ${p.name}?`)) return; await api.del(`/providers/${p.id}`); onChange(); };
  return (
    <div className="card provider">
      <div className="row between"><h3>{p.name}</h3>{p.configured ? <span className="chip ok"><CheckCircle2 size={12} /> Conectado</span> : <span className="chip">Sin clave</span>}</div>
      <p className="small muted">{p.description}</p>
      <div className="row">{p.categories.map((c) => <span key={c} className="chip acc">{label(c).split(' (')[0]}</span>)}</div>
      {p.fields.map((f) => (
        <Field key={f.key} label={f.label} hint={p.configured && f.hint ? `Guardada: ${f.hint}. Escribe una nueva para reemplazarla.` : undefined}>
          <input type="password" autoComplete="off" placeholder={f.placeholder} value={vals[f.key] || ''} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })} />
        </Field>
      ))}
      {['replicate', 'fal'].includes(p.id) || true ? p.categories.map((c) => (
        <Field key={c} label={`Modelo · ${c}`} hint={p.defaultModels?.[c] ? `Por defecto: ${p.defaultModels[c]}` : undefined}>
          <input type="text" placeholder={p.defaultModels?.[c] || ''} value={models[c] || ''} onChange={(e) => setModels({ ...models, [c]: e.target.value })} />
        </Field>
      )).filter((_, i) => p.categories[i] !== 'lipsync' || true) : null}
      <div className="row">
        <button className="btn primary sm" disabled={busy} onClick={save}>{busy ? <Spinner size={14} /> : null} Guardar</button>
        <button className="btn sm" disabled={busy || !p.configured} onClick={test}>Probar conexión</button>
        {p.configured && <button className="btn sm ghost danger" onClick={remove}><Trash2 size={14} /> Quitar</button>}
        <a className="btn sm ghost" href={p.docs} target="_blank" rel="noreferrer"><ExternalLink size={13} /> Docs</a>
      </div>
    </div>
  );
}

function Credits() {
  const { boot, toast, refresh } = useApp();
  const [d, setD] = useState(null);
  const load = () => api.get('/credits').then(setD);
  useEffect(() => { load(); }, []);
  const grant = async () => { try { await api.post('/credits/dev-grant'); toast('+100 créditos de prueba', 'ok'); load(); refresh(); } catch (e) { toast(e.message, 'error'); } };
  if (!d) return <Spinner />;
  return (
    <div className="grid2" style={{ alignItems: 'start' }}>
      <div className="col">
        <div className="card"><div className="small muted">Saldo disponible</div><div style={{ fontSize: 40, fontWeight: 800 }}>{d.balance}</div>
          {boot.devCredits ? <button className="btn sm" onClick={grant}><Plus size={14} /> Añadir 100 créditos de prueba</button> : <p className="small muted">Compra de créditos: conecta aquí tu pasarela de pago.</p>}
          <p className="small faint" style={{ marginTop: 8 }}>Los créditos se cobran al lanzar una generación y se devuelven si falla o se cancela.</p></div>
        <div className="card"><h3>Coste por generación</h3>
          <table className="t"><tbody>{Object.entries(boot.creditCost).filter(([, v]) => v).map(([k, v]) => <tr key={k}><td>{k}</td><td>{v}{['image', 'video'].includes(k) ? ' (× calidad)' : ''}</td></tr>)}</tbody></table></div>
      </div>
      <div className="card"><h3>Movimientos</h3>
        <table className="t"><tbody>{d.ledger.map((l) => <tr key={l.id}><td className="small">{l.reason}<div className="faint small">{fmtDate(l.created_at)}</div></td><td style={{ color: l.delta > 0 ? 'var(--ok)' : 'var(--text)', textAlign: 'right', fontWeight: 600 }}>{l.delta > 0 ? '+' : ''}{l.delta}</td></tr>)}</tbody></table></div>
    </div>
  );
}
