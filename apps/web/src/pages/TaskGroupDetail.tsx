import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { Card, SectionLabel, Pill, Button } from '../components/UI';

const fmt = (d) => new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });

export default function TaskGroupDetail() {
  const { id } = useParams();
  const q = useQuery({ queryKey: ['tg', id], queryFn: () => api.get(`/api/task-groups/${id}`) });
  const g = q.data;
  if (!g) return <div className="muted">Yükleniyor…</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
        <div>
          <SectionLabel>Görev grubu</SectionLabel>
          <h1 className="h-serif" style={{ fontStyle: 'italic', fontSize: 32, margin: 0 }}>{g.name}</h1>
          {g.description && <div className="muted" style={{ marginTop: 4 }}>{g.description}</div>}
        </div>
        <Link to={`/assignments/new?groupId=${g.id}`}><Button variant="accent">+ Atama yap</Button></Link>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {g.recurrence && <Pill tone="accent">{g.recurrence}</Pill>}
        {g.requiresApproval && <Pill tone="warn">Grup onayı</Pill>}
        {g.minFiles > 0 && <Pill>min {g.minFiles} dosya</Pill>}
      </div>

      <div className="grid-2">
        <Card>
          <SectionLabel>Görevler ({g.tasks.length})</SectionLabel>
          <div className="list">
            {g.tasks.map((t, i) => (
              <div key={t.id} className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span className="mono muted" style={{ fontSize: 11, width: 24 }}>{i + 1}</span>
                  <span style={{ flex: 1, fontWeight: 600 }}>{t.name}</span>
                  <Pill>{t.estimatedMinutes} dk</Pill>
                </div>
                <div style={{ display: 'flex', gap: 6, marginLeft: 32, flexWrap: 'wrap' }}>
                  {t.requiresApproval && <Pill tone="warn">onay</Pill>}
                  {t.minFiles > 0 && <Pill>min {t.minFiles} dosya</Pill>}
                  {t.questionGroup && <Pill tone="accent">{t.questionGroup.name}</Pill>}
                  {t.dependsOn?.length > 0 && (
                    <Pill>
                      ← {t.dependsOn
                        .map((d) => g.tasks.findIndex((x) => x.id === d) + 1)
                        .filter((x) => x > 0)
                        .join(', ')}
                    </Pill>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionLabel>Atamalar</SectionLabel>
          {g.assignments.length === 0 && <div className="muted" style={{ fontSize: 13 }}>Henüz atama yok.</div>}
          <div className="list">
            {g.assignments.map((a) => (
              <div key={a.id} className="list-item">
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{a.team.name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {fmt(a.startsAt)} → {fmt(a.endsAt)}
                  </div>
                </div>
                <Pill tone={a.status === 'ACTIVE' ? 'accent' : 'mute'}>{a.status}</Pill>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
