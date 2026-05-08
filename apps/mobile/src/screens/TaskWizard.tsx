import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Image, TextInput,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { api, uploadBinary } from '../api';
import { Card, Btn, Pill, StatusPill, SectionLabel } from '../components';
import { T } from '../theme';

export default function TaskWizardScreen({ route, navigation }: any) {
  const taskRunId: string = route.params.taskRunId;
  const qc = useQueryClient();

  const trQ = useQuery({
    queryKey: ['taskRun', taskRunId],
    queryFn: () => api.get(`/api/task-runs/${taskRunId}`),
  });

  const tr = trQ.data;
  const [step, setStep] = useState<'overview' | 'photos' | 'checklist' | 'done'>('overview');
  const [answers, setAnswers] = useState<Record<string, { value: string; note?: string }>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (tr?.answers) {
      const init: Record<string, { value: string; note?: string }> = {};
      for (const a of tr.answers) init[a.questionId] = { value: a.value, note: a.note ?? undefined };
      setAnswers(init);
    }
  }, [tr?.id]);

  const start = useMutation({
    mutationFn: () => api.post(`/api/task-runs/${taskRunId}/start`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['taskRun', taskRunId] });
      qc.invalidateQueries({ queryKey: ['runs'] });
    },
  });

  const saveAnswer = useMutation({
    mutationFn: (input: { questionId: string; value: string; note?: string }) =>
      api.post(`/api/task-runs/${taskRunId}/answer`, input),
  });

  const complete = useMutation({
    mutationFn: () => api.post(`/api/task-runs/${taskRunId}/complete`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['taskRun', taskRunId] });
      qc.invalidateQueries({ queryKey: ['runs'] });
      qc.invalidateQueries({ queryKey: ['approvals'] });
      Alert.alert('Tamamlandı', 'Görev gönderildi.', [
        { text: 'Tamam', onPress: () => navigation.goBack() },
      ]);
    },
    onError: (e: any) => Alert.alert('Hata', e.message),
  });

  const pickAndUpload = async () => {
    setBusy(true);
    try {
      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });
      if (r.canceled) return;
      const asset = r.assets[0];

      const filename = asset.fileName || `photo-${Date.now()}.jpg`;
      const mime = asset.mimeType || 'image/jpeg';
      const sizeBytes = asset.fileSize || 0;

      const presigned = await api.post('/api/files/upload-url', { filename, mime, sizeBytes });
      const blob = await fetch(asset.uri).then((x) => x.blob());
      await uploadBinary(presigned.uploadUrl, blob, presigned.headers);
      await api.post(`/api/task-runs/${taskRunId}/proof`, {
        key: presigned.key,
        filename,
        mime,
        sizeBytes,
      });
      qc.invalidateQueries({ queryKey: ['taskRun', taskRunId] });
    } catch (e: any) {
      Alert.alert('Yükleme hatası', e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!tr) {
    return (
      <View style={{ flex: 1, backgroundColor: T.bg, padding: 16 }}>
        <Text style={{ color: T.mute }}>Yükleniyor…</Text>
      </View>
    );
  }

  const proofs = tr.proofs || [];
  const minFiles = tr.task.minFiles || 0;
  const questions = tr.task.questionGroup?.questions || [];
  const requiredQs = questions.filter((q: any) => q.required);
  const allAnswered = requiredQs.every((q: any) => answers[q.id]?.value);
  const canComplete = proofs.length >= minFiles && allAnswered && tr.status !== 'BLOCKED' && tr.status !== 'AWAITING_APPROVAL';

  return (
    <ScrollView style={s.page} contentContainerStyle={{ padding: 16 }}>
      <Card>
        <SectionLabel>{tr.run.assignment.group.name}</SectionLabel>
        <Text style={s.title}>{tr.task.name}</Text>
        {tr.task.description ? <Text style={s.desc}>{tr.task.description}</Text> : null}

        <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          <StatusPill status={tr.status} />
          <Pill>{tr.task.estimatedMinutes} dk</Pill>
          {minFiles > 0 && <Pill>≥{minFiles} foto</Pill>}
          {tr.task.requiresApproval && <Pill tone={{ bg: T.warnSoft, fg: T.warn }}>Onay gerekir</Pill>}
        </View>

        {tr.status === 'BLOCKED' && (
          <View style={s.warn}>
            <Text style={s.warnText}>Bu görev önceki görevlerin tamamlanmasını bekliyor.</Text>
          </View>
        )}

        {(tr.status === 'PENDING' || tr.status === 'REJECTED') && (
          <Btn variant="accent" style={{ marginTop: 12 }} onPress={() => start.mutate()}>
            {start.isPending ? 'Başlatılıyor…' : 'Görevi başlat'}
          </Btn>
        )}
      </Card>

      <SectionLabel style={{ marginTop: 20 }}>Foto kanıtlar ({proofs.length}/{minFiles})</SectionLabel>
      <Card>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {proofs.map((p: any) => (
            <View key={p.id} style={s.thumb}>
              <Text style={{ fontSize: 9, color: T.muteSoft, padding: 4, textAlign: 'center' }}>
                {p.filename}
              </Text>
            </View>
          ))}
        </View>
        <Btn variant="ghost" style={{ marginTop: 12 }} onPress={pickAndUpload} disabled={busy || tr.status === 'BLOCKED'}>
          {busy ? 'Yükleniyor…' : '+ Foto ekle'}
        </Btn>
      </Card>

      {questions.length > 0 && (
        <>
          <SectionLabel style={{ marginTop: 20 }}>Checklist · {tr.task.questionGroup.name}</SectionLabel>
          <Card>
            {questions.map((q: any) => (
              <View key={q.id} style={s.q}>
                <Text style={s.qText}>
                  {q.text} {q.required ? <Text style={{ color: T.danger }}>*</Text> : null}
                </Text>
                <QuestionInput
                  question={q}
                  value={answers[q.id]?.value}
                  note={answers[q.id]?.note}
                  onChange={(value, note) => {
                    setAnswers((a) => ({ ...a, [q.id]: { value, note } }));
                    if (value) saveAnswer.mutate({ questionId: q.id, value, note });
                  }}
                />
              </View>
            ))}
          </Card>
        </>
      )}

      <Btn
        variant="accent"
        style={{ marginTop: 20 }}
        disabled={!canComplete || complete.isPending}
        onPress={() => complete.mutate()}
      >
        {complete.isPending ? 'Gönderiliyor…' : 'Görevi tamamla'}
      </Btn>
      {!canComplete && tr.status !== 'BLOCKED' && tr.status !== 'AWAITING_APPROVAL' && (
        <Text style={s.hint}>
          {proofs.length < minFiles ? `${minFiles - proofs.length} foto daha gerekli. ` : ''}
          {!allAnswered ? 'Tüm zorunlu soruları cevapla.' : ''}
        </Text>
      )}
    </ScrollView>
  );
}

function QuestionInput({ question, value, note, onChange }: {
  question: any;
  value?: string;
  note?: string;
  onChange: (value: string, note?: string) => void;
}) {
  if (question.answerType === 'YES_NO' || question.answerType === 'YES_NO_NA') {
    const opts = question.answerType === 'YES_NO_NA'
      ? [['EVET', 'Evet'], ['HAYIR', 'Hayır'], ['NA', 'N/A']]
      : [['EVET', 'Evet'], ['HAYIR', 'Hayır']];
    return (
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {opts.map(([v, l]) => (
          <TouchableOpacity
            key={v}
            onPress={() => onChange(v, note)}
            style={[qs.opt, value === v && qs.optActive]}
          >
            <Text style={[qs.optText, value === v && qs.optTextActive]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }
  if (question.answerType === 'NUMBER') {
    return (
      <TextInput
        style={qs.input}
        keyboardType="numeric"
        value={value ?? ''}
        onChangeText={(t) => onChange(t)}
        placeholder="Sayı"
      />
    );
  }
  return (
    <TextInput
      style={qs.input}
      value={value ?? ''}
      onChangeText={(t) => onChange(t)}
      placeholder="Yanıt"
      multiline
    />
  );
}

const qs = StyleSheet.create({
  opt: { paddingVertical: 8, paddingHorizontal: 14, borderColor: T.line, borderWidth: 1, borderRadius: 8, backgroundColor: T.surface },
  optActive: { backgroundColor: T.accent, borderColor: T.accent },
  optText: { fontWeight: '700', color: T.mute },
  optTextActive: { color: '#fff' },
  input: { borderColor: T.line, borderWidth: 1, borderRadius: 8, padding: 8, fontSize: 13, color: T.ink },
});

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: T.bg },
  title: { fontSize: 22, fontWeight: '700', marginTop: 4, color: T.ink },
  desc: { fontSize: 13, color: T.mute, marginTop: 6 },
  thumb: { width: 80, height: 80, backgroundColor: T.surfaceAlt, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  warn: { marginTop: 12, padding: 10, backgroundColor: T.warnSoft, borderRadius: 8 },
  warnText: { fontSize: 12, color: T.warn },
  q: { paddingVertical: 10, borderTopColor: T.line, borderTopWidth: 1, gap: 8 },
  qText: { fontSize: 13, color: T.ink },
  hint: { fontSize: 11, color: T.mute, textAlign: 'center', marginTop: 8 },
});
