import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useKeyboardFocusScroll } from '@/hooks/use-keyboard-focus-scroll';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/state/app-store';
import { notify } from '@/utils/dialog';

/** 家族を新しく作る or 招待コードで参加する */
export default function OnboardingScreen() {
  const t = useTheme();
  const { repo, reload } = useApp();
  const [displayName, setDisplayName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const kb = useKeyboardFocusScroll();

  const run = async (fn: () => Promise<void>) => {
    if (!displayName.trim()) return notify('あなたの表示名を入力してください');
    setBusy(true);
    try {
      await fn();
      await reload();
    } catch (e) {
      notify('エラー', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const input = [styles.input, { color: t.text, backgroundColor: t.backgroundElement }];
  return (
    // 入力欄にフォーカスしたら、キーボードの上（画面の上のほう）へスクロールする
    <ScrollView
      ref={kb.scrollRef}
      style={{ backgroundColor: t.background }}
      contentContainerStyle={[styles.root, { paddingBottom: 24 + kb.keyboardHeight }]}
      keyboardShouldPersistTaps="handled">
      <Text style={[styles.label, { color: t.textSecondary }]}>あなたの表示名</Text>
      <TextInput {...kb.field('name')} onFocus={kb.focus('name')} value={displayName} onChangeText={setDisplayName} placeholder="例：パパ、ゆうこ" placeholderTextColor={t.textMuted} style={input} />

      <View style={[styles.card, { borderColor: t.border }]} {...kb.field('create')}>
        <Text style={[styles.cardTitle, { color: t.text }]}>家族を新しく作る</Text>
        <TextInput onFocus={kb.focus('create')} value={familyName} onChangeText={setFamilyName} placeholder="家族の名前（例：田中家）" placeholderTextColor={t.textMuted} style={input} />
        <Pressable
          disabled={busy}
          onPress={() => run(() => repo.createFamily(familyName.trim() || 'わが家', displayName.trim()))}
          style={[styles.primary, { backgroundColor: t.accent }]}>
          <Text style={styles.primaryText}>作成する</Text>
        </Pressable>
      </View>

      <View style={[styles.card, { borderColor: t.border }]} {...kb.field('join')}>
        <Text style={[styles.cardTitle, { color: t.text }]}>招待コードで参加する</Text>
        <TextInput onFocus={kb.focus('join')} value={code} onChangeText={setCode} placeholder="8桁の招待コード" placeholderTextColor={t.textMuted} autoCapitalize="characters" style={input} />
        <Pressable
          disabled={busy || !code.trim()}
          onPress={() => run(() => repo.joinFamily(code.trim(), displayName.trim()))}
          style={[styles.primary, { backgroundColor: t.accent, opacity: code.trim() ? 1 : 0.5 }]}>
          <Text style={styles.primaryText}>参加する</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { padding: 20, gap: 12 },
  label: { fontSize: 12 },
  input: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  card: { borderWidth: 1, borderRadius: 14, padding: 16, gap: 10, marginTop: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  primary: { borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
