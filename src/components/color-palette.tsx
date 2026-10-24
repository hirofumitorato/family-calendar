import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PALETTE } from '@/constants/palette';
import { useTheme } from '@/hooks/use-theme';

/** 30色から選ぶパレット。allowNone なら「なし（自動）」も選べる */
export function ColorPalette({
  value,
  onChange,
  allowNone = false,
  noneLabel = 'なし',
  size = 30,
}: {
  value: string | null;
  onChange: (color: string | null) => void;
  allowNone?: boolean;
  noneLabel?: string;
  size?: number;
}) {
  const t = useTheme();
  return (
    <View style={styles.grid}>
      {allowNone && (
        <Pressable
          accessibilityLabel={`色 ${noneLabel}`}
          accessibilityState={{ selected: value === null }}
          onPress={() => onChange(null)}
          style={[
            styles.none,
            { width: size, height: size, borderRadius: size / 2, borderColor: value === null ? t.text : t.border },
          ]}>
          <Text style={{ color: t.textSecondary, fontSize: 9 }} numberOfLines={1}>
            {noneLabel}
          </Text>
        </Pressable>
      )}
      {PALETTE.map((c) => {
        const active = c.toLowerCase() === value?.toLowerCase();
        return (
          <Pressable
            key={c}
            accessibilityLabel={`色 ${c}`}
            accessibilityState={{ selected: active }}
            onPress={() => onChange(c)}
            style={[
              { width: size, height: size, borderRadius: size / 2, backgroundColor: c },
              active && [styles.active, { borderColor: t.background, outlineColor: c, outlineWidth: 2, outlineStyle: 'solid' }],
            ]}>
            {active && <Text style={styles.check}>✓</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  none: { borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  active: { borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  check: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
