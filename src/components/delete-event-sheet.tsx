import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { formatDayLabel } from '@/lib/date';
import type { CalendarEvent, DeleteScope } from '@/lib/types';

/**
 * 予定の削除確認シート。
 * 繰り返し予定なら「この予定のみ／以降の予定／すべての予定」を選べる。
 * （Alert はAndroidでボタン3つまで・Webでは表示されないため、自前のシートにしている）
 */
export function DeleteEventSheet({
  target,
  onSelect,
  onClose,
}: {
  target: { event: CalendarEvent; occurrenceStart: Date } | null;
  onSelect: (scope: DeleteScope) => void;
  onClose: () => void;
}) {
  const t = useTheme();
  const repeating = Boolean(target?.event.rrule);

  const options: { scope: DeleteScope; label: string }[] = repeating
    ? [
        { scope: 'this', label: 'この予定のみ' },
        { scope: 'following', label: '以降の予定' },
        { scope: 'all', label: 'すべての予定' },
      ]
    : [{ scope: 'all', label: '削除' }];

  return (
    <Modal visible={target !== null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="閉じる">
        <Pressable style={[styles.card, { backgroundColor: t.background }]} onPress={() => {}}>
          {target && (
            <>
              <Text style={[styles.title, { color: t.text }]} numberOfLines={2}>
                「{target.event.title}」を削除しますか？
              </Text>
              {repeating && (
                <Text style={[styles.sub, { color: t.textSecondary }]}>
                  繰り返し予定です（{formatDayLabel(target.occurrenceStart)} の回）
                </Text>
              )}
              <View style={styles.buttons}>
                {options.map((o) => (
                  <Pressable
                    key={o.scope}
                    accessibilityRole="button"
                    accessibilityLabel={o.label}
                    onPress={() => onSelect(o.scope)}
                    style={({ pressed }) => [
                      styles.button,
                      { backgroundColor: pressed ? t.selected : t.backgroundElement },
                    ]}>
                    <Text style={[styles.buttonText, { color: t.sunday }]}>{o.label}</Text>
                  </Pressable>
                ))}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="キャンセル"
                  onPress={onClose}
                  style={styles.cancel}>
                  <Text style={[styles.buttonText, { color: t.text }]}>キャンセル</Text>
                </Pressable>
              </View>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  card: { borderRadius: 16, padding: 20, maxWidth: 420, width: '100%', alignSelf: 'center' },
  title: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  sub: { fontSize: 13, textAlign: 'center', marginTop: 6 },
  buttons: { marginTop: 18, gap: 8 },
  button: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  cancel: { paddingVertical: 12, alignItems: 'center' },
  buttonText: { fontSize: 16, fontWeight: '600' },
});
