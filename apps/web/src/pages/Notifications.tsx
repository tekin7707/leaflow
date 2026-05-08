import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Card, SectionLabel, Button, Pill, Empty } from '../components/UI';

const fmt = (d) => new Date(d).toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' });

export default function Notifications() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['notifications'], queryFn: () => api.get('/api/notifications') });
  const list = q.data || [];

  const markRead = useMutation({
    mutationFn: (id) => api.post(`/api/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  return (
    <div>
      <SectionLabel>Bildirimler</SectionLabel>
      <h1 className="h-serif" style={{ fontStyle: 'italic', fontSize: 32, margin: '0 0 20px' }}>
        Bildirimler
      </h1>

      {list.length === 0 && <Empty>Bildirim yok.</Empty>}

      <Card>
        <div className="list">
          {list.map((n) => (
            <div key={n.id} className="list-item" style={{ background: n.readAt ? 'transparent' : 'var(--accent-soft)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{n.title}</div>
                <div className="muted" style={{ fontSize: 12 }}>{n.body}</div>
              </div>
              <Pill>{n.kind}</Pill>
              <span className="mono muted-soft" style={{ fontSize: 11 }}>{fmt(n.createdAt)}</span>
              {!n.readAt && (
                <Button size="sm" variant="ghost" onClick={() => markRead.mutate(n.id)}>Okundu</Button>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
