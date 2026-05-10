import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth';
import { api } from '../api';
import { Avatar, Button } from './UI';
import { QuickTaskModal } from './QuickTaskModal';
import { BrandLogo } from './BrandLogo';

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
  const [quickOpen, setQuickOpen] = useState(false);

  const unreadQ = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const list = await api.get('/api/notifications?unread=1');
      return Array.isArray(list) ? list.length : 0;
    },
    refetchInterval: 30_000,
    enabled: !!user,
  });
  const unread = unreadQ.data ?? 0;
  return (
    <div className="app">
      <aside className="app__sidebar">
        <div className="app__brand">
          <BrandLogo />
        </div>
        <Button variant="accent" size="sm" onClick={() => setQuickOpen(true)} style={{ margin: '0 12px 12px' }}>
          + Hızlı atama
        </Button>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) => `app__nav-link ${isActive ? 'active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <span>{n.label}</span>
              {n.to === '/notifications' && unread > 0 && (
                <span
                  style={{
                    background: 'var(--accent)',
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 700,
                    minWidth: 18,
                    height: 18,
                    borderRadius: 9,
                    padding: '0 6px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
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
      <QuickTaskModal open={quickOpen} onClose={() => setQuickOpen(false)} />
    </div>
  );
}
