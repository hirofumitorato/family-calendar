import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { ColorPalette } from '@/components/color-palette';
import { useTheme } from '@/hooks/use-theme';

/** 日付セルの背景色を選ぶシート（日付マスの長押しで開く）。マスには薄くして塗る */
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
        <ColorPalette value={current} onChange={onSelect} allowNone noneLabel="なし" size={34} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, paddingBottom: 40 },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
});
