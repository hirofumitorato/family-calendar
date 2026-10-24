import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

/**
 * 複数人の予定の背景を、選んだ人の色で左→右のグラデーションにする。
 * 親の View の最初の子として置く（親に overflow: 'hidden'・角丸・zIndex: 0 を付けておく。
 * zIndex: 0 がないと Web で文字の上に重なる）。
 * 色が1つ以下なら何も描かない（親の backgroundColor がそのまま見える）。
 * 終日＝濃い色、時間指定＝淡い色（eventLook と同じ考え方）。
 */
export function EventGradient({ colors, allDay }: { colors: string[]; allDay: boolean }) {
  if (colors.length < 2) return null;
  const stops = colors.map((c) => (allDay ? c : `${c}33`)) as unknown as readonly [string, string, ...string[]];
  return (
    <LinearGradient
      pointerEvents="none"
      colors={stops}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={styles.fill}
    />
  );
}

/** グラデーションに使う色（予定の色を指定していればグラデーションにしない） */
export function gradientColorsOf(explicitColor: string | null | undefined, memberColors: string[]): string[] {
  return explicitColor ? [] : memberColors;
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1 },
});
