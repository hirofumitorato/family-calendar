import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { STAMP_IMAGES } from '@/constants/stamp-images';
import { parseStamp, textStampLayout } from '@/lib/stamp-catalog';

/**
 * スタンプ（予定のアイコン・日付のスタンプ）を1つ描く。
 * - 絵のスタンプ：Fluent Emoji の画像。画像がない絵文字は文字のまま表示。
 * - 文字のスタンプ：色付きの枠に文字（小さいときは1文字目だけ）。
 */
export function Stamp({ value, size = 24, style }: { value: string; size?: number; style?: StyleProp<ViewStyle> }) {
  const s = parseStamp(value);
  if (s.kind === 'emoji') {
    const src = STAMP_IMAGES[s.glyph.replace(/️/g, '')];
    if (src) {
      return (
        <Image
          source={src}
          style={[{ width: size, height: size }, style as object]}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      );
    }
    return (
      <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
        <Text style={{ fontSize: size * 0.8, lineHeight: size }}>{s.glyph}</Text>
      </View>
    );
  }

  // 小さいとき（カレンダーのマスの中など）は読めないので、1文字目だけ
  const tiny = size < 20;
  const layout = tiny ? { lines: [Array.from(s.label)[0] ?? ''], scale: 0.62 } : textStampLayout(s.label);
  const fontSize = Math.max(6, size * layout.scale);
  return (
    <View
      style={[
        styles.text,
        {
          width: size,
          height: size,
          borderRadius: size * 0.22,
          borderWidth: tiny ? 0 : Math.max(1, size * 0.04),
          borderColor: s.color,
          // シールのように白地（ダークモードでも読める）。小さいときは色で塗る
          backgroundColor: tiny ? s.color : '#FFFFFF',
        },
        style,
      ]}>
      {layout.lines.map((line, i) => (
        <Text
          key={i}
          numberOfLines={1}
          allowFontScaling={false}
          style={{
            color: tiny ? '#fff' : s.color,
            fontSize,
            lineHeight: fontSize * 1.12,
            fontWeight: '800',
            textAlign: 'center',
            includeFontPadding: false,
          }}>
          {line}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  text: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
