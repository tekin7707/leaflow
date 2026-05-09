import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Image, TextInput, Modal, Dimensions, ActionSheetIOS, Platform,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { api, filoadUpload, filoadDataUri } from '../api';
import { useAuth } from '../auth';
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
  const { user } = useAuth();
  const [step, setStep] = useState<'overview' | 'photos' | 'checklist' | 'done'>('overview');
  const [answers, setAnswers] = useState<Record<string, { value: string; note?: string }>>({});
  const [note, setNote] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState<{ uri: string; filename?: string } | null>(null);

  useEffect(() => {
    if (tr?.answers) {
      const init: Record<string, { value: string; note?: string }> = {};
      for (const a of tr.answers) init[a.questionId] = { value: a.value, note: a.note ?? undefined };
      setAnswers(init);
    }
    if (tr) setNote(tr.note ?? '');
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

  const saveNote = useMutation({
    mutationFn: (value: string) =>
      api(`/api/task-runs/${taskRunId}/note`, {
        method: 'PATCH',
        body: { note: value || null },
      }),
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

  const uploadAsset = async (asset: ImagePicker.ImagePickerAsset) => {
    const filename = asset.fileName || `photo-${Date.now()}.jpg`;
    const mime = asset.mimeType || 'image/jpeg';
    const sizeBytes = asset.fileSize || 0;

    const uploaded = await filoadUpload(asset.uri, filename, mime);
    await api.post(`/api/task-runs/${taskRunId}/proof`, {
      key: uploaded.path,
      filename: uploaded.filename,
      mime,
      sizeBytes,
    });
    qc.invalidateQueries({ queryKey: ['taskRun', taskRunId] });
  };

  const fromLibrary = async () => {
    setBusy(true);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('İzin gerekli', 'Galeri erişimi reddedildi.');
        return;
      }
      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });
      if (r.canceled) return;
      await uploadAsset(r.assets[0]);
    } catch (e: any) {
      Alert.alert('Yükleme hatası', e.message);
    } finally {
      setBusy(false);
    }
  };

  const fromCamera = async () => {
    setBusy(true);
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('İzin gerekli', 'Kamera erişimi reddedildi.');
        return;
      }
      const r = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: false,
      });
      if (r.canceled) return;
      await uploadAsset(r.assets[0]);
    } catch (e: any) {
      Alert.alert('Yükleme hatası', e.message);
    } finally {
      setBusy(false);
    }
  };

  const pickAndUpload = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['İptal', 'Fotoğraf çek', 'Galeriden seç'],
          cancelButtonIndex: 0,
        },
        (i) => {
          if (i === 1) fromCamera();
          if (i === 2) fromLibrary();
        },
      );
    } else {
      Alert.alert('Foto ekle', undefined, [
        { text: 'İptal', style: 'cancel' },
        { text: 'Fotoğraf çek', onPress: fromCamera },
        { text: 'Galeriden seç', onPress: fromLibrary },
      ]);
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
  const minFiles = Math.max(
    tr.task.minFiles || 0,
    tr.run?.assignment?.group?.minFiles || 0,
  );
  const questions = tr.task.questionGroup?.questions || [];
  const requiredQs = questions.filter((q: any) => q.required);
  const allAnswered = requiredQs.every((q: any) => answers[q.id]?.value);
  // Read-only when the viewer isn't the assignee, or the run is past the
  // working stage. Managers viewing someone else's task land here too.
  const isAssignee = !!user?.id && tr.assigneeId === user.id;
  const isFinal = ['AWAITING_APPROVAL', 'APPROVED', 'DONE', 'REJECTED'].includes(tr.status);
  const readOnly = !isAssignee || isFinal;
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

        {!readOnly && (tr.status === 'PENDING' || tr.status === 'REJECTED') && (
          <Btn variant="accent" style={{ marginTop: 12 }} onPress={() => start.mutate()}>
            {start.isPending ? 'Başlatılıyor…' : 'Görevi başlat'}
          </Btn>
        )}
        {readOnly && (
          <View style={s.warn}>
            <Text style={s.warnText}>
              {isAssignee ? 'Bu görev artık düzenlenemez.' : 'Sadece görüntüleme — bu görev sana atanmamış.'}
            </Text>
          </View>
        )}
      </Card>

      <SectionLabel style={{ marginTop: 20 }}>Açıklama</SectionLabel>
      <Card>
        <TextInput
          style={s.note}
          value={note}
          onChangeText={setNote}
          onBlur={() => { if (!readOnly && (tr.note ?? '') !== note) saveNote.mutate(note); }}
          placeholder={readOnly ? 'Açıklama girilmedi.' : 'Bu görev için serbest açıklama (opsiyonel)…'}
          multiline
          editable={!readOnly}
        />
      </Card>

      <SectionLabel style={{ marginTop: 20 }}>Foto kanıtlar ({proofs.length}/{minFiles})</SectionLabel>
      <Card>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {proofs.map((p: any) => (
            <ProofThumb
              key={p.id}
              proof={p}
              onPress={(uri) => setZoom({ uri, filename: p.filename })}
            />
          ))}
        </View>
        {!readOnly && (
          <Btn variant="ghost" style={{ marginTop: 12 }} onPress={pickAndUpload} disabled={busy || tr.status === 'BLOCKED'}>
            {busy ? 'Yükleniyor…' : '+ Foto ekle'}
          </Btn>
        )}
        {readOnly && proofs.length === 0 && (
          <Text style={{ color: T.muteSoft, fontSize: 12, marginTop: 8 }}>Foto eklenmedi.</Text>
        )}
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
                  disabled={readOnly}
                  onChange={(value, note) => {
                    if (readOnly) return;
                    setAnswers((a) => ({ ...a, [q.id]: { value, note } }));
                    if (value) saveAnswer.mutate({ questionId: q.id, value, note });
                  }}
                />
              </View>
            ))}
          </Card>
        </>
      )}

      {!readOnly && (
        <Btn
          variant="accent"
          style={{ marginTop: 20 }}
          disabled={!canComplete || complete.isPending}
          onPress={() => complete.mutate()}
        >
          {complete.isPending ? 'Gönderiliyor…' : 'Görevi tamamla'}
        </Btn>
      )}
      {!readOnly && !canComplete && tr.status !== 'BLOCKED' && tr.status !== 'AWAITING_APPROVAL' && (
        <Text style={s.hint}>
          {proofs.length < minFiles ? `${minFiles - proofs.length} foto daha gerekli. ` : ''}
          {!allAnswered ? 'Tüm zorunlu soruları cevapla.' : ''}
        </Text>
      )}

      <Modal visible={!!zoom} transparent animationType="fade" onRequestClose={() => setZoom(null)}>
        <TouchableOpacity activeOpacity={1} style={s.zoomBackdrop} onPress={() => setZoom(null)}>
          {zoom && (
            <>
              <Image source={{ uri: zoom.uri }} style={s.zoomImage} resizeMode="contain" />
              {zoom.filename ? <Text style={s.zoomCaption}>{zoom.filename}</Text> : null}
              <Text style={s.zoomHint}>Kapatmak için dokunun</Text>
            </>
          )}
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

function ProofThumb({ proof, onPress }: { proof: any; onPress?: (uri: string) => void }) {
  const [uri, setUri] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    if (!proof?.key || !(proof?.mime ?? '').startsWith('image/')) return;
    filoadDataUri(proof.key, proof.mime || 'image/jpeg')
      .then((u) => { if (alive) setUri(u); })
      .catch(() => { if (alive) setUri(null); });
    return () => { alive = false; };
  }, [proof?.key]);

  if (uri) {
    return (
      <TouchableOpacity onPress={() => onPress?.(uri)} activeOpacity={0.85}>
        <Image source={{ uri }} style={s.thumb} />
      </TouchableOpacity>
    );
  }
  return (
    <View style={s.thumb}>
      <Text style={{ fontSize: 9, color: T.muteSoft, padding: 4, textAlign: 'center' }}>
        {proof.filename}
      </Text>
    </View>
  );
}

function QuestionInput({ question, value, note, onChange, disabled }: {
  question: any;
  value?: string;
  note?: string;
  disabled?: boolean;
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
            disabled={disabled}
            style={[qs.opt, value === v && qs.optActive, disabled && { opacity: 0.6 }]}
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
        editable={!disabled}
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
      editable={!disabled}
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
  note: { borderColor: T.line, borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 13, color: T.ink, minHeight: 80, textAlignVertical: 'top' },
  zoomBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  zoomImage: { width: Dimensions.get('window').width, height: Dimensions.get('window').height * 0.75 },
  zoomCaption: { color: '#fff', fontSize: 12, marginTop: 12, textAlign: 'center' },
  zoomHint: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 8 },
});
