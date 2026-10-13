import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/state/app-store';

/** 家族を新しく作る or 招待コードで参加する */
export default function OnboardingScreen() {
  const t = useTheme();
  const { repo, reload } = useApp();
  const [displayName, setDisplayName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    if (!displayName.trim()) return Alert.alert('あなたの表示名を入力してください');
    setBusy(true);
    try {
      await fn();
      await reload();
    } catch (e) {
      Alert.alert('エラー', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const input = [styles.input, { color: t.text, backgroundColor: t.backgroundElement }];
  return (
    <View style={[styles.root, { backgroundColor: t.background }]}>
      <Text style={[styles.label, { color: t.textSecondary }]}>あなたの表示名</Text>
      <TextInput value={displayName} onChangeText={setDisplayName} placeholder="例：パパ、ゆうこ" placeholderTextColor={t.textMuted} style={input} />

      <View style={[styles.card, { borderColor: t.border }]}>
        <Text style={[styles.cardTitle, { color: t.text }]}>家族を新しく作る</Text>
        <TextInput value={familyName} onChangeText={setFamilyName} placeholder="家族の名前（例：田中家）" placeholderTextColor={t.textMuted} style={input} />
        <Pressable
          disabled={busy}
          onPress={() => run(() => repo.createFamily(familyName.trim() || 'わが家', displayName.trim()))}
          style={[styles.primary, { backgroundColor: t.accent }]}>
          <Text style={styles.primaryText}>作成する</Text>
        </Pressable>
      </View>

      <View style={[styles.card, { borderColor: t.border }]}>
        <Text style={[styles.cardTitle, { color: t.text }]}>招待コードで参加する</Text>
        <TextInput value={code} onChangeText={setCode} placeholder="8桁の招待コード" placeholderTextColor={t.textMuted} autoCapitalize="characters" style={input} />
        <Pressable
          disabled={busy || !code.trim()}
          onPress={() => run(() => repo.joinFamily(code.trim(), displayName.trim()))}
          style={[styles.primary, { backgroundColor: t.accent, opacity: code.trim() ? 1 : 0.5 }]}>
          <Text style={styles.primaryText}>参加する</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 20, gap: 12 },
  label: { fontSize: 12 },
  input: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  card: { borderWidth: 1, borderRadius: 14, padding: 16, gap: 10, marginTop: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  primary: { borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
