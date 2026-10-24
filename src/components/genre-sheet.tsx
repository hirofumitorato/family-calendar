import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGenres } from '@/hooks/use-genres';
import { useTheme } from '@/hooks/use-theme';
import type { Genre } from '@/lib/types';
import { confirm, notify } from '@/utils/dialog';

type Editing = { genre: Genre | null; name: string } | null;

/** テンプレートのジャンルを追加・名前変更・削除するシート。入力中は画面の上に編集欄を出す */
export function GenreSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { genres, create, rename, remove } = useGenres();
  const [editing, setEditing] = useState<Editing>(null);
  const [busy, setBusy] = useState(false);

  const close = () => {
    setEditing(null);
    onClose();
  };

  const save = async () => {
    if (!editing) return;
    const name = editing.name.trim();
    if (!name) return notify('ジャンル名を入力してください');
    if (genres.some((g) => g.name === name && g.id !== editing.genre?.id)) {
      return notify('同じ名前のジャンルがあります');
    }
    setBusy(true);
    try {
      if (editing.genre) await rename(editing.genre, name);
      else await create(name);
      setEditing(null);
    } catch (e) {
      notify('保存できませんでした', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const del = async (g: Genre) => {
    const ok = await confirm(`ジャンル「${g.name}」を削除しますか？`, {
      message: 'このジャンルのテンプレートは「未分類」になります（テンプレートは消えません）',
      okText: '削除',
      destructive: true,
    });
    if (!ok) return;
    await remove(g);
    setEditing(null);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      {editing ? (
        <View style={styles.topWrap}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setEditing(null)} accessibilityLabel="編集をやめる" />
          <View style={[styles.topSheet, { backgroundColor: t.background, paddingTop: insets.top + 12 }]}>
            <Text style={[styles.title, { color: t.text }]}>{editing.genre ? 'ジャンル名を変更' : 'ジャンルを追加'}</Text>
            <TextInput
              value={editing.name}
              onChangeText={(name) => setEditing({ ...editing, name })}
              placeholder="例：習い事、家事、病院"
              placeholderTextColor={t.textMuted}
              autoFocus
              accessibilityLabel="ジャンル名"
              style={[styles.input, { color: t.text, backgroundColor: t.backgroundElement }]}
            />
            <View style={styles.actions}>
              {editing.genre && (
                <Pressable onPress={() => del(editing.genre!)} disabled={busy} style={styles.actionBtn} accessibilityLabel="このジャンルを削除">
                  <Text style={{ color: t.sunday, fontWeight: '600' }}>削除</Text>
                </Pressable>
              )}
              <View style={{ flex: 1 }} />
              <Pressable onPress={() => setEditing(null)} disabled={busy} style={styles.actionBtn}>
                <Text style={{ color: t.textSecondary }}>キャンセル</Text>
              </Pressable>
              <Pressable
                onPress={save}
                disabled={busy}
                accessibilityLabel="ジャンルを保存"
                style={[styles.saveBtn, { backgroundColor: t.accent, opacity: busy ? 0.6 : 1 }]}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>保存</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : (
        <>
          <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="閉じる" />
          <View style={[styles.sheet, { backgroundColor: t.background }]}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: t.text }]}>ジャンル</Text>
              <Pressable onPress={close} hitSlop={10} accessibilityLabel="ジャンルの編集を完了">
                <Text style={{ color: t.accent, fontSize: 16, fontWeight: '700' }}>完了</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 32, gap: 8 }}>
              {genres.map((g) => (
                <Pressable
                  key={g.id}
                  accessibilityLabel={`ジャンル ${g.name} を編集`}
                  onPress={() => setEditing({ genre: g, name: g.name })}
                  style={({ pressed }) => [styles.row, { backgroundColor: pressed ? t.selected : t.backgroundElement }]}>
                  <Text style={{ color: t.text, fontSize: 16, flex: 1 }}>{g.name}</Text>
                  <Text style={{ color: t.textSecondary }}>編集 ›</Text>
                </Pressable>
              ))}
              <Pressable
                onPress={() => setEditing({ genre: null, name: '' })}
                accessibilityLabel="ジャンルを追加"
                style={[styles.addRow, { borderColor: t.border }]}>
                <Text style={{ color: t.accent, fontSize: 15, fontWeight: '600' }}>＋ ジャンルを追加</Text>
              </Pressable>
            </ScrollView>
          </View>
        </>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: { maxHeight: '70%', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 14 },
  addRow: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, padding: 14, alignItems: 'center' },
  topWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  topSheet: { borderBottomLeftRadius: 16, borderBottomRightRadius: 16, paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  input: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 8 },
  saveBtn: { borderRadius: 10, paddingHorizontal: 18, paddingVertical: 9 },
});
