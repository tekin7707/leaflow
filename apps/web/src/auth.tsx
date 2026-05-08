import { createContext, useContext, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api, tokenStore } from './api';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tokenStore.get()) {
      setLoading(false);
      return;
    }
    api.get('/api/auth/me')
      .then(setUser)
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const r = await api.post('/api/auth/login', { email, password });
    tokenStore.set(r.token);
    setUser(r.user);
    return r.user;
  };

  const logout = () => {
    tokenStore.clear();
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

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div style={{ padding: 40 }}>Yükleniyor…</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}
