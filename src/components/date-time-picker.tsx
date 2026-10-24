import { useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { WEEKDAY_LABELS, addMonths, buildMonthGrid, formatDayLabel, isSameDay, parseDateKey, toDateKey } from '@/lib/date';

export type PickerOpen = 'date' | 'time' | null;

/**
 * 「開始」「終了」の1行。日付・時刻のボタンを押すと、その下にカレンダー／ダイヤルが開く。
 * date / time が null の項目は表示しない（終日なら time なし、テンプレートなら date なし）。
 */
export function DateTimeRow({
  label,
  date,
  time,
  open,
  onOpen,
  onChangeDate,
  onChangeTime,
}: {
  label: string;
  date: string | null;
  time: string | null;
  open: PickerOpen;
  onOpen: (o: PickerOpen) => void;
  onChangeDate: (d: string) => void;
  onChangeTime: (t: string) => void;
}) {
  const t = useTheme();
  const pill = (active: boolean) => [
    styles.pill,
    { backgroundColor: active ? t.selected : t.backgroundElement },
  ];
  return (
    <View>
      <View style={styles.row}>
        <Text style={[styles.label, { color: t.text }]}>{label}</Text>
        <View style={{ flex: 1 }} />
        {date !== null && (
          <Pressable
            accessibilityLabel={`${label}の日付 ${date}`}
            onPress={() => onOpen(open === 'date' ? null : 'date')}
            style={pill(open === 'date')}>
            <Text style={[styles.pillText, { color: t.text }]}>{formatDayLabel(parseDateKey(date))}</Text>
          </Pressable>
        )}
        {time !== null && (
          <Pressable
            accessibilityLabel={`${label}の時刻 ${time}`}
            onPress={() => onOpen(open === 'time' ? null : 'time')}
            style={pill(open === 'time')}>
            <Text style={[styles.pillText, { color: t.text }]}>{time}</Text>
          </Pressable>
        )}
      </View>
      {open === 'date' && date !== null && <InlineCalendar value={date} onChange={onChangeDate} />}
      {open === 'time' && time !== null && <TimeWheel value={time} onChange={onChangeTime} />}
    </View>
  );
}

/** 月のカレンダーから日付を選ぶ */
export function InlineCalendar({ value, onChange }: { value: string; onChange: (d: string) => void }) {
  const t = useTheme();
  const selected = parseDateKey(value);
  const [cursor, setCursor] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1));
  const days = buildMonthGrid(cursor.getFullYear(), cursor.getMonth());
  const today = new Date();

  return (
    <View style={styles.calendar}>
      <View style={styles.calHeader}>
        <Text style={[styles.calTitle, { color: t.text }]}>
          {cursor.getFullYear()}年{cursor.getMonth() + 1}月
        </Text>
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => setCursor((c) => addMonths(c, -1))} hitSlop={10} accessibilityLabel="前の月を表示">
          <Text style={[styles.calNav, { color: t.text }]}>‹</Text>
        </Pressable>
        <Pressable onPress={() => setCursor((c) => addMonths(c, 1))} hitSlop={10} accessibilityLabel="次の月を表示">
          <Text style={[styles.calNav, { color: t.text }]}>›</Text>
        </Pressable>
      </View>
      <View style={styles.calWeek}>
        {WEEKDAY_LABELS.map((w, i) => (
          <Text key={w} style={[styles.calWeekLabel, { color: i === 0 ? t.sunday : i === 6 ? t.saturday : t.textSecondary }]}>
            {w}
          </Text>
        ))}
      </View>
      <View style={styles.calGrid}>
        {days.map((d) => {
          const inMonth = d.getMonth() === cursor.getMonth();
          const isSel = isSameDay(d, selected);
          const isToday = isSameDay(d, today);
          return (
            <Pressable
              key={toDateKey(d)}
              accessibilityLabel={`${d.getMonth() + 1}月${d.getDate()}日を選ぶ`}
              onPress={() => {
                onChange(toDateKey(d));
                if (!inMonth) setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
              }}
              style={styles.calCell}>
              <View style={[styles.calDay, isSel && { backgroundColor: t.accent }, !isSel && isToday && { borderWidth: 1, borderColor: t.accent }]}>
                <Text
                  style={[
                    styles.calDayText,
                    { color: isSel ? '#fff' : !inMonth ? t.textMuted : d.getDay() === 0 ? t.sunday : d.getDay() === 6 ? t.saturday : t.text },
                    isSel && { fontWeight: '700' },
                  ]}>
                  {d.getDate()}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const ITEM = 40;
const VISIBLE = 5;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

/** 時・分をダイヤル（くるくる回す）で選ぶ */
export function TimeWheel({ value, onChange }: { value: string; onChange: (t: string) => void }) {
  const t = useTheme();
  const [h, m] = value.split(':').map(Number);
  const set = (nh: number, nm: number) => onChange(`${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`);
  return (
    <View style={styles.wheelWrap}>
      <View pointerEvents="none" style={[styles.wheelBand, { backgroundColor: t.backgroundElement }]} />
      <WheelColumn values={HOURS} value={h} onChange={(nh) => set(nh, m)} label="時" />
      <Text style={[styles.colon, { color: t.text }]}>:</Text>
      <WheelColumn values={MINUTES} value={m} onChange={(nm) => set(h, nm)} label="分" />
    </View>
  );
}

function WheelColumn({
  values,
  value,
  onChange,
  label,
}: {
  values: number[];
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  const t = useTheme();
  const ref = useRef<ScrollViewInstance>(null);
  const [current, setCurrent] = useState(value);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 最初に選択中の値の位置までスクロール
  useEffect(() => {
    const i = Math.max(0, values.indexOf(value));
    requestAnimationFrame(() => ref.current?.scrollTo({ y: i * ITEM, animated: false }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const settle = (y: number) => {
    const i = Math.min(values.length - 1, Math.max(0, Math.round(y / ITEM)));
    setCurrent(values[i]);
    if (values[i] !== value) onChange(values[i]);
    // Web はスナップしないので、止まった位置に合わせる
    if (Platform.OS === 'web') ref.current?.scrollTo({ y: i * ITEM, animated: true });
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const i = Math.min(values.length - 1, Math.max(0, Math.round(y / ITEM)));
    setCurrent(values[i]);
    // スクロールが止まったら確定（Web など momentum イベントがない環境向け）
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => settle(y), 160);
  };

  return (
    <ScrollView
      ref={ref}
      style={{ height: ITEM * VISIBLE, width: 72 }}
      contentContainerStyle={{ paddingVertical: ITEM * Math.floor(VISIBLE / 2) }}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM}
      decelerationRate="fast"
      nestedScrollEnabled
      scrollEventThrottle={16}
      onScroll={onScroll}
      onMomentumScrollEnd={(e) => settle(e.nativeEvent.contentOffset.y)}
      accessibilityLabel={`${label}を選ぶ`}>
      {values.map((v) => {
        const diff = Math.abs(v - current);
        return (
          <Pressable
            key={v}
            onPress={() => {
              ref.current?.scrollTo({ y: values.indexOf(v) * ITEM, animated: true });
              setCurrent(v);
              onChange(v);
            }}
            accessibilityLabel={`${v}${label}`}
            style={styles.wheelItem}>
            <Text
              style={{
                color: diff === 0 ? t.text : t.textSecondary,
                fontSize: diff === 0 ? 24 : diff === 1 ? 19 : 15,
                opacity: diff === 0 ? 1 : diff === 1 ? 0.7 : 0.4,
                fontVariant: ['tabular-nums'],
              }}>
              {v}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  label: { fontSize: 15, fontWeight: '600' },
  pill: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8 },
  pillText: { fontSize: 16, fontVariant: ['tabular-nums'] },
  calendar: { marginTop: 10, paddingHorizontal: 4 },
  calHeader: { flexDirection: 'row', alignItems: 'center', gap: 18, marginBottom: 6 },
  calTitle: { fontSize: 16, fontWeight: '700' },
  calNav: { fontSize: 26, lineHeight: 28, paddingHorizontal: 6 },
  calWeek: { flexDirection: 'row' },
  calWeekLabel: { flex: 1, textAlign: 'center', fontSize: 12, paddingVertical: 4 },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 3 },
  calDay: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  calDayText: { fontSize: 16 },
  wheelWrap: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  wheelBand: { position: 'absolute', left: 0, right: 0, height: ITEM, top: ITEM * Math.floor(VISIBLE / 2), borderRadius: 12 },
  wheelItem: { height: ITEM, alignItems: 'center', justifyContent: 'center' },
  colon: { fontSize: 22, fontWeight: '700', marginHorizontal: 4 },
});
