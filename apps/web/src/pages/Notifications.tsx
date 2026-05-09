import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Card, SectionLabel, Button, Pill, Empty } from '../components/UI';

const fmt = (d) => new Date(d).toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' });

const KIND_TONE = {
  TASK_ASSIGNED: 'accent',
  ASSIGNMENT_NEW: 'accent',
  APPROVAL_REQUESTED: 'warn',
  APPROVAL_RESULT: 'accent',
  TASK_COMPLETED: 'accent',
  TASK_UNBLOCKED: 'mute',
  TASK_DUE_SOON: 'warn',
};

export default function Notifications() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const q = useQuery({
    queryKey: ['notifications', filter],
    queryFn: () => api.get(`/api/notifications${filter === 'unread' ? '?unread=1' : ''}`),
    refetchInterval: 30_000,
  });
  const list = q.data || [];

  const markRead = useMutation({
    mutationFn: (id) => api.post(`/api/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const openTarget = (n) => {
    const data = n.data ?? {};
    if (!n.readAt) markRead.mutate(n.id);
    if (data.taskRunId || data.entityId) {
      nav(`/task-runs/${data.taskRunId ?? data.entityId}`);
      return;
    }
    if (data.path) nav(data.path);
  };

  return (
    <div>
      <SectionLabel>Bildirimler</SectionLabel>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 className="h-serif" style={{ fontStyle: 'italic', fontSize: 32, margin: 0 }}>
          Bildirimler
        </h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant={filter === 'all' ? 'primary' : 'ghost'} size="sm" onClick={() => setFilter('all')}>Tümü</Button>
          <Button variant={filter === 'unread' ? 'primary' : 'ghost'} size="sm" onClick={() => setFilter('unread')}>Okunmamış</Button>
        </div>
      </div>

      {list.length === 0 && <Empty>{filter === 'unread' ? 'Okunmamış bildirim yok.' : 'Bildirim yok.'}</Empty>}

      <Card>
        <div className="list">
          {list.map((n) => (
            <div
              key={n.id}
              className="list-item"
              onClick={() => openTarget(n)}
              style={{ background: n.readAt ? 'transparent' : 'var(--accent-soft)', cursor: 'pointer' }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{n.title}</div>
                <div className="muted" style={{ fontSize: 12 }}>{n.body}</div>
              </div>
              <Pill tone={KIND_TONE[n.kind] ?? 'mute'}>{n.kind}</Pill>
              <span className="mono muted-soft" style={{ fontSize: 11 }}>{fmt(n.createdAt)}</span>
              {!n.readAt && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => { e.stopPropagation(); markRead.mutate(n.id); }}
                >
                  Okundu
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
