import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth';
import { Avatar, Button } from './UI';

const NAV = [
  { to: '/', label: 'Pano', end: true },
  { to: '/teams', label: 'Takımlar' },
  { to: '/checklists', label: 'Checklist' },
  { to: '/task-groups', label: 'Görev grupları' },
  { to: '/timeline', label: 'Zaman çizelgesi' },
  { to: '/approvals', label: 'Onaylar' },
  { to: '/reports', label: 'Raporlar' },
  { to: '/notifications', label: 'Bildirimler' },
];

export function Layout() {
  const { user, logout } = useAuth();
  return (
    <div className="app">
      <aside className="app__sidebar">
        <div className="app__brand">Provit</div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) => `app__nav-link ${isActive ? 'active' : ''}`}
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderTop: '1px solid var(--line)', paddingTop: 12 }}>
          <Avatar name={user?.displayName ?? '?'} size={32} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.displayName}
            </div>
            <div style={{ fontSize: 11, color: 'var(--mute)' }}>{user?.email}</div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={logout}>Çıkış</Button>
      </aside>
      <main className="app__main">
        <Outlet />
      </main>
    </div>
  );
}
