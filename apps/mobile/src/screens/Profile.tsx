import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth';
import { api } from '../api';
import { Card, Btn, Pill, Avatar, SectionLabel } from '../components';
import { BrandLogo } from '../BrandLogo';
import { T } from '../theme';

export default function ProfileScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const statsQ = useQuery({ queryKey: ['runs', 'stats'], queryFn: () => api.get('/api/task-runs/mine/stats') });
  const stats = statsQ.data || {};

  const doLogout = () => {
    Alert.alert('Çıkış', 'Çıkış yapmak istediğine emin misin?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Çıkış', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <ScrollView style={s.page} contentContainerStyle={{ padding: 16 }}>
      <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
        <BrandLogo style={s.logo} />
        <Avatar name={user?.displayName ?? '?'} size={72} />
        <Text style={s.name}>{user?.displayName}</Text>
        <Text style={s.email}>{user?.email}</Text>
      </Card>

      <SectionLabel style={{ marginTop: 20 }}>İstatistik</SectionLabel>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Card style={s.kpi}>
          <Text style={s.kpiLabel}>Bugün</Text>
          <Text style={s.kpiValue}>{stats.completedToday ?? 0}</Text>
        </Card>
        <Card style={s.kpi}>
          <Text style={s.kpiLabel}>Bu hafta</Text>
          <Text style={s.kpiValue}>{stats.completedWeek ?? 0}</Text>
        </Card>
        <Card style={s.kpi}>
          <Text style={s.kpiLabel}>Seri</Text>
          <Text style={s.kpiValue}>{stats.streak ?? 0}</Text>
        </Card>
      </View>

      <SectionLabel style={{ marginTop: 20 }}>Takımlarım</SectionLabel>
      <Card>
        {(user?.memberships || []).map((m: any) => (
          <View key={m.teamId} style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={s.rowTitle}>{m.teamName}</Text>
              <Text style={s.rowSub}>{m.teamCode}</Text>
            </View>
            <Pill tone={m.role === 'MANAGER' ? { bg: T.accentSoft, fg: T.accent } : undefined}>
              {m.role}
            </Pill>
          </View>
        ))}
      </Card>

      <Btn
        style={{ marginTop: 20 }}
        variant="ghost"
        onPress={() => navigation.navigate('Notifications')}
      >
        Bildirimler
      </Btn>

      <Btn style={{ marginTop: 12 }} variant="danger" onPress={doLogout}>
        Çıkış yap
      </Btn>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: T.bg },
  logo: { width: 172, height: 38, marginBottom: 18 },
  name: { fontSize: 22, fontWeight: '700', color: T.ink, marginTop: 12 },
  email: { fontSize: 12, color: T.mute, marginTop: 2 },
  kpi: { flex: 1, padding: 12, alignItems: 'flex-start' },
  kpiLabel: { fontSize: 9, color: T.muteSoft, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  kpiValue: { fontSize: 24, fontStyle: 'italic', color: T.ink, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopColor: T.line, borderTopWidth: 1 },
  rowTitle: { fontSize: 14, fontWeight: '600', color: T.ink },
  rowSub: { fontSize: 11, color: T.mute },
});
