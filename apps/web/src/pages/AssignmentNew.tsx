import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../api';
import { Card, SectionLabel, Button } from '../components/UI';

const isoLocal = (d) => {
  const x = new Date(d);
  const off = x.getTimezoneOffset();
  return new Date(x.getTime() - off * 60_000).toISOString().slice(0, 16);
};
const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d;
};

export default function AssignmentNew() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [groupId, setGroupId] = useState(params.get('groupId') || '');
  const [teamId, setTeamId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [startsAt, setStartsAt] = useState(isoLocal(tomorrow()));
  const [endsAt, setEndsAt] = useState(isoLocal(new Date(tomorrow().getTime() + 8 * 3600_000)));
  const [approverId, setApproverId] = useState('');
  const [err, setErr] = useState(null);

  const tgQ = useQuery({ queryKey: ['tg'], queryFn: () => api.get('/api/task-groups') });
  const teamsQ = useQuery({ queryKey: ['teams'], queryFn: () => api.get('/api/teams') });

  const create = useMutation({
    mutationFn: () =>
      api.post('/api/assignments', {
        groupId,
        teamId,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        approverId: approverId || undefined,
        assigneeId: assigneeId || undefined,
      }),
    onSuccess: () => nav('/timeline'),
    onError: (e) => setErr(e.message),
  });

  const team = (teamsQ.data || []).find((t) => t.id === teamId);
  const assignee = team?.members.find((m) => m.userId === assigneeId);

  return (
    <div>
      <SectionLabel>Atama</SectionLabel>
      <h1 className="h-serif" style={{ fontStyle: 'italic', fontSize: 32, margin: '0 0 20px' }}>
        Yeni atama
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        <Card>
          <div className="field">
            <label>Görev grubu</label>
            <select value={groupId} onChange={(e) => setGroupId(e.target.value)}>
              <option value="">— Seçin —</option>
              {(tgQ.data || []).map((g) => (
                <option key={g.id} value={g.id}>{g.name} {g.recurrence ? `· ${g.recurrence}` : ''}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Takım</label>
            <select value={teamId} onChange={(e) => { setTeamId(e.target.value); setAssigneeId(''); }}>
              <option value="">— Seçin —</option>
              {(teamsQ.data || []).map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          {team && (
            <div className="field">
              <label>Kişiye ata (opsiyonel — boşsa tüm takıma duyurulur)</label>
              <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                <option value="">— Tüm takım —</option>
                {team.members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user.displayName} · {m.role === 'MANAGER' ? 'Yönetici' : 'Üye'}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="row">
            <div className="field" style={{ flex: 1 }}>
              <label>Başlangıç</label>
              <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Bitiş</label>
              <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </div>
          </div>
          {team && (
            <div className="field">
              <label>Onaylayıcı (opsiyonel — grubun varsayılanını ezer)</label>
              <select value={approverId} onChange={(e) => setApproverId(e.target.value)}>
                <option value="">— Varsayılan —</option>
                {team.members
                  .filter((m) => m.role === 'MANAGER')
                  .map((m) => (
                    <option key={m.userId} value={m.userId}>{m.user.displayName}</option>
                  ))}
              </select>
            </div>
          )}
          {err && <div style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 8 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <Link to="/task-groups"><Button variant="ghost">İptal</Button></Link>
            <Button
              variant="accent"
              disabled={!groupId || !teamId || create.isPending}
              onClick={() => create.mutate()}
            >
              {create.isPending ? 'Oluşturuluyor…' : 'Atamayı oluştur'}
            </Button>
          </div>
        </Card>

        <Card>
          <SectionLabel>Önizleme</SectionLabel>
          <div className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
            <div><strong>Grup:</strong> {(tgQ.data || []).find((g) => g.id === groupId)?.name || '—'}</div>
            <div><strong>Takım:</strong> {team?.name || '—'}</div>
            <div><strong>Kişi:</strong> {assignee?.user.displayName ?? 'Tüm takım'}</div>
            <div><strong>Başlangıç:</strong> {startsAt}</div>
            <div><strong>Bitiş:</strong> {endsAt}</div>
            <div><strong>Onaylayıcı:</strong> {approverId ? team?.members.find((m) => m.userId === approverId)?.user.displayName : 'Varsayılan'}</div>
          </div>
          <div className="muted" style={{ fontSize: 11, marginTop: 12, lineHeight: 1.5 }}>
            Kişi seçilirse tüm taskRun'lar bu kullanıcıya atanır ve mobil cihazına push bildirimi gönderilir.
            Boş bırakılırsa tüm takıma duyurulur.
          </div>
        </Card>
      </div>
    </div>
  );
}
