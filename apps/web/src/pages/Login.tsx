import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { Card, Button } from '../components/UI';
import { BrandLogo } from '../components/BrandLogo';

export default function Login() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={loc.state?.from?.pathname ?? '/'} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      await login(email, password);
      nav(loc.state?.from?.pathname ?? '/', { replace: true });
    } catch (e) {
      setErr(e.message || 'Giriş başarısız');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <Card style={{ width: 'min(420px, 100%)', padding: 32 }}>
        <BrandLogo variant="vertical" className="login-brand" />
        <div className="muted" style={{ marginBottom: 24, fontSize: 13 }}>
          Where work flows naturally
        </div>

        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="email">E-posta</label>
            <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="password">Parola</label>
            <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {err && <div className="field err" style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 12 }}>{err}</div>}
          <Button type="submit" variant="accent" size="lg" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Giriş yapılıyor…' : 'Giriş yap'}
          </Button>
        </form>

        <div className="hint" style={{ marginTop: 16, padding: 12, background: 'var(--surface-alt)', borderRadius: 8, fontSize: 12, color: 'var(--mute)' }}>
          <div className="mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 6, color: 'var(--mute-soft)' }}>
            Agentechauth
          </div>
          <div>Leaflow hesabı ile giriş yapın.</div>
        </div>
      </Card>
    </div>
  );
}
