import { useQuery } from '@tanstack/react-query';
import { View, Text, FlatList, RefreshControl, StyleSheet, TouchableOpacity } from 'react-native';
import { api } from '../api';
import { useAuth } from '../auth';
import { Card, Pill, StatusPill, SectionLabel } from '../components';
import { T } from '../theme';

export default function TodayScreen({ navigation }) {
  const { user } = useAuth();
  const todayQ = useQuery({ queryKey: ['runs', 'today'], queryFn: () => api.get('/api/task-runs/mine/today') });
  const statsQ = useQuery({ queryKey: ['runs', 'stats'], queryFn: () => api.get('/api/task-runs/mine/stats') });

  const items = todayQ.data || [];
  const stats = statsQ.data || {};

  const grouped = items.reduce((acc, r) => {
    const key = r.run.assignment.group.id;
    if (!acc[key]) acc[key] = { group: r.run.assignment.group, items: [] };
    acc[key].items.push(r);
    return acc;
  }, {});

  return (
    <View style={s.page}>
      <FlatList
        data={Object.values(grouped)}
        keyExtractor={(g) => g.group.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={todayQ.isFetching} onRefresh={() => todayQ.refetch()} />}
        ListHeaderComponent={
          <View>
            <SectionLabel>Merhaba</SectionLabel>
            <Text style={s.hello}>{user?.displayName?.split(' ')[0] ?? ''} 👋</Text>

            <View style={s.kpis}>
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
                <Text style={s.kpiValue}>{stats.streak ?? 0} gün</Text>
              </Card>
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginVertical: 12 }}>
              <TouchableOpacity onPress={() => navigation.navigate('QuickAssign')} style={[s.fab]}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>+ Hızlı atama</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={[s.fab, { backgroundColor: T.surface, borderColor: T.line, borderWidth: 1 }]}>
                <Text style={{ color: T.ink, fontWeight: '700', fontSize: 13 }}>🔔 Bildirimler</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <Card style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={s.groupName}>{item.group.name}</Text>
              <Pill>{item.items.length} görev</Pill>
            </View>
            {item.items.map((r) => (
              <TouchableOpacity
                key={r.id}
                style={s.row}
                onPress={() => navigation.navigate('TaskWizard', { taskRunId: r.id })}
                disabled={r.status === 'BLOCKED'}
              >
                <View style={{ flex: 1 }}>
                  <Text style={s.taskName}>{r.task.name}</Text>
                  <Text style={s.taskMeta}>
                    {r.run.assignment.team.name} · {r.task.estimatedMinutes} dk
                    {r.task.minFiles > 0 ? ` · ≥${r.task.minFiles} foto` : ''}
                  </Text>
                </View>
                <StatusPill status={r.status} />
              </TouchableOpacity>
            ))}
          </Card>
        )}
        ListEmptyComponent={
          !todayQ.isLoading ? (
            <View style={{ padding: 32, alignItems: 'center' }}>
              <Text style={{ color: T.mute }}>Bugün açık görev yok.</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: T.bg },
  hello: { fontSize: 28, fontStyle: 'italic', marginBottom: 16, color: T.ink },
  kpis: { flexDirection: 'row', gap: 8 },
  kpi: { flex: 1, padding: 12, alignItems: 'flex-start' },
  kpiLabel: { fontSize: 9, color: T.muteSoft, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  kpiValue: { fontSize: 28, fontStyle: 'italic', color: T.ink, marginTop: 4 },
  fab: { backgroundColor: T.ink, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
  groupName: { fontSize: 16, fontWeight: '700', color: T.ink },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopColor: T.line, borderTopWidth: StyleSheet.hairlineWidth, gap: 8 },
  taskName: { fontSize: 14, fontWeight: '600', color: T.ink },
  taskMeta: { fontSize: 11, color: T.mute, marginTop: 2 },
});
