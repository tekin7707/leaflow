const API_URL = import.meta.env.VITE_API_URL || '';

const TOKEN_KEY = 'leaflow.token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.message || `HTTP ${status}`);
    this.status = status;
    this.body = body;
  }
}

export async function api(path, opts = {}) {
  const headers = new Headers(opts.headers || {});
  headers.set('Accept', 'application/json');
  if (opts.body && !(opts.body instanceof FormData) && !headers.has('content-type')) {
    headers.set('Content-Type', 'application/json');
  }
  const token = tokenStore.get();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const body = opts.body && !(opts.body instanceof FormData) && typeof opts.body !== 'string'
    ? JSON.stringify(opts.body)
    : opts.body;

  const url = path.startsWith('http') ? path : `${API_URL}${path}`;
  const r = await fetch(url, { ...opts, headers, body });
  if (r.status === 204) return null;
  const text = await r.text();
  const data = text ? JSON.parse(text) : null;
  if (!r.ok) throw new ApiError(r.status, data);
  return data;
}

api.get = (path) => api(path);
api.post = (path, body) => api(path, { method: 'POST', body });
api.put = (path, body) => api(path, { method: 'PUT', body });
api.del = (path) => api(path, { method: 'DELETE' });

/** Absolute URL for an `<img src>` to a Fiload-stored proof. */
export const fileUrl = (path, mime = 'image/jpeg') =>
  `${API_URL}/api/files/raw?path=${encodeURIComponent(path)}&mime=${encodeURIComponent(mime)}`;
