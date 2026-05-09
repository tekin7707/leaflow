import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../api';
import { Modal, Button, SectionLabel } from './UI';

const RECURRENCES = [
  ['', 'Tek seferlik'],
  ['DAILY', 'Her gün'],
  ['WEEKLY:1', 'Her pazartesi'],
  ['WEEKLY:1,3,5', 'Pzt/Çar/Cum'],
  ['MONTHLY:1', 'Her ayın 1\'i'],
];

const WHENS = [
  ['NOW', 'Şimdi'],
  ['TODAY', 'Bugün'],
  ['TOMORROW', 'Yarın'],
];

export function QuickTaskModal({ open, onClose, defaultTeamId }: any) {
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [recurrence, setRecurrence] = useState('');
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [minFiles, setMinFiles] = useState(0);
  const [estimatedMinutes, setEstimatedMinutes] = useState(15);
  const [teamId, setTeamId] = useState(defaultTeamId ?? '');
  const [assigneeId, setAssigneeId] = useState('');
  const [when, setWhen] = useState('TODAY');

  const teamsQ = useQuery({ queryKey: ['teams'], queryFn: () => api.get('/api/teams'), enabled: open });
  const team = (teamsQ.data || []).find((t: any) => t.id === teamId);

  const reset = () => {
    setName(''); setDescription(''); setRecurrence(''); setRequiresApproval(false);
    setMinFiles(0); setEstimatedMinutes(15); setTeamId(''); setAssigneeId(''); setWhen('TODAY');
  };

  const submit = useMutation({
    mutationFn: () =>
      api.post('/api/quick-task', {
        name,
        description: description || undefined,
        requiresApproval,
        minFiles,
        estimatedMinutes,
        recurrence: recurrence || null,
        teamId: teamId || undefined,
        assigneeId: assigneeId || undefined,
        when,
      }),
    onSuccess: (r: any) => {
      reset();
      onClose();
      if (r?.taskRunId) nav(`/task-runs/${r.taskRunId}`);
      else nav('/timeline');
    },
  });

  return (
    <Modal open={open} onClose={onClose} title="Hızlı görev">
      <div style={{ display: 'grid', gap: 12 }}>
        <div className="field">
          <label>Görev adı *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mağaza temizliği" autoFocus />
        </div>
        <div className="field">
          <label>Açıklama (opsiyonel)</label>
          <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className="row" style={{ display: 'flex', gap: 8 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>Tekrar</label>
            <select value={recurrence} onChange={(e) => setRecurrence(e.target.value)}>
              {RECURRENCES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Süre (dk)</label>
            <input type="number" min={1} value={estimatedMinutes} onChange={(e) => setEstimatedMinutes(Number(e.target.value))} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Min foto</label>
            <input type="number" min={0} value={minFiles} onChange={(e) => setMinFiles(Number(e.target.value))} />
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <input type="checkbox" checked={requiresApproval} onChange={(e) => setRequiresApproval(e.target.checked)} />
          Tamamlanınca onay gerekli
        </label>

        <SectionLabel>Atama (opsiyonel)</SectionLabel>
        <div className="row" style={{ display: 'flex', gap: 8 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>Takım</label>
            <select value={teamId} onChange={(e) => { setTeamId(e.target.value); setAssigneeId(''); }}>
              <option value="">— Atama yapma —</option>
              {(teamsQ.data || []).map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Kişi (boşsa tüm takım)</label>
            <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} disabled={!team}>
              <option value="">— Tüm takım —</option>
              {team?.members.map((m: any) => (
                <option key={m.userId} value={m.userId}>{m.user.displayName}</option>
              ))}
            </select>
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Ne zaman</label>
            <select value={when} onChange={(e) => setWhen(e.target.value)} disabled={!teamId}>
              {WHENS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>

        {submit.isError && (
          <div style={{ color: 'var(--danger)', fontSize: 12 }}>{(submit.error as any)?.message}</div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <Button variant="ghost" onClick={onClose}>İptal</Button>
          <Button
            variant="accent"
            disabled={!name || submit.isPending}
            onClick={() => submit.mutate()}
          >
            {submit.isPending ? 'Oluşturuluyor…' : (teamId ? 'Oluştur + ata' : 'Oluştur')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
