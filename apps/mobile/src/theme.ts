// Leaflow Yön A — RN versiyonu
export const T = {
  bg: '#FAF8F4',
  surface: '#FFFFFF',
  surfaceAlt: '#F4F1EA',
  ink: '#1F2A1C',
  inkSoft: '#3F4A3A',
  mute: '#6B7568',
  muteSoft: '#9AA392',
  line: '#EEE9E0',
  accent: '#5C7A4F',
  accentSoft: '#DCE6D2',
  warn: '#C97B3B',
  warnSoft: '#F5E6D3',
  danger: '#A8332B',
  dangerSoft: '#FDECEA',
  radius: 12,
  radiusSm: 8,
};

export const statusTone = (s) => {
  if (s === 'APPROVED' || s === 'DONE' || s === 'IN_PROGRESS') return { bg: T.accentSoft, fg: T.accent };
  if (s === 'AWAITING_APPROVAL') return { bg: T.warnSoft, fg: T.warn };
  if (s === 'REJECTED') return { bg: T.dangerSoft, fg: T.danger };
  return { bg: T.line, fg: T.mute };
};

export const statusLabel = (s) => ({
  BLOCKED: 'Bloklu',
  PENDING: 'Bekliyor',
  IN_PROGRESS: 'Devam',
  AWAITING_APPROVAL: 'Onay bekliyor',
  DONE: 'Tamamlandı',
  APPROVED: 'Onaylandı',
  REJECTED: 'Reddedildi',
}[s] || s);
