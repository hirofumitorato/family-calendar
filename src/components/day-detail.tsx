import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MemberBadges } from '@/components/member-badge';
import { WeatherSheet } from '@/components/weather-sheet';
import { MemberStripe } from '@/components/member-stripe';
import { useTheme } from '@/hooks/use-theme';
import { formatDayLabel, formatTime, isSameDay, parseDateKey, toDateKey } from '@/lib/date';
import { getHolidayName } from '@/lib/holidays';
import { getRokuyo } from '@/lib/rokuyo';
import { bestDirectionNames } from '@/lib/kaiun';
import { birthStars } from '@/lib/kyusei';
import type { DaySticker, EventOccurrence } from '@/lib/types';
import { weatherCodeToIcon } from '@/lib/weather';
import { useApp, type MonthData } from '@/state/app-store';
import { useCalendarPrefs } from '@/state/calendar-prefs';
import { confirm } from '@/utils/dialog';
import { EventGradient, gradientColorsOf } from '@/components/event-gradient';
import { eventLook } from '@/utils/event-look';

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
  const [weatherOpen, setWeatherOpen] = useState(false);
  const locationName = useApp().ctx?.family.location_name ?? null;
  const stickers = data.stickersByDay.get(key) ?? [];
  const occs = data.occurrencesByDay.get(key) ?? [];
  const prefs = useCalendarPrefs();
  const rokuyo = prefs.rokuyo ? getRokuyo(date) : null;
  const bestDirs = prefs.kaiun
    ? (() => {
        const st = birthStars(parseDateKey(prefs.kaiun.birthDate));
        return bestDirectionNames(date, st.honmei, st.getsumei);
      })()
    : [];

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
          <Pressable
            onPress={() => setWeatherOpen(true)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="時間ごとの天気を見る"
            style={({ pressed }) => [styles.weather, pressed && { opacity: 0.5 }]}>
            {/* どこの天気か */}
            {locationName && (
              <Text style={[styles.place, { color: t.textSecondary, borderColor: t.border }]}>{locationName}</Text>
            )}
            <Text style={styles.weatherEmoji}>{weatherCodeToIcon(weather.weather_code).emoji}</Text>
            <Text style={[styles.weatherText, { color: t.textSecondary }]}>
              {weatherCodeToIcon(weather.weather_code).label}
              {weather.temp_max != null && ` ${Math.round(weather.temp_max)}°/${Math.round(weather.temp_min ?? 0)}°`}
              {weather.precip_prob != null && ` ☂${weather.precip_prob}%`}
            </Text>
            <Text style={[styles.weatherText, { color: t.textMuted }]}>›</Text>
          </Pressable>
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

      {prefs.kaiun && (
        <Text style={[styles.bestLine, { color: t.textSecondary }]}>
          🧭 この日の最大吉方：{bestDirs.length ? bestDirs.join('・') : 'なし'}
        </Text>
      )}

      {occs.length === 0 ? (
        <Text style={[styles.empty, { color: t.textMuted }]}>予定はありません</Text>
      ) : (
        occs.map((o) => {
          // カレンダー・編集画面のタイトルと同じ色にする
          const look = eventLook(o.color, o.event.all_day, t);
          const grad = gradientColorsOf(o.event.color, o.members.map((m) => m.color));
          return (
          <Pressable
            key={o.key}
            accessibilityLabel={`${o.event.title} の内容を見る`}
            onPress={() => onPressEvent(o)}
            style={({ pressed }) => [
              styles.event,
              { backgroundColor: grad.length > 1 ? 'transparent' : look.bg, opacity: pressed ? 0.7 : 1 },
            ]}>
            {/* 複数人なら背景を選んだ人の色のグラデーションに */}
            <EventGradient colors={grad} allDay={o.event.all_day} />
            {/* 左端の帯：選ばれた人の色で分割（予定の色を指定していればその色） */}
            <MemberStripe
              colors={o.event.color ? [] : o.members.map((m) => m.color)}
              fallback={look.bar}
              width={6}
            />
            {/* 誰の予定か：先頭に小さく */}
            <View style={styles.badgeCol}>
              <MemberBadges people={o.members} outlined={look.solid} />
            </View>
            <View style={styles.eventBody}>
              <Text style={[styles.eventTitle, { color: look.text }]} numberOfLines={1}>
                {o.event.icon ? `${o.event.icon} ` : ''}
                {o.event.title}
              </Text>
              <Text style={[styles.eventTime, { color: look.sub }]} numberOfLines={1}>
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
              <Text style={{ color: look.solid ? '#fff' : t.accent, fontSize: 13, fontWeight: '700' }}>編集</Text>
            </Pressable>
            <Pressable
              hitSlop={6}
              accessibilityLabel={`${o.event.title} を削除`}
              onPress={() => onDeleteEvent(o)}
              style={[styles.rowButton, { paddingRight: 12 }]}>
              <Text style={{ color: look.solid ? '#fff' : t.sunday, fontSize: 13, fontWeight: '700' }}>削除</Text>
            </Pressable>
          </Pressable>
          );
        })
      )}
      <WeatherSheet date={date} daily={weather} visible={weatherOpen} onClose={() => setWeatherOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { padding: 16, gap: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  dayRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  dayLabel: { fontSize: 18, fontWeight: '700' },
  rokuyo: { fontSize: 13, fontWeight: '600' },
  bestLine: { fontSize: 13 },
  holiday: { fontSize: 12, marginTop: 2 },
  weather: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  weatherEmoji: { fontSize: 20 },
  place: { fontSize: 11, fontWeight: '600', borderWidth: 1, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1, marginRight: 2 },
  weatherText: { fontSize: 12 },
  stickerRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  sticker: { fontSize: 24 },
  empty: { fontSize: 14, paddingVertical: 8 },
  event: { zIndex: 0, flexDirection: 'row', alignItems: 'center', borderRadius: 10, overflow: 'hidden', minHeight: 56 },
  colorBar: { width: 4, alignSelf: 'stretch' },
  badgeCol: { paddingLeft: 8, alignSelf: 'center' },
  eventBody: { flex: 1, paddingLeft: 8, paddingVertical: 8, gap: 3 },
  eventTitle: { fontSize: 15, fontWeight: '600' },
  eventTime: { fontSize: 12 },
  rowButton: { paddingHorizontal: 8, alignSelf: 'stretch', justifyContent: 'center' },
});
