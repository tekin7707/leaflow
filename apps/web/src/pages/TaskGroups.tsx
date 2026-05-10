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

const EXECUTION_MODES = [
  ['REPRESENTATIVE', 'Temsilci'],
  ['INDIVIDUAL', 'Bireysel'],
];

const APPROVAL_MODES = [
  ['NONE', 'Onay yok'],
  ['TEAM_MANAGER', 'Takım yöneticisi'],
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
        <Button variant="accent" onClick={() => setWizard(true)}>+ Yeni görev</Button>
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
                <Pill>{g.kind === 'SIMPLE' ? 'Basit' : 'Grup'}</Pill>
                <Pill>{g.defaultExecutionMode === 'INDIVIDUAL' ? 'Bireysel' : 'Temsilci'}</Pill>
                {g.requiresApproval && <Pill tone="warn">Onay zorunlu</Pill>}
                {g.defaultApprovalMode === 'TEAM_MANAGER' && <Pill tone="warn">Yönetici onayı</Pill>}
                {g.minFiles > 0 && <Pill>min {g.minFiles} dosya</Pill>}
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <Modal open={wizard} onClose={() => setWizard(false)} title="Yeni görev">
        <Wizard onCreated={() => { setWizard(false); qc.invalidateQueries({ queryKey: ['tg'] }); }} />
      </Modal>
    </div>
  );
}

function Wizard({ onCreated }) {
  const checklistsQ = useQuery({ queryKey: ['qg'], queryFn: () => api.get('/api/checklists') });
  const checklists = checklistsQ.data || [];
  const [step, setStep] = useState(1);
  const [meta, setMeta] = useState({
    name: '',
    description: '',
    kind: 'GROUP',
    requiresApproval: false,
    minFiles: 0,
    recurrence: '',
    questionGroupId: '',
    checklistRequirement: 'OPTIONAL',
  });
  const [simpleTask, setSimpleTask] = useState({
    estimatedMinutes: 15,
    minFiles: 0,
    requiresApproval: false,
    questionGroupId: '',
    checklistRequirement: 'OPTIONAL',
  });
  const [tasks, setTasks] = useState([
    { id: 't0', name: '', order: 0, estimatedMinutes: 15, minFiles: 0, requiresApproval: false, questionGroupId: '', checklistRequirement: 'OPTIONAL', dependsOn: [] },
  ]);
  const [err, setErr] = useState(null);
  const totalSteps = meta.kind === 'SIMPLE' ? 1 : 3;

  const buildTasksPayload = () => {
    if (meta.kind === 'SIMPLE') {
      return [{
        id: 'simple-task',
        name: meta.name,
        description: meta.description || undefined,
        order: 0,
        estimatedMinutes: simpleTask.estimatedMinutes,
        minFiles: simpleTask.minFiles,
        requiresApproval: simpleTask.requiresApproval,
        questionGroupId: simpleTask.questionGroupId || null,
        checklistRequirement: simpleTask.checklistRequirement,
        dependsOn: [],
      }];
    }
    return tasks.map((t, i) => ({ ...t, order: i, questionGroupId: t.questionGroupId || null }));
  };

  const create = useMutation({
    mutationFn: () =>
      api.post('/api/task-groups', {
        name: meta.name,
        description: meta.description || undefined,
        kind: meta.kind,
        requiresApproval: meta.requiresApproval,
        minFiles: Number(meta.minFiles) || 0,
        recurrence: meta.recurrence || null,
        questionGroupId: meta.questionGroupId || null,
        checklistRequirement: meta.checklistRequirement,
        tasks: buildTasksPayload(),
      }),
    onSuccess: () => onCreated(),
    onError: (e) => setErr(e.message),
  });

  const submitCreate = () => {
    if (!meta.name.trim()) {
      setErr('Görev adı zorunlu.');
      return;
    }

    if (meta.kind === 'GROUP' && tasks.some((task) => !task.name.trim())) {
      setErr('Her alt görev için ad girmelisin.');
      return;
    }

    setErr(null);
    create.mutate();
  };

  const addTask = () =>
    setTasks((ts) => [
      ...ts,
      { id: `t${ts.length}`, name: '', order: ts.length, estimatedMinutes: 15, minFiles: 0, requiresApproval: false, questionGroupId: '', checklistRequirement: 'OPTIONAL', dependsOn: [] },
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
  const moveTask = (index, direction) => {
    setTasks((current) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next.map((task, taskIndex) => ({
        ...task,
        order: taskIndex,
        dependsOn: task.dependsOn.filter((depId) => next.slice(0, taskIndex).some((candidate) => candidate.id === depId)),
      }));
    });
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
        Adım {step}/{totalSteps}
      </div>

      {step === 1 && (
        <>
          <div className="field">
            <label>Görev adı</label>
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
              <input type="number" min={0} value={meta.minFiles} onChange={(e) => setMeta({ ...meta, minFiles: Number(e.target.value) || 0 })} />
            </div>
          </div>
          <div className="row">
            <div className="field" style={{ flex: 1 }}>
              <label>Yapı</label>
              <select value={meta.kind} onChange={(e) => setMeta({ ...meta, kind: e.target.value })}>
                <option value="SIMPLE">Basit görev</option>
                <option value="GROUP">Görev grubu</option>
              </select>
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
          <SectionLabel>Grup checklisti</SectionLabel>
          <div className="row">
            <div className="field" style={{ flex: 1 }}>
              <label>Checklist</label>
              <select value={meta.questionGroupId} onChange={(e) => setMeta({ ...meta, questionGroupId: e.target.value })}>
                <option value="">Checklist yok</option>
                {checklists.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Checklist kullanımı</label>
              <select
                value={meta.checklistRequirement}
                onChange={(e) => setMeta({ ...meta, checklistRequirement: e.target.value })}
                disabled={!meta.questionGroupId}
              >
                <option value="MANDATORY">Zorunlu</option>
                <option value="OPTIONAL">Opsiyonel</option>
              </select>
            </div>
          </div>
          {meta.kind === 'SIMPLE' && (
            <>
              <SectionLabel>Görev ayarları</SectionLabel>
              <div className="row">
                <div className="field" style={{ flex: 1 }}>
                  <label>Checklist</label>
                  <select value={simpleTask.questionGroupId} onChange={(e) => setSimpleTask({ ...simpleTask, questionGroupId: e.target.value })}>
                    <option value="">Checklist yok</option>
                    {checklists.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label>Checklist kullanımı</label>
                  <select value={simpleTask.checklistRequirement} onChange={(e) => setSimpleTask({ ...simpleTask, checklistRequirement: e.target.value })} disabled={!simpleTask.questionGroupId}>
                    <option value="MANDATORY">Zorunlu</option>
                    <option value="OPTIONAL">Opsiyonel</option>
                  </select>
                </div>
              </div>
              <div className="row">
                <div className="field" style={{ flex: 1 }}>
                  <label>Süre (dk)</label>
                  <input type="number" min={1} value={simpleTask.estimatedMinutes} onChange={(e) => setSimpleTask({ ...simpleTask, estimatedMinutes: Number(e.target.value) || 1 })} />
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label>Min. dosya</label>
                  <input type="number" min={0} value={simpleTask.minFiles} onChange={(e) => setSimpleTask({ ...simpleTask, minFiles: Number(e.target.value) || 0 })} />
                </div>
              </div>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={simpleTask.requiresApproval}
                  onChange={(e) => setSimpleTask({ ...simpleTask, requiresApproval: e.target.checked })}
                />
                Alt görev tamamlanınca onay gerekli
              </label>
            </>
          )}
        </>
      )}

      {step === 2 && (
        <>
          <SectionLabel>Görevler</SectionLabel>
          {meta.kind === 'SIMPLE' && (
            <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
              Basit görev için ilk satır tek çalıştırılabilir görev olarak kullanılır.
            </div>
          )}
          <div className="list">
            {tasks.map((t, i) => (
              <div key={t.id} className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span className="mono muted" style={{ fontSize: 11, width: 24, paddingTop: 8 }}>{i + 1}</span>
                  <input value={t.name} placeholder="Görev adı" onChange={(e) => updateTask(i, { name: e.target.value })} style={{ flex: 1 }} />
                  <Button size="sm" variant="ghost" onClick={() => moveTask(i, -1)} disabled={i === 0}>↑</Button>
                  <Button size="sm" variant="ghost" onClick={() => moveTask(i, 1)} disabled={i === tasks.length - 1}>↓</Button>
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
                  <label style={{ fontSize: 12 }}>Checklist
                    <select value={t.questionGroupId || ''} onChange={(e) => updateTask(i, { questionGroupId: e.target.value })} style={{ width: 180, marginLeft: 6 }}>
                      <option value="">Checklist yok</option>
                      {checklists.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </label>
                  <label style={{ fontSize: 12 }}>Zorunluluk
                    <select value={t.checklistRequirement || 'OPTIONAL'} onChange={(e) => updateTask(i, { checklistRequirement: e.target.value })} style={{ width: 120, marginLeft: 6 }} disabled={!t.questionGroupId}>
                      <option value="OPTIONAL">Opsiyonel</option>
                      <option value="MANDATORY">Zorunlu</option>
                    </select>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                  <div style={{ fontWeight: 600 }}>{i + 1}. {t.name || '(adsız)'}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Button size="sm" variant="ghost" onClick={() => moveTask(i, -1)} disabled={i === 0}>↑</Button>
                    <Button size="sm" variant="ghost" onClick={() => moveTask(i, 1)} disabled={i === tasks.length - 1}>↓</Button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                  {i === 0 && (
                    <span className="muted" style={{ fontSize: 12 }}>İlk görev için bağımlılık yok.</span>
                  )}
                  {tasks.slice(0, i).map((dep) => (
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
        {step < totalSteps ? (
          <Button variant="accent" onClick={() => setStep(step + 1)}>İleri</Button>
        ) : (
          <Button
            variant="accent"
            disabled={create.isPending}
            onClick={submitCreate}
          >
            {create.isPending ? 'Oluşturuluyor…' : 'Oluştur'}
          </Button>
        )}
      </div>
    </div>
  );
}
