// design-tokens.jsx
// Leaflow Yön A — sıcak krem + zeytin yeşili.
// Tüm ekranlar bu tokenları kullanır; CLAUDE_CODE_SPEC.md ile birebir aynı.

const T = {
  bg: '#FAF8F4',
  surface: '#FFFFFF',
  surfaceAlt: '#F4F1EA',
  ink: '#1F2A1C',
  inkSoft: '#3F4A3A',
  mute: '#6B7568',
  muteSoft: '#9AA392',
  line: '#EEE9E0',
  lineSoft: '#F4F1EA',
  accent: '#5C7A4F',
  accentSoft: '#DCE6D2',
  warn: '#C97B3B',
  warnSoft: '#F5E6D3',
  danger: '#A8332B',
  dangerSoft: '#FDECEA',
  radius: 12,
  radiusSm: 8,
  shadow: '0 1px 2px rgba(31,42,28,.04), 0 8px 24px rgba(31,42,28,.06)',
  shadowSoft: '0 1px 2px rgba(31,42,28,.03)',
  font: '"Inter Tight", -apple-system, system-ui, sans-serif',
  fontSerif: '"Instrument Serif", Georgia, serif',
  fontMono: '"Geist Mono", "JetBrains Mono", ui-monospace, monospace',
};

window.T = T;

// Yardımcı UI parçaları — birden çok ekranda kullanılır.
const UI = {};

UI.Pill = function Pill({ children, tone = 'mute' }) {
  const tones = {
    mute: { bg: T.lineSoft, fg: T.mute },
    accent: { bg: T.accentSoft, fg: T.accent },
    warn: { bg: T.warnSoft, fg: T.warn },
    danger: { bg: T.dangerSoft, fg: T.danger },
    ink: { bg: T.ink, fg: '#fff' },
  };
  const c = tones[tone] || tones.mute;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: c.bg, color: c.fg, fontSize: 11, fontWeight: 600,
      padding: '3px 8px', borderRadius: 6, fontFamily: T.fontMono,
      letterSpacing: 0.3, textTransform: 'uppercase',
    }}>{children}</span>
  );
};

UI.Card = function Card({ children, style, pad = 20 }) {
  return (
    <div style={{
      background: T.surface, borderRadius: T.radius, border: `1px solid ${T.line}`,
      padding: pad, boxShadow: T.shadowSoft, ...style,
    }}>{children}</div>
  );
};

UI.SectionLabel = function SectionLabel({ children }) {
  return (
    <div style={{
      fontFamily: T.fontMono, fontSize: 10, fontWeight: 600,
      letterSpacing: 1.4, textTransform: 'uppercase', color: T.muteSoft,
      marginBottom: 12,
    }}>{children}</div>
  );
};

UI.Avatar = function Avatar({ name = '?', size = 32, bg }) {
  const initials = name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
  // Hash-based color so avatars are stable per name.
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const palette = [T.accent, '#7B6A4A', '#6B7568', '#8A6240', '#4A6B57', '#5E6E48'];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bg || palette[h % palette.length], color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.4, fontFamily: T.font,
      flexShrink: 0,
    }}>{initials}</div>
  );
};

UI.Button = function Button({ children, variant = 'primary', size = 'md', icon, onClick }) {
  const sizes = {
    sm: { p: '6px 10px', fs: 12 },
    md: { p: '10px 16px', fs: 13 },
    lg: { p: '14px 22px', fs: 14 },
  };
  const variants = {
    primary: { bg: T.ink, fg: '#fff', bd: T.ink },
    accent: { bg: T.accent, fg: '#fff', bd: T.accent },
    ghost: { bg: 'transparent', fg: T.ink, bd: T.line },
    danger: { bg: 'transparent', fg: T.danger, bd: T.danger },
  };
  const s = sizes[size]; const v = variants[variant];
  return (
    <button onClick={onClick} style={{
      background: v.bg, color: v.fg, border: `1px solid ${v.bd}`,
      padding: s.p, fontSize: s.fs, fontWeight: 600, borderRadius: 8,
      fontFamily: T.font, cursor: 'pointer', display: 'inline-flex',
      alignItems: 'center', gap: 6,
    }}>{icon}{children}</button>
  );
};

UI.Placeholder = function Placeholder({ w = '100%', h = 120, label }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: T.radiusSm,
      background: `repeating-linear-gradient(135deg, ${T.lineSoft} 0 8px, ${T.line} 8px 16px)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: T.fontMono, fontSize: 10, color: T.muteSoft,
      letterSpacing: 1, textTransform: 'uppercase',
    }}>{label}</div>
  );
};

window.UI = UI;
