export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error?.message || `Error ${status}`);
    this.status = status;
    this.code = body?.error?.code || 'ERROR';
    this.extra = body?.error || {};
  }
}

async function request(method, path, body) {
  const isForm = body instanceof FormData;
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: body && !isForm ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    });
  } catch {
    throw new ApiError(0, { error: { code: 'NETWORK', message: 'No se puede conectar con el servidor.' } });
  }
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, json);
  return json;
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, b) => request('POST', p, b ?? {}),
  put: (p, b) => request('PUT', p, b ?? {}),
  patch: (p, b) => request('PATCH', p, b ?? {}),
  del: (p) => request('DELETE', p),
};

export const form = (files, fields = {}) => {
  const fd = new FormData();
  Object.entries(fields).forEach(([k, v]) => v != null && fd.set(k, v));
  [...files].forEach((f) => fd.append('files', f));
  return fd;
};

export const uid = (p = 'x') => `${p}_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
export const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
export const fmtDate = (iso) => new Date(iso).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
