import { View, Text, ScrollView, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Btn, Card, Pill, SectionLabel } from '../components';
import { T } from '../theme';

const fmt = (d: string | Date) =>
  new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });

export default function TaskGroupDetailScreen({ route }: any) {
  const id: string = route.params.id;
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['tg', id], queryFn: () => api.get(`/api/task-groups/${id}`) });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['tg'] });
    qc.invalidateQueries({ queryKey: ['tg', id] });
  };
  const suspend = useMutation({ mutationFn: (assignmentId: string) => api.post(`/api/assignments/${assignmentId}/suspend`), onSuccess: refresh });
  const activate = useMutation({ mutationFn: (assignmentId: string) => api.post(`/api/assignments/${assignmentId}/activate`), onSuccess: refresh });
  const remove = useMutation({ mutationFn: (assignmentId: string) => api.del(`/api/assignments/${assignmentId}`), onSuccess: refresh });
  const g = q.data;

  if (!g) {
    return (
      <View style={{ flex: 1, backgroundColor: T.bg, padding: 16 }}>
        <Text style={{ color: T.mute }}>Yükleniyor…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={s.page} contentContainerStyle={{ padding: 16 }}>
      <SectionLabel>Görev grubu</SectionLabel>
      <Text style={s.title}>{g.name}</Text>
      {g.description ? <Text style={s.desc}>{g.description}</Text> : null}

      <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
        {g.recurrence && <Pill tone={{ bg: T.accentSoft, fg: T.accent }}>{g.recurrence}</Pill>}
        {g.requiresApproval && <Pill tone={{ bg: T.warnSoft, fg: T.warn }}>Onay</Pill>}
        {g.minFiles > 0 && <Pill>min {g.minFiles} dosya</Pill>}
      </View>

      <SectionLabel style={{ marginTop: 20 }}>Görevler ({g.tasks.length})</SectionLabel>
      <Card>
        {g.tasks.map((t: any, i: number) => (
          <View key={t.id} style={s.row}>
            <Text style={s.idx}>{i + 1}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.rowTitle}>{t.name}</Text>
              <View style={{ flexDirection: 'row', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                <Pill>{t.estimatedMinutes} dk</Pill>
                {t.minFiles > 0 && <Pill>≥{t.minFiles}</Pill>}
                {t.requiresApproval && <Pill tone={{ bg: T.warnSoft, fg: T.warn }}>onay</Pill>}
                {t.questionGroup && <Pill tone={{ bg: T.accentSoft, fg: T.accent }}>{t.questionGroup.name}</Pill>}
              </View>
            </View>
          </View>
        ))}
      </Card>

      <SectionLabel style={{ marginTop: 20 }}>Atamalar</SectionLabel>
      <Card>
        {g.assignments.length === 0 && (
          <Text style={{ color: T.mute, fontSize: 13 }}>Henüz atama yok.</Text>
        )}
        {g.assignments.map((a: any) => (
          <View key={a.id} style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={s.rowTitle}>{a.team.name}</Text>
              <Text style={{ fontSize: 11, color: T.mute }}>
                {fmt(a.startsAt)} → {fmt(a.endsAt)}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <Pill tone={a.status === 'ACTIVE' ? { bg: T.accentSoft, fg: T.accent } : a.status === 'SUSPENDED' ? { bg: T.warnSoft, fg: T.warn } : undefined}>
                {a.status}
              </Pill>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {a.status !== 'SUSPENDED' ? (
                  <Btn variant="ghost" onPress={() => suspend.mutate(a.id)} style={{ paddingVertical: 6, paddingHorizontal: 10 }}>Askıya al</Btn>
                ) : (
                  <Btn variant="ghost" onPress={() => activate.mutate(a.id)} style={{ paddingVertical: 6, paddingHorizontal: 10 }}>Aktif et</Btn>
                )}
                <Btn
                  variant="danger"
                  onPress={() => Alert.alert('Atamayı sil', 'Bu atama ve oluşturduğu run kayıtları silinecek.', [
                    { text: 'İptal', style: 'cancel' },
                    { text: 'Sil', style: 'destructive', onPress: () => remove.mutate(a.id) },
                  ])}
                  style={{ paddingVertical: 6, paddingHorizontal: 10 }}
                >
                  Sil
                </Btn>
              </View>
            </View>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: T.bg },
  title: { fontSize: 26, fontWeight: '700', color: T.ink, fontStyle: 'italic' },
  desc: { fontSize: 13, color: T.mute, marginTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopColor: T.line, borderTopWidth: 1 },
  idx: { fontSize: 11, color: T.muteSoft, width: 20, fontWeight: '700' },
  rowTitle: { fontSize: 14, fontWeight: '600', color: T.ink },
});
