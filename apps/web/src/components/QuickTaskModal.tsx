import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../api';
import { Modal, Button } from './UI';

const WHEN_OPTIONS = [
  ['NOW', 'Şimdi'],
  ['TODAY', 'Bugün'],
  ['TOMORROW', 'Yarın'],
];

export function QuickTaskModal({ open, onClose, defaultTeamId }: any) {
  const nav = useNavigate();
  const [groupId, setGroupId] = useState('');
  const [targetMode, setTargetMode] = useState<'TEAM' | 'USER'>('TEAM');
  const [teamId, setTeamId] = useState(defaultTeamId || '');
  const [assigneeId, setAssigneeId] = useState('');
  const [when, setWhen] = useState('TODAY');
  const [executionMode, setExecutionMode] = useState('REPRESENTATIVE');
  const groupsQ = useQuery({ queryKey: ['tg'], queryFn: () => api.get('/api/task-groups'), enabled: open });
  const teamsQ = useQuery({ queryKey: ['teams'], queryFn: () => api.get('/api/teams'), enabled: open });

  const groups = groupsQ.data || [];
  const teams = teamsQ.data || [];
  const team = teams.find((item: any) => item.id === teamId);
  const users = Array.from(
    new Map(
      teams
        .flatMap((item: any) => item.members.map((member: any) => ({ ...member, teamName: item.name, teamId: item.id })))
        .map((member: any) => [member.userId, member]),
    ).values(),
  );

  const reset = () => {
    setGroupId('');
    setTargetMode('TEAM');
    setTeamId(defaultTeamId || '');
    setAssigneeId('');
    setWhen('TODAY');
    setExecutionMode('REPRESENTATIVE');
  };

  const submit = useMutation({
    mutationFn: () =>
      api.post('/api/assignments/quick', {
        groupId,
        target: targetMode === 'USER' ? { kind: 'USER', id: assigneeId } : { kind: 'TEAM', id: teamId },
        when,
        executionMode: targetMode === 'USER' ? undefined : executionMode,
      }),
    onSuccess: () => {
      reset();
      onClose();
      nav('/timeline');
    },
  });

  return (
    <Modal open={open} onClose={onClose} title="Hızlı atama">
      <div style={{ display: 'grid', gap: 12 }}>
        <div className="field">
          <label>Görev *</label>
          <select value={groupId} onChange={(e) => setGroupId(e.target.value)} autoFocus>
            <option value="">— Görev seç —</option>
            {groups.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Hedef tipi</label>
          <select value={targetMode} onChange={(e) => { const next = e.target.value as 'TEAM' | 'USER'; setTargetMode(next); setAssigneeId(''); if (next === 'USER') setTeamId(''); }}>
            <option value="TEAM">Takıma ata</option>
            <option value="USER">Kişiye ata</option>
          </select>
        </div>

        <div className="row" style={{ display: 'flex', gap: 8 }}>
          <div className="field" style={{ flex: 1 }}>
            {targetMode === 'TEAM' ? (
              <>
                <label>Takım *</label>
                <select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
                  <option value="">— Takım seç —</option>
                  {teams.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </>
            ) : (
              <>
                <label>Kişi *</label>
                <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                  <option value="">— Kişi seç —</option>
                  {users.map((member: any) => (
                    <option key={member.userId} value={member.userId}>{member.user.displayName} · {member.teamName}</option>
                  ))}
                </select>
              </>
            )}
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Ne zaman</label>
            <select value={when} onChange={(e) => setWhen(e.target.value)}>
              {WHEN_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
        </div>

        {targetMode === 'TEAM' && team && (
          <div className="field">
            <label>Takım çalışma modu</label>
            <select value={executionMode} onChange={(e) => setExecutionMode(e.target.value)}>
              <option value="REPRESENTATIVE">Bir kişi yapsa yeterli</option>
              <option value="INDIVIDUAL">Herkes bağımsız yapmalı</option>
            </select>
            <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>
              Kullanıcı seçilmezse atama tüm takıma açılır. Bu alanda takımın çalışma biçimini seçersin.
            </div>
          </div>
        )}
        {submit.isError && (
          <div style={{ color: 'var(--danger)', fontSize: 12 }}>{(submit.error as any)?.message}</div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <Button variant="ghost" onClick={onClose}>İptal</Button>
          <Button
            variant="accent"
            disabled={!groupId || (targetMode === 'TEAM' ? !teamId : !assigneeId) || submit.isPending}
            onClick={() => submit.mutate()}
          >
            {submit.isPending ? 'Atanıyor…' : 'Atamayı oluştur'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
