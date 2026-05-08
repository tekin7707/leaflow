import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { T, statusTone, statusLabel } from './theme';

export function Card({ children, style }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Pill({ children, tone }) {
  const c = tone || { bg: T.line, fg: T.mute };
  return (
    <View style={{ backgroundColor: c.bg, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, alignSelf: 'flex-start' }}>
      <Text style={{ color: c.fg, fontSize: 11, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' }}>{children}</Text>
    </View>
  );
}

export function StatusPill({ status }) {
  return <Pill tone={statusTone(status)}>{statusLabel(status)}</Pill>;
}

export function Btn({ children, onPress, variant = 'primary', disabled, style }) {
  const palette = {
    primary: { bg: T.ink, fg: '#fff', bd: T.ink },
    accent: { bg: T.accent, fg: '#fff', bd: T.accent },
    ghost: { bg: 'transparent', fg: T.ink, bd: T.line },
    danger: { bg: 'transparent', fg: T.danger, bd: T.danger },
  }[variant];
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        {
          backgroundColor: palette.bg,
          borderColor: palette.bd,
          borderWidth: 1,
          borderRadius: 8,
          paddingVertical: 10,
          paddingHorizontal: 16,
          alignItems: 'center',
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      <Text style={{ color: palette.fg, fontWeight: '700', fontSize: 13 }}>{children}</Text>
    </TouchableOpacity>
  );
}

export function SectionLabel({ children, style }) {
  return (
    <Text style={[{ fontSize: 10, fontWeight: '700', letterSpacing: 1.4, color: T.muteSoft, textTransform: 'uppercase', marginBottom: 8 }, style]}>
      {children}
    </Text>
  );
}

export function Avatar({ name = '?', size = 32 }) {
  const initials = name.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const palette = [T.accent, '#7B6A4A', '#6B7568', '#8A6240', '#4A6B57'];
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: palette[h % palette.length],
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.4 }}>{initials}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: T.surface,
    borderColor: T.line,
    borderWidth: 1,
    borderRadius: T.radius,
    padding: 16,
  },
});
