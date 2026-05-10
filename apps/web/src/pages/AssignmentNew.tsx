import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  const [targetMode, setTargetMode] = useState<'TEAM' | 'USER'>('TEAM');
  const [teamId, setTeamId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [executionMode, setExecutionMode] = useState('REPRESENTATIVE');
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
        teamId: targetMode === 'TEAM' ? teamId : undefined,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        approverId: approverId || undefined,
        assigneeId: targetMode === 'USER' ? assigneeId || undefined : undefined,
        executionMode: targetMode === 'TEAM' ? executionMode : undefined,
      }),
    onSuccess: () => nav('/timeline'),
    onError: (e) => setErr(e.message),
  });

  const team = (teamsQ.data || []).find((t) => t.id === teamId);
  const assignee = team?.members.find((m) => m.userId === assigneeId);
  const users = Array.from(
    new Map(
      (teamsQ.data || [])
        .flatMap((teamItem: any) => teamItem.members.map((member: any) => ({ ...member, teamName: teamItem.name, teamId: teamItem.id })))
        .map((member: any) => [member.userId, member]),
    ).values(),
  );
  const selectedUser: any = users.find((member: any) => member.userId === assigneeId);
  const inferredTeam = targetMode === 'USER' ? (teamsQ.data || []).find((item: any) => item.id === selectedUser?.teamId) : team;

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
            <label>Hedef tipi</label>
            <select value={targetMode} onChange={(e) => { const next = e.target.value as 'TEAM' | 'USER'; setTargetMode(next); setAssigneeId(''); setTeamId(''); setApproverId(''); }}>
              <option value="TEAM">Takıma ata</option>
              <option value="USER">Kişiye ata</option>
            </select>
          </div>
          {targetMode === 'TEAM' && (
            <div className="field">
              <label>Takım</label>
              <select value={teamId} onChange={(e) => { setTeamId(e.target.value); setApproverId(''); }}>
                <option value="">— Seçin —</option>
                {(teamsQ.data || []).map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}
          {targetMode === 'USER' && (
            <div className="field">
              <label>Kişi</label>
              <select value={assigneeId} onChange={(e) => { setAssigneeId(e.target.value); setApproverId(''); }}>
                <option value="">— Seçin —</option>
                {users.map((member: any) => (
                  <option key={member.userId} value={member.userId}>
                    {member.user.displayName} · {member.teamName}
                  </option>
                ))}
              </select>
            </div>
          )}
          {targetMode === 'TEAM' && team && (
            <div className="field">
              <label>Takım atama modu</label>
              <select value={executionMode} onChange={(e) => setExecutionMode(e.target.value)}>
                <option value="REPRESENTATIVE">Bir kişi yapsa yeterli</option>
                <option value="INDIVIDUAL">Herkes bağımsız yapmalı</option>
              </select>
              <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>
                Her iki modda da her üye kendi task run&apos;ını görür. İlk seçenek operasyonel olarak tek bir tamamlamayı yeterli görmek için, ikinci seçenek ise herkesi ayrı sorumlu tutmak içindir.
              </div>
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
          {inferredTeam && (
            <div className="field">
              <label>Onaylayıcı (opsiyonel — grubun varsayılanını ezer)</label>
              <select value={approverId} onChange={(e) => setApproverId(e.target.value)}>
                <option value="">— Varsayılan —</option>
                {inferredTeam.members
                  .filter((m) => m.role === 'MANAGER')
                  .map((m) => (
                    <option key={m.userId} value={m.userId}>{m.user.displayName}</option>
                  ))}
              </select>
            </div>
          )}
          {err && <div style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 8 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" onClick={() => nav('/task-groups')}>İptal</Button>
            <Button
              variant="accent"
              disabled={!groupId || (targetMode === 'TEAM' ? !teamId : !assigneeId) || create.isPending}
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
            <div><strong>Takım:</strong> {inferredTeam?.name || '—'}</div>
            <div><strong>Kişi:</strong> {targetMode === 'USER' ? (selectedUser?.user.displayName || '—') : 'Tüm takım'}</div>
            <div><strong>Çalışma:</strong> {targetMode === 'USER' ? 'Tek kullanıcı' : executionMode === 'INDIVIDUAL' ? 'Herkes bağımsız yapmalı' : 'Bir kişi yapsa yeterli'}</div>
            <div><strong>Başlangıç:</strong> {startsAt}</div>
            <div><strong>Bitiş:</strong> {endsAt}</div>
            <div><strong>Onaylayıcı:</strong> {approverId ? inferredTeam?.members.find((m) => m.userId === approverId)?.user.displayName : 'Varsayılan'}</div>
          </div>
          <div className="muted" style={{ fontSize: 11, marginTop: 12, lineHeight: 1.5 }}>
            Kişi modu seçilirse takım seçmeden kullanıcıya atama yapılır; sistem uygun takımı üyelikten bulur.
            Takım modu seçilirse tüm takıma duyurulur.
          </div>
        </Card>
      </div>
    </div>
  );
}
