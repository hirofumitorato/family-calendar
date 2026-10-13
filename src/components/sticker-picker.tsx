import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { StickerGroup } from '@/constants/stickers';
import { useTheme } from '@/hooks/use-theme';

/** 絵文字スタンプ／アイコンを選ぶボトムシート */
export function StickerPicker({
  visible,
  title,
  groups,
  onSelect,
  onClose,
  allowClear = false,
}: {
  visible: boolean;
  title: string;
  groups: StickerGroup[];
  onSelect: (value: string | null) => void;
  onClose: () => void;
  allowClear?: boolean;
}) {
  const t = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="閉じる" />
      <View style={[styles.sheet, { backgroundColor: t.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: t.text }]}>{title}</Text>
          {allowClear && (
            <Pressable onPress={() => onSelect(null)} hitSlop={8}>
              <Text style={{ color: t.textSecondary }}>なし</Text>
            </Pressable>
          )}
        </View>
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
          {groups.map((g) => (
            <View key={g.label} style={styles.group}>
              <Text style={[styles.groupLabel, { color: t.textSecondary }]}>{g.label}</Text>
              <View style={styles.grid}>
                {g.items.map((item) => (
                  <Pressable
                    key={item}
                    onPress={() => onSelect(item)}
                    accessibilityLabel={`スタンプ ${item}`}
                    style={({ pressed }) => [
                      styles.cell,
                      { backgroundColor: pressed ? t.selected : t.backgroundElement },
                    ]}>
                    <Text style={styles.emoji}>{item}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: {
    maxHeight: '60%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '700' },
  group: { marginTop: 8 },
  groupLabel: { fontSize: 12, marginBottom: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 24 },
});
