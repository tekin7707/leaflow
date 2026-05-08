// web-screens-2.jsx — Task Groups, Timeline, Approvals, Reports

// ─────────────── 5. TASK GROUPS (DAG wizard) ───────────────
window.WebTaskGroups = function WebTaskGroups() {
  const tasks = [
    { id: 1, name: 'Aydınlatmayı aç', order: 1, mins: 5, deps: [] },
    { id: 2, name: 'Kasa açılışını yap', order: 2, mins: 10, deps: [1] },
    { id: 3, name: 'Soğutucu kontrolü', order: 3, mins: 8, deps: [1] },
    { id: 4, name: 'Genel temizlik kontrolü', order: 4, mins: 15, deps: [2, 3], approval: true },
  ];
  return (
    <WebShell route="/task-groups">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
        <div>
          <UI.SectionLabel>Yeni görev grubu · adım 2/3</UI.SectionLabel>
          <div style={{ fontFamily: T.fontSerif, fontSize: 36, letterSpacing: -0.8 }}>
            Sabah Açılış Rutini
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <UI.Button variant="ghost">İptal</UI.Button>
          <UI.Button variant="primary">İlerle →</UI.Button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {['Genel bilgiler', 'Görevler & bağımlılık', 'Tekrarlama'].map((s, i) => (
          <div key={s} style={{
            flex: 1, padding: '12px 14px',
            background: i <= 1 ? T.surface : T.lineSoft,
            border: `1px solid ${i === 1 ? T.ink : T.line}`,
            borderRadius: 8,
          }}>
            <div style={{ fontFamily: T.fontMono, fontSize: 10, color: T.muteSoft }}>{String(i + 1).padStart(2, '0')}</div>
            <div style={{ fontSize: 13, fontWeight: i === 1 ? 600 : 500, color: i <= 1 ? T.ink : T.mute }}>{s}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, height: 'calc(100% - 200px)' }}>
        <UI.Card pad={0}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.line}`, display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Görevler</div>
            <UI.Button variant="ghost" size="sm">+ Görev ekle</UI.Button>
          </div>
          <div style={{ padding: 16, overflow: 'auto' }}>
            {tasks.map(t => (
              <div key={t.id} style={{
                padding: 14, borderRadius: 10, border: `1px solid ${T.line}`,
                marginBottom: 8, background: T.surface,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 12, background: T.accent, color: '#fff',
                    fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{t.order}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>{t.name}</div>
                  {t.approval && <UI.Pill tone="warn">Onay</UI.Pill>}
                </div>
                <div style={{ display: 'flex', gap: 8, fontSize: 11, color: T.muteSoft, fontFamily: T.fontMono, paddingLeft: 34 }}>
                  <span>~{t.mins}DK</span>
                  {t.deps.length > 0 && <span>· bekler: {t.deps.map(d => `#${d}`).join(', ')}</span>}
                </div>
              </div>
            ))}
          </div>
        </UI.Card>

        <UI.Card>
          <UI.SectionLabel>Bağımlılık grafiği</UI.SectionLabel>
          <DagViz tasks={tasks} />
          <div style={{ marginTop: 16, padding: 12, background: T.accentSoft, borderRadius: 8, fontSize: 12, color: T.accent, fontFamily: T.fontMono }}>
            ✓ Döngü yok · 4 görev · 3 seviye
          </div>
        </UI.Card>
      </div>
    </WebShell>
  );
};

const DagViz = ({ tasks }) => {
  // Manuel layout — 1: top, 2,3: middle, 4: bottom.
  const nodes = {
    1: { x: 50, y: 10 }, 2: { x: 20, y: 45 }, 3: { x: 80, y: 45 }, 4: { x: 50, y: 80 },
  };
  return (
    <div style={{ position: 'relative', height: 280, marginTop: 8 }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        {tasks.flatMap(t =>
          t.deps.map(d => (
            <line key={`${d}-${t.id}`}
              x1={nodes[d].x} y1={nodes[d].y + 4}
              x2={nodes[t.id].x} y2={nodes[t.id].y - 4}
              stroke={T.accent} strokeWidth="0.4" markerEnd="url(#arr)" />
          ))
        )}
        <defs>
          <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M 0 0 L 6 3 L 0 6 z" fill={T.accent} />
          </marker>
        </defs>
      </svg>
      {tasks.map(t => (
        <div key={t.id} style={{
          position: 'absolute',
          left: `${nodes[t.id].x}%`, top: `${nodes[t.id].y}%`,
          transform: 'translate(-50%, -50%)',
          background: T.surface, border: `2px solid ${T.accent}`,
          padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
          whiteSpace: 'nowrap',
        }}>{t.order}. {t.name}</div>
      ))}
    </div>
  );
};

// ─────────────── 6. TIMELINE (Kanban) ───────────────
window.WebTimeline = function WebTimeline() {
  const cols = [
    { key: 'PENDING', label: 'Beklemede', tone: 'mute', count: 8 },
    { key: 'IN_PROGRESS', label: 'Sürüyor', tone: 'accent', count: 5 },
    { key: 'AWAITING_APPROVAL', label: 'Onayda', tone: 'warn', count: 4 },
    { key: 'APPROVED', label: 'Onaylandı', tone: 'accent', count: 12 },
  ];
  const cards = {
    PENDING: [
      { name: 'Akşam kapanış', team: 'Bahçeşehir', who: 'Ayşe K.', time: '18:00' },
      { name: 'Stok kontrolü', team: 'Kadıköy', who: 'Mehmet Y.', time: '14:00' },
      { name: 'Hijyen denetimi', team: 'Ataşehir', who: 'Zeynep T.', time: '15:30' },
    ],
    IN_PROGRESS: [
      { name: 'Sabah açılış', team: 'Bahçeşehir', who: 'Mehmet Y.', time: '09:30', progress: 0.6 },
      { name: 'Soğutucu kontrolü', team: 'Kadıköy', who: 'Can A.', time: '10:00', progress: 0.3 },
    ],
    AWAITING_APPROVAL: [
      { name: 'Stok sayımı', team: 'Bahçeşehir', who: 'Zeynep T.', time: '12:30' },
      { name: 'Kasa kontrolü', team: 'Kadıköy', who: 'Elif D.', time: '11:45' },
    ],
    APPROVED: [
      { name: 'Sabah açılış', team: 'Ataşehir', who: 'Mert Y.', time: '08:15', done: true },
      { name: 'Açılış checklist', team: 'Bahçeşehir', who: 'Ayşe K.', time: '08:45', done: true },
      { name: 'Stok girişi', team: 'Kadıköy', who: 'Mehmet Y.', time: '09:30', done: true },
    ],
  };
  return (
    <WebShell route="/timeline">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <UI.SectionLabel>4 Mayıs · 29 görev</UI.SectionLabel>
          <div style={{ fontFamily: T.fontSerif, fontSize: 36, letterSpacing: -0.8 }}>Akış</div>
        </div>
        <div style={{ display: 'flex', gap: 4, padding: 4, background: T.lineSoft, borderRadius: 8 }}>
          <div style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, background: T.surface, borderRadius: 6 }}>Kanban</div>
          <div style={{ padding: '6px 14px', fontSize: 12, color: T.mute }}>Gantt</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, height: 'calc(100% - 90px)' }}>
        {cols.map(c => (
          <div key={c.key} style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, padding: '0 4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 6, height: 6, borderRadius: 3,
                  background: c.tone === 'accent' ? T.accent : c.tone === 'warn' ? T.warn : T.muteSoft,
                }} />
                <div style={{ fontSize: 13, fontWeight: 600 }}>{c.label}</div>
              </div>
              <span style={{ fontSize: 11, color: T.muteSoft, fontFamily: T.fontMono }}>{c.count}</span>
            </div>
            <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(cards[c.key] || []).map((card, i) => (
                <UI.Card key={i} pad={14}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{card.name}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: card.progress ? 10 : 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <UI.Avatar name={card.who} size={20} />
                      <span style={{ fontSize: 11, color: T.mute }}>{card.who}</span>
                    </div>
                    <span style={{ fontSize: 10, color: T.muteSoft, fontFamily: T.fontMono }}>{card.time}</span>
                  </div>
                  {card.progress && (
                    <div style={{ height: 4, background: T.lineSoft, borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${card.progress * 100}%`, background: T.accent }} />
                    </div>
                  )}
                  <div style={{ marginTop: 10, fontSize: 10, color: T.muteSoft, fontFamily: T.fontMono }}>{card.team}</div>
                </UI.Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </WebShell>
  );
};

// ─────────────── 7. APPROVALS ───────────────
window.WebApprovals = function WebApprovals() {
  const queue = [
    { id: 1, name: 'Stok sayımı kapanış', team: 'Bahçeşehir', who: 'Mehmet Y.', age: '12dk', no: 0, on: true },
    { id: 2, name: 'Kasa kontrolü', team: 'Kadıköy', who: 'Zeynep T.', age: '34dk', no: 1 },
    { id: 3, name: 'Ekipman temizliği', team: 'Ataşehir', who: 'Can A.', age: '1s', no: 0 },
    { id: 4, name: 'Açılış kontrolü', team: 'Bahçeşehir', who: 'Elif D.', age: '2s', no: 2 },
  ];
  const answers = [
    { q: 'Aydınlatma açıldı mı?', a: 'EVET', tone: 'accent' },
    { q: 'Kasa açılış raporu yazdırıldı mı?', a: 'EVET', tone: 'accent' },
    { q: 'Soğutucu sıcaklığı uygun mu?', a: 'EVET', tone: 'accent' },
    { q: 'Genel temizlik durumu (1-5)', a: '4', tone: 'mute' },
    { q: 'Notlar', a: 'Sabah erken geldim, hepsi tamam', tone: 'mute' },
  ];
  return (
    <WebShell route="/approvals">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <UI.SectionLabel>4 bekleyen · 0 seçili</UI.SectionLabel>
          <div style={{ fontFamily: T.fontSerif, fontSize: 36, letterSpacing: -0.8 }}>Onaylar</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <UI.Button variant="ghost">Tüm takımlar ▾</UI.Button>
          <UI.Button variant="ghost">Filtre</UI.Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20, height: 'calc(100% - 90px)' }}>
        <UI.Card pad={0}>
          {queue.map(q => (
            <div key={q.id} style={{
              padding: 16, borderBottom: `1px solid ${T.lineSoft}`,
              background: q.on ? T.surfaceAlt : 'transparent', cursor: 'pointer',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{q.name}</div>
                {q.no > 0 && <UI.Pill tone="danger">{q.no} HAYIR</UI.Pill>}
              </div>
              <div style={{ fontSize: 11, color: T.muteSoft, fontFamily: T.fontMono }}>
                {q.team} · {q.who} · {q.age} önce
              </div>
            </div>
          ))}
        </UI.Card>

        <UI.Card pad={0}>
          <div style={{ padding: 24, borderBottom: `1px solid ${T.line}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <div>
                <UI.SectionLabel>Bahçeşehir · Mehmet Y. · 12dk önce</UI.SectionLabel>
                <div style={{ fontFamily: T.fontSerif, fontSize: 28, letterSpacing: -0.6 }}>Stok sayımı kapanış</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <UI.Button variant="ghost">Düzelt iste</UI.Button>
                <UI.Button variant="accent">✓ Onayla</UI.Button>
              </div>
            </div>
          </div>
          <div style={{ padding: 24, overflow: 'auto', height: 'calc(100% - 110px)' }}>
            <UI.SectionLabel>İspat foto ({3})</UI.SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 24 }}>
              <UI.Placeholder h={140} label="raf görseli" />
              <UI.Placeholder h={140} label="kasa raporu" />
              <UI.Placeholder h={140} label="depo" />
            </div>
            <UI.SectionLabel>Checklist cevapları</UI.SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {answers.map((a, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 14px', background: T.lineSoft, borderRadius: 8,
                }}>
                  <div style={{ fontSize: 13 }}>{a.q}</div>
                  <UI.Pill tone={a.tone}>{a.a}</UI.Pill>
                </div>
              ))}
            </div>
          </div>
        </UI.Card>
      </div>
    </WebShell>
  );
};

// ─────────────── 8. REPORTS ───────────────
window.WebReports = function WebReports() {
  const days = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
  const teams = [
    { name: 'Bahçeşehir', score: [0.92, 0.95, 0.88, 0.92, 0.85, 0.97, 0.93] },
    { name: 'Kadıköy', score: [0.82, 0.78, 0.91, 0.86, 0.88, 0.84, 0.9] },
    { name: 'Ataşehir', score: [0.74, 0.82, 0.79, 0.85, 0.91, 0.88, 0.8] },
  ];
  const daily = [12, 18, 15, 22, 19, 25, 31];
  const max = Math.max(...daily);
  return (
    <WebShell route="/reports">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
        <div>
          <UI.SectionLabel>Son 7 gün</UI.SectionLabel>
          <div style={{ fontFamily: T.fontSerif, fontSize: 36, letterSpacing: -0.8 }}>Raporlar</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <UI.Button variant="ghost">Bu hafta ▾</UI.Button>
          <UI.Button variant="ghost">Tüm takımlar ▾</UI.Button>
          <UI.Button variant="primary">Dışa aktar</UI.Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        <UI.Card><Kpi v="142" label="Tamamlandı" tone="accent" /></UI.Card>
        <UI.Card><Kpi v="28" label="Beklemede" /></UI.Card>
        <UI.Card><Kpi v="6" label="Geçikti" tone="warn" /></UI.Card>
        <UI.Card><Kpi v="%94" label="Onay oranı" tone="accent" /></UI.Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, height: 380 }}>
        <UI.Card>
          <UI.SectionLabel>Günlük tamamlanma</UI.SectionLabel>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 240, padding: '20px 8px' }}>
            {daily.map((v, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 11, color: T.mute, fontFamily: T.fontMono }}>{v}</div>
                <div style={{
                  width: '100%', height: `${(v / max) * 200}px`,
                  background: i === daily.length - 1 ? T.accent : T.accentSoft,
                  borderRadius: 6,
                }} />
                <div style={{ fontSize: 11, color: T.muteSoft, fontFamily: T.fontMono }}>{days[i]}</div>
              </div>
            ))}
          </div>
        </UI.Card>

        <UI.Card>
          <UI.SectionLabel>Takım performansı</UI.SectionLabel>
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '100px repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
              <div />
              {days.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 10, color: T.muteSoft, fontFamily: T.fontMono }}>{d}</div>)}
            </div>
            {teams.map(t => (
              <div key={t.name} style={{ display: 'grid', gridTemplateColumns: '100px repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
                <div style={{ fontSize: 12, fontWeight: 500, alignSelf: 'center' }}>{t.name}</div>
                {t.score.map((s, i) => {
                  const intensity = Math.round(s * 100);
                  return (
                    <div key={i} style={{
                      height: 36, borderRadius: 4,
                      background: `oklch(0.${Math.round(50 + s * 30)} 0.08 130)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, color: s > 0.85 ? '#fff' : T.ink, fontFamily: T.fontMono, fontWeight: 600,
                    }}>{intensity}</div>
                  );
                })}
              </div>
            ))}
          </div>
        </UI.Card>
      </div>
    </WebShell>
  );
};
