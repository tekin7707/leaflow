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

  const groupsQ = useQuery({ queryKey: ['qg'], queryFn: () => api.get('/api/question-groups') });
  const detailQ = useQuery({
    queryKey: ['qg', selected],
    queryFn: () => api.get(`/api/question-groups/${selected}`),
    enabled: !!selected,
  });

  useEffect(() => {
    if (detailQ.data) setDraft(detailQ.data.questions);
  }, [detailQ.data]);

  const create = useMutation({
    mutationFn: (data) => api.post('/api/question-groups', data),
    onSuccess: (g) => {
      qc.invalidateQueries({ queryKey: ['qg'] });
      setSelected(g.id);
    },
  });
  const save = useMutation({
    mutationFn: ({ id, questions }) =>
      api.post(`/api/question-groups/${id}/questions`, { questions }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['qg'] }),
  });

  const groups = groupsQ.data || [];
  const group = detailQ.data;

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
      <SectionLabel>Checklist</SectionLabel>
      <h1 className="h-serif" style={{ fontStyle: 'italic', fontSize: 32, margin: '0 0 20px' }}>
        Soru grupları
      </h1>
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
        <Card>
          <SectionLabel>Gruplar</SectionLabel>
          <div className="list">
            {groups.map((g) => (
              <div
                key={g.id}
                className={`list-item ${selected === g.id ? 'active' : ''}`}
                onClick={() => setSelected(g.id)}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{g.name}</div>
                </div>
                <Pill>{g.questionCount} soru</Pill>
              </div>
            ))}
          </div>
          <Button
            variant="ghost"
            style={{ marginTop: 12, width: '100%' }}
            onClick={() => {
              const name = prompt('Grup adı?');
              if (name) create.mutate({ name });
            }}
          >
            + Yeni grup
          </Button>
        </Card>

        <Card>
          {!group && <Empty>Soru grubu seçin.</Empty>}
          {group && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
                <h2 className="h-serif" style={{ margin: 0, fontSize: 24, fontStyle: 'italic' }}>{group.name}</h2>
                <Button
                  variant="accent"
                  size="sm"
                  onClick={() => save.mutate({ id: group.id, questions: draft })}
                  disabled={save.isPending || draft.length === 0}
                >
                  {save.isPending ? 'Kaydediliyor…' : 'Kaydet'}
                </Button>
              </div>

              {draft.length === 0 && <Empty>Henüz soru yok.</Empty>}
              <div className="list">
                {draft.map((q, idx) => (
                  <div key={idx} className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span className="mono muted" style={{ fontSize: 11, width: 24 }}>{idx + 1}</span>
                      <input
                        value={q.text}
                        placeholder="Soru metni"
                        onChange={(e) => updateQ(idx, { text: e.target.value })}
                        style={{ flex: 1 }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <select
                        value={q.answerType}
                        onChange={(e) => updateQ(idx, { answerType: e.target.value })}
                      >
                        {ANSWER_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span className="mono muted" style={{ fontSize: 11 }}>Ağırlık</span>
                        <input
                          type="number"
                          min={1}
                          max={5}
                          value={q.weight}
                          onChange={(e) => updateQ(idx, { weight: Number(e.target.value) })}
                          style={{ width: 60 }}
                        />
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                        <input
                          type="checkbox"
                          checked={q.required}
                          onChange={(e) => updateQ(idx, { required: e.target.checked })}
                        />
                        Zorunlu
                      </label>
                      <span style={{ flex: 1 }} />
                      <Button size="sm" variant="ghost" onClick={() => moveQ(idx, -1)}>↑</Button>
                      <Button size="sm" variant="ghost" onClick={() => moveQ(idx, 1)}>↓</Button>
                      <Button size="sm" variant="danger" onClick={() => removeQ(idx)}>Sil</Button>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="ghost" style={{ marginTop: 12 }} onClick={addQ}>+ Soru ekle</Button>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
