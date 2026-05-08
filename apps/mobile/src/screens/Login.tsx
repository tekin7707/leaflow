import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../auth';
import { Btn, Card } from '../components';
import { T } from '../theme';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@provit.test');
  const [password, setPassword] = useState('demo');
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      await login(email, password);
    } catch (e) {
      setErr(e.message || 'Giriş başarısız');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={s.page}
    >
      <Card style={s.card}>
        <Text style={s.title}>Provit</Text>
        <Text style={s.subtitle}>Görev — atama — ispat — onay</Text>

        <Text style={s.label}>E-posta</Text>
        <TextInput style={s.input} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />

        <Text style={s.label}>Parola</Text>
        <TextInput style={s.input} secureTextEntry value={password} onChangeText={setPassword} />

        {err ? <Text style={s.err}>{err}</Text> : null}

        <Btn variant="accent" onPress={submit} disabled={busy} style={{ marginTop: 12 }}>
          {busy ? 'Giriş yapılıyor…' : 'Giriş yap'}
        </Btn>

        <View style={s.hint}>
          <Text style={s.hintTitle}>TEST HESAPLARI</Text>
          <Text style={s.hintLine}>admin@provit.test — herhangi bir parola</Text>
          <Text style={s.hintLine}>mehmet@provit.test — Bahçeşehir member</Text>
        </View>
      </Card>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: T.bg, justifyContent: 'center', padding: 20 },
  card: { padding: 24 },
  title: { fontSize: 36, fontStyle: 'italic', marginBottom: 4, color: T.ink },
  subtitle: { color: T.mute, marginBottom: 24 },
  label: { fontSize: 10, color: T.muteSoft, textTransform: 'uppercase', letterSpacing: 1.2, marginTop: 12, marginBottom: 4 },
  input: { borderColor: T.line, borderWidth: 1, borderRadius: T.radiusSm, padding: 10, fontSize: 14, color: T.ink },
  err: { color: T.danger, fontSize: 12, marginTop: 8 },
  hint: { marginTop: 20, padding: 12, backgroundColor: T.surfaceAlt, borderRadius: T.radiusSm },
  hintTitle: { fontSize: 10, color: T.muteSoft, fontWeight: '700', letterSpacing: 1.2, marginBottom: 6 },
  hintLine: { fontSize: 12, color: T.mute },
});
