import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { ClockDial } from '@/components/clock-dial';
import { InlineCalendar } from '@/components/date-time-picker';
import { useTheme } from '@/hooks/use-theme';
import { withHour, withMinute } from '@/lib/clock-dial';
import { formatDayLabel, parseDateKey } from '@/lib/date';

type Side = 'start' | 'end';
type Part = 'date' | 'hour' | 'minute';

/**
 * 「開始 ▶ 終了 ｜ 終日」を1段に並べ、押した日付・時・分をその下のカレンダー／時計の文字盤で選ぶ。
 * 時を選ぶと自動で分の文字盤に切り替わる。
 * date が null の側（テンプレート）は日付を出さない。終日なら時刻を出さない。
 */
export function StartEndPanel({
  startDate,
  startTime,
  endDate,
  endTime,
  allDay,
  onChangeAllDay,
  onChangeStart,
  onChangeEnd,
  onDialTouching,
}: {
  startDate: string | null;
  startTime: string;
  endDate: string | null;
  endTime: string;
  allDay: boolean;
  onChangeAllDay: (v: boolean) => void;
  onChangeStart: (next: { date?: string; time?: string }) => void;
  onChangeEnd: (next: { date?: string; time?: string }) => void;
  /** 時計の文字盤に指が触れている間 true（入力画面のスクロールを止める） */
  onDialTouching?: (touching: boolean) => void;
}) {
  const t = useTheme();
  const [active, setActive] = useState<{ side: Side; part: Part } | null>(null);

  const toggle = (side: Side, part: Part) =>
    setActive((cur) => (cur && cur.side === side && cur.part === part ? null : { side, part }));

  const val = (side: Side) =>
    side === 'start' ? { date: startDate, time: startTime } : { date: endDate, time: endTime };
  const change = (side: Side, next: { date?: string; time?: string }) =>
    side === 'start' ? onChangeStart(next) : onChangeEnd(next);

  const block = (side: Side) => {
    const v = val(side);
    const [hh, mm] = v.time.split(':');
    const isSide = active?.side === side;
    const box = (part: 'hour' | 'minute', text: string) => {
      const on = isSide && active?.part === part;
      return (
        <Pressable
          onPress={() => toggle(side, part)}
          accessibilityRole="button"
          accessibilityLabel={`${side === 'start' ? '開始' : '終了'}の${part === 'hour' ? '時' : '分'} ${text}`}
          style={[styles.box, { borderColor: on ? t.accent : t.border, backgroundColor: on ? t.accent : t.background }]}>
          <Text style={[styles.boxText, { color: on ? '#fff' : t.text }]}>{text}</Text>
        </Pressable>
      );
    };
    return (
      <View style={[styles.block, { backgroundColor: isSide ? `${t.accent}1F` : 'transparent' }]}>
        <Text style={[styles.sideLabel, { color: t.textSecondary }]}>{side === 'start' ? '開始' : '終了'}</Text>
        {v.date !== null && (
          <Pressable
            onPress={() => toggle(side, 'date')}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`${side === 'start' ? '開始' : '終了'}の日付 ${v.date}`}>
            <Text
              style={[
                styles.date,
                { color: isSide && active?.part === 'date' ? t.accent : t.text },
                allDay && styles.dateLarge,
              ]}>
              {formatDayLabel(parseDateKey(v.date))}
            </Text>
          </Pressable>
        )}
        {!allDay && (
          <View style={styles.timeRow}>
            {box('hour', hh)}
            <Text style={[styles.colon, { color: t.textSecondary }]}>:</Text>
            {box('minute', mm)}
          </View>
        )}
      </View>
    );
  };

  const a = active;
  const cur = a ? val(a.side) : null;

  return (
    <View>
      <View style={[styles.panel, { borderColor: t.border }]}>
        <View style={styles.sides}>
          {block('start')}
          {/* 開始 → 終了 の矢印 */}
          <View pointerEvents="none" style={styles.arrowWrap}>
            <View style={[styles.arrow, { borderLeftColor: t.border }]} />
            <View style={[styles.arrowInner, { borderLeftColor: active?.side === 'start' ? blend(t.accent, t.background) : t.background }]} />
          </View>
          {block('end')}
        </View>
        <View style={[styles.allDay, { borderLeftColor: t.border }]}>
          <Text style={[styles.allDayLabel, { color: t.textSecondary }]}>終日</Text>
          <Switch
            value={allDay}
            onValueChange={(v) => {
              onChangeAllDay(v);
              if (v && a && a.part !== 'date') setActive(null);
            }}
            accessibilityLabel="終日"
          />
        </View>
      </View>

      {/* 押したところに合わせて、カレンダーか時計の文字盤を出す */}
      {a && cur && (
        <View style={styles.editor}>
          <Text style={[styles.editorTitle, { color: t.textSecondary }]}>
            {a.side === 'start' ? '開始' : '終了'}の{a.part === 'date' ? '日付' : a.part === 'hour' ? '時' : '分'}
            {a.part !== 'date' && <Text style={{ color: t.text, fontWeight: '700' }}>　{cur.time}</Text>}
          </Text>
          {a.part === 'date' && cur.date !== null && (
            <InlineCalendar value={cur.date} onChange={(d) => change(a.side, { date: d })} />
          )}
          {a.part === 'hour' && (
            <ClockDial
              mode="hour"
              value={Number(cur.time.split(':')[0])}
              onTouching={onDialTouching}
              onChange={(h, done) => {
                change(a.side, { time: withHour(cur.time, h) });
                // 時を決めたら、分の文字盤へ
                if (done) setActive({ side: a.side, part: 'minute' });
              }}
            />
          )}
          {a.part === 'minute' && (
            <ClockDial
              mode="minute"
              value={Number(cur.time.split(':')[1])}
              onTouching={onDialTouching}
              onChange={(m) => change(a.side, { time: withMinute(cur.time, m) })}
            />
          )}
          <Pressable onPress={() => setActive(null)} style={styles.done} accessibilityLabel="日時の選択を閉じる">
            <Text style={{ color: t.accent, fontWeight: '600' }}>OK</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

/** 背景の上に、淡くした色を重ねたときの色（矢印の中を左の欄と同じ色にするため） */
function blend(hex: string, bg: string): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r1, g1, b1] = p(hex);
  const [r2, g2, b2] = p(bg.length === 7 ? bg : '#ffffff');
  const k = 0x1f / 255;
  const mix = (a: number, b: number) => Math.round(a * k + b * (1 - k)).toString(16).padStart(2, '0');
  return `#${mix(r1, r2)}${mix(g1, g2)}${mix(b1, b2)}`;
}

const ARROW = 12;
const styles = StyleSheet.create({
  panel: { flexDirection: 'row', borderWidth: 1, borderRadius: 14, overflow: 'hidden', marginTop: 16 },
  sides: { flex: 1, flexDirection: 'row' },
  block: { flex: 1, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4, gap: 4 },
  sideLabel: { fontSize: 11 },
  date: { fontSize: 15, fontWeight: '700' },
  dateLarge: { fontSize: 16, paddingVertical: 10 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
  box: { borderWidth: 1.5, borderRadius: 8, minWidth: 44, paddingVertical: 4, alignItems: 'center' },
  boxText: { fontSize: 22, fontWeight: '600', fontVariant: ['tabular-nums'] },
  colon: { fontSize: 20, fontWeight: '700' },
  arrowWrap: { width: 0, justifyContent: 'center', zIndex: 1 },
  arrow: {
    position: 'absolute',
    left: 0,
    width: 0,
    height: 0,
    borderTopWidth: ARROW + 1,
    borderBottomWidth: ARROW + 1,
    borderLeftWidth: ARROW + 1,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  arrowInner: {
    position: 'absolute',
    left: 0,
    width: 0,
    height: 0,
    borderTopWidth: ARROW,
    borderBottomWidth: ARROW,
    borderLeftWidth: ARROW,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  allDay: { width: 64, alignItems: 'center', justifyContent: 'center', gap: 6, borderLeftWidth: StyleSheet.hairlineWidth },
  allDayLabel: { fontSize: 12 },
  editor: { marginTop: 12, gap: 10 },
  editorTitle: { fontSize: 13, textAlign: 'center' },
  done: { alignSelf: 'center', paddingHorizontal: 24, paddingVertical: 8 },
});
