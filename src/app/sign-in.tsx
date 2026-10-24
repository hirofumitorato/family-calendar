import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import { notify } from '@/utils/dialog';

export default function SignInScreen() {
  const t = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (mode: 'signIn' | 'signUp') => {
    if (!supabase) return;
    setBusy(true);
    const { error } =
      mode === 'signIn'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (error) notify('エラー', error.message);
    else if (mode === 'signUp') notify('確認メールを送りました', 'メール内のリンクを開いてからログインしてください');
  };

  const input = [styles.input, { color: t.text, backgroundColor: t.backgroundElement }];
  return (
    <View style={[styles.root, { backgroundColor: t.background }]}>
      <Text style={[styles.title, { color: t.text }]}>👪 かぞくカレンダー</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="メールアドレス"
        placeholderTextColor={t.textMuted}
        autoCapitalize="none"
        keyboardType="email-address"
        style={input}
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="パスワード（6文字以上）"
        placeholderTextColor={t.textMuted}
        secureTextEntry
        style={input}
      />
      <Pressable disabled={busy} onPress={() => run('signIn')} style={[styles.primary, { backgroundColor: t.accent }]}>
        <Text style={styles.primaryText}>ログイン</Text>
      </Pressable>
      <Pressable disabled={busy} onPress={() => run('signUp')} style={styles.secondary}>
        <Text style={{ color: t.accent }}>はじめての方は新規登録</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // 入力欄がキーボードと重ならないよう、中央ではなく画面の上のほうに置く
  root: { flex: 1, padding: 24, paddingTop: 72, gap: 12 },
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 16 },
  input: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  primary: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondary: { alignItems: 'center', paddingVertical: 12 },
});
