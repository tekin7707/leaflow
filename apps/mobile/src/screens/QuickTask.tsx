import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, Alert, Switch } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Btn, Card, SectionLabel } from '../components';
import { T } from '../theme';

const RECURRENCES: Array<[string, string]> = [
  ['', 'Tek seferlik'],
  ['DAILY', 'Her gün'],
  ['WEEKLY:1', 'Her pazartesi'],
  ['WEEKLY:1,3,5', 'Pzt/Çar/Cum'],
  ['MONTHLY:1', 'Her ayın 1\'i'],
];

const WHENS: Array<[string, string]> = [
  ['NOW', 'Şimdi'],
  ['TODAY', 'Bugün'],
  ['TOMORROW', 'Yarın'],
];

export default function QuickTaskScreen({ navigation }: any) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [recurrence, setRecurrence] = useState('');
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [minFiles, setMinFiles] = useState(0);
  const [estimatedMinutes, setEstimatedMinutes] = useState(15);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [when, setWhen] = useState<string>('TODAY');

  const teamsQ = useQuery({ queryKey: ['teams'], queryFn: () => api.get('/api/teams') });
  const teams = teamsQ.data || [];
  const team = teams.find((t: any) => t.id === teamId);

  const submit = useMutation({
    mutationFn: () =>
      api.post('/api/quick-task', {
        name,
        description: description || undefined,
        requiresApproval,
        minFiles,
        estimatedMinutes,
        recurrence: recurrence || null,
        teamId: teamId || undefined,
        assigneeId: assigneeId || undefined,
        when,
      }),
    onSuccess: (r: any) => {
      qc.invalidateQueries({ queryKey: ['runs'] });
      qc.invalidateQueries({ queryKey: ['tg'] });
      Alert.alert('Oluşturuldu', teamId ? 'Görev oluşturuldu ve atandı.' : 'Görev oluşturuldu.', [{
        text: 'Tamam',
        onPress: () => {
          if (r?.taskRunId) navigation.replace('TaskWizard', { taskRunId: r.taskRunId });
          else navigation.goBack();
        },
      }]);
    },
    onError: (e: any) => Alert.alert('Hata', e.message),
  });

  return (
    <ScrollView style={s.page} contentContainerStyle={{ padding: 16 }}>
      <SectionLabel>Görev</SectionLabel>
      <Card>
        <Text style={s.label}>AD</Text>
        <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Mağaza temizliği" autoFocus />
        <Text style={s.label}>AÇIKLAMA (opsiyonel)</Text>
        <TextInput style={[s.input, { minHeight: 60 }]} value={description} onChangeText={setDescription} multiline />

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>SÜRE (DK)</Text>
            <TextInput
              style={s.input}
              keyboardType="numeric"
              value={String(estimatedMinutes)}
              onChangeText={(t) => setEstimatedMinutes(Number(t) || 0)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>MIN FOTO</Text>
            <TextInput
              style={s.input}
              keyboardType="numeric"
              value={String(minFiles)}
              onChangeText={(t) => setMinFiles(Number(t) || 0)}
            />
          </View>
        </View>

        <Text style={s.label}>TEKRAR</Text>
        <View style={s.chips}>
          {RECURRENCES.map(([v, l]) => (
            <TouchableOpacity
              key={v}
              style={[s.chip, recurrence === v && s.chipActive]}
              onPress={() => setRecurrence(v)}
            >
              <Text style={[s.chipText, recurrence === v && s.chipTextActive]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
          <Text style={{ fontSize: 13, color: T.ink }}>Tamamlanınca onay gerekli</Text>
          <Switch value={requiresApproval} onValueChange={setRequiresApproval} />
        </View>
      </Card>

      <SectionLabel style={{ marginTop: 20 }}>Atama (opsiyonel)</SectionLabel>
      <Card>
        <Text style={s.label}>TAKIM</Text>
        <View style={s.chips}>
          <TouchableOpacity
            style={[s.chip, !teamId && s.chipActive]}
            onPress={() => { setTeamId(null); setAssigneeId(null); }}
          >
            <Text style={[s.chipText, !teamId && s.chipTextActive]}>Atama yok</Text>
          </TouchableOpacity>
          {teams.map((t: any) => (
            <TouchableOpacity
              key={t.id}
              style={[s.chip, teamId === t.id && s.chipActive]}
              onPress={() => { setTeamId(t.id); setAssigneeId(null); }}
            >
              <Text style={[s.chipText, teamId === t.id && s.chipTextActive]}>{t.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {team && (
          <>
            <Text style={s.label}>KİŞİ (boşsa tüm takım)</Text>
            <View style={s.chips}>
              <TouchableOpacity
                style={[s.chip, !assigneeId && s.chipActive]}
                onPress={() => setAssigneeId(null)}
              >
                <Text style={[s.chipText, !assigneeId && s.chipTextActive]}>Tüm takım</Text>
              </TouchableOpacity>
              {team.members.map((m: any) => (
                <TouchableOpacity
                  key={m.userId}
                  style={[s.chip, assigneeId === m.userId && s.chipActive]}
                  onPress={() => setAssigneeId(m.userId)}
                >
                  <Text style={[s.chipText, assigneeId === m.userId && s.chipTextActive]}>{m.user.displayName}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>NE ZAMAN</Text>
            <View style={s.chips}>
              {WHENS.map(([v, l]) => (
                <TouchableOpacity
                  key={v}
                  style={[s.chip, when === v && s.chipActive]}
                  onPress={() => setWhen(v)}
                >
                  <Text style={[s.chipText, when === v && s.chipTextActive]}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </Card>

      <Btn
        variant="accent"
        style={{ marginTop: 24 }}
        disabled={!name || submit.isPending}
        onPress={() => submit.mutate()}
      >
        {submit.isPending ? 'Oluşturuluyor…' : (teamId ? 'Oluştur + ata' : 'Oluştur')}
      </Btn>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: T.bg },
  label: { fontSize: 10, color: T.muteSoft, fontWeight: '700', letterSpacing: 1.2, marginTop: 10, marginBottom: 6 },
  input: { borderColor: T.line, borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14, color: T.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderColor: T.line, borderWidth: 1, borderRadius: 999, backgroundColor: T.surface },
  chipActive: { backgroundColor: T.ink, borderColor: T.ink },
  chipText: { fontWeight: '600', color: T.mute, fontSize: 12 },
  chipTextActive: { color: '#fff' },
});
