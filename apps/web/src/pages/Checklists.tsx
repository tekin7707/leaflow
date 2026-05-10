import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Card, SectionLabel, Button, Empty, Pill } from '../components/UI';

const ANSWER_TYPES = [
  ['YES_NO', 'Evet/Hayır'],
  ['YES_NO_NA', 'Evet/Hayır/N.A.'],
  ['TEXT', 'Metin'],
  ['NUMBER', 'Sayı'],
];

export default function Checklists() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [draft, setDraft] = useState([]);
  const [name, setName] = useState('');
  const [newName, setNewName] = useState('');

  const groupsQ = useQuery({ queryKey: ['qg'], queryFn: () => api.get('/api/question-groups') });
  const detailQ = useQuery({
    queryKey: ['qg', selected],
    queryFn: () => api.get(`/api/question-groups/${selected}`),
    enabled: !!selected,
  });
  const usedByQ = useQuery({
    queryKey: ['qg', selected, 'used-by'],
    queryFn: () => api.get(`/api/question-groups/${selected}/used-by`),
    enabled: !!selected,
  });

  useEffect(() => {
    if (detailQ.data) {
      setDraft(detailQ.data.questions);
      setName(detailQ.data.name);
    }
  }, [detailQ.data]);

  useEffect(() => {
    if (!selected && groupsQ.data?.length) setSelected(groupsQ.data[0].id);
  }, [groupsQ.data, selected]);

  const create = useMutation({
    mutationFn: (data) => api.post('/api/question-groups', data),
    onSuccess: (g) => {
      qc.invalidateQueries({ queryKey: ['qg'] });
      setSelected(g.id);
      setNewName('');
    },
  });
  const rename = useMutation({
    mutationFn: ({ id, nextName }) => api.put(`/api/question-groups/${id}`, { name: nextName }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['qg'] });
      qc.invalidateQueries({ queryKey: ['qg', selected] });
    },
  });
  const save = useMutation({
    mutationFn: ({ id, questions }) =>
      api.post(`/api/question-groups/${id}/questions`, { questions }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['qg'] });
      qc.invalidateQueries({ queryKey: ['qg', selected] });
    },
  });
  const remove = useMutation({
    mutationFn: (id) => api.del(`/api/question-groups/${id}`),
    onSuccess: () => {
      const groups = groupsQ.data || [];
      const next = groups.find((item) => item.id !== selected);
      setSelected(next?.id || null);
      setDraft([]);
      setName('');
      qc.invalidateQueries({ queryKey: ['qg'] });
    },
  });

  const groups = groupsQ.data || [];
  const group = detailQ.data;
  const usedBy = usedByQ.data || [];
  const questionCount = draft.length;
  const requiredCount = draft.filter((question) => question.required).length;
  const weightedAverage = questionCount ? (draft.reduce((sum, question) => sum + Number(question.weight || 0), 0) / questionCount).toFixed(1) : '0.0';

  const updateQ = (idx, patch) => setDraft((d) => d.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  const moveQ = (idx, dir) => {
    setDraft((d) => {
      const x = [...d];
      const j = idx + dir;
      if (j < 0 || j >= x.length) return d;
      [x[idx], x[j]] = [x[j], x[idx]];
      return x.map((q, i) => ({ ...q, order: i }));
    });
  };
  const removeQ = (idx) => setDraft((d) => d.filter((_, i) => i !== idx).map((q, i) => ({ ...q, order: i })));
  const addQ = () =>
    setDraft((d) => [
      ...d,
      { text: '', answerType: 'YES_NO', weight: 3, required: true, order: d.length },
    ]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
        <div>
          <SectionLabel>Checklist</SectionLabel>
          <h1 className="h-serif" style={{ fontStyle: 'italic', fontSize: 32, margin: 0 }}>
            Checklist tanımları
          </h1>
        </div>
        <Pill>{groups.length} şablon</Pill>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16, alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 16 }}>
          <Card>
            <SectionLabel>Yeni checklist</SectionLabel>
            <div className="field">
              <label>Şablon adı</label>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Açılış kontrol listesi" />
            </div>
            <Button variant="accent" style={{ width: '100%' }} disabled={!newName || create.isPending} onClick={() => create.mutate({ name: newName })}>
              {create.isPending ? 'Oluşturuluyor…' : '+ Yeni checklist'}
            </Button>
          </Card>

          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
              <SectionLabel>Mevcut şablonlar</SectionLabel>
              <span className="muted" style={{ fontSize: 12 }}>{groups.length} kayıt</span>
            </div>
            {groups.length === 0 && <Empty>Henüz checklist tanımı yok.</Empty>}
            <div className="list">
              {groups.map((g) => (
                <div
                  key={g.id}
                  className={`list-item ${selected === g.id ? 'active' : ''}`}
                  onClick={() => setSelected(g.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{g.name}</div>
                    <div className="muted" style={{ fontSize: 12 }}>Son düzenlenen şablonlardan biri</div>
                  </div>
                  <Pill>{g.questionCount} soru</Pill>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          {!group && <Card><Empty>Düzenlemek için soldan bir checklist seçin.</Empty></Card>}
          {group && (
            <>
              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <SectionLabel>Checklist bilgileri</SectionLabel>
                    <div className="field" style={{ marginBottom: 0 }}>
                      <label>Şablon adı</label>
                      <input value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
                    <Button variant="ghost" size="sm" disabled={!name || name === group.name || rename.isPending} onClick={() => rename.mutate({ id: group.id, nextName: name })}>
                      {rename.isPending ? 'Kaydediliyor…' : 'Adı kaydet'}
                    </Button>
                    <Button variant="danger" size="sm" disabled={remove.isPending || usedBy.length > 0} onClick={() => remove.mutate(group.id)}>
                      Sil
                    </Button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
                  <Pill>{questionCount} soru</Pill>
                  <Pill>{requiredCount} zorunlu</Pill>
                  <Pill>Ort. ağırlık {weightedAverage}</Pill>
                  <Pill tone={usedBy.length > 0 ? 'warn' : undefined}>{usedBy.length} görevde kullanım</Pill>
                </div>
                {usedBy.length > 0 && (
                  <div className="muted" style={{ fontSize: 12, marginTop: 12 }}>
                    Bu checklist aktif görev tanımlarında kullanılıyor. Silme işlemi bu yüzden kapalı.
                  </div>
                )}
              </Card>

              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
                  <div>
                    <SectionLabel>Sorular</SectionLabel>
                    <h2 className="h-serif" style={{ margin: 0, fontSize: 24, fontStyle: 'italic' }}>{group.name}</h2>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button variant="ghost" onClick={addQ}>+ Soru ekle</Button>
                    <Button
                      variant="accent"
                      onClick={() => save.mutate({ id: group.id, questions: draft })}
                      disabled={save.isPending || draft.length === 0 || draft.some((question) => !question.text?.trim())}
                    >
                      {save.isPending ? 'Kaydediliyor…' : 'Soruları kaydet'}
                    </Button>
                  </div>
                </div>

                {draft.length === 0 && <Empty>İlk soruyu ekleyerek checklist yapısını oluştur.</Empty>}
                <div style={{ display: 'grid', gap: 12 }}>
                  {draft.map((q, idx) => (
                    <div key={idx} style={{ border: '1px solid var(--line)', borderRadius: 14, padding: 14, background: 'var(--card)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span className="mono muted" style={{ fontSize: 11 }}>#{idx + 1}</span>
                          <Pill>{q.required ? 'Zorunlu' : 'Opsiyonel'}</Pill>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <Button size="sm" variant="ghost" onClick={() => moveQ(idx, -1)} disabled={idx === 0}>↑</Button>
                          <Button size="sm" variant="ghost" onClick={() => moveQ(idx, 1)} disabled={idx === draft.length - 1}>↓</Button>
                          <Button size="sm" variant="danger" onClick={() => removeQ(idx)}>Sil</Button>
                        </div>
                      </div>
                      <div className="field">
                        <label>Soru metni</label>
                        <textarea
                          rows={2}
                          value={q.text}
                          placeholder="Kontrol edilmesi gereken maddeyi yaz"
                          onChange={(e) => updateQ(idx, { text: e.target.value })}
                        />
                      </div>
                      <div className="row" style={{ alignItems: 'flex-end' }}>
                        <div className="field" style={{ flex: 1 }}>
                          <label>Yanıt tipi</label>
                          <select value={q.answerType} onChange={(e) => updateQ(idx, { answerType: e.target.value })}>
                            {ANSWER_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                          </select>
                        </div>
                        <div className="field" style={{ width: 120 }}>
                          <label>Ağırlık</label>
                          <input type="number" min={1} max={5} value={q.weight} onChange={(e) => updateQ(idx, { weight: Number(e.target.value) || 1 })} />
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 10, fontSize: 13 }}>
                          <input type="checkbox" checked={q.required} onChange={(e) => updateQ(idx, { required: e.target.checked })} />
                          Zorunlu soru
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                  <SectionLabel>Kullanıldığı görevler</SectionLabel>
                  <span className="muted" style={{ fontSize: 12 }}>{usedBy.length} bağlantı</span>
                </div>
                {usedBy.length === 0 ? (
                  <Empty>Bu checklist henüz hiçbir görevde kullanılmıyor.</Empty>
                ) : (
                  <div className="list">
                    {usedBy.map((item: any) => (
                      <div key={item.taskId} className="list-item">
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600 }}>{item.taskGroupName}</div>
                          <div className="muted" style={{ fontSize: 12 }}>{item.taskOrder + 1}. adım · {item.taskName}</div>
                        </div>
                        <Pill>Bağlı</Pill>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
