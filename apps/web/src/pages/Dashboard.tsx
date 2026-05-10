import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Card, SectionLabel, StatusPill, Pill, Empty, Button } from '../components/UI';
import { QuickTaskModal } from '../components/QuickTaskModal';

const fmtTime = (d) => new Date(d).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
const fmtDate = (d) => new Date(d).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });

export default function Dashboard() {
  const [quickOpen, setQuickOpen] = useState(false);
  const todayQ = useQuery({
    queryKey: ['runs', 'today'],
    queryFn: () => api.get('/api/task-runs/mine/today'),
  });
  const statsQ = useQuery({
    queryKey: ['runs', 'stats'],
    queryFn: () => api.get('/api/task-runs/mine/stats'),
  });
  const reportQ = useQuery({
    queryKey: ['report', 'overview'],
    queryFn: () => api.get('/api/reports/overview'),
  });
  const approvalsQ = useQuery({
    queryKey: ['approvals', 'queue', 'preview'],
    queryFn: () => api.get('/api/approvals/queue'),
  });

  const today = todayQ.data || [];
  const stats = statsQ.data || {};
  const report = reportQ.data || { kpis: {}, daily: [], teamScores: [] };
  const approvals = approvalsQ.data || [];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <SectionLabel>Pano</SectionLabel>
          <h1 className="h-serif" style={{ fontStyle: 'italic', fontSize: 36, margin: 0 }}>
            {fmtDate(new Date())}
          </h1>
        </div>
        <Button variant="accent" onClick={() => setQuickOpen(true)}>+ Hızlı atama</Button>
      </div>

      <QuickTaskModal open={quickOpen} onClose={() => setQuickOpen(false)} />

      <div className="grid-4" style={{ marginBottom: 24 }}>
        <Card>
          <div className="kpi">
            <div className="kpi__label">Bugün tamamlanan</div>
            <div className="kpi__value--serif">{stats.completedToday ?? '–'}</div>
          </div>
        </Card>
        <Card>
          <div className="kpi">
            <div className="kpi__label">Haftalık seri</div>
            <div className="kpi__value--serif">{stats.streak ?? '–'}</div>
          </div>
        </Card>
        <Card>
          <div className="kpi">
            <div className="kpi__label">Tamamlanma oranı</div>
            <div className="kpi__value--serif">%{report.kpis.completionRate ?? '–'}</div>
          </div>
        </Card>
        <Card>
          <div className="kpi">
            <div className="kpi__label">Bekleyen onay</div>
            <div className="kpi__value--serif">{approvals.length}</div>
          </div>
        </Card>
      </div>

      <div className="grid-2">
        <Card>
          <SectionLabel>Bugünkü ajanda</SectionLabel>
          {today.length === 0 && <Empty>Bugün için açık görev yok.</Empty>}
          <div className="list">
            {today.map((tr) => (
              <Link
                to={`/task-runs/${tr.id}`}
                key={tr.id}
                className="list-item"
                style={{ background: tr.viewerCanAct ? 'transparent' : 'var(--surface-alt)', borderRadius: 10, opacity: tr.viewerCanAct ? 1 : 0.8 }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{tr.task.name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {tr.run.assignment.group.name} · {tr.run.assignment.team.name}
                  </div>
                </div>
                <Pill tone={tr.viewerCanAct ? 'accent' : 'mute'}>{tr.viewerCanAct ? 'Aksiyon sende' : 'İzleme'}</Pill>
                <StatusPill status={tr.status} />
                <div className="muted-soft mono" style={{ fontSize: 11 }}>
                  {fmtTime(tr.run.date)}
                </div>
              </Link>
            ))}
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <SectionLabel>Bekleyen onaylar</SectionLabel>
            <Link to="/approvals" style={{ fontSize: 12, color: 'var(--accent)' }}>Tümü →</Link>
          </div>
          {approvals.length === 0 && <Empty>Onay bekleyen iş yok.</Empty>}
          <div className="list">
            {approvals.slice(0, 6).map((a) => (
              <Link to={`/task-runs/${a.taskRunId}`} key={a.id} className="list-item">
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{a.taskRun.task.name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {a.taskRun.assignee?.displayName ?? '—'} · {a.taskRun.run.assignment.team.name}
                  </div>
                </div>
                <Pill tone="warn">Onay</Pill>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
