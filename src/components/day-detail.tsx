import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { formatDayLabel, formatTime, isSameDay, toDateKey } from '@/lib/date';
import { getHolidayName } from '@/lib/holidays';
import type { DaySticker, EventOccurrence } from '@/lib/types';
import { weatherCodeToIcon } from '@/lib/weather';
import type { MonthData } from '@/state/app-store';
import { confirm } from '@/utils/dialog';

export function DayDetail({
  date,
  data,
  onPressEvent,
  onDeleteEvent,
  onAddSticker,
  onRemoveSticker,
}: {
  date: Date;
  data: MonthData;
  onPressEvent: (o: EventOccurrence) => void;
  onDeleteEvent: (o: EventOccurrence) => void;
  onAddSticker: () => void;
  onRemoveSticker: (s: DaySticker) => void;
}) {
  const t = useTheme();
  const key = toDateKey(date);
  const holiday = getHolidayName(key);
  const weather = data.weatherByDay.get(key);
  const stickers = data.stickersByDay.get(key) ?? [];
  const occs = data.occurrencesByDay.get(key) ?? [];

  const timeLabel = (o: EventOccurrence) => {
    if (o.event.all_day) return '終日';
    const start = isSameDay(o.start, date) ? formatTime(o.start) : '';
    const end = isSameDay(o.end, date) ? formatTime(o.end) : '';
    return `${start}〜${end}`;
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.dayLabel, { color: t.text }]}>{formatDayLabel(date)}</Text>
          {holiday && <Text style={[styles.holiday, { color: t.sunday }]}>{holiday}</Text>}
        </View>
        {weather && (
          <View style={styles.weather}>
            <Text style={styles.weatherEmoji}>{weatherCodeToIcon(weather.weather_code).emoji}</Text>
            <Text style={[styles.weatherText, { color: t.textSecondary }]}>
              {weatherCodeToIcon(weather.weather_code).label}
              {weather.temp_max != null && ` ${Math.round(weather.temp_max)}°/${Math.round(weather.temp_min ?? 0)}°`}
              {weather.precip_prob != null && ` ☂${weather.precip_prob}%`}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.stickerRow}>
        {stickers.map((s) => (
          <Pressable
            key={s.id}
            accessibilityLabel={`スタンプ ${s.sticker} を外す`}
            onPress={async () => {
              if (await confirm(`スタンプ ${s.sticker} を外しますか？`, { okText: '外す', destructive: true })) {
                onRemoveSticker(s);
              }
            }}>
            <Text style={styles.sticker}>{s.sticker}</Text>
          </Pressable>
        ))}
        <Pressable
          onPress={onAddSticker}
          accessibilityLabel="スタンプを追加"
          style={[styles.addSticker, { borderColor: t.border }]}>
          <Text style={{ color: t.textSecondary, fontSize: 12 }}>＋スタンプ</Text>
        </Pressable>
      </View>

      <Text style={[styles.hint, { color: t.textMuted }]}>日付マスを長押しすると、マスの色を変えられます</Text>

      {occs.length === 0 ? (
        <Text style={[styles.empty, { color: t.textMuted }]}>予定はありません</Text>
      ) : (
        occs.map((o) => (
          <Pressable
            key={o.key}
            onPress={() => onPressEvent(o)}
            style={({ pressed }) => [
              styles.event,
              { backgroundColor: pressed ? t.selected : t.backgroundElement },
            ]}>
            <View style={[styles.colorBar, { backgroundColor: o.calendar.color }]} />
            <Text style={[styles.eventTime, { color: t.textSecondary }]}>{timeLabel(o)}</Text>
            <Text style={[styles.eventTitle, { color: t.text }]} numberOfLines={1}>
              {o.event.icon ? `${o.event.icon} ` : ''}
              {o.event.title}
            </Text>
            <Text style={[styles.calName, { color: t.textSecondary }]}>
              {o.calendar.visibility === 'personal' ? '🔒' : '👪'}
            </Text>
            <Pressable
              hitSlop={8}
              accessibilityLabel={`${o.event.title} を削除`}
              onPress={async () => {
                const ok = await confirm(`「${o.event.title}」を削除しますか？`, {
                  message: o.event.rrule ? '繰り返し予定はすべての回が削除されます' : undefined,
                  okText: '削除',
                  destructive: true,
                });
                if (ok) onDeleteEvent(o);
              }}
              style={styles.deleteButton}>
              <Text style={{ color: t.sunday, fontSize: 13 }}>削除</Text>
            </Pressable>
          </Pressable>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { padding: 16, gap: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  dayLabel: { fontSize: 18, fontWeight: '700' },
  holiday: { fontSize: 12, marginTop: 2 },
  weather: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  weatherEmoji: { fontSize: 20 },
  weatherText: { fontSize: 12 },
  stickerRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  sticker: { fontSize: 24 },
  addSticker: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  empty: { fontSize: 14, paddingVertical: 8 },
  event: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, overflow: 'hidden', minHeight: 44 },
  colorBar: { width: 4, alignSelf: 'stretch' },
  eventTime: { width: 92, fontSize: 12, paddingLeft: 10 },
  eventTitle: { flex: 1, fontSize: 15 },
  calName: { paddingHorizontal: 6, fontSize: 12 },
  deleteButton: { paddingHorizontal: 12, alignSelf: 'stretch', justifyContent: 'center' },
  hint: { fontSize: 11 },
});
