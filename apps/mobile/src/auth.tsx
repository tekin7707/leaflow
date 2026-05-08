import { createContext, useContext, useEffect, useState } from 'react';
import { api, session } from './api';

const AuthCtx = createContext<any>(null);

export function AuthProvider({ children }: { children: any }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const tok = await session.getProvitToken();
      if (!tok) {
        setLoading(false);
        return;
      }
      try {
        const me = await api.get('/api/auth/me');
        if (!cancelled) setUser(me);
      } catch {
        await session.clear();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const login = async (email: string, password: string) => {
    const r = await api.post('/api/auth/login', { email, password });
    await session.setProvitToken(r.token);
    if (r.upstream) {
      await session.setUpstream({
        accessToken: r.upstream.accessToken,
        refreshToken: r.upstream.refreshToken,
        expiresIn: r.upstream.expiresIn,
      });
    }
    setUser(r.user);
    return r.user;
  };

  const logout = async () => {
    try { await api.post('/api/auth/logout'); } catch { /* best-effort */ }
    await session.clear();
    setUser(null);
  };

  const isManager = user?.memberships?.some((m: any) => m.role === 'MANAGER') ?? false;

  return (
    <AuthCtx.Provider value={{ user, isManager, loading, login, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
