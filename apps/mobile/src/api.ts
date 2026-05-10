import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * SecureStore is native-only. On web we fall back to localStorage so the
 * web preview of the app keeps working. (Web is not the production target
 * but it is useful while iterating.)
 */
const storage = Platform.OS === 'web'
  ? {
      getItemAsync: async (k: string) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null),
      setItemAsync: async (k: string, v: string) => { if (typeof localStorage !== 'undefined') localStorage.setItem(k, v); },
      deleteItemAsync: async (k: string) => { if (typeof localStorage !== 'undefined') localStorage.removeItem(k); },
    }
  : {
      getItemAsync: SecureStore.getItemAsync,
      setItemAsync: SecureStore.setItemAsync,
      deleteItemAsync: SecureStore.deleteItemAsync,
    };

const easConfig = Constants.easConfig as any;
const extra = Constants.expoConfig?.extra ?? easConfig?.extra ?? {};
const nativeApiUrl = extra.apiUrl ?? 'http://localhost:7051';

export const API_URL: string = Platform.OS === 'web' ? 'http://localhost:7051' : nativeApiUrl;
export const AGENTECH_BASE_URL: string = extra.agentechBaseUrl ?? 'https://api.agentechauth.com/api';
export const AGENTECH_API_KEY: string = extra.agentechApiKey ?? '';
export const FILOAD_BASE_URL: string = extra.filoadBaseUrl ?? 'https://fiload.agentechauth.com';
export const EAS_PROJECT_ID: string | undefined = extra.eas?.projectId ?? easConfig?.projectId;

const KEYS = {
  leaflowToken: 'leaflow.token',
  agentechAccess: 'leaflow.agentech.access',
  agentechRefresh: 'leaflow.agentech.refresh',
  agentechExpiresAt: 'leaflow.agentech.expiresAt',
};

const get = (k: string) => storage.getItemAsync(k);
const set = (k: string, v: string) => storage.setItemAsync(k, v);
const del = (k: string) => storage.deleteItemAsync(k);

export const session = {
  getLeaflowToken: () => get(KEYS.leaflowToken),
  setLeaflowToken: (t: string) => set(KEYS.leaflowToken, t),

  async setUpstream(tokens: { accessToken: string; refreshToken: string; expiresIn: number }) {
    const expiresAt = Date.now() + tokens.expiresIn * 1000;
    await Promise.all([
      set(KEYS.agentechAccess, tokens.accessToken),
      set(KEYS.agentechRefresh, tokens.refreshToken),
      set(KEYS.agentechExpiresAt, String(expiresAt)),
    ]);
  },

  async getUpstreamAccess(): Promise<string | null> {
    const [tok, exp, refresh] = await Promise.all([
      get(KEYS.agentechAccess),
      get(KEYS.agentechExpiresAt),
      get(KEYS.agentechRefresh),
    ]);
    if (!tok) return null;
    const expiresAt = Number(exp ?? 0);
    if (Date.now() < expiresAt - 60_000) return tok;
    if (!refresh) return tok;
    try {
      const r = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refresh }),
      });
      if (!r.ok) return tok;
      const j = await r.json();
      const t = j.tokens;
      await this.setUpstream({
        accessToken: t.accessToken,
        refreshToken: t.refreshToken ?? refresh,
        expiresIn: t.expiresIn ?? 900,
      });
      return t.accessToken;
    } catch {
      return tok;
    }
  },

  async clear() {
    await Promise.all([
      del(KEYS.leaflowToken),
      del(KEYS.agentechAccess),
      del(KEYS.agentechRefresh),
      del(KEYS.agentechExpiresAt),
    ]);
  },
};

export class ApiError extends Error {
  status: number;
  body: any;
  constructor(status: number, body: any) {
    super(body?.message || `HTTP ${status}`);
    this.status = status;
    this.body = body;
  }
}

type ReqOpts = Omit<RequestInit, 'body'> & { body?: any };

export async function api(path: string, opts: ReqOpts = {}) {
  const headers: Record<string, string> = { Accept: 'application/json', ...(opts.headers as any || {}) };
  const isJson = opts.body && typeof opts.body !== 'string' && !(opts.body instanceof FormData);
  if (isJson && !headers['Content-Type']) headers['Content-Type'] = 'application/json';

  const token = await session.getLeaflowToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const body = isJson ? JSON.stringify(opts.body) : opts.body;

  const r = await fetch(`${API_URL}${path}`, { ...opts, headers, body });
  if (r.status === 204) return null;
  const text = await r.text();
  const data = text ? JSON.parse(text) : null;
  if (!r.ok) throw new ApiError(r.status, data);
  return data;
}

api.get = (path: string) => api(path);
api.post = (path: string, body?: any) => api(path, { method: 'POST', body });
api.put = (path: string, body?: any) => api(path, { method: 'PUT', body });
api.del = (path: string) => api(path, { method: 'DELETE' });

/**
 * Direct agentechauth call (e.g. for /notifications/devices/register which is
 * authenticated against the agentechauth user session, not our own JWT).
 */
export async function agentech(path: string, opts: ReqOpts = {}) {
  const access = await session.getUpstreamAccess();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'x-api-key': AGENTECH_API_KEY,
    ...(opts.headers as any || {}),
  };
  if (access) headers.Authorization = `Bearer ${access}`;
  const isJson = opts.body && typeof opts.body !== 'string' && !(opts.body instanceof FormData);
  if (isJson && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  const body = isJson ? JSON.stringify(opts.body) : opts.body;

  const r = await fetch(`${AGENTECH_BASE_URL}${path}`, { ...opts, headers, body });
  if (r.status === 204) return null;
  const text = await r.text();
  const data = text ? JSON.parse(text) : null;
  if (!r.ok) throw new ApiError(r.status, data);
  return data?.data ?? data;
}

/**
 * Upload a file to Fiload via multipart and return { path, filename }.
 * Fiload's /upld responds with a single plain-text body — the stored path
 * (or filename); we trust whatever it returns and use that as the proof key.
 *
 * On web we read the picker's URI as a Blob first because React Native's
 * `{ uri, name, type }` FormData shorthand only works in the native runtime.
 */
export async function filoadUpload(uri: string, filename: string, mime: string): Promise<{ path: string; filename: string }> {
  const form = new FormData();
  if (Platform.OS === 'web') {
    const blob = await fetch(uri).then((res) => res.blob());
    form.append('file', blob, filename);
  } else {
    form.append('file', { uri, name: filename, type: mime } as any);
  }

  let r: Response;
  try {
    r = await fetch(`${FILOAD_BASE_URL}/upld`, { method: 'POST', body: form as any });
  } catch (err: any) {
    throw new ApiError(0, { message: `Fiload erişilemedi: ${err?.message ?? err}` });
  }

  const text = (await r.text().catch(() => '')).trim();
  if (!r.ok) throw new ApiError(r.status, { message: text || `HTTP ${r.status}` });
  if (!text) throw new ApiError(r.status, { message: 'Fiload yanıtı boş' });

  return { path: text, filename: text.split('/').pop() || filename };
}

/**
 * Fetches a file from Fiload's /gt endpoint. The response body is a
 * base64-encoded string (no JSON wrapper, no binary stream). Useful for
 * rendering thumbnails directly via `data:` URIs.
 *
 * Note: Fiload uses ?filename=<path> (URL-encoded) — the path returned by
 * /upld goes here verbatim, e.g. "2026-05/abc.jpg".
 */
export async function filoadDownloadBase64(filename: string): Promise<string> {
  const url = `${FILOAD_BASE_URL}/gt?filename=${encodeURIComponent(filename)}`;
  const r = await fetch(url);
  const text = (await r.text().catch(() => '')).trim();
  if (!r.ok) throw new ApiError(r.status, { message: text || `HTTP ${r.status}` });
  return text;
}

/** Builds a `data:<mime>;base64,...` URI from a Fiload filename for <Image>. */
export async function filoadDataUri(filename: string, mime = 'image/jpeg'): Promise<string> {
  const b64 = await filoadDownloadBase64(filename);
  return `data:${mime};base64,${b64}`;
}
