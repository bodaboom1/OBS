import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api.js';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }) {
  const [boot, setBoot] = useState(null);
  const [error, setError] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [jobs, setJobs] = useState([]);
  const listeners = useRef(new Set());
  const prevStatus = useRef(new Map());

  const refresh = useCallback(async () => {
    try { setBoot(await api.get('/bootstrap')); setError(null); } catch (e) { setError(e.message); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const toast = useCallback((message, type = 'info') => {
    const id = Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), type === 'error' ? 7000 : 3500);
  }, []);

  const loadJobs = useCallback(async () => {
    try {
      const { jobs: js, credits } = await api.get('/jobs?limit=100');
      setJobs(js);
      setBoot((b) => (b ? { ...b, user: { ...b.user, credits } } : b));
      for (const j of js) {
        const before = prevStatus.current.get(j.id);
        if (before && before !== j.status && ['succeeded', 'failed', 'canceled'].includes(j.status)) {
          listeners.current.forEach((fn) => fn(j));
          if (j.status === 'failed') toast(`Falló la generación (${j.kind}): ${j.error}`, 'error');
        }
        prevStatus.current.set(j.id, j.status);
      }
    } catch { /* silencio: se reintenta */ }
  }, [toast]);

  const active = jobs.filter((j) => j.status === 'queued' || j.status === 'running').length;
  useEffect(() => { loadJobs(); }, [loadJobs]);
  useEffect(() => {
    const t = setInterval(loadJobs, active ? 2000 : 10000);
    return () => clearInterval(t);
  }, [active, loadJobs]);

  const onJobDone = useCallback((fn) => { listeners.current.add(fn); return () => listeners.current.delete(fn); }, []);

  const connected = useCallback((cat) => !!boot?.categories.find((c) => c.id === cat)?.connected, [boot]);

  /** Lanza una generación. Si falta proveedor o créditos lo explica en vez de fallar en silencio. */
  const generate = useCallback(async (kind, params) => {
    try {
      const r = await api.post('/jobs', { kind, ...params });
      setJobs((j) => [r.job, ...j]);
      prevStatus.current.set(r.job.id, r.job.status);
      setBoot((b) => (b ? { ...b, user: { ...b.user, credits: r.credits } } : b));
      return r.job;
    } catch (e) {
      if (e.code === 'PROVIDER_NOT_CONFIGURED') toast(e.message, 'warn');
      else toast(e.message, 'error');
      return null;
    }
  }, [toast]);

  const value = useMemo(() => ({ boot, error, refresh, toast, jobs, loadJobs, activeJobs: active, onJobDone, connected, generate }), [boot, error, refresh, toast, jobs, loadJobs, active, onJobDone, connected, generate]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className={`toast ${t.type}`}>{t.message}</div>)}
      </div>
    </Ctx.Provider>
  );
}
