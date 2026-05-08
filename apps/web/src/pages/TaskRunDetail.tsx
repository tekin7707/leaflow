import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, fileUrl } from '../api';
import { Card, SectionLabel, Button, Pill, StatusPill, Avatar, Empty } from '../components/UI';
import { useAuth } from '../auth';

const fmt = (d) => (d ? new Date(d).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

export default function TaskRunDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { isManager } = useAuth();
  const [comment, setComment] = useState('');
  const [assigneeId, setAssigneeId] = useState('');

  const trQ = useQuery({ queryKey: ['taskRun', id], queryFn: () => api.get(`/api/task-runs/${id}`) });
  const tr = trQ.data;

  const teamId = tr?.run?.assignment?.teamId;
  const teamsQ = useQuery({
    queryKey: ['teams'],
    queryFn: () => api.get('/api/teams'),
    enabled: !!teamId,
  });
  const team = (teamsQ.data || []).find((t) => t.id === teamId);

  const assign = useMutation({
    mutationFn: () => api.post(`/api/task-runs/${id}/assign`, { userId: assigneeId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['taskRun', id] }),
  });

  const decide = useMutation({
    mutationFn: ({ approvalId, decision }) =>
      api.post(`/api/approvals/${approvalId}/decide`, { decision, comment: comment || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['taskRun', id] });
      qc.invalidateQueries({ queryKey: ['approvals'] });
      setComment('');
    },
  });

  if (trQ.isLoading) return <Empty>Yükleniyor…</Empty>;
  if (!tr) return <Empty>Görev bulunamadı.</Empty>;

  const proofs = tr.proofs || [];
  const answers = tr.answers || [];
  const approvals = tr.approvals || [];
  const pending = approvals.find((a) => a.decision === 'PENDING');
  const questions = tr.task?.questionGroup?.questions || [];
  const answerByQ = new Map(answers.map((a) => [a.questionId, a]));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <SectionLabel>{tr.run.assignment.group.name} · {tr.run.assignment.team.name}</SectionLabel>
          <h1 className="h-serif" style={{ fontStyle: 'italic', fontSize: 32, margin: 0 }}>
            {tr.task.name}
          </h1>
        </div>
        <Button variant="ghost" onClick={() => nav(-1)}>← Geri</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        <Card>
          {tr.task.description && (
            <>
              <SectionLabel>Görev tanımı</SectionLabel>
              <div style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 16, color: 'var(--ink)' }}>
                {tr.task.description}
              </div>
            </>
          )}

          {tr.note && (
            <>
              <SectionLabel>Açıklama (atanan kişiden)</SectionLabel>
              <div
                style={{
                  whiteSpace: 'pre-wrap',
                  fontSize: 13,
                  background: 'var(--surface-alt)',
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 16,
                }}
              >
                {tr.note}
              </div>
            </>
          )}

          <SectionLabel>Foto kanıtlar ({proofs.length})</SectionLabel>
          {proofs.length === 0 && <div className="muted" style={{ fontSize: 13, marginBottom: 16 }}>Henüz foto eklenmedi.</div>}
          {proofs.length > 0 && (
            <div className="grid-3" style={{ marginBottom: 16 }}>
              {proofs.map((p) => (
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
            </div>
          )}

          {questions.length > 0 && (
            <>
              <SectionLabel>Checklist · {tr.task.questionGroup.name}</SectionLabel>
              <div className="list" style={{ marginBottom: 16 }}>
                {questions.map((q) => {
                  const ans = answerByQ.get(q.id);
                  return (
                    <div key={q.id} className="list-item">
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13 }}>
                          {q.text} {q.required && <span style={{ color: 'var(--danger)' }}>*</span>}
                        </div>
                        {ans?.note && <div className="muted" style={{ fontSize: 11 }}>{ans.note}</div>}
                      </div>
                      {ans
                        ? <Pill tone={ans.value === 'EVET' || ans.value === 'YES' ? 'accent' : 'mute'}>{ans.value}</Pill>
                        : <Pill tone="mute">—</Pill>}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {approvals.length > 0 && (
            <>
              <SectionLabel>Onay geçmişi</SectionLabel>
              <div className="list" style={{ marginBottom: 16 }}>
                {approvals.map((a) => (
                  <div key={a.id} className="list-item">
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        {a.decision === 'APPROVED' ? 'Onaylandı' : a.decision === 'CHANGES_REQUESTED' ? 'Düzeltme istendi' : 'Bekliyor'}
                      </div>
                      {a.comment && <div className="muted" style={{ fontSize: 12 }}>{a.comment}</div>}
                    </div>
                    <span className="mono muted" style={{ fontSize: 11 }}>{fmt(a.decidedAt ?? a.createdAt)}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {pending && isManager && (
            <>
              <SectionLabel>Onay kararı</SectionLabel>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Yorum (opsiyonel)…"
                style={{ width: '100%', marginBottom: 12 }}
              />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <Button
                  variant="danger"
                  disabled={decide.isPending}
                  onClick={() => decide.mutate({ approvalId: pending.id, decision: 'CHANGES_REQUESTED' })}
                >
                  Düzeltme iste
                </Button>
                <Button
                  variant="accent"
                  disabled={decide.isPending}
                  onClick={() => decide.mutate({ approvalId: pending.id, decision: 'APPROVED' })}
                >
                  Onayla
                </Button>
              </div>
            </>
          )}
        </Card>

        <Card>
          <SectionLabel>Durum</SectionLabel>
          <div style={{ marginBottom: 12 }}><StatusPill status={tr.status} /></div>

          <SectionLabel>Atanan</SectionLabel>
          {tr.assignee ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Avatar name={tr.assignee.displayName} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{tr.assignee.displayName}</div>
                <div className="muted" style={{ fontSize: 12 }}>{tr.assignee.email}</div>
              </div>
            </div>
          ) : (
            <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>Henüz atanmamış.</div>
          )}

          {isManager && team && (
            <>
              <SectionLabel>{tr.assignee ? 'Yeniden ata' : 'Ata'}</SectionLabel>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                style={{ width: '100%', marginBottom: 8 }}
              >
                <option value="">— Kişi seç —</option>
                {team.members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user.displayName}
                  </option>
                ))}
              </select>
              <Button
                variant="primary"
                size="sm"
                disabled={!assigneeId || assign.isPending}
                onClick={() => assign.mutate()}
                style={{ width: '100%', marginBottom: 12 }}
              >
                {assign.isPending ? 'Atanıyor…' : 'Ata + bildirim gönder'}
              </Button>
            </>
          )}

          <SectionLabel>Tarihler</SectionLabel>
          <div className="muted" style={{ fontSize: 12, lineHeight: 1.7 }}>
            <div>Plan: {fmt(tr.run.date)}</div>
            <div>Başlangıç: {fmt(tr.startedAt)}</div>
            <div>Bitiş: {fmt(tr.completedAt)}</div>
          </div>

          <div style={{ marginTop: 16 }}>
            <Link to={`/task-groups/${tr.run.assignment.groupId}`} style={{ fontSize: 12, color: 'var(--accent)' }}>
              Görev grubu →
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
