import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:4000';
const TOKEN_KEY = 'provit.token';

export const tokenStore = {
  get: () => AsyncStorage.getItem(TOKEN_KEY),
  set: (t) => AsyncStorage.setItem(TOKEN_KEY, t),
  clear: () => AsyncStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.message || `HTTP ${status}`);
    this.status = status;
    this.body = body;
  }
}

export async function api(path, opts = {}) {
  const headers = { Accept: 'application/json', ...(opts.headers || {}) };
  if (opts.body && typeof opts.body !== 'string' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  const token = await tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;

  const body = opts.body && typeof opts.body !== 'string'
    ? JSON.stringify(opts.body)
    : opts.body;

  const r = await fetch(`${API_URL}${path}`, { ...opts, headers, body });
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

/** PUT a binary file to the (mock) presigned URL returned by /api/files/upload-url */
export async function uploadBinary(uploadUrl, blob, headers = {}) {
  const r = await fetch(uploadUrl, { method: 'PUT', headers, body: blob });
  if (!r.ok) throw new ApiError(r.status, await r.text());
}
