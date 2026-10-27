import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { WEEKDAY_LABELS, addMonths, buildMonthGrid, isSameDay, parseDateKey, toDateKey } from '@/lib/date';

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

const styles = StyleSheet.create({
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
});
