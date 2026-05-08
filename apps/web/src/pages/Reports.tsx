import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { Card, SectionLabel, Pill } from '../components/UI';

export default function Reports() {
  const q = useQuery({ queryKey: ['report'], queryFn: () => api.get('/api/reports/overview') });
  const data = q.data || { kpis: {}, daily: [], teamScores: [] };
  const max = Math.max(1, ...data.daily.map((d) => d.value));

  return (
    <div>
      <SectionLabel>Raporlar</SectionLabel>
      <h1 className="h-serif" style={{ fontStyle: 'italic', fontSize: 32, margin: '0 0 20px' }}>
        Genel görünüm (son 14 gün)
      </h1>

      <div className="grid-4" style={{ marginBottom: 24 }}>
        {[
          ['Toplam', data.kpis.total],
          ['Tamamlanan', data.kpis.completed],
          ['Tamamlanma %', `%${data.kpis.completionRate ?? 0}`],
          ['Geciken', data.kpis.overdue],
        ].map(([label, value]) => (
          <Card key={label}>
            <div className="kpi">
              <div className="kpi__label">{label}</div>
              <div className="kpi__value--serif">{value ?? '–'}</div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid-2">
        <Card>
          <SectionLabel>Günlük tamamlanma</SectionLabel>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 160 }}>
            {data.daily.map((d) => (
              <div
                key={d.date}
                title={`${d.date}: ${d.value}`}
                style={{
                  flex: 1,
                  height: `${(d.value / max) * 100}%`,
                  background: 'var(--accent)',
                  borderRadius: 4,
                  minHeight: 2,
                  opacity: 0.9,
                }}
              />
            ))}
          </div>
          <div className="mono muted-soft" style={{ fontSize: 10, marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
            <span>{data.daily[0]?.date}</span>
            <span>{data.daily.at(-1)?.date}</span>
          </div>
        </Card>

        <Card>
          <SectionLabel>Takım skorları</SectionLabel>
          <div className="list">
            {data.teamScores.map((t) => (
              <div key={t.id} className="list-item">
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{t.name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{t.completed} / {t.total}</div>
                </div>
                <Pill tone={t.score >= 70 ? 'accent' : t.score >= 40 ? 'warn' : 'danger'}>
                  %{t.score}
                </Pill>
              </div>
            ))}
            {data.teamScores.length === 0 && <div className="muted" style={{ fontSize: 13 }}>Takım verisi yok.</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}
