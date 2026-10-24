import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ColorPalette } from '@/components/color-palette';
import { useTheme } from '@/hooks/use-theme';

/** 小さな色選択（タイトル横の色ボタンから開く）。キーボードと重ならないよう画面上部に出す */
export function ColorPopover({
  visible,
  value,
  autoColor,
  onChange,
  onClose,
}: {
  visible: boolean;
  value: string | null;
  /** 「自動」のときの色（誰の予定かの色） */
  autoColor: string;
  onChange: (c: string | null) => void;
  onClose: () => void;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="色選択を閉じる">
        <Pressable style={[styles.card, { backgroundColor: t.background, marginTop: insets.top + 64 }]} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: t.text }]}>予定の色</Text>
            <Text style={{ color: t.textSecondary, fontSize: 11 }}>
              自動＝<Text style={{ color: autoColor, fontWeight: '700' }}>●</Text> 誰の予定かの色
            </Text>
          </View>
          <ColorPalette
            value={value}
            onChange={(c) => {
              onChange(c);
              onClose();
            }}
            allowNone
            noneLabel="自動"
            size={26}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center' },
  card: {
    width: 320,
    maxWidth: '92%',
    borderRadius: 16,
    padding: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  title: { fontSize: 15, fontWeight: '700' },
});
