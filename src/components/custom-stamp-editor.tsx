import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import type { CustomStamp } from '@/lib/types';
import { useCustomStamps } from '@/state/custom-stamps';
import { confirm, notify } from '@/utils/dialog';
import { canPickStampImage, pickStampImage } from '@/utils/pick-stamp-image';

/**
 * オリジナルスタンプの追加・名前の変更・削除。
 * 入力欄があるので、キーボードに隠れないよう画面の上から出す。
 */
export function CustomStampEditor({
  visible,
  editing,
  onClose,
  onSaved,
}: {
  visible: boolean;
  /** 既存のスタンプを編集するとき */
  editing?: CustomStamp | null;
  onClose: () => void;
  onSaved?: (stamp: CustomStamp) => void;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const custom = useCustomStamps();
  const [image, setImage] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setImage(editing?.image_data ?? null);
    setName(editing?.name ?? '');
  }, [visible, editing]);

  const choose = async () => {
    try {
      const data = await pickStampImage();
      if (data) setImage(data);
    } catch (e) {
      notify('画像を読み込めませんでした', e instanceof Error ? e.message : String(e));
    }
  };

  const save = async () => {
    const n = name.trim();
    if (!image) return notify('画像を選んでください');
    if (!n) return notify('名前を入れてください');
    setBusy(true);
    try {
      if (editing) {
        await custom.rename(editing, n);
        onSaved?.({ ...editing, name: n });
      } else {
        const created = await custom.add(n, image);
        onSaved?.(created);
      }
      onClose();
    } catch (e) {
      notify('保存できませんでした', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!editing) return;
    const ok = await confirm(`スタンプ「${editing.name}」を削除しますか？`, {
      message: 'このスタンプを付けた予定は 🖼️ の表示になります',
      okText: '削除',
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await custom.remove(editing);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  // アプリでは画像を選べないので、新しく追加するときは Web 版を案内する
  const cannotAdd = !editing && !canPickStampImage;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.sheet, { backgroundColor: t.background, paddingTop: insets.top + 12 }]}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="閉じる">
            <Text style={{ color: t.textSecondary, fontSize: 15 }}>キャンセル</Text>
          </Pressable>
          <Text style={[styles.title, { color: t.text }]}>{editing ? 'オリジナルスタンプ' : 'オリジナルスタンプを追加'}</Text>
          {cannotAdd ? (
            <View style={{ width: 64 }} />
          ) : (
            <Pressable onPress={save} disabled={busy} hitSlop={8} accessibilityLabel="スタンプを保存">
              <Text style={{ color: t.accent, fontSize: 15, fontWeight: '700' }}>保存</Text>
            </Pressable>
          )}
        </View>

        {cannotAdd ? (
          <Text style={[styles.note, { color: t.textSecondary }]}>
            画像の追加は、Web 版（ブラウザ）の設定画面から行えます。{'\n'}
            追加したスタンプは、このアプリにもすぐ表示されます。
          </Text>
        ) : (
          <View style={styles.body}>
            <Pressable
              onPress={editing ? undefined : choose}
              accessibilityRole="button"
              accessibilityLabel={image ? '画像を選び直す' : '画像を選ぶ'}
              style={[styles.preview, { borderColor: t.border, backgroundColor: t.backgroundElement }]}>
              {image ? (
                <Image source={{ uri: image }} style={styles.previewImage} />
              ) : (
                <Text style={{ color: t.accent, fontWeight: '600', textAlign: 'center' }}>＋{'\n'}画像を選ぶ</Text>
              )}
            </Pressable>
            {!editing && image && (
              <Pressable onPress={choose} hitSlop={6}>
                <Text style={{ color: t.accent, fontSize: 13 }}>画像を選び直す</Text>
              </Pressable>
            )}
            <Text style={[styles.hint, { color: t.textMuted }]}>
              {editing ? '名前を変えられます' : '真ん中を正方形に切り抜いて、小さくして保存します（家族だけが見られます）'}
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="スタンプの名前（例：MGA）"
              placeholderTextColor={t.textMuted}
              maxLength={20}
              accessibilityLabel="スタンプの名前"
              style={[styles.input, { backgroundColor: t.backgroundElement, color: t.text }]}
            />
            {busy && <ActivityIndicator />}
            {editing && (
              <Pressable onPress={remove} disabled={busy} style={styles.delete} accessibilityLabel="このスタンプを削除">
                <Text style={{ color: t.sunday, fontWeight: '600' }}>このスタンプを削除</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="閉じる" />
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { borderBottomLeftRadius: 18, borderBottomRightRadius: 18, paddingHorizontal: 16, paddingBottom: 20 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontSize: 16, fontWeight: '700' },
  body: { alignItems: 'center', gap: 10 },
  preview: {
    width: 112,
    height: 112,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewImage: { width: 112, height: 112 },
  hint: { fontSize: 12, textAlign: 'center' },
  input: { alignSelf: 'stretch', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  note: { fontSize: 14, lineHeight: 22, paddingVertical: 12, textAlign: 'center' },
  delete: { paddingVertical: 8 },
});
