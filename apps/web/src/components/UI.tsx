export function Card({ children, style, pad }) {
  return (
    <div className={pad === 'sm' ? 'card card--pad-sm' : 'card'} style={style}>
      {children}
    </div>
  );
}

export function Button({ children, variant = 'primary', size, icon, ...rest }) {
  const cls = ['btn'];
  if (variant === 'accent') cls.push('btn--accent');
  if (variant === 'ghost') cls.push('btn--ghost');
  if (variant === 'danger') cls.push('btn--danger');
  if (size === 'sm') cls.push('btn--sm');
  if (size === 'lg') cls.push('btn--lg');
  return (
    <button className={cls.join(' ')} {...rest}>
      {icon}
      {children}
    </button>
  );
}

export function Pill({ children, tone = 'mute' }) {
  return <span className={`pill ${tone !== 'mute' ? `pill--${tone}` : ''}`}>{children}</span>;
}

export function SectionLabel({ children }) {
  return <div className="section-label">{children}</div>;
}

export function Avatar({ name = '?', size = 32 }) {
  const initials = name.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const palette = ['#5C7A4F', '#7B6A4A', '#6B7568', '#8A6240', '#4A6B57', '#5E6E48'];
  return (
    <div
      className="avatar"
      style={{
        width: size,
        height: size,
        background: palette[h % palette.length],
        fontSize: size * 0.4,
      }}
    >
      {initials}
    </div>
  );
}

export function Empty({ children }) {
  return <div className="empty">{children}</div>;
}

export function Modal({ open, onClose, children, title }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {title && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 24 }}>
              {title}
            </h3>
            <Button variant="ghost" size="sm" onClick={onClose}>Kapat</Button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export function StatusPill({ status }) {
  const map = {
    BLOCKED: ['Bloklu', 'mute'],
    PENDING: ['Bekliyor', 'mute'],
    IN_PROGRESS: ['Devam ediyor', 'accent'],
    AWAITING_APPROVAL: ['Onay bekliyor', 'warn'],
    DONE: ['Tamamlandı', 'accent'],
    APPROVED: ['Onaylandı', 'accent'],
    REJECTED: ['Reddedildi', 'danger'],
  };
  const [label, tone] = map[status] || [status, 'mute'];
  return <Pill tone={tone}>{label}</Pill>;
}
