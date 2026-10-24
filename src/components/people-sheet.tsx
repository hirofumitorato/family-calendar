import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ColorPalette } from '@/components/color-palette';
import { PALETTE } from '@/constants/palette';
import { useTheme } from '@/hooks/use-theme';
import type { Person } from '@/lib/types';
import { useApp } from '@/state/app-store';
import { confirm, notify } from '@/utils/dialog';

type Editing = { id: string | null; name: string; color: string } | null;

/**
 * 「誰の予定？」に出る人の追加・編集・削除シート。
 * 予定フォームと設定画面の両方から開く。
 */
export function PeopleSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const t = useTheme();
  const { repo, ctx, reload, bumpRevision } = useApp();
  const people = ctx?.people ?? [];
  const [editing, setEditing] = useState<Editing>(null);
  const [busy, setBusy] = useState(false);
  const insets = useSafeAreaInsets();

  const close = () => {
    setEditing(null);
    onClose();
  };

  const startNew = () => {
    const used = new Set(people.map((p) => p.color));
    // まだ誰も使っていない色を、ピンク・青・緑…の順に提案する
    const suggest = ['#EC4899', '#3B82F6', '#22C55E', '#F97316', '#8B5CF6', '#06B6D4', '#EAB308', ...PALETTE];
    const color = suggest.find((c) => !used.has(c)) ?? PALETTE[0];
    setEditing({ id: null, name: '', color });
  };

  const save = async () => {
    if (!editing || !ctx) return;
    const name = editing.name.trim();
    if (!name) return notify('名前を入力してください');
    setBusy(true);
    try {
      if (editing.id) await repo.updatePerson(editing.id, { name, color: editing.color });
      else await repo.createPerson(ctx.family.id, { name, color: editing.color });
      await reload();
      bumpRevision();
      setEditing(null);
    } catch (e) {
      notify('保存できませんでした', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (p: Person) => {
    const ok = await confirm(`「${p.name}」を削除しますか？`, {
      message: 'この人の予定とテンプレートは「みんな」の予定になります',
      okText: '削除',
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await repo.deletePerson(p.id);
      await reload();
      bumpRevision();
      setEditing(null);
    } catch (e) {
      notify('削除できませんでした', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const editingPerson = editing?.id ? people.find((p) => p.id === editing.id) : undefined;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      {editing ? (
        // 編集中：キーボードと重ならないよう、編集エリアを画面の上半分に出す
        <View style={styles.topWrap}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setEditing(null)} accessibilityLabel="編集をやめる" />
          <View style={[styles.topSheet, { backgroundColor: t.background, paddingTop: insets.top + 12 }]}>
            <Text style={[styles.title, { color: t.text, marginBottom: 12 }]}>
              {editing.id ? '人を編集' : '人を追加'}
            </Text>
            <PersonEditor
              value={editing}
              onChange={setEditing}
              onSave={save}
              onCancel={() => setEditing(null)}
              onDelete={editingPerson ? () => remove(editingPerson) : undefined}
              busy={busy}
            />
          </View>
        </View>
      ) : (
        <>
          <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="閉じる" />
          <View style={[styles.sheet, { backgroundColor: t.background }]}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: t.text }]}>誰の予定？に出る人</Text>
              <Pressable onPress={close} hitSlop={10} accessibilityLabel="完了">
                <Text style={{ color: t.accent, fontSize: 16, fontWeight: '700' }}>完了</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
              {people.map((p) => (
                <Pressable
                  key={p.id}
                  accessibilityLabel={`${p.name} を編集`}
                  onPress={() => setEditing({ id: p.id, name: p.name, color: p.color })}
                  style={({ pressed }) => [
                    styles.row,
                    { backgroundColor: pressed ? t.selected : t.backgroundElement },
                  ]}>
                  <View style={[styles.dot, { backgroundColor: p.color }]} />
                  <Text style={[styles.name, { color: t.text }]}>{p.name}</Text>
                  {p.user_id && <Text style={[styles.badge, { color: t.textSecondary }]}>アカウントあり</Text>}
                  <Text style={{ color: t.textSecondary }}>編集 ›</Text>
                </Pressable>
              ))}
              <Pressable
                onPress={startNew}
                accessibilityLabel="人を追加"
                style={[styles.addRow, { borderColor: t.border }]}>
                <Text style={{ color: t.accent, fontSize: 15, fontWeight: '600' }}>＋ 人を追加</Text>
              </Pressable>
            </ScrollView>
          </View>
        </>
      )}
    </Modal>
  );
}

function PersonEditor({
  value,
  onChange,
  onSave,
  onCancel,
  onDelete,
  busy,
}: {
  value: NonNullable<Editing>;
  onChange: (v: NonNullable<Editing>) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  busy: boolean;
}) {
  const t = useTheme();
  return (
    <View style={[styles.editor, { borderColor: value.color, backgroundColor: t.backgroundElement }]}>
      <TextInput
        value={value.name}
        onChangeText={(name) => onChange({ ...value, name })}
        placeholder="名前（例：パパ、ゆうと）"
        placeholderTextColor={t.textMuted}
        autoFocus
        accessibilityLabel="名前"
        style={[styles.input, { color: t.text, backgroundColor: t.background }]}
      />
      <ColorPalette value={value.color} onChange={(c) => c && onChange({ ...value, color: c })} size={28} />
      <View style={styles.actions}>
        {onDelete && (
          <Pressable onPress={onDelete} disabled={busy} accessibilityLabel="この人を削除" style={styles.actionBtn}>
            <Text style={{ color: t.sunday, fontWeight: '600' }}>削除</Text>
          </Pressable>
        )}
        <View style={{ flex: 1 }} />
        <Pressable onPress={onCancel} disabled={busy} style={styles.actionBtn}>
          <Text style={{ color: t.textSecondary }}>キャンセル</Text>
        </Pressable>
        <Pressable
          onPress={onSave}
          disabled={busy}
          accessibilityLabel="人を保存"
          style={[styles.saveBtn, { backgroundColor: t.accent, opacity: busy ? 0.6 : 1 }]}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>保存</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: { maxHeight: '75%', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 },
  topWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  topSheet: { borderBottomLeftRadius: 16, borderBottomRightRadius: 16, paddingHorizontal: 16, paddingBottom: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, padding: 14, marginBottom: 8 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  name: { flex: 1, fontSize: 16 },
  badge: { fontSize: 11 },
  addRow: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, padding: 14, alignItems: 'center' },
  editor: { borderWidth: 2, borderRadius: 12, padding: 12, marginBottom: 8, gap: 12 },
  input: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  colors: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: { width: 30, height: 30, borderRadius: 15 },
  swatchActive: { borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 3, elevation: 3 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 8 },
  saveBtn: { borderRadius: 10, paddingHorizontal: 18, paddingVertical: 9 },
});
