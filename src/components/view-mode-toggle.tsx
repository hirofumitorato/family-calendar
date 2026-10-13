import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import type { ViewMode } from '@/lib/types';

const OPTIONS: { value: ViewMode; label: string }[] = [
  { value: 'mine', label: '自分' },
  { value: 'family', label: '家族' },
  { value: 'all', label: 'すべて' },
];

export function ViewModeToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  const t = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: t.backgroundElement }]} accessibilityRole="tablist">
      {OPTIONS.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={[styles.item, active && { backgroundColor: t.background }]}>
            <Text style={[styles.label, { color: active ? t.text : t.textSecondary }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', borderRadius: 10, padding: 3 },
  item: { flex: 1, paddingVertical: 6, borderRadius: 8, alignItems: 'center' },
  label: { fontSize: 14, fontWeight: '600' },
});
