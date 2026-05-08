import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { Card, SectionLabel, Pill, StatusPill, Button, Empty } from '../components/UI';

const COLUMNS = [
  ['BLOCKED', 'Bloklu'],
  ['PENDING', 'Bekliyor'],
  ['IN_PROGRESS', 'Devam ediyor'],
  ['AWAITING_APPROVAL', 'Onay bekliyor'],
  ['DONE', 'Tamamlandı'],
];

const fmtDay = (d) => new Date(d).toLocaleDateString('tr-TR', { weekday: 'short', day: '2-digit', month: 'short' });

export default function Timeline() {
  const [view, setView] = useState('kanban');
  const [scope, setScope] = useState('team');

  const runsQ = useQuery({
    queryKey: ['pool', scope],
    queryFn: () => api.get(`/api/task-runs/pool?scope=${scope}`),
  });
  const runs = runsQ.data || [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
        <div>
          <SectionLabel>Zaman çizelgesi</SectionLabel>
          <h1 className="h-serif" style={{ fontStyle: 'italic', fontSize: 32, margin: 0 }}>
            Tüm akış
          </h1>
        </div>
        <div className="row">
          <select value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="mine">Bana</option>
            <option value="team">Takım</option>
          </select>
          <Button variant={view === 'kanban' ? 'primary' : 'ghost'} size="sm" onClick={() => setView('kanban')}>Kanban</Button>
          <Button variant={view === 'gantt' ? 'primary' : 'ghost'} size="sm" onClick={() => setView('gantt')}>Gantt</Button>
        </div>
      </div>

      {runs.length === 0 && <Empty>Görüntülenecek görev yok.</Empty>}

      {view === 'kanban' && runs.length > 0 && (
        <div className="kanban">
          {COLUMNS.map(([s, label]) => {
            const items = runs.filter((r) => r.status === s);
            return (
              <div key={s} className="kanban__col">
                <div className="kanban__head">
                  <span>{label}</span>
                  <span>{items.length}</span>
                </div>
                <div className="col">
                  {items.map((tr) => (
                    <Link key={tr.id} to={`/task-runs/${tr.id}`} style={{ textDecoration: 'none' }}>
                      <Card pad="sm" style={{ cursor: 'pointer' }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{tr.task.name}</div>
                        <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                          {tr.run.assignment.group.name}
                        </div>
                        <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                          <Pill>{tr.run.assignment.team.name}</Pill>
                          <Pill>{fmtDay(tr.run.date)}</Pill>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === 'gantt' && runs.length > 0 && (
        <Card>
          <table>
            <thead>
              <tr>
                <th>Görev</th>
                <th>Grup</th>
                <th>Takım</th>
                <th>Tarih</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((tr) => (
                <tr key={tr.id}>
                  <td>{tr.task.name}</td>
                  <td className="muted">{tr.run.assignment.group.name}</td>
                  <td>{tr.run.assignment.team.name}</td>
                  <td className="mono" style={{ fontSize: 12 }}>{fmtDay(tr.run.date)}</td>
                  <td><StatusPill status={tr.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
