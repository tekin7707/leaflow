import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, fileUrl } from '../api';
import { Card, SectionLabel, Button, Pill, Empty, Avatar } from '../components/UI';

const fmtTime = (d) => new Date(d).toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' });

export default function Approvals() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [picked, setPicked] = useState(new Set());
  const [comment, setComment] = useState('');

  const queueQ = useQuery({ queryKey: ['approvals', 'queue'], queryFn: () => api.get('/api/approvals/queue') });
  const queue = queueQ.data || [];
  const current = queue.find((a) => a.id === selected) || queue[0];

  const decide = useMutation({
    mutationFn: ({ id, decision, comment }) =>
      api.post(`/api/approvals/${id}/decide`, { decision, comment: comment || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approvals'] });
      setSelected(null);
      setComment('');
    },
  });

  const bulk = useMutation({
    mutationFn: ({ decision }) =>
      api.post('/api/approvals/bulk-decide', {
        ids: [...picked],
        decision,
        comment: comment || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approvals'] });
      setPicked(new Set());
    },
  });

  const togglePick = (id) => {
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  return (
    <div>
      <SectionLabel>Onaylar</SectionLabel>
      <h1 className="h-serif" style={{ fontStyle: 'italic', fontSize: 32, margin: '0 0 20px' }}>
        Onay kuyruğu ({queue.length})
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 16 }}>
        <Card>
          <div className="toolbar">
            <Pill>{queue.length} bekleyen</Pill>
            <span className="spacer" />
            {picked.size > 0 && (
              <>
                <Button size="sm" variant="accent" onClick={() => bulk.mutate({ decision: 'APPROVED' })}>
                  Toplu onayla ({picked.size})
                </Button>
                <Button size="sm" variant="danger" onClick={() => bulk.mutate({ decision: 'CHANGES_REQUESTED' })}>
                  Toplu reddet
                </Button>
              </>
            )}
          </div>

          {queue.length === 0 && <Empty>Bekleyen onay yok.</Empty>}
          <div className="list">
            {queue.map((a) => (
              <div
                key={a.id}
                className={`list-item ${current?.id === a.id ? 'active' : ''}`}
                onClick={() => setSelected(a.id)}
              >
                <input
                  type="checkbox"
                  checked={picked.has(a.id)}
                  onChange={(e) => { e.stopPropagation(); togglePick(a.id); }}
                  onClick={(e) => e.stopPropagation()}
                />
                <Avatar name={a.taskRun.assignee?.displayName ?? '?'} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{a.taskRun.task.name}</div>
                  <div className="muted" style={{ fontSize: 11 }}>
                    {a.taskRun.assignee?.displayName ?? '—'} · {a.taskRun.run.assignment.team.name}
                  </div>
                </div>
                <span className="mono muted" style={{ fontSize: 10 }}>{fmtTime(a.createdAt)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          {!current && <Empty>Bir kayıt seçin.</Empty>}
          {current && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div>
                  <SectionLabel>{current.taskRun.run.assignment.group.name}</SectionLabel>
                  <h2 className="h-serif" style={{ margin: 0, fontSize: 24, fontStyle: 'italic' }}>
                    {current.taskRun.task.name}
                  </h2>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Link to={`/task-runs/${current.taskRunId}`} style={{ fontSize: 12, color: 'var(--accent)' }}>
                    Detay sayfası →
                  </Link>
                  <Pill tone="warn">Onay bekliyor</Pill>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 12, marginBottom: 16 }}>
                <Avatar name={current.taskRun.assignee?.displayName ?? '?'} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{current.taskRun.assignee?.displayName ?? '—'}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{fmtTime(current.taskRun.completedAt)}</div>
                </div>
              </div>

              {current.taskRun.note && (
                <>
                  <SectionLabel>Açıklama</SectionLabel>
                  <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: 'var(--ink)', background: 'var(--surface-alt)', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                    {current.taskRun.note}
                  </div>
                </>
              )}

              <SectionLabel>Foto kanıtlar ({current.taskRun.proofs.length})</SectionLabel>
              <div className="grid-3" style={{ marginBottom: 16 }}>
                {current.taskRun.proofs.map((p) => (
                  <a
                    key={p.id}
                    href={fileUrl(p.key, p.mime || 'application/octet-stream')}
                    target="_blank"
                    rel="noreferrer"
                    title={p.filename}
                  >
                    <img
                      src={fileUrl(p.key, p.mime || 'image/jpeg')}
                      alt={p.filename}
                      style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: 8, background: 'var(--surface-alt)' }}
                    />
                  </a>
                ))}
                {current.taskRun.proofs.length === 0 && <div className="muted" style={{ fontSize: 13 }}>Foto yok.</div>}
              </div>

              {current.taskRun.answers.length > 0 && (
                <>
                  <SectionLabel>Checklist cevapları</SectionLabel>
                  <div className="list" style={{ marginBottom: 16 }}>
                    {current.taskRun.answers.map((ans) => (
                      <div key={ans.id} className="list-item">
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13 }}>{ans.question.text}</div>
                          {ans.note && <div className="muted" style={{ fontSize: 11 }}>{ans.note}</div>}
                        </div>
                        <Pill tone={ans.value === 'EVET' || ans.value === 'YES' ? 'accent' : 'mute'}>{ans.value}</Pill>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <SectionLabel>Yorum (ops.)</SectionLabel>
              <textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} style={{ width: '100%', marginBottom: 12 }} />

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <Button
                  variant="danger"
                  onClick={() => decide.mutate({ id: current.id, decision: 'CHANGES_REQUESTED', comment })}
                  disabled={decide.isPending}
                >
                  Düzeltme iste
                </Button>
                <Button
                  variant="accent"
                  onClick={() => decide.mutate({ id: current.id, decision: 'APPROVED', comment })}
                  disabled={decide.isPending}
                >
                  Onayla
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
