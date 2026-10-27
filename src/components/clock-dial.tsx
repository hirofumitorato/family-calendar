import { useMemo, useRef } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { hourPosition, minutePosition, pointToHour, pointToMinute, toXY } from '@/lib/clock-dial';

const HOURS_OUTER = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const HOURS_INNER = [0, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

/**
 * アナログ時計の文字盤。指でなぞる・タップして時（24時間）や分を選ぶ。
 * onChange(値, 確定) — 指を離したときに 確定=true。
 */
export function ClockDial({
  mode,
  value,
  onChange,
  size = 260,
}: {
  mode: 'hour' | 'minute';
  value: number;
  onChange: (v: number, done: boolean) => void;
  size?: number;
}) {
  const t = useTheme();
  const moved = useRef(0);
  const start = useRef({ x: 0, y: 0 });
  // PanResponder は最初に作ったものを使い続けるので、最新の値は ref で渡す
  const latest = useRef({ mode, onChange, size });
  latest.current = { mode, onChange, size };

  const pick = (x: number, y: number, snap: 1 | 5) => {
    const { mode: m, size: s } = latest.current;
    return m === 'hour' ? pointToHour(x, y, s) : pointToMinute(x, y, s, snap);
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        // 親のスクロールに指を取られないようにする
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: (e) => {
          const { locationX: x, locationY: y } = e.nativeEvent;
          start.current = { x, y };
          moved.current = 0;
          latest.current.onChange(pick(x, y, 1), false);
        },
        onPanResponderMove: (e) => {
          const { locationX: x, locationY: y } = e.nativeEvent;
          moved.current = Math.max(moved.current, Math.hypot(x - start.current.x, y - start.current.y));
          latest.current.onChange(pick(x, y, 1), false);
        },
        onPanResponderRelease: (e) => {
          const { locationX: x, locationY: y } = e.nativeEvent;
          // 分はタップなら5分単位、なぞったら1分単位
          const snap = latest.current.mode === 'minute' && moved.current < 8 ? 5 : 1;
          latest.current.onChange(pick(x, y, snap), true);
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const pos = mode === 'hour' ? hourPosition(value) : minutePosition(value);
  const handLen = pos.radius * size;
  const knob = toXY(pos.angle, pos.radius, size);
  const KNOB = 40;

  const label = (n: number, angle: number, radius: number, small: boolean) => {
    const p = toXY(angle, radius, size);
    const active = n === value;
    return (
      <Text
        key={`${radius}-${n}`}
        style={[
          styles.num,
          {
            left: p.x - 20,
            top: p.y - 12,
            color: active ? '#fff' : small ? t.textSecondary : t.text,
            fontSize: small ? 13 : 16,
            fontWeight: active ? '700' : small ? '400' : '500',
          },
        ]}>
        {mode === 'minute' || n === 0 ? String(n).padStart(2, '0') : n}
      </Text>
    );
  };

  return (
    <View style={[styles.dial, { width: size, height: size, borderRadius: size / 2, backgroundColor: t.backgroundElement }]}>
      {/* 針 */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: size / 2 - 1,
          top: size / 2 - handLen,
          width: 2,
          height: handLen * 2,
          transform: [{ rotate: `${pos.angle}deg` }],
        }}>
        <View style={{ height: handLen, width: 2, backgroundColor: t.accent }} />
      </View>
      <View pointerEvents="none" style={[styles.center, { left: size / 2 - 4, top: size / 2 - 4, backgroundColor: t.accent }]} />
      {/* 選んでいる位置の丸 */}
      <View
        pointerEvents="none"
        style={[styles.knob, { left: knob.x - KNOB / 2, top: knob.y - KNOB / 2, width: KNOB, height: KNOB, borderRadius: KNOB / 2, backgroundColor: t.accent }]}>
        {mode === 'minute' && value % 5 !== 0 && <View style={styles.knobDot} />}
      </View>
      {/* 数字 */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {mode === 'hour'
          ? [
              ...HOURS_OUTER.map((h) => label(h, hourPosition(h).angle, hourPosition(h).radius, false)),
              ...HOURS_INNER.map((h) => label(h, hourPosition(h).angle, hourPosition(h).radius, true)),
            ]
          : MINUTES.map((m) => label(m, minutePosition(m).angle, minutePosition(m).radius, false))}
      </View>
      {/* 指の動きを受け取る透明な板（子要素を持たないので、座標が文字盤基準になる） */}
      <View
        {...responder.panHandlers}
        accessibilityLabel={mode === 'hour' ? '時を選ぶ文字盤' : '分を選ぶ文字盤'}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  dial: { alignSelf: 'center' },
  num: { position: 'absolute', width: 40, textAlign: 'center', lineHeight: 24, fontVariant: ['tabular-nums'] },
  center: { position: 'absolute', width: 8, height: 8, borderRadius: 4 },
  knob: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  knobDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
});
