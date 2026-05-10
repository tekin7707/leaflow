import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Button, Card, Pill, SectionLabel } from '../components/UI';

type TaskDraft = {
  id: string;
  name: string;
  description?: string;
  order: number;
  estimatedMinutes: number;
  minFiles: number;
  requiresApproval: boolean;
  questionGroupId: string;
  checklistRequirement: string;
  dependsOn: string[];
};

export default function TaskGroupEdit() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [meta, setMeta] = useState({
    name: '',
    description: '',
    kind: 'GROUP',
    defaultExecutionMode: 'REPRESENTATIVE',
    defaultApprovalMode: 'NONE',
    requiresApproval: false,
    minFiles: 0,
    recurrence: '',
    questionGroupId: '',
    checklistRequirement: 'OPTIONAL',
  });
  const [tasks, setTasks] = useState<TaskDraft[]>([]);
  const [simpleTask, setSimpleTask] = useState({
    estimatedMinutes: 15,
    minFiles: 0,
    requiresApproval: false,
    questionGroupId: '',
    checklistRequirement: 'OPTIONAL',
  });
  const [err, setErr] = useState<string | null>(null);

  const groupQ = useQuery({
    queryKey: ['tg', id, 'edit'],
    queryFn: () => api.get(`/api/task-groups/${id}`),
    enabled: !!id,
  });
  const checklistsQ = useQuery({ queryKey: ['qg'], queryFn: () => api.get('/api/checklists') });
  const checklists = checklistsQ.data || [];

  useEffect(() => {
    const g = groupQ.data;
    if (!g) return;
    setMeta({
      name: g.name,
      description: g.description || '',
      kind: g.kind,
      defaultExecutionMode: g.defaultExecutionMode,
      defaultApprovalMode: g.defaultApprovalMode,
      requiresApproval: g.requiresApproval,
      minFiles: g.minFiles,
      recurrence: g.recurrence || '',
      questionGroupId: g.questionGroupId || '',
      checklistRequirement: g.checklistRequirement || 'OPTIONAL',
    });
    setTasks(g.tasks.map((t: any, index: number) => ({
      id: t.id,
      name: t.name,
      description: t.description || '',
      order: index,
      estimatedMinutes: t.estimatedMinutes,
      minFiles: t.minFiles,
      requiresApproval: t.requiresApproval,
      questionGroupId: t.questionGroupId || '',
      checklistRequirement: t.checklistRequirement || 'OPTIONAL',
      dependsOn: t.dependsOn || [],
    })));
    const firstTask = g.tasks[0];
    if (firstTask) {
      setSimpleTask({
        estimatedMinutes: firstTask.estimatedMinutes,
        minFiles: firstTask.minFiles,
        requiresApproval: firstTask.requiresApproval,
        questionGroupId: firstTask.questionGroupId || '',
        checklistRequirement: firstTask.checklistRequirement || 'OPTIONAL',
      });
    }
  }, [groupQ.data]);

  const buildTasksPayload = () => {
    if (meta.kind === 'SIMPLE') {
      const preservedId = tasks[0]?.id;
      return [{
        ...(preservedId ? { id: preservedId } : {}),
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
    return tasks.map((task, index) => ({ ...task, order: index, questionGroupId: task.questionGroupId || null }));
  };

  const save = useMutation({
    mutationFn: () => api.put(`/api/task-groups/${id}`, {
      name: meta.name,
      description: meta.description || undefined,
      kind: meta.kind,
      defaultExecutionMode: meta.defaultExecutionMode,
      defaultApprovalMode: meta.requiresApproval ? meta.defaultApprovalMode : 'NONE',
      requiresApproval: meta.requiresApproval,
      minFiles: Number(meta.minFiles) || 0,
      recurrence: meta.recurrence || null,
      questionGroupId: meta.questionGroupId || null,
      checklistRequirement: meta.checklistRequirement,
      tasks: buildTasksPayload(),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tg'] });
      qc.invalidateQueries({ queryKey: ['tg', id] });
      nav(`/task-groups/${id}`);
    },
    onError: (e: any) => setErr(e.message),
  });

  const addTask = () => setTasks((current) => ([
    ...current,
    {
      id: `tmp_${current.length}`,
      name: '',
      description: '',
      order: current.length,
      estimatedMinutes: 15,
      minFiles: 0,
      requiresApproval: false,
      questionGroupId: '',
      checklistRequirement: 'OPTIONAL',
      dependsOn: [],
    },
  ]));

  const updateTask = (index: number, patch: Partial<TaskDraft>) => {
    setTasks((current) => current.map((task, idx) => (idx === index ? { ...task, ...patch } : task)));
  };

  const removeTask = (index: number) => {
    const removedId = tasks[index]?.id;
    setTasks((current) => current
      .filter((_, idx) => idx !== index)
      .map((task) => ({ ...task, dependsOn: task.dependsOn.filter((depId) => depId !== removedId) })));
  };

  const moveTask = (index: number, direction: number) => {
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

  const toggleDep = (index: number, depId: string) => {
    setTasks((current) => current.map((task, idx) => {
      if (idx !== index) return task;
      return {
        ...task,
        dependsOn: task.dependsOn.includes(depId)
          ? task.dependsOn.filter((id) => id !== depId)
          : [...task.dependsOn, depId],
      };
    }));
  };

  const assignmentCount = useMemo(() => groupQ.data?.assignments?.length ?? 0, [groupQ.data]);

  const submitSave = () => {
    if (!meta.name.trim()) {
      setErr('Grup adı zorunlu.');
      return;
    }
    if (meta.kind === 'GROUP' && tasks.some((task) => !task.name.trim())) {
      setErr('Her alt görev için ad girmelisin.');
      return;
    }
    setErr(null);
    save.mutate();
  };

  if (!groupQ.data) return <div className="muted">Yükleniyor…</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
        <div>
          <SectionLabel>Görev grubu</SectionLabel>
          <h1 className="h-serif" style={{ fontStyle: 'italic', fontSize: 32, margin: 0 }}>Grubu düzenle</h1>
        </div>
        <Link to={`/task-groups/${id}`}><Button variant="ghost">Geri dön</Button></Link>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <Pill>{assignmentCount} atama</Pill>
          <Pill tone="warn">Eski atamalar bu değişiklikten etkilenmez</Pill>
        </div>
        <div className="field">
          <label>Grup adı</label>
          <input value={meta.name} onChange={(e) => setMeta({ ...meta, name: e.target.value })} />
        </div>
        <div className="field">
          <label>Açıklama</label>
          <textarea rows={3} value={meta.description} onChange={(e) => setMeta({ ...meta, description: e.target.value })} />
        </div>
        <div className="row">
          <div className="field" style={{ flex: 1 }}>
            <label>Grup checklisti</label>
            <select value={meta.questionGroupId} onChange={(e) => setMeta({ ...meta, questionGroupId: e.target.value })}>
              <option value="">Checklist yok</option>
              {checklists.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Checklist kullanımı</label>
            <select value={meta.checklistRequirement} onChange={(e) => setMeta({ ...meta, checklistRequirement: e.target.value })} disabled={!meta.questionGroupId}>
              <option value="MANDATORY">Zorunlu</option>
              <option value="OPTIONAL">Opsiyonel</option>
            </select>
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
          <div className="field" style={{ flex: 1 }}>
            <label>Çalışma modu</label>
            <select value={meta.defaultExecutionMode} onChange={(e) => setMeta({ ...meta, defaultExecutionMode: e.target.value })}>
              <option value="REPRESENTATIVE">Bir kişi yapsa yeterli</option>
              <option value="INDIVIDUAL">Herkes bağımsız yapmalı</option>
            </select>
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Onay modu</label>
            <select value={meta.defaultApprovalMode} onChange={(e) => setMeta({ ...meta, defaultApprovalMode: e.target.value })} disabled={!meta.requiresApproval}>
              <option value="NONE">Onay yok</option>
              <option value="TEAM_MANAGER">Takım yöneticisi</option>
            </select>
          </div>
        </div>
      </Card>

      <Card>
        <SectionLabel>{meta.kind === 'SIMPLE' ? 'Görev ayarları' : 'Görevler'}</SectionLabel>
        {meta.kind === 'SIMPLE' ? (
          <div style={{ display: 'grid', gap: 12 }}>
            <div className="muted" style={{ fontSize: 12 }}>
              Basit görevde çalıştırılabilir alt görev, üst görev adı ve açıklamasıyla otomatik eşleşir.
            </div>
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
                <label>Süre</label>
                <input type="number" min={1} value={simpleTask.estimatedMinutes} onChange={(e) => setSimpleTask({ ...simpleTask, estimatedMinutes: Number(e.target.value) || 1 })} />
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label>Min dosya</label>
                <input type="number" min={0} value={simpleTask.minFiles} onChange={(e) => setSimpleTask({ ...simpleTask, minFiles: Number(e.target.value) || 0 })} />
              </div>
            </div>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
              <input type="checkbox" checked={simpleTask.requiresApproval} onChange={(e) => setSimpleTask({ ...simpleTask, requiresApproval: e.target.checked })} />
              Alt görev tamamlanınca onay gerekli
            </label>
          </div>
        ) : (
          <div className="list">
            {tasks.map((task, index) => (
              <div key={task.id} className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span className="mono muted" style={{ fontSize: 11, width: 24, paddingTop: 8 }}>{index + 1}</span>
                  <input value={task.name} placeholder="Görev adı" onChange={(e) => updateTask(index, { name: e.target.value })} style={{ flex: 1 }} />
                  <Button variant="ghost" size="sm" onClick={() => moveTask(index, -1)} disabled={index === 0}>↑</Button>
                  <Button variant="ghost" size="sm" onClick={() => moveTask(index, 1)} disabled={index === tasks.length - 1}>↓</Button>
                  <Button variant="danger" size="sm" onClick={() => removeTask(index)}>Sil</Button>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <label style={{ fontSize: 12 }}>Checklist
                    <select value={task.questionGroupId} onChange={(e) => updateTask(index, { questionGroupId: e.target.value })} style={{ width: 180, marginLeft: 6 }}>
                      <option value="">Checklist yok</option>
                      {checklists.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </label>
                  <label style={{ fontSize: 12 }}>Zorunluluk
                    <select value={task.checklistRequirement} onChange={(e) => updateTask(index, { checklistRequirement: e.target.value })} style={{ width: 120, marginLeft: 6 }} disabled={!task.questionGroupId}>
                      <option value="MANDATORY">Zorunlu</option>
                      <option value="OPTIONAL">Opsiyonel</option>
                    </select>
                  </label>
                  <label style={{ fontSize: 12 }}>Süre
                    <input type="number" min={1} value={task.estimatedMinutes} onChange={(e) => updateTask(index, { estimatedMinutes: Number(e.target.value) || 1 })} style={{ width: 80, marginLeft: 6 }} />
                  </label>
                  <label style={{ fontSize: 12 }}>Min dosya
                    <input type="number" min={0} value={task.minFiles} onChange={(e) => updateTask(index, { minFiles: Number(e.target.value) || 0 })} style={{ width: 80, marginLeft: 6 }} />
                  </label>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {index === 0 && (
                    <span className="muted" style={{ fontSize: 12 }}>İlk görev için bağımlılık yok.</span>
                  )}
                  {tasks.slice(0, index).map((dep) => (
                    <label key={dep.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, padding: '4px 8px', border: '1px solid var(--line)', borderRadius: 6 }}>
                      <input type="checkbox" checked={task.dependsOn.includes(dep.id)} onChange={() => toggleDep(index, dep.id)} />
                      {dep.name || '(adsız)'}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {err && <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 12 }}>{err}</div>}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
          <div>
            {meta.kind === 'GROUP' && <Button variant="ghost" onClick={addTask}>+ Görev ekle</Button>}
          </div>
          <Button
            variant="accent"
            disabled={save.isPending}
            onClick={submitSave}
          >
            {save.isPending ? 'Kaydediliyor…' : 'Değişiklikleri kaydet'}
          </Button>
        </div>
      </Card>
    </div>
  );
}