// mobile-screens-2.jsx — Pool (havuz) + QuickAssign (hızlı atama)

// ─────────────── 8. POOL (Havuz) ───────────────
window.MobPool = () => {
  const tasks = [
    { name: 'Stok kontrolü', group: 'Haftalık Stok', team: 'Bahçeşehir', due: 'Bugün 14:00', status: 'PENDING', mine: true },
    { name: 'Soğutucu kontrolü', group: 'Sabah Açılış', team: 'Bahçeşehir', due: 'Şu an', status: 'IN_PROGRESS', mine: true, active: true },
    { name: 'Hijyen denetimi', group: 'Haftalık Bakım', team: 'Kadıköy', due: 'Yarın 10:00', status: 'PENDING' },
    { name: 'Kasa kontrolü', group: 'Kapanış', team: 'Bahçeşehir', due: 'Dün 22:00', status: 'OVERDUE', mine: true },
    { name: 'Açılış checklist', group: 'Sabah Açılış', team: 'Ataşehir', due: 'Bugün 09:00', status: 'AWAITING' },
    { name: 'Ekipman temizliği', group: 'Aylık Bakım', team: 'Kadıköy', due: 'Bu hafta', status: 'PENDING' },
  ];
  const statusMeta = {
    PENDING: { label: 'Beklemede', tone: 'mute' },
    IN_PROGRESS: { label: 'Sürüyor', tone: 'accent' },
    AWAITING: { label: 'Onayda', tone: 'warn' },
    OVERDUE: { label: 'Gecikti', tone: 'danger' },
  };

  return (
    <Phone>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', paddingTop: 60, paddingBottom: 90 }}>
        <div style={{ padding: '0 24px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: T.fontSerif, fontSize: 32, letterSpacing: -0.8 }}>Havuz</div>
              <div style={{ fontSize: 13, color: T.mute, marginTop: 2 }}>{tasks.length} görev</div>
            </div>
            <div style={{
              width: 36, height: 36, borderRadius: 10, background: T.surface, border: `1px solid ${T.line}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
            }}>
              <span style={{ fontSize: 14 }}>⚙︎</span>
              <div style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8, background: T.accent, color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>2</div>
            </div>
          </div>

          {/* Segment */}
          <div style={{ display: 'flex', background: T.lineSoft, borderRadius: 10, padding: 3, marginBottom: 12 }}>
            {['Bana atanmış', 'Takımım', 'Tümü'].map((s, i) => (
              <div key={s} style={{
                flex: 1, padding: '8px', textAlign: 'center', fontSize: 12, fontWeight: 600,
                background: i === 0 ? T.surface : 'transparent',
                color: i === 0 ? T.ink : T.mute,
                borderRadius: 8, boxShadow: i === 0 ? '0 1px 2px rgba(0,0,0,.04)' : 'none',
              }}>{s}</div>
            ))}
          </div>

          {/* Filtre çipleri */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', flexWrap: 'nowrap' }}>
            {[
              { v: 'Bahçeşehir', on: true },
              { v: 'Bugün', on: true },
              { v: '+ Durum' },
              { v: '+ Tarih' },
              { v: '+ Grup' },
            ].map(c => (
              <div key={c.v} style={{
                padding: '7px 12px', borderRadius: 16, fontSize: 12, fontWeight: 500,
                background: c.on ? T.ink : T.surface,
                color: c.on ? '#fff' : T.mute,
                border: c.on ? 'none' : `1px solid ${T.line}`,
                whiteSpace: 'nowrap', flexShrink: 0,
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
                {c.v}
                {c.on && <span style={{ fontSize: 14, opacity: 0.8 }}>×</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Liste */}
        <div style={{ flex: 1, overflow: 'auto', padding: '0 24px' }}>
          {tasks.map((t, i) => {
            const sm = statusMeta[t.status];
            return (
              <UI.Card key={i} pad={14} style={{
                marginBottom: 10,
                border: t.active ? `2px solid ${T.accent}` : `1px solid ${T.line}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: T.muteSoft, fontFamily: T.fontMono }}>
                      {t.group.toUpperCase()} · {t.team.toUpperCase()}
                    </div>
                  </div>
                  <UI.Pill tone={sm.tone}>{sm.label}</UI.Pill>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.lineSoft}` }}>
                  <span style={{
                    fontSize: 12,
                    color: t.status === 'OVERDUE' ? T.danger : t.active ? T.accent : T.mute,
                    fontWeight: t.active || t.status === 'OVERDUE' ? 600 : 500,
                  }}>
                    {t.status === 'OVERDUE' ? '⚠ ' : t.active ? '● ' : ''}
                    {t.due}
                  </span>
                  {t.mine && <UI.Pill tone="accent">Bana</UI.Pill>}
                </div>
              </UI.Card>
            );
          })}
        </div>

        {/* Sticky FAB — hızlı atama */}
        <div style={{
          position: 'absolute', bottom: 100, right: 20,
          width: 56, height: 56, borderRadius: 28,
          background: T.ink, color: '#fff', fontSize: 26,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 20px rgba(31,42,28,.25)', fontWeight: 300,
        }}>+</div>
      </div>
      <TabBar active="pool" />
    </Phone>
  );
};

// ─────────────── 9. QUICK ASSIGN (Hızlı atama) ───────────────
window.MobQuickAssign = () => {
  return (
    <Phone>
      <div style={{ padding: '24px 24px 28px', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <span style={{ fontSize: 22, color: T.mute }}>×</span>
          <div style={{ fontSize: 11, fontFamily: T.fontMono, color: T.muteSoft, letterSpacing: 1 }}>HIZLI ATAMA</div>
          <span style={{ width: 22 }} />
        </div>

        <div style={{ fontFamily: T.fontSerif, fontSize: 32, letterSpacing: -0.8, lineHeight: 1.05, marginBottom: 28 }}>
          Yeni atama,<br/><i>30 saniyede.</i>
        </div>

        {/* 1. Görev grubu */}
        <UI.SectionLabel>1 · Görev grubu</UI.SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {[
            { name: 'Sabah Açılış Rutini', meta: '4 görev · ~30dk', on: true },
            { name: 'Haftalık Stok Kontrolü', meta: '3 görev · ~45dk' },
            { name: 'Kapanış Rutini', meta: '5 görev · ~25dk' },
          ].map(g => (
            <div key={g.name} style={{
              padding: 14, borderRadius: 10,
              border: g.on ? `2px solid ${T.accent}` : `1px solid ${T.line}`,
              background: g.on ? T.accentSoft : T.surface,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{g.name}</div>
                <div style={{ fontSize: 11, color: T.muteSoft, fontFamily: T.fontMono, marginTop: 2 }}>{g.meta}</div>
              </div>
              {g.on && <span style={{ color: T.accent, fontSize: 18 }}>✓</span>}
            </div>
          ))}
        </div>

        {/* 2. Hedef */}
        <UI.SectionLabel>2 · Kim yapacak</UI.SectionLabel>
        <div style={{ display: 'flex', background: T.lineSoft, borderRadius: 10, padding: 3, marginBottom: 12 }}>
          {['Takım', 'Kişi'].map((s, i) => (
            <div key={s} style={{
              flex: 1, padding: 8, textAlign: 'center', fontSize: 12, fontWeight: 600,
              background: i === 0 ? T.surface : 'transparent',
              color: i === 0 ? T.ink : T.mute,
              borderRadius: 8,
            }}>{s}</div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {[
            { name: 'Bahçeşehir', meta: '6 üye', on: true },
            { name: 'Kadıköy', meta: '5 üye' },
            { name: 'Ataşehir', meta: '4 üye' },
          ].map(t => (
            <div key={t.name} style={{
              padding: 14, borderRadius: 10,
              border: t.on ? `2px solid ${T.accent}` : `1px solid ${T.line}`,
              background: t.on ? T.accentSoft : T.surface,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <UI.Avatar name={t.name} size={36} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{t.name}</div>
                <div style={{ fontSize: 11, color: T.muteSoft, fontFamily: T.fontMono }}>{t.meta}</div>
              </div>
              {t.on && <span style={{ color: T.accent, fontSize: 18 }}>✓</span>}
            </div>
          ))}
        </div>

        {/* 3. Tarih */}
        <UI.SectionLabel>3 · Ne zaman</UI.SectionLabel>
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {[
            { v: 'Hemen', on: true },
            { v: 'Bugün' },
            { v: 'Yarın' },
            { v: 'Özel' },
          ].map(d => (
            <div key={d.v} style={{
              flex: 1, padding: 12, textAlign: 'center', fontSize: 13, fontWeight: 600,
              borderRadius: 10,
              background: d.on ? T.ink : T.surface,
              color: d.on ? '#fff' : T.mute,
              border: d.on ? 'none' : `1px solid ${T.line}`,
            }}>{d.v}</div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: T.muteSoft, fontFamily: T.fontMono, marginBottom: 24 }}>
          → Bugün 14:32'de başlar, 15:02'ye kadar.
        </div>

        {/* Onay özeti + buton */}
        <div style={{
          padding: 14, background: T.surfaceAlt, borderRadius: 10, marginBottom: 12,
          fontSize: 12, lineHeight: 1.5, color: T.mute,
        }}>
          <span style={{ fontWeight: 600, color: T.ink }}>Sabah Açılış Rutini</span> · Bahçeşehir takımı · hemen başla
        </div>

        <div style={{
          background: T.accent, color: '#fff', padding: 16, borderRadius: 12,
          textAlign: 'center', fontWeight: 700, fontSize: 15,
        }}>Atamayı oluştur ✓</div>
      </div>
    </Phone>
  );
};
