import { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { Pill, StatusPill, Card } from '../components';
import { T } from '../theme';

const SCOPES = [
  ['mine', 'Bana'],
  ['team', 'Takım'],
  ['all', 'Tümü'],
] as const;

const fmtDay = (d: string | Date) =>
  new Date(d).toLocaleDateString('tr-TR', { weekday: 'short', day: '2-digit', month: 'short' });

export default function PoolScreen({ navigation }: any) {
  const [scope, setScope] = useState<'mine' | 'team' | 'all'>('team');
  const q = useQuery({
    queryKey: ['pool', scope],
    queryFn: () => api.get(`/api/task-runs/pool?scope=${scope}`),
  });
  const list = q.data || [];

  return (
    <View style={s.page}>
      <View style={s.tabs}>
        {SCOPES.map(([v, l]) => (
          <TouchableOpacity
            key={v}
            onPress={() => setScope(v)}
            style={[s.tab, scope === v && s.tabActive]}
          >
            <Text style={[s.tabText, scope === v && s.tabTextActive]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={list}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: 16, paddingTop: 0 }}
        refreshControl={<RefreshControl refreshing={q.isFetching} onRefresh={() => q.refetch()} />}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          !q.isLoading ? (
            <Text style={{ color: T.mute, padding: 16 }}>Görüntülenecek görev yok.</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate('TaskWizard', { taskRunId: item.id })}>
            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={s.taskName}>{item.task.name}</Text>
                  <Text style={s.taskMeta}>{item.run.assignment.group.name}</Text>
                </View>
                <StatusPill status={item.status} />
              </View>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                <Pill>{item.run.assignment.team.name}</Pill>
                <Pill>{fmtDay(item.run.date)}</Pill>
              </View>
            </Card>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: T.bg },
  tabs: { flexDirection: 'row', padding: 16, gap: 6 },
  tab: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderColor: T.line, borderWidth: 1, backgroundColor: T.surface },
  tabActive: { backgroundColor: T.ink, borderColor: T.ink },
  tabText: { fontSize: 12, fontWeight: '700', color: T.mute },
  tabTextActive: { color: '#fff' },
  taskName: { fontSize: 14, fontWeight: '700', color: T.ink },
  taskMeta: { fontSize: 11, color: T.mute, marginTop: 2 },
});
