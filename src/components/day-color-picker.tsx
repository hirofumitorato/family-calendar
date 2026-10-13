import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { DAY_COLORS, dayColorFill } from '@/constants/stickers';
import { useTheme } from '@/hooks/use-theme';

/** 日付セルの背景色を選ぶシート（日付マスの長押しで開く） */
export function DayColorPicker({
  visible,
  title,
  current,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  current: string | null;
  onSelect: (color: string | null) => void;
  onClose: () => void;
}) {
  const t = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="閉じる" />
      <View style={[styles.sheet, { backgroundColor: t.background }]}>
        <Text style={[styles.title, { color: t.text }]}>{title}</Text>
        <View style={styles.grid}>
          {DAY_COLORS.map((c) => {
            const active = c.value === current;
            return (
              <Pressable
                key={c.value}
                onPress={() => onSelect(c.value)}
                accessibilityLabel={`${c.label}にする`}
                style={styles.item}>
                <View
                  style={[
                    styles.swatch,
                    { backgroundColor: dayColorFill(c.value), borderColor: active ? c.value : t.border },
                    active && styles.swatchActive,
                  ]}
                />
                <Text style={[styles.label, { color: t.textSecondary }]}>{c.label}</Text>
              </Pressable>
            );
          })}
          <Pressable onPress={() => onSelect(null)} accessibilityLabel="色をなしにする" style={styles.item}>
            <View style={[styles.swatch, { borderColor: t.border, backgroundColor: t.background }]}>
              <Text style={{ color: t.textMuted, fontSize: 18 }}>✕</Text>
            </View>
            <Text style={[styles.label, { color: t.textSecondary }]}>なし</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, paddingBottom: 40 },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  item: { alignItems: 'center', width: 56 },
  swatch: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchActive: { borderWidth: 3 },
  label: { fontSize: 11, marginTop: 4 },
});
