// web-screens-1.jsx — Login, Dashboard, Teams, Checklists
// Tüm ekranlar 1280×800 sabit; Provit Yön A.

const WebShell = ({ children, route = '/', wide = false }) => {
  const items = [
    ['/', 'Panel'], ['/teams', 'Takımlar'], ['/checklists', 'Checklist'],
    ['/task-groups', 'Görev grupları'], ['/timeline', 'Akış'],
    ['/approvals', 'Onaylar'], ['/reports', 'Raporlar'],
  ];
  return (
    <div style={{
      width: 1280, height: 800, background: T.bg, fontFamily: T.font,
      display: 'flex', color: T.ink, overflow: 'hidden',
    }}>
      <aside style={{
        width: 220, background: T.surface, borderRight: `1px solid ${T.line}`,
        padding: '24px 16px', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          fontFamily: T.fontSerif, fontSize: 28, fontStyle: 'italic',
          color: T.ink, marginBottom: 32, paddingLeft: 8,
        }}>Provit</div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {items.map(([p, label]) => {
            const on = p === route;
            return (
              <div key={p} style={{
                padding: '9px 12px', borderRadius: 8, fontSize: 13,
                fontWeight: on ? 600 : 500,
                color: on ? T.ink : T.mute,
                background: on ? T.surfaceAlt : 'transparent',
                cursor: 'default',
              }}>{label}</div>
            );
          })}
        </nav>
        <div style={{ marginTop: 'auto', display: 'flex', gap: 10, alignItems: 'center', padding: 8 }}>
          <UI.Avatar name="Ayşe Kaya" size={32} />
          <div style={{ fontSize: 12 }}>
            <div style={{ fontWeight: 600, color: T.ink }}>Ayşe Kaya</div>
            <div style={{ color: T.muteSoft, fontSize: 11 }}>Yönetici</div>
          </div>
        </div>
      </aside>
      <main style={{ flex: 1, overflow: 'hidden', padding: wide ? 0 : 32 }}>{children}</main>
    </div>
  );
};

window.WebShell = WebShell;

// ─────────────── 1. LOGIN ───────────────
window.WebLogin = function WebLogin() {
  return (
    <div style={{
      width: 1280, height: 800, background: T.bg, fontFamily: T.font,
      display: 'flex', alignItems: 'stretch',
    }}>
      <div style={{ flex: 1, padding: 64, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: T.fontSerif, fontSize: 32, fontStyle: 'italic', color: T.ink }}>Provit</div>
        <div style={{ maxWidth: 380 }}>
          <div style={{
            fontFamily: T.fontSerif, fontSize: 56, lineHeight: 1.05, color: T.ink,
            letterSpacing: -1, marginBottom: 16,
          }}>Sahadaki<br/>her görev,<br/><i>kanıtla.</i></div>
          <div style={{ color: T.mute, fontSize: 15, lineHeight: 1.5, marginBottom: 40 }}>
            Görev oluştur, ata, gerçekleştir, ispatla, onayla. Tek bir akışta.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="E-posta" value="ayse@provit.test" />
            <Field label="Parola" value="••••••••" />
            <UI.Button variant="primary" size="lg">Giriş yap →</UI.Button>
          </div>
        </div>
        <div style={{ fontFamily: T.fontMono, fontSize: 11, color: T.muteSoft }}>
          v0.1 · admin@provit.test / herhangi bir şifre
        </div>
      </div>
      <div style={{
        flex: 1, background: T.accentSoft, position: 'relative', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `radial-gradient(circle at 20% 30%, rgba(92,122,79,.12), transparent 50%),
                            radial-gradient(circle at 80% 70%, rgba(92,122,79,.08), transparent 60%)`,
        }} />
        <div style={{
          width: 320, padding: 28, background: T.surface, borderRadius: 16,
          border: `1px solid ${T.line}`, boxShadow: T.shadow, position: 'relative',
        }}>
          <UI.SectionLabel>bugün · 14:32</UI.SectionLabel>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Sabah Açılış Rutini</div>
          <div style={{ fontSize: 12, color: T.mute, marginBottom: 16 }}>4/4 görev · onaylandı</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <div style={{ width: 18, height: 18, borderRadius: 9, background: T.accent, color: '#fff', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</div>
                <span style={{ color: T.mute, textDecoration: 'line-through' }}>Görev {i}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, value }) => (
  <div>
    <div style={{ fontSize: 11, fontFamily: T.fontMono, color: T.muteSoft, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
    <div style={{
      padding: '12px 14px', border: `1px solid ${T.line}`, borderRadius: 8,
      background: T.surface, fontSize: 14, color: T.ink,
    }}>{value}</div>
  </div>
);

// ─────────────── 2. DASHBOARD ───────────────
window.WebDashboard = function WebDashboard() {
  return (
    <WebShell route="/">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
        <div>
          <UI.SectionLabel>Pazartesi · 4 Mayıs 2026</UI.SectionLabel>
          <div style={{ fontFamily: T.fontSerif, fontSize: 44, color: T.ink, letterSpacing: -1 }}>
            Günaydın, <i>Ayşe</i>.
          </div>
          <div style={{ color: T.mute, fontSize: 14, marginTop: 4 }}>3 takımın günü başladı. 4 görev onayını bekliyor.</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <UI.Button variant="ghost" size="md">Bu hafta</UI.Button>
          <UI.Button variant="primary" size="md">+ Yeni atama</UI.Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '4fr 2fr', gap: 20, height: 'calc(100% - 120px)' }}>
        <UI.Card pad={0}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Bugünün ajandası</div>
            <UI.Pill tone="accent">3 aktif · 1 bekliyor</UI.Pill>
          </div>
          <div style={{ padding: 20, position: 'relative', height: 'calc(100% - 53px)', overflow: 'hidden' }}>
            <Timeline />
          </div>
        </UI.Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <UI.Card>
            <UI.SectionLabel>Bekleyen onaylar</UI.SectionLabel>
            {[
              { name: 'Stok sayımı kapanış', team: 'Bahçeşehir', who: 'Mehmet Y.' },
              { name: 'Kasa kontrolü', team: 'Kadıköy', who: 'Zeynep T.' },
              { name: 'Ekipman temizliği', team: 'Ataşehir', who: 'Can A.' },
            ].map(a => (
              <div key={a.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${T.lineSoft}` }}>
                <UI.Avatar name={a.who} size={28} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
                  <div style={{ fontSize: 11, color: T.muteSoft }}>{a.team} · {a.who}</div>
                </div>
                <span style={{ fontSize: 18, color: T.muteSoft }}>›</span>
              </div>
            ))}
          </UI.Card>

          <UI.Card>
            <UI.SectionLabel>Bu hafta</UI.SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Kpi v="142" label="Tamamlandı" tone="accent" />
              <Kpi v="28" label="Beklemede" />
              <Kpi v="6" label="Geçikti" tone="warn" />
              <Kpi v="%94" label="Onay oranı" />
            </div>
          </UI.Card>
        </div>
      </div>
    </WebShell>
  );
};

const Kpi = ({ v, label, tone }) => {
  const color = tone === 'accent' ? T.accent : tone === 'warn' ? T.warn : T.ink;
  return (
    <div>
      <div style={{ fontFamily: T.fontSerif, fontSize: 32, color, letterSpacing: -0.5 }}>{v}</div>
      <div style={{ fontSize: 11, color: T.muteSoft, fontFamily: T.fontMono, textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</div>
    </div>
  );
};

const Timeline = () => {
  const hours = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00'];
  const items = [
    { row: 0, start: 5, len: 18, name: 'Sabah açılış rutini', team: 'Bahçeşehir', tone: 'accent', done: true },
    { row: 1, start: 12, len: 14, name: 'Stok kontrolü', team: 'Kadıköy', tone: 'accent', active: true },
    { row: 2, start: 22, len: 16, name: 'Ekipman temizliği', team: 'Ataşehir', tone: 'warn' },
    { row: 0, start: 32, len: 12, name: 'Kapanış rutini', team: 'Bahçeşehir', tone: 'mute' },
  ];
  return (
    <div style={{ position: 'relative', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: T.fontMono, fontSize: 10, color: T.muteSoft, marginBottom: 16 }}>
        {hours.map(h => <div key={h}>{h}</div>)}
      </div>
      <div style={{ position: 'absolute', top: 24, left: 0, right: 0, bottom: 0 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ position: 'absolute', top: i * 100 + 12, left: 0, right: 0, height: 1, background: T.lineSoft }} />
        ))}
        {items.map((it, i) => {
          const colors = {
            accent: { bg: T.accentSoft, bd: T.accent, fg: T.accent },
            warn: { bg: T.warnSoft, bd: T.warn, fg: T.warn },
            mute: { bg: T.lineSoft, bd: T.line, fg: T.mute },
          };
          const c = colors[it.tone];
          return (
            <div key={i} style={{
              position: 'absolute', top: it.row * 100 + 4,
              left: `${it.start * 1.8}%`, width: `${it.len * 1.8}%`,
              background: c.bg, border: `1px solid ${c.bd}`,
              borderLeft: `3px solid ${c.bd}`, borderRadius: 6,
              padding: '8px 10px', height: 64, overflow: 'hidden',
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.ink, marginBottom: 2 }}>{it.name}</div>
              <div style={{ fontSize: 10, color: c.fg, fontFamily: T.fontMono }}>
                {it.team}{it.done && ' · ✓'}{it.active && ' · canlı'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─────────────── 3. TEAMS ───────────────
window.WebTeams = function WebTeams() {
  const teams = [
    { id: 1, name: 'Bahçeşehir', code: 'BAH', members: 6, on: true },
    { id: 2, name: 'Kadıköy', code: 'KAD', members: 5 },
    { id: 3, name: 'Ataşehir', code: 'ATA', members: 4 },
  ];
  const members = [
    { name: 'Ayşe Kaya', email: 'ayse@provit.test', role: 'MANAGER' },
    { name: 'Mehmet Yıldız', email: 'mehmet@provit.test', role: 'MEMBER' },
    { name: 'Zeynep Toprak', email: 'zeynep@provit.test', role: 'MEMBER' },
    { name: 'Can Aslan', email: 'can@provit.test', role: 'MEMBER' },
    { name: 'Elif Demir', email: 'elif@provit.test', role: 'MEMBER' },
    { name: 'Mert Yağmur', email: 'mert@provit.test', role: 'MEMBER' },
  ];
  return (
    <WebShell route="/teams">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
        <div>
          <UI.SectionLabel>3 takım · 15 kullanıcı</UI.SectionLabel>
          <div style={{ fontFamily: T.fontSerif, fontSize: 36, letterSpacing: -0.8 }}>Takımlar</div>
        </div>
        <UI.Button variant="primary">+ Yeni takım</UI.Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, height: 'calc(100% - 100px)' }}>
        <UI.Card pad={0}>
          <div style={{ padding: 12 }}>
            {teams.map(t => (
              <div key={t.id} style={{
                padding: '12px 14px', borderRadius: 8, marginBottom: 4,
                background: t.on ? T.surfaceAlt : 'transparent',
                cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: t.on ? 600 : 500 }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: T.muteSoft, fontFamily: T.fontMono }}>{t.code} · {t.members} üye</div>
                </div>
                {t.on && <span style={{ color: T.muteSoft }}>›</span>}
              </div>
            ))}
          </div>
        </UI.Card>

        <UI.Card pad={0}>
          <div style={{ padding: 24, borderBottom: `1px solid ${T.line}` }}>
            <UI.SectionLabel>BAH</UI.SectionLabel>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontFamily: T.fontSerif, fontSize: 28, letterSpacing: -0.6 }}>Bahçeşehir</div>
                <div style={{ fontSize: 12, color: T.mute, marginTop: 2 }}>1 yönetici · 5 üye</div>
              </div>
              <UI.Button variant="ghost" size="sm">+ Üye ekle</UI.Button>
            </div>
          </div>
          <div style={{ padding: '8px 12px', overflow: 'auto', height: 'calc(100% - 110px)' }}>
            {members.map(m => (
              <div key={m.email} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 8,
              }}>
                <UI.Avatar name={m.name} size={36} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: T.muteSoft, fontFamily: T.fontMono }}>{m.email}</div>
                </div>
                <UI.Pill tone={m.role === 'MANAGER' ? 'accent' : 'mute'}>
                  {m.role === 'MANAGER' ? 'Yönetici' : 'Üye'}
                </UI.Pill>
                <span style={{ color: T.muteSoft, marginLeft: 8 }}>⋯</span>
              </div>
            ))}
          </div>
        </UI.Card>
      </div>
    </WebShell>
  );
};

// ─────────────── 4. CHECKLISTS ───────────────
window.WebChecklists = function WebChecklists() {
  const groups = [
    { id: 1, name: 'Açılış Kontrolü', count: 5, on: true },
    { id: 2, name: 'Kapanış Kontrolü', count: 4 },
    { id: 3, name: 'Haftalık Bakım', count: 7 },
    { id: 4, name: 'Hijyen Denetimi', count: 6 },
  ];
  const questions = [
    { text: 'Aydınlatma açıldı mı?', type: 'EVET/HAYIR', weight: 3, req: true },
    { text: 'Kasa açılış raporu yazdırıldı mı?', type: 'EVET/HAYIR', weight: 5, req: true },
    { text: 'Soğutucu sıcaklığı uygun mu?', type: 'EVET/HAYIR/NA', weight: 4, req: true },
    { text: 'Genel temizlik durumu (1-5)', type: 'SAYI', weight: 3, req: true },
    { text: 'Notlar', type: 'METİN', weight: 1, req: false },
  ];
  return (
    <WebShell route="/checklists">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
        <div>
          <UI.SectionLabel>4 soru grubu · 22 soru</UI.SectionLabel>
          <div style={{ fontFamily: T.fontSerif, fontSize: 36, letterSpacing: -0.8 }}>Checklist</div>
        </div>
        <UI.Button variant="primary">+ Yeni soru grubu</UI.Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, height: 'calc(100% - 100px)' }}>
        <UI.Card pad={0}>
          <div style={{ padding: 12 }}>
            {groups.map(g => (
              <div key={g.id} style={{
                padding: '12px 14px', borderRadius: 8, marginBottom: 4,
                background: g.on ? T.surfaceAlt : 'transparent',
              }}>
                <div style={{ fontSize: 14, fontWeight: g.on ? 600 : 500 }}>{g.name}</div>
                <div style={{ fontSize: 11, color: T.muteSoft, fontFamily: T.fontMono }}>{g.count} soru</div>
              </div>
            ))}
          </div>
        </UI.Card>

        <UI.Card pad={0}>
          <div style={{ padding: 24, borderBottom: `1px solid ${T.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <UI.SectionLabel>Soru grubu</UI.SectionLabel>
              <div style={{ fontFamily: T.fontSerif, fontSize: 28, letterSpacing: -0.6 }}>Açılış Kontrolü</div>
            </div>
            <UI.Button variant="ghost" size="sm">+ Soru ekle</UI.Button>
          </div>
          <div style={{ padding: 16, overflow: 'auto', height: 'calc(100% - 110px)' }}>
            {questions.map((q, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: 14, borderRadius: 10, border: `1px solid ${T.line}`, marginBottom: 8,
                background: T.surface,
              }}>
                <div style={{ fontFamily: T.fontMono, fontSize: 11, color: T.muteSoft, width: 24 }}>{String(i + 1).padStart(2, '0')}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, marginBottom: 4 }}>{q.text}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <UI.Pill>{q.type}</UI.Pill>
                    {q.req && <UI.Pill tone="warn">Zorunlu</UI.Pill>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 11, color: T.muteSoft, fontFamily: T.fontMono, marginRight: 4 }}>AĞIRLIK</span>
                  {[1,2,3,4,5].map(n => (
                    <div key={n} style={{
                      width: 14, height: 14, borderRadius: 7,
                      background: n <= q.weight ? T.accent : T.lineSoft,
                    }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </UI.Card>
      </div>
    </WebShell>
  );
};
