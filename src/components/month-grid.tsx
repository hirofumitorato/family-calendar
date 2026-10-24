import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { dayColorFill } from '@/constants/stickers';
import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { WEEKDAY_LABELS, buildMonthGrid, isSameDay, toDateKey } from '@/lib/date';
import { getHolidayName } from '@/lib/holidays';
import type { MonthData } from '@/state/app-store';
import { weatherCodeToIcon } from '@/lib/weather';

const MAX_CHIPS = 3;

export function MonthGrid({
  year,
  month,
  selected,
  onSelect,
  onLongPress,
  data,
}: {
  year: number;
  month: number;
  selected: Date;
  onSelect: (d: Date) => void;
  /** 日付マスの長押し（セルの色変更） */
  onLongPress?: (d: Date) => void;
  data: MonthData;
}) {
  const t = useTheme();
  const days = buildMonthGrid(year, month);
  const today = new Date();

  return (
    <View>
      <View style={styles.weekHeader}>
        {WEEKDAY_LABELS.map((w, i) => (
          <Text
            key={w}
            style={[
              styles.weekLabel,
              { color: i === 0 ? t.sunday : i === 6 ? t.saturday : t.textSecondary },
            ]}>
            {w}
          </Text>
        ))}
      </View>
      {Array.from({ length: 6 }, (_, row) => (
        <View key={row} style={[styles.row, { borderColor: t.border }]}>
          {days.slice(row * 7, row * 7 + 7).map((d) => {
            const key = toDateKey(d);
            return (
              <DayCell
                key={key}
                date={d}
                dateKey={key}
                inMonth={d.getMonth() === month}
                isToday={isSameDay(d, today)}
                isSelected={isSameDay(d, selected)}
                data={data}
                theme={t}
                onPress={onSelect}
                onLongPress={onLongPress}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

const DayCell = memo(function DayCell({
  date,
  dateKey,
  inMonth,
  isToday,
  isSelected,
  data,
  theme: t,
  onPress,
  onLongPress,
}: {
  date: Date;
  dateKey: string;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  data: MonthData;
  theme: ThemeColors;
  onPress: (d: Date) => void;
  onLongPress?: (d: Date) => void;
}) {
  const holiday = getHolidayName(dateKey);
  const dow = date.getDay();
  const weather = data.weatherByDay.get(dateKey);
  const stickers = data.stickersByDay.get(dateKey) ?? [];
  const occs = data.occurrencesByDay.get(dateKey) ?? [];
  const cellColor = data.colorByDay.get(dateKey);

  const dateColor = !inMonth
    ? t.textMuted
    : holiday || dow === 0
      ? t.sunday
      : dow === 6
        ? t.saturday
        : t.text;

  return (
    <Pressable
      onPress={() => onPress(date)}
      onLongPress={onLongPress ? () => onLongPress(date) : undefined}
      delayLongPress={400}
      accessibilityLabel={`${date.getMonth() + 1}月${date.getDate()}日 予定${occs.length}件${holiday ? ` ${holiday}` : ''}`}
      style={[
        styles.cell,
        { borderColor: t.border },
        // 優先順位：長押しで付けた色 ＞ 今日 ＞ 日曜（薄い赤）・土曜（薄い青）
        cellColor
          ? { backgroundColor: dayColorFill(cellColor) }
          : isToday
            ? { backgroundColor: t.today }
            : dow === 0
              ? { backgroundColor: t.sundayBg }
              : dow === 6
                ? { backgroundColor: t.saturdayBg }
                : null,
      ]}>
      {isSelected && <View pointerEvents="none" style={[styles.selectedRing, { borderColor: t.accent }]} />}
      <View style={styles.cellHeader}>
        <View style={[styles.dateBadge, isToday && { backgroundColor: t.accent }]}>
          <Text style={[styles.dateNum, { color: isToday ? '#fff' : dateColor }, isToday && styles.dateToday]}>
            {date.getDate()}
          </Text>
        </View>
        {weather && inMonth && (
          <Text style={styles.weather} accessibilityLabel={weatherCodeToIcon(weather.weather_code).label}>
            {weatherCodeToIcon(weather.weather_code).emoji}
          </Text>
        )}
      </View>

      {stickers.length > 0 && (
        <Text style={styles.stickers} numberOfLines={1}>
          {stickers.slice(0, 3).map((s) => s.sticker).join('')}
        </Text>
      )}

      {occs.slice(0, MAX_CHIPS).map((o) => (
        <View
          key={o.key}
          style={[
            styles.chip,
            o.event.all_day
              ? { backgroundColor: o.color }
              : { borderLeftColor: o.color, borderLeftWidth: 2 },
          ]}>
          <Text
            numberOfLines={1}
            style={[styles.chipText, { color: o.event.all_day ? '#fff' : inMonth ? t.text : t.textMuted }]}>
            {o.event.icon ?? ''}
            {o.event.title}
          </Text>
        </View>
      ))}
      {occs.length > MAX_CHIPS && (
        <Text style={[styles.more, { color: t.textSecondary }]}>+{occs.length - MAX_CHIPS}</Text>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  weekHeader: { flexDirection: 'row', paddingVertical: 4 },
  weekLabel: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600' },
  row: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth },
  cell: {
    flex: 1,
    minHeight: 84,
    paddingHorizontal: 2,
    paddingTop: 2,
    paddingBottom: 2,
    borderLeftWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  cellHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selectedRing: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderWidth: 2, borderRadius: 4 },
  dateBadge: { minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  dateNum: { fontSize: 12, fontWeight: '600', paddingHorizontal: 2 },
  dateToday: { fontWeight: '800' },
  weather: { fontSize: 11 },
  stickers: { fontSize: 11, lineHeight: 14 },
  chip: { marginTop: 1, paddingHorizontal: 2, borderRadius: 3 },
  chipText: { fontSize: 9, lineHeight: 13 },
  more: { fontSize: 9 },
});
