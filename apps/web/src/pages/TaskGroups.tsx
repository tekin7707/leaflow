import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Card, SectionLabel, Button, Pill, Modal, Empty } from '../components/UI';

const RECURRENCES = [
  ['', 'Tek seferlik'],
  ['DAILY', 'Her gün'],
  ['WEEKLY:1', 'Her pazartesi'],
  ['WEEKLY:1,3,5', 'Pzt/Çar/Cum'],
  ['MONTHLY:1', 'Her ayın 1\'i'],
];

export default function TaskGroups() {
  const qc = useQueryClient();
  const [wizard, setWizard] = useState(false);

  const groupsQ = useQuery({ queryKey: ['tg'], queryFn: () => api.get('/api/task-groups') });
  const groups = groupsQ.data || [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
        <div>
          <SectionLabel>Görev grupları</SectionLabel>
          <h1 className="h-serif" style={{ fontStyle: 'italic', fontSize: 32, margin: 0 }}>
            Tüm görev grupları
          </h1>
        </div>
        <Button variant="accent" onClick={() => setWizard(true)}>+ Yeni grup</Button>
      </div>

      {groups.length === 0 && <Empty>Henüz görev grubu yok.</Empty>}
      <div className="grid-2">
        {groups.map((g) => (
          <Link key={g.id} to={`/task-groups/${g.id}`} style={{ textDecoration: 'none' }}>
            <Card style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <h3 style={{ margin: 0, fontSize: 18 }}>{g.name}</h3>
                {g.recurrence && <Pill tone="accent">{g.recurrence}</Pill>}
              </div>
              {g.description && <div className="muted" style={{ fontSize: 13, margin: '8px 0' }}>{g.description}</div>}
              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <Pill>{g.taskCount} görev</Pill>
                <Pill>{g.assignmentCount} atama</Pill>
                {g.requiresApproval && <Pill tone="warn">Onay zorunlu</Pill>}
                {g.minFiles > 0 && <Pill>min {g.minFiles} dosya</Pill>}
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <Modal open={wizard} onClose={() => setWizard(false)} title="Yeni görev grubu">
        <Wizard onCreated={() => { setWizard(false); qc.invalidateQueries({ queryKey: ['tg'] }); }} />
      </Modal>
    </div>
  );
}

function Wizard({ onCreated }) {
  const [step, setStep] = useState(1);
  const [meta, setMeta] = useState({
    name: '',
    description: '',
    requiresApproval: false,
    minFiles: 0,
    recurrence: '',
  });
  const [tasks, setTasks] = useState([
    { id: 't0', name: '', order: 0, estimatedMinutes: 15, minFiles: 0, requiresApproval: false, dependsOn: [] },
  ]);
  const [err, setErr] = useState(null);

  const create = useMutation({
    mutationFn: () =>
      api.post('/api/task-groups', {
        name: meta.name,
        description: meta.description || undefined,
        requiresApproval: meta.requiresApproval,
        minFiles: Number(meta.minFiles) || 0,
        recurrence: meta.recurrence || null,
        tasks: tasks.map((t, i) => ({ ...t, order: i })),
      }),
    onSuccess: () => onCreated(),
    onError: (e) => setErr(e.message),
  });

  const addTask = () =>
    setTasks((ts) => [
      ...ts,
      { id: `t${ts.length}`, name: '', order: ts.length, estimatedMinutes: 15, minFiles: 0, requiresApproval: false, dependsOn: [] },
    ]);
  const updateTask = (i, patch) => setTasks((ts) => ts.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  const removeTask = (i) => {
    const removed = tasks[i].id;
    setTasks((ts) =>
      ts
        .filter((_, idx) => idx !== i)
        .map((t) => ({ ...t, dependsOn: t.dependsOn.filter((d) => d !== removed) })),
    );
  };
  const toggleDep = (i, depId) => {
    setTasks((ts) =>
      ts.map((t, idx) =>
        idx === i
          ? { ...t, dependsOn: t.dependsOn.includes(depId) ? t.dependsOn.filter((d) => d !== depId) : [...t.dependsOn, depId] }
          : t,
      ),
    );
  };

  return (
    <div>
      <div className="mono muted" style={{ fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 12 }}>
        Adım {step}/3
      </div>

      {step === 1 && (
        <>
          <div className="field">
            <label>Grup adı</label>
            <input value={meta.name} onChange={(e) => setMeta({ ...meta, name: e.target.value })} />
          </div>
          <div className="field">
            <label>Açıklama</label>
            <textarea value={meta.description} onChange={(e) => setMeta({ ...meta, description: e.target.value })} rows={3} />
          </div>
          <div className="row">
            <div className="field" style={{ flex: 1 }}>
              <label>Tekrarlama</label>
              <select value={meta.recurrence} onChange={(e) => setMeta({ ...meta, recurrence: e.target.value })}>
                {RECURRENCES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Min. dosya</label>
              <input type="number" min={0} value={meta.minFiles} onChange={(e) => setMeta({ ...meta, minFiles: e.target.value })} />
            </div>
          </div>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
            <input
              type="checkbox"
              checked={meta.requiresApproval}
              onChange={(e) => setMeta({ ...meta, requiresApproval: e.target.checked })}
            />
            Grup sonu yönetici onayı gerekli
          </label>
        </>
      )}

      {step === 2 && (
        <>
          <SectionLabel>Görevler</SectionLabel>
          <div className="list">
            {tasks.map((t, i) => (
              <div key={t.id} className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span className="mono muted" style={{ fontSize: 11, width: 24, paddingTop: 8 }}>{i + 1}</span>
                  <input value={t.name} placeholder="Görev adı" onChange={(e) => updateTask(i, { name: e.target.value })} style={{ flex: 1 }} />
                  <Button size="sm" variant="danger" onClick={() => removeTask(i)}>Sil</Button>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <label style={{ fontSize: 12 }}>Süre (dk)
                    <input type="number" min={1} value={t.estimatedMinutes} onChange={(e) => updateTask(i, { estimatedMinutes: Number(e.target.value) })} style={{ width: 80, marginLeft: 6 }} />
                  </label>
                  <label style={{ fontSize: 12 }}>Min dosya
                    <input type="number" min={0} value={t.minFiles} onChange={(e) => updateTask(i, { minFiles: Number(e.target.value) })} style={{ width: 80, marginLeft: 6 }} />
                  </label>
                  <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input type="checkbox" checked={t.requiresApproval} onChange={(e) => updateTask(i, { requiresApproval: e.target.checked })} />
                    Onay
                  </label>
                </div>
              </div>
            ))}
          </div>
          <Button variant="ghost" style={{ marginTop: 8 }} onClick={addTask}>+ Görev ekle</Button>
        </>
      )}

      {step === 3 && (
        <>
          <SectionLabel>Bağımlılıklar (DAG)</SectionLabel>
          <div className="muted" style={{ fontSize: 12, marginBottom: 12 }}>
            Bir görev başlamadan önce hangi görevlerin tamamlanmış olması gerektiğini seç. Döngüye izin verilmez.
          </div>
          <div className="list">
            {tasks.map((t, i) => (
              <div key={t.id} className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <div style={{ fontWeight: 600 }}>{i + 1}. {t.name || '(adsız)'}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                  {tasks.filter((_, j) => j !== i).map((dep) => (
                    <label key={dep.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, padding: '4px 8px', border: '1px solid var(--line)', borderRadius: 6 }}>
                      <input
                        type="checkbox"
                        checked={t.dependsOn.includes(dep.id)}
                        onChange={() => toggleDep(i, dep.id)}
                      />
                      {tasks.findIndex((x) => x.id === dep.id) + 1}. {dep.name || '(adsız)'}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {err && <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 8 }}>{err}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
        <Button variant="ghost" disabled={step === 1} onClick={() => setStep(step - 1)}>Geri</Button>
        {step < 3 ? (
          <Button variant="accent" onClick={() => setStep(step + 1)} disabled={step === 1 && !meta.name}>İleri</Button>
        ) : (
          <Button variant="accent" disabled={create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? 'Oluşturuluyor…' : 'Oluştur'}
          </Button>
        )}
      </div>
    </div>
  );
}
