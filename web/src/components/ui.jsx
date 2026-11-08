import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Plug, X, Loader2, Upload, Image as ImageIcon, Film, Mic } from 'lucide-react';
import { useApp } from '../store.jsx';

export function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="row between" style={{ marginBottom: 14 }}>
          <h2>{title}</h2>
          <button className="btn ghost icon" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Spinner({ size = 16 }) { return <Loader2 size={size} className="spin" />; }

export function PageHead({ title, sub, children }) {
  return (
    <div className="page-head">
      <div><h1>{title}</h1>{sub && <p>{sub}</p>}</div>
      <div className="row">{children}</div>
    </div>
  );
}

export function Empty({ icon: Icon, title, text, children }) {
  return (
    <div className="empty">
      {Icon && <Icon size={34} />}
      <h3 style={{ color: 'var(--text)' }}>{title}</h3>
      {text && <p style={{ margin: '6px auto 14px', maxWidth: 440 }}>{text}</p>}
      {children}
    </div>
  );
}

/** Aviso estándar cuando una función necesita un proveedor externo que aún no está conectado. */
export function NeedsConnection({ category, children }) {
  const { boot, connected } = useApp();
  if (connected(category)) return null;
  const label = boot?.categories.find((c) => c.id === category)?.label || category;
  return (
    <div className="banner">
      <Plug size={18} />
      <div>
        <b>Falta conectar la IA ({label.split(' (')[0].toLowerCase()}).</b>{' '}
        {children || 'Sin conexión no se genera nada.'}{' '}
        <Link to="/settings">Conectar →</Link>
      </div>
    </div>
  );
}

export function Field({ label, hint, children }) {
  return <label className="f">{label}{children}{hint && <span className="hint">{hint}</span>}</label>;
}

export function Drop({ onFiles, accept = 'image/png,image/jpeg,image/webp,image/gif', multiple, children, className = '' }) {
  const ref = useRef();
  const [over, setOver] = useState(false);
  return (
    <div
      className={`drop ${over ? 'over' : ''} ${className}`}
      role="button" tabIndex={0}
      onClick={() => ref.current.click()}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && ref.current.click()}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); const fs = [...e.dataTransfer.files]; if (fs.length) onFiles(fs); }}
    >
      <input ref={ref} type="file" hidden accept={accept} multiple={multiple} onChange={(e) => { const fs = [...e.target.files]; e.target.value = ''; if (fs.length) onFiles(fs); }} />
      <div>{children || <><Upload size={22} /><div>Arrastra archivos o haz clic</div></>}</div>
    </div>
  );
}

export function useFilePicker(onFiles, accept, multiple) {
  const ref = useRef();
  const input = <input ref={ref} type="file" hidden accept={accept} multiple={multiple} onChange={(e) => { const fs = [...e.target.files]; e.target.value = ''; if (fs.length) onFiles(fs); }} />;
  return [() => ref.current.click(), input];
}

export const STATUS = { queued: ['En cola', 'chip'], running: ['Generando…', 'chip acc'], succeeded: ['Completado', 'chip ok'], failed: ['Fallido', 'chip err'], canceled: ['Cancelado', 'chip'] };
export function StatusChip({ status }) { const [t, c] = STATUS[status] || [status, 'chip']; return <span className={c}>{t}</span>; }
export const confirmAsk = (msg) => window.confirm(msg);

export function LibraryTabs() {
  const { pathname } = useLocation();
  const items = [['/images', 'Imágenes', ImageIcon], ['/videos', 'Vídeos', Film], ['/voices', 'Voces', Mic]];
  return <div className="tabs" role="tablist">{items.map(([to, l, I]) => <Link key={to} to={to} className={pathname === to ? 'on' : ''} role="tab" aria-selected={pathname === to}><I size={16} />{l}</Link>)}</div>;
}
