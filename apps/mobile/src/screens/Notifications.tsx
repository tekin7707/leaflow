import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Card, Pill } from '../components';
import { T } from '../theme';

const fmt = (d: string | Date) =>
  new Date(d).toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' });

export default function NotificationsScreen() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['notifications'], queryFn: () => api.get('/api/notifications') });
  const list = q.data || [];

  const markRead = useMutation({
    mutationFn: (id: string) => api.post(`/api/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  return (
    <FlatList
      style={s.page}
      contentContainerStyle={{ padding: 16 }}
      data={list}
      keyExtractor={(n) => n.id}
      refreshControl={<RefreshControl refreshing={q.isFetching} onRefresh={() => q.refetch()} />}
      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      ListEmptyComponent={
        !q.isLoading ? (
          <View style={{ padding: 32, alignItems: 'center' }}>
            <Text style={{ color: T.mute }}>Bildirim yok.</Text>
          </View>
        ) : null
      }
      renderItem={({ item }) => (
        <TouchableOpacity onPress={() => !item.readAt && markRead.mutate(item.id)}>
          <Card style={{ backgroundColor: item.readAt ? T.surface : T.accentSoft }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={s.title}>{item.title}</Text>
                <Text style={s.body}>{item.body}</Text>
              </View>
              <Pill>{item.kind}</Pill>
            </View>
            <Text style={s.time}>{fmt(item.createdAt)}</Text>
          </Card>
        </TouchableOpacity>
      )}
    />
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: T.bg },
  title: { fontSize: 14, fontWeight: '700', color: T.ink },
  body: { fontSize: 12, color: T.mute, marginTop: 2 },
  time: { fontSize: 10, color: T.muteSoft, marginTop: 6 },
});
