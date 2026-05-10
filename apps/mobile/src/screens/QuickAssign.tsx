import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Btn, Card, SectionLabel } from '../components';
import { T } from '../theme';

const WHENS = [
  ['NOW', 'Şimdi'],
  ['TODAY', 'Bugün'],
  ['TOMORROW', 'Yarın'],
] as const;

export default function QuickAssignScreen({ navigation }: any) {
  const qc = useQueryClient();
  const [groupId, setGroupId] = useState<string | null>(null);
  const [targetMode, setTargetMode] = useState<'TEAM' | 'USER'>('TEAM');
  const [teamId, setTeamId] = useState<string | null>(null);
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [when, setWhen] = useState<'NOW' | 'TODAY' | 'TOMORROW'>('TODAY');
  const [executionMode, setExecutionMode] = useState<'REPRESENTATIVE' | 'INDIVIDUAL'>('REPRESENTATIVE');

  const groupsQ = useQuery({ queryKey: ['tg'], queryFn: () => api.get('/api/task-groups') });
  const teamsQ = useQuery({ queryKey: ['teams'], queryFn: () => api.get('/api/teams') });
  const team = (teamsQ.data || []).find((item: any) => item.id === teamId);
  const users = Array.from(
    new Map(
      (teamsQ.data || [])
        .flatMap((teamItem: any) => teamItem.members.map((member: any) => ({ ...member, teamName: teamItem.name, teamId: teamItem.id })))
        .map((member: any) => [member.userId, member]),
    ).values(),
  );

  const create = useMutation({
    mutationFn: () =>
      api.post('/api/assignments/quick', {
        groupId,
        target: targetMode === 'USER' ? { kind: 'USER', id: assigneeId } : { kind: 'TEAM', id: teamId },
        when,
        executionMode: targetMode === 'USER' ? undefined : executionMode,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['runs'] });
      Alert.alert('Atandı', 'Atama oluşturuldu.', [{ text: 'Tamam', onPress: () => navigation.goBack() }]);
    },
    onError: (e: any) => Alert.alert('Hata', e.message),
  });

  return (
    <ScrollView style={s.page} contentContainerStyle={{ padding: 16 }}>
      <SectionLabel>1. Görev grubu</SectionLabel>
      <Card>
        {(groupsQ.data || []).map((g: any) => (
          <TouchableOpacity
            key={g.id}
            style={[s.row, groupId === g.id && s.rowActive]}
            onPress={() => setGroupId(g.id)}
          >
            <Text style={s.rowText}>{g.name}</Text>
            {g.recurrence ? <Text style={s.rowMeta}>{g.recurrence}</Text> : null}
          </TouchableOpacity>
        ))}
      </Card>

      <SectionLabel style={{ marginTop: 20 }}>2. Hedef tipi</SectionLabel>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity style={[s.chip, targetMode === 'TEAM' && s.chipActive]} onPress={() => { setTargetMode('TEAM'); setAssigneeId(null); }}>
          <Text style={[s.chipText, targetMode === 'TEAM' && s.chipTextActive]}>Takım</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.chip, targetMode === 'USER' && s.chipActive]} onPress={() => { setTargetMode('USER'); setTeamId(null); }}>
          <Text style={[s.chipText, targetMode === 'USER' && s.chipTextActive]}>Kişi</Text>
        </TouchableOpacity>
      </View>

      {targetMode === 'TEAM' ? (
        <>
          <SectionLabel style={{ marginTop: 20 }}>3. Hedef takım</SectionLabel>
          <Card>
            {(teamsQ.data || []).map((t: any) => (
              <TouchableOpacity
                key={t.id}
                style={[s.row, teamId === t.id && s.rowActive]}
                onPress={() => { setTeamId(t.id); setAssigneeId(null); }}
              >
                <Text style={s.rowText}>{t.name}</Text>
                <Text style={s.rowMeta}>{t.members.length} üye</Text>
              </TouchableOpacity>
            ))}
          </Card>
        </>
      ) : (
        <>
          <SectionLabel style={{ marginTop: 20 }}>3. Kişi seçimi</SectionLabel>
          <Card>
            {users.map((member: any) => (
              <TouchableOpacity
                key={member.userId}
                style={[s.row, assigneeId === member.userId && s.rowActive]}
                onPress={() => setAssigneeId(member.userId)}
              >
                <Text style={s.rowText}>{member.user.displayName}</Text>
                <Text style={s.rowMeta}>{member.teamName}</Text>
              </TouchableOpacity>
            ))}
          </Card>
        </>
      )}

      {targetMode === 'TEAM' && team && (
        <>
          <SectionLabel style={{ marginTop: 20 }}>4. Takım modu</SectionLabel>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={[s.chip, executionMode === 'REPRESENTATIVE' && s.chipActive]}
              onPress={() => setExecutionMode('REPRESENTATIVE')}
            >
              <Text style={[s.chipText, executionMode === 'REPRESENTATIVE' && s.chipTextActive]}>Bir kişi yeterli</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.chip, executionMode === 'INDIVIDUAL' && s.chipActive]}
              onPress={() => setExecutionMode('INDIVIDUAL')}
            >
              <Text style={[s.chipText, executionMode === 'INDIVIDUAL' && s.chipTextActive]}>Herkes bağımsız</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <SectionLabel style={{ marginTop: 20 }}>{targetMode === 'TEAM' && team ? '5. Ne zaman' : '4. Ne zaman'}</SectionLabel>
      <View style={{ flexDirection: 'row', gap: 8 }}>
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

      <Btn
        variant="accent"
        style={{ marginTop: 24 }}
        disabled={!groupId || (targetMode === 'TEAM' ? !teamId : !assigneeId) || create.isPending}
        onPress={() => create.mutate()}
      >
        {create.isPending ? 'Atama oluşturuluyor…' : 'Atamayı oluştur'}
      </Btn>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: T.bg },
  row: { paddingVertical: 12, borderTopColor: T.line, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowActive: { backgroundColor: T.accentSoft },
  rowText: { fontSize: 14, color: T.ink, fontWeight: '600' },
  rowMeta: { fontSize: 11, color: T.mute },
  chip: { paddingVertical: 10, paddingHorizontal: 14, borderColor: T.line, borderWidth: 1, borderRadius: 999, backgroundColor: T.surface },
  chipActive: { backgroundColor: T.ink, borderColor: T.ink },
  chipText: { fontWeight: '700', color: T.mute },
  chipTextActive: { color: '#fff' },
});
