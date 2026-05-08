import { createContext, useContext, useEffect, useState } from 'react';
import { api, tokenStore } from './api';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const tok = await tokenStore.get();
      if (!tok) {
        setLoading(false);
        return;
      }
      try {
        const me = await api.get('/api/auth/me');
        if (!cancelled) setUser(me);
      } catch {
        await tokenStore.clear();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const login = async (email, password) => {
    const r = await api.post('/api/auth/login', { email, password });
    await tokenStore.set(r.token);
    setUser(r.user);
    return r.user;
  };

  const logout = async () => {
    await tokenStore.clear();
    setUser(null);
  };

  const isManager = user?.memberships?.some((m) => m.role === 'MANAGER') ?? false;

  return (
    <AuthCtx.Provider value={{ user, isManager, loading, login, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
