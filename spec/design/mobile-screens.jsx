// mobile-screens.jsx — Today, TaskWizard, Approvals, Profile, Login, TaskGroupDetail, Notifications

// Hafif telefon çerçevesi — IOSDevice'ı sarmaya gerek yok, kendi sade kasamızı çiziyoruz.
const Phone = ({ children }) => {
  return (
    <div style={{
      width: 390, height: 844, background: '#0a0a0a',
      borderRadius: 54, padding: 12, boxShadow: '0 30px 60px -20px rgba(0,0,0,.25)',
      position: 'relative', boxSizing: 'border-box',
    }}>
      <div style={{
        width: '100%', height: '100%', background: T.bg, borderRadius: 42,
        overflow: 'hidden', position: 'relative',
        fontFamily: T.font, color: T.ink,
      }}>
        {/* Status bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 44,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 28px', fontSize: 15, fontWeight: 600, color: T.ink, zIndex: 10,
        }}>
          <span>9:41</span>
          <span style={{ fontSize: 12, fontFamily: T.fontMono }}>● ● ●</span>
        </div>
        {/* Dynamic island */}
        <div style={{
          position: 'absolute', top: 11, left: '50%', transform: 'translateX(-50%)',
          width: 124, height: 36, background: '#0a0a0a', borderRadius: 20, zIndex: 11,
        }} />
        {/* Home indicator */}
        <div style={{
          position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
          width: 134, height: 5, background: T.ink, borderRadius: 3, opacity: 0.4, zIndex: 10,
        }} />
        <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
          {children}
        </div>
      </div>
    </div>
  );
};

window.Phone = Phone;

// ─────────────── 1. MOBİL LOGIN ───────────────
window.MobLogin = () => (
  <Phone>
    <div style={{ padding: '60px 28px 28px', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ fontFamily: T.fontSerif, fontSize: 32, fontStyle: 'italic', marginBottom: 60 }}>Provit</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: T.fontSerif, fontSize: 38, lineHeight: 1.05, letterSpacing: -1, marginBottom: 12 }}>
          Hoş geldin.
        </div>
        <div style={{ color: T.mute, fontSize: 14, marginBottom: 32 }}>
          Bugünkü görevlerine ve takım akışına eriş.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
          <Field label="E-posta" value="ayse@provit.test" />
          <Field label="Parola" value="••••••••" />
        </div>
        <div style={{
          background: T.ink, color: '#fff', padding: '16px', textAlign: 'center',
          borderRadius: 12, fontWeight: 600, fontSize: 15,
        }}>Giriş yap →</div>
      </div>
      <div style={{ textAlign: 'center', fontSize: 11, color: T.muteSoft, fontFamily: T.fontMono }}>
        v0.1 · provit.test
      </div>
    </div>
  </Phone>
);

const TabBar = ({ active = 'today' }) => (
  <div style={{
    position: 'absolute', bottom: 0, left: 0, right: 0,
    background: T.surface, borderTop: `1px solid ${T.line}`,
    paddingTop: 10, paddingBottom: 28, display: 'flex',
  }}>
    {[
      ['today', 'Bugün'], ['pool', 'Havuz'], ['approvals', 'Onaylar'], ['profile', 'Profil'],
    ].map(([k, label]) => {
      const on = k === active;
      return (
        <div key={k} style={{ flex: 1, textAlign: 'center', fontSize: 11, color: on ? T.ink : T.muteSoft, fontWeight: on ? 600 : 500 }}>
          <div style={{
            width: 6, height: 6, borderRadius: 3, background: on ? T.ink : 'transparent',
            margin: '0 auto 6px',
          }} />
          {label}
        </div>
      );
    })}
  </div>
);

// ─────────────── 2. TODAY ───────────────
window.MobToday = () => (
  <Phone>
    <div style={{ padding: '24px 24px 100px', height: '100%', overflow: 'auto' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 14, color: T.mute }}>Günaydın,</div>
        <div style={{ fontFamily: T.fontSerif, fontSize: 36, letterSpacing: -0.8, marginTop: 2 }}>
          Ayşe.
        </div>
        <div style={{ fontSize: 13, color: T.mute, marginTop: 12 }}>2/4 görev tamamlandı</div>
        <div style={{ height: 6, background: T.lineSoft, borderRadius: 3, marginTop: 8, overflow: 'hidden' }}>
          <div style={{ width: '50%', height: '100%', background: T.accent }} />
        </div>
      </div>

      <UI.SectionLabel>Şu an aktif</UI.SectionLabel>
      <UI.Card pad={16} style={{ marginBottom: 16, border: `2px solid ${T.accent}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>Sabah Açılış Rutini</div>
            <div style={{ fontSize: 11, color: T.muteSoft, fontFamily: T.fontMono }}>BAHÇEŞEHİR · BUGÜN 18:00</div>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: T.accent }}>2/4</span>
        </div>
        {[
          { n: 'Aydınlatmayı aç', s: 'done' },
          { n: 'Kasa açılışını yap', s: 'done' },
          { n: 'Soğutucu kontrolü', s: 'now' },
          { n: 'Genel temizlik kontrolü', s: 'lock' },
        ].map((t, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
            borderTop: i > 0 ? `1px solid ${T.lineSoft}` : 'none',
            opacity: t.s === 'lock' ? 0.5 : 1,
          }}>
            <div style={{
              width: 26, height: 26, borderRadius: 13,
              background: t.s === 'done' ? T.accent : t.s === 'now' ? T.surface : T.lineSoft,
              border: t.s === 'now' ? `2px solid ${T.accent}` : 'none',
              color: t.s === 'done' ? '#fff' : T.ink, fontSize: 11, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{t.s === 'done' ? '✓' : t.s === 'lock' ? '🔒' : i + 1}</div>
            <div style={{ flex: 1, fontSize: 14, fontWeight: 500, textDecoration: t.s === 'done' ? 'line-through' : 'none', color: t.s === 'done' ? T.mute : T.ink }}>
              {t.n}
            </div>
            {t.s === 'now' && <span style={{ fontSize: 18, color: T.muteSoft }}>›</span>}
          </div>
        ))}
      </UI.Card>

      <UI.SectionLabel>Sonraki</UI.SectionLabel>
      <UI.Card pad={16}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Akşam Kapanış</div>
            <div style={{ fontSize: 11, color: T.muteSoft, fontFamily: T.fontMono, marginTop: 4 }}>BAHÇEŞEHİR · 20:00</div>
          </div>
          <UI.Pill>3 görev</UI.Pill>
        </div>
      </UI.Card>
    </div>
    <TabBar active="today" />
  </Phone>
);

// ─────────────── 3. TASK WIZARD ───────────────
window.MobTaskWizard = () => (
  <Phone>
    <div style={{ padding: '24px 24px 28px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <span style={{ fontSize: 22, color: T.mute }}>×</span>
        <div style={{ fontSize: 11, fontFamily: T.fontMono, color: T.muteSoft, letterSpacing: 1 }}>ADIM 2/3 · İSPAT</div>
        <span style={{ fontSize: 13, color: T.accent, fontWeight: 600 }}>Atla</span>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 28 }}>
        {[1,2,3].map(i => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= 2 ? T.accent : T.lineSoft }} />
        ))}
      </div>

      <UI.SectionLabel>3. görev · Bahçeşehir</UI.SectionLabel>
      <div style={{ fontFamily: T.fontSerif, fontSize: 30, letterSpacing: -0.8, lineHeight: 1.1, marginBottom: 8 }}>
        Soğutucu kontrolü
      </div>
      <div style={{ fontSize: 13, color: T.mute, marginBottom: 24 }}>
        En az 2 fotoğraf yükle · soğutucu sıcaklık ekranı görünsün.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <UI.Placeholder h={140} label="termometre" />
        <UI.Placeholder h={140} label="ürün rafı" />
        <div style={{
          height: 140, borderRadius: 8, border: `2px dashed ${T.line}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 6, color: T.muteSoft,
        }}>
          <div style={{ fontSize: 24 }}>📷</div>
          <div style={{ fontSize: 11, fontFamily: T.fontMono }}>+ FOTO</div>
        </div>
        <div style={{ height: 140, borderRadius: 8, background: T.lineSoft, opacity: 0.5 }} />
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 12, color: T.accent, fontFamily: T.fontMono, textAlign: 'center' }}>
          ✓ 2/2 zorunlu foto yüklendi
        </div>
        <div style={{
          background: T.ink, color: '#fff', padding: 16, borderRadius: 12,
          textAlign: 'center', fontWeight: 600, fontSize: 15,
        }}>Devam → Checklist</div>
      </div>
    </div>
  </Phone>
);

// ─────────────── 4. CHECKLIST (TaskWizard adım 3) ───────────────
window.MobChecklist = () => (
  <Phone>
    <div style={{ padding: '24px 24px 28px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <span style={{ fontSize: 22, color: T.mute }}>×</span>
        <div style={{ fontSize: 11, fontFamily: T.fontMono, color: T.muteSoft, letterSpacing: 1 }}>ADIM 3/3 · CHECKLIST</div>
        <span style={{ width: 22 }} />
      </div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
        {[1,2,3].map(i => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: T.accent }} />
        ))}
      </div>

      <UI.SectionLabel>Soru 3 / 5</UI.SectionLabel>
      <div style={{ fontFamily: T.fontSerif, fontSize: 26, letterSpacing: -0.6, lineHeight: 1.15, marginBottom: 24 }}>
        Soğutucu sıcaklığı uygun aralıkta mı?
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        {[
          { v: 'EVET', tone: 'accent', on: true },
          { v: 'HAYIR', tone: 'danger' },
          { v: 'GEÇERLİ DEĞİL', tone: 'mute' },
        ].map(o => (
          <div key={o.v} style={{
            padding: 16, borderRadius: 10,
            border: o.on ? `2px solid ${T.accent}` : `1px solid ${T.line}`,
            background: o.on ? T.accentSoft : T.surface,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 15, fontWeight: 600 }}>{o.v}</span>
            {o.on && <span style={{ color: T.accent, fontSize: 18 }}>✓</span>}
          </div>
        ))}
      </div>

      <UI.SectionLabel>Not (opsiyonel)</UI.SectionLabel>
      <div style={{ padding: 14, background: T.surface, borderRadius: 10, border: `1px solid ${T.line}`, fontSize: 13, color: T.muteSoft, minHeight: 60 }}>
        Sıcaklık 4°C, ekran fotoğrafı eklendi.
      </div>

      <div style={{ marginTop: 'auto' }}>
        <div style={{
          background: T.accent, color: '#fff', padding: 16, borderRadius: 12,
          textAlign: 'center', fontWeight: 700, fontSize: 15,
        }}>Tamamla & onaya gönder</div>
      </div>
    </div>
  </Phone>
);

// ─────────────── 5. APPROVALS (mobil) ───────────────
window.MobApprovals = () => (
  <Phone>
    <div style={{ padding: '60px 24px 100px', height: '100%', overflow: 'auto' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: T.fontSerif, fontSize: 32, letterSpacing: -0.8 }}>Onaylar</div>
        <div style={{ fontSize: 13, color: T.mute, marginTop: 4 }}>4 bekleyen</div>
      </div>

      {[
        { name: 'Stok sayımı kapanış', team: 'Bahçeşehir', who: 'Mehmet Y.', no: 0 },
        { name: 'Kasa kontrolü', team: 'Kadıköy', who: 'Zeynep T.', no: 1 },
      ].map((a, i) => (
        <UI.Card key={i} pad={16} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>{a.name}</div>
              <div style={{ fontSize: 11, color: T.muteSoft, fontFamily: T.fontMono }}>
                {a.team} · {a.who.toUpperCase()}
              </div>
            </div>
            {a.no > 0 && <UI.Pill tone="danger">{a.no} HAYIR</UI.Pill>}
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            <UI.Placeholder w={70} h={70} label="" />
            <UI.Placeholder w={70} h={70} label="" />
            <UI.Placeholder w={70} h={70} label="" />
            <div style={{ width: 70, height: 70, background: T.lineSoft, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: T.muteSoft, fontFamily: T.fontMono }}>+2</div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{
              flex: 1, padding: 12, border: `1px solid ${T.ink}`, borderRadius: 10,
              textAlign: 'center', fontSize: 13, fontWeight: 600,
            }}>Düzelt iste</div>
            <div style={{
              flex: 1, padding: 12, background: T.ink, color: '#fff', borderRadius: 10,
              textAlign: 'center', fontSize: 13, fontWeight: 600,
            }}>Onayla</div>
          </div>
        </UI.Card>
      ))}
    </div>
    <TabBar active="approvals" />
  </Phone>
);

// ─────────────── 6. PROFILE ───────────────
window.MobProfile = () => (
  <Phone>
    <div style={{ padding: '60px 24px 100px', height: '100%', overflow: 'auto' }}>
      <div style={{ alignItems: 'center', display: 'flex', flexDirection: 'column', marginBottom: 24 }}>
        <UI.Avatar name="Ayşe Kaya" size={80} />
        <div style={{ fontFamily: T.fontSerif, fontSize: 28, letterSpacing: -0.6, marginTop: 14 }}>Ayşe Kaya</div>
        <div style={{ fontSize: 12, color: T.mute, fontFamily: T.fontMono }}>ayse@provit.test</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 24 }}>
        <UI.Card pad={14} style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: T.fontSerif, fontSize: 28, color: T.accent }}>4</div>
          <div style={{ fontSize: 10, color: T.muteSoft, fontFamily: T.fontMono }}>BUGÜN</div>
        </UI.Card>
        <UI.Card pad={14} style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: T.fontSerif, fontSize: 28 }}>23</div>
          <div style={{ fontSize: 10, color: T.muteSoft, fontFamily: T.fontMono }}>HAFTA</div>
        </UI.Card>
        <UI.Card pad={14} style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: T.fontSerif, fontSize: 28 }}>7</div>
          <div style={{ fontSize: 10, color: T.muteSoft, fontFamily: T.fontMono }}>SERİ</div>
        </UI.Card>
      </div>

      <UI.SectionLabel>Takımlar</UI.SectionLabel>
      <UI.Card pad={4} style={{ marginBottom: 20 }}>
        {[
          { name: 'Bahçeşehir', code: 'BAH', role: 'MANAGER' },
          { name: 'Kadıköy', code: 'KAD', role: 'MEMBER' },
        ].map((t, i, arr) => (
          <div key={t.code} style={{
            display: 'flex', alignItems: 'center', padding: 12,
            borderBottom: i < arr.length - 1 ? `1px solid ${T.lineSoft}` : 'none',
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{t.name}</div>
              <div style={{ fontSize: 11, color: T.muteSoft, fontFamily: T.fontMono }}>{t.code}</div>
            </div>
            <UI.Pill tone={t.role === 'MANAGER' ? 'accent' : 'mute'}>
              {t.role === 'MANAGER' ? 'Yönetici' : 'Üye'}
            </UI.Pill>
          </div>
        ))}
      </UI.Card>

      <UI.SectionLabel>Ayarlar</UI.SectionLabel>
      <UI.Card pad={4} style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Push bildirimleri</div>
            <div style={{ fontSize: 11, color: T.muteSoft }}>Yeni atama, onay, hatırlatma</div>
          </div>
          <div style={{ width: 44, height: 26, background: T.accent, borderRadius: 13, position: 'relative' }}>
            <div style={{ position: 'absolute', top: 3, right: 3, width: 20, height: 20, background: '#fff', borderRadius: 10 }} />
          </div>
        </div>
      </UI.Card>

      <div style={{
        padding: 14, border: `1px solid ${T.danger}`, borderRadius: 10,
        textAlign: 'center', color: T.danger, fontWeight: 600, fontSize: 14,
      }}>Çıkış yap</div>
    </div>
    <TabBar active="profile" />
  </Phone>
);

// ─────────────── 7. NOTIFICATIONS ───────────────
window.MobNotifications = () => (
  <Phone>
    <div style={{ padding: '60px 24px 100px', height: '100%', overflow: 'auto' }}>
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 24, color: T.mute }}>‹</span>
        <div style={{ fontFamily: T.fontSerif, fontSize: 28, letterSpacing: -0.6 }}>Bildirimler</div>
      </div>

      <div style={{ fontFamily: T.fontMono, fontSize: 10, color: T.muteSoft, letterSpacing: 1, textTransform: 'uppercase', margin: '12px 0 8px' }}>
        BUGÜN
      </div>
      {[
        { kind: 'ASSIGNMENT', title: 'Yeni atama: Stok kontrolü', body: 'Bugün 14:00 · Kadıköy', time: '12dk', new: true },
        { kind: 'APPROVAL', title: 'Onayın hazır', body: 'Mehmet Y. — Stok sayımı kapanış', time: '34dk', new: true },
        { kind: 'RESULT', title: 'Görevin onaylandı ✓', body: 'Sabah açılış · Bahçeşehir', time: '2s' },
      ].map((n, i) => (
        <div key={i} style={{
          display: 'flex', gap: 12, padding: '14px 12px', borderRadius: 10,
          background: n.new ? T.accentSoft : 'transparent', marginBottom: 4,
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: 4, background: n.new ? T.accent : 'transparent',
            marginTop: 6, flexShrink: 0,
          }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{n.title}</div>
            <div style={{ fontSize: 12, color: T.mute }}>{n.body}</div>
          </div>
          <div style={{ fontSize: 10, color: T.muteSoft, fontFamily: T.fontMono, flexShrink: 0 }}>{n.time}</div>
        </div>
      ))}
    </div>
  </Phone>
);
