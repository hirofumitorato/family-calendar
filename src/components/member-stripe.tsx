import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

/**
 * 予定の左端の濃い帯。選ばれた人の色で縦に分割する（4人なら4色）。
 * 色が1つもなければ fallback の1色。
 */
export function MemberStripe({
  colors,
  fallback,
  width = 5,
  style,
}: {
  colors: string[];
  fallback: string;
  width?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const list = colors.length ? colors : [fallback];
  return (
    <View style={[styles.stripe, { width }, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {list.map((c, i) => (
        <View key={`${c}-${i}`} style={{ flex: 1, backgroundColor: c }} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stripe: { alignSelf: 'stretch', overflow: 'hidden' },
});
