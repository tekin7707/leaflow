import { View, Text, FlatList, RefreshControl, StyleSheet, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Card, Btn, Pill, Avatar, SectionLabel } from '../components';
import { T } from '../theme';

const fmt = (d: string | Date) =>
  new Date(d).toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' });

export default function ApprovalsScreen() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['approvals', 'queue'], queryFn: () => api.get('/api/approvals/queue') });
  const list = q.data || [];

  const decide = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'APPROVED' | 'CHANGES_REQUESTED' }) =>
      api.post(`/api/approvals/${id}/decide`, { decision }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['approvals'] }),
    onError: (e: any) => Alert.alert('Hata', e.message),
  });

  return (
    <View style={s.page}>
      <FlatList
        data={list}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={q.isFetching} onRefresh={() => q.refetch()} />}
        ListHeaderComponent={
          <View style={{ marginBottom: 12 }}>
            <SectionLabel>Onaylar</SectionLabel>
            <Text style={s.title}>Bekleyen onaylar ({list.length})</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          !q.isLoading ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text style={{ color: T.mute }}>Bekleyen onay yok.</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Avatar name={item.taskRun.assignee?.displayName ?? '?'} />
              <View style={{ flex: 1 }}>
                <Text style={s.taskName}>{item.taskRun.task.name}</Text>
                <Text style={s.meta}>
                  {item.taskRun.assignee?.displayName ?? '—'} · {item.taskRun.run.assignment.team.name}
                </Text>
              </View>
              <Pill tone={{ bg: T.warnSoft, fg: T.warn }}>Onay</Pill>
            </View>
            <Text style={s.metaMono}>{fmt(item.createdAt)}</Text>

            {item.taskRun.proofs?.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {item.taskRun.proofs.map((p: any) => (
                  <View key={p.id} style={s.thumb}>
                    <Text style={{ fontSize: 9, color: T.muteSoft }}>{p.filename}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <Btn
                variant="danger"
                style={{ flex: 1 }}
                onPress={() => decide.mutate({ id: item.id, decision: 'CHANGES_REQUESTED' })}
              >
                Düzeltme iste
              </Btn>
              <Btn
                variant="accent"
                style={{ flex: 1 }}
                onPress={() => decide.mutate({ id: item.id, decision: 'APPROVED' })}
              >
                Onayla
              </Btn>
            </View>
          </Card>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: T.bg },
  title: { fontSize: 24, fontStyle: 'italic', color: T.ink },
  taskName: { fontSize: 14, fontWeight: '700', color: T.ink },
  meta: { fontSize: 11, color: T.mute, marginTop: 2 },
  metaMono: { fontSize: 10, color: T.muteSoft, marginTop: 6 },
  thumb: {
    width: 72, height: 72, borderRadius: 6,
    backgroundColor: T.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
    padding: 4,
  },
});
