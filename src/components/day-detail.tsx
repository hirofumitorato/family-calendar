import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { KaiunSheet } from '@/components/kaiun-sheet';
import { MemberBadge } from '@/components/member-badge';
import { useTheme } from '@/hooks/use-theme';
import { formatDayLabel, formatTime, isSameDay, toDateKey } from '@/lib/date';
import { getHolidayName } from '@/lib/holidays';
import { getRokuyo } from '@/lib/rokuyo';
import type { DaySticker, EventOccurrence } from '@/lib/types';
import { weatherCodeToIcon } from '@/lib/weather';
import type { MonthData } from '@/state/app-store';
import { useCalendarPrefs } from '@/state/calendar-prefs';
import { confirm } from '@/utils/dialog';

export function DayDetail({
  date,
  data,
  onPressEvent,
  onEditEvent,
  onDeleteEvent,
  onRemoveSticker,
}: {
  date: Date;
  data: MonthData;
  /** タップ：内容を見る */
  onPressEvent: (o: EventOccurrence) => void;
  onEditEvent: (o: EventOccurrence) => void;
  onDeleteEvent: (o: EventOccurrence) => void;
  onRemoveSticker: (s: DaySticker) => void;
}) {
  const t = useTheme();
  const key = toDateKey(date);
  const holiday = getHolidayName(key);
  const weather = data.weatherByDay.get(key);
  const stickers = data.stickersByDay.get(key) ?? [];
  const occs = data.occurrencesByDay.get(key) ?? [];
  const prefs = useCalendarPrefs();
  const rokuyo = prefs.rokuyo ? getRokuyo(date) : null;
  const [kaiunOpen, setKaiunOpen] = useState(false);

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
          <View style={styles.dayRow}>
            <Text style={[styles.dayLabel, { color: t.text }]}>{formatDayLabel(date)}</Text>
            {rokuyo && (
              <Text style={[styles.rokuyo, { color: rokuyo === '大安' ? t.sunday : t.textSecondary }]}>{rokuyo}</Text>
            )}
          </View>
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

      {/* 貼ってあるスタンプ（タップで外す） */}
      {stickers.length > 0 && (
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
        </View>
      )}

      {/* 表示するカレンダー */}
      <View style={styles.calRow}>
        <Text style={[styles.calLabel, { color: t.textSecondary }]}>表示するカレンダー</Text>
        <Pressable
          accessibilityLabel={`六曜カレンダー ${prefs.rokuyo ? 'オン' : 'オフ'}`}
          accessibilityState={{ selected: prefs.rokuyo }}
          onPress={() => prefs.update({ rokuyo: !prefs.rokuyo })}
          style={[styles.calChip, { borderColor: t.border }, prefs.rokuyo && { backgroundColor: t.accent, borderColor: t.accent }]}>
          <Text style={{ color: prefs.rokuyo ? '#fff' : t.text, fontSize: 12 }}>{prefs.rokuyo ? '✓ ' : ''}六曜</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={`開運カレンダー ${prefs.kaiun ? 'オン' : 'オフ'}`}
          accessibilityState={{ selected: Boolean(prefs.kaiun) }}
          onPress={() => setKaiunOpen(true)}
          style={[styles.calChip, { borderColor: t.border }, prefs.kaiun && { backgroundColor: t.accent, borderColor: t.accent }]}>
          <Text style={{ color: prefs.kaiun ? '#fff' : t.text, fontSize: 12 }}>{prefs.kaiun ? '✓ ' : '＋ '}🧭 開運</Text>
        </Pressable>
      </View>

      {occs.length === 0 ? (
        <Text style={[styles.empty, { color: t.textMuted }]}>予定はありません</Text>
      ) : (
        occs.map((o) => (
          <Pressable
            key={o.key}
            accessibilityLabel={`${o.event.title} の内容を見る`}
            onPress={() => onPressEvent(o)}
            style={({ pressed }) => [
              styles.event,
              { backgroundColor: pressed ? t.selected : t.backgroundElement },
            ]}>
            <View style={[styles.colorBar, { backgroundColor: o.color }]} />
            {/* 誰の予定か：先頭に小さく */}
            <View style={styles.badgeCol}>
              <MemberBadge person={o.member} />
            </View>
            <View style={styles.eventBody}>
              <Text style={[styles.eventTitle, { color: t.text }]} numberOfLines={1}>
                {o.event.icon ? `${o.event.icon} ` : ''}
                {o.event.title}
              </Text>
              <Text style={[styles.eventTime, { color: t.textSecondary }]} numberOfLines={1}>
                {timeLabel(o)}
                {o.event.location ? `  📍${o.event.location}` : ''}
                {o.calendar.visibility === 'personal' ? '  🔒' : ''}
              </Text>
            </View>
            <Pressable
              hitSlop={6}
              accessibilityLabel={`${o.event.title} を編集`}
              onPress={() => onEditEvent(o)}
              style={styles.rowButton}>
              <Text style={{ color: t.accent, fontSize: 13, fontWeight: '600' }}>編集</Text>
            </Pressable>
            <Pressable
              hitSlop={6}
              accessibilityLabel={`${o.event.title} を削除`}
              onPress={() => onDeleteEvent(o)}
              style={[styles.rowButton, { paddingRight: 12 }]}>
              <Text style={{ color: t.sunday, fontSize: 13, fontWeight: '600' }}>削除</Text>
            </Pressable>
          </Pressable>
        ))
      )}
      <KaiunSheet visible={kaiunOpen} onClose={() => setKaiunOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { padding: 16, gap: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  dayRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  dayLabel: { fontSize: 18, fontWeight: '700' },
  rokuyo: { fontSize: 13, fontWeight: '600' },
  calRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  calLabel: { fontSize: 12 },
  calChip: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  holiday: { fontSize: 12, marginTop: 2 },
  weather: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  weatherEmoji: { fontSize: 20 },
  weatherText: { fontSize: 12 },
  stickerRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  sticker: { fontSize: 24 },
  empty: { fontSize: 14, paddingVertical: 8 },
  event: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, overflow: 'hidden', minHeight: 56 },
  colorBar: { width: 4, alignSelf: 'stretch' },
  badgeCol: { paddingLeft: 8, alignSelf: 'center' },
  eventBody: { flex: 1, paddingLeft: 8, paddingVertical: 8, gap: 3 },
  eventTitle: { fontSize: 15, fontWeight: '600' },
  eventTime: { fontSize: 12 },
  rowButton: { paddingHorizontal: 8, alignSelf: 'stretch', justifyContent: 'center' },
});
