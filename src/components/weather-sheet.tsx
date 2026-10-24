import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ScrollViewInstance,
} from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { formatDayLabel, isSameDay } from '@/lib/date';
import type { WeatherDaily, WeatherHourly } from '@/lib/types';
import { hourlyIcon, weatherCodeToIcon } from '@/lib/weather';
import { useApp } from '@/state/app-store';

const COL = 54;
const GRAPH = 56; // 気温の点を動かす高さ
const BAR = 44; // 降水確率の棒の最大の高さ
const RAIN = '#3B82F6';

/** 日付の詳細で天気をタップしたときに出る、その日の時間ごとの気温・降水確率 */
export function WeatherSheet({
  date,
  daily,
  visible,
  onClose,
}: {
  date: Date;
  daily: WeatherDaily | undefined;
  visible: boolean;
  onClose: () => void;
}) {
  const t = useTheme();
  const { repo, ctx } = useApp();
  const [hours, setHours] = useState<WeatherHourly[] | null>(null);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const dateKey = daily?.date;
  const today = isSameDay(date, new Date());
  const nowHour = new Date().getHours();

  useEffect(() => {
    if (!visible || !ctx || !dateKey) return;
    let alive = true;
    setHours(null);
    repo
      .listHourlyWeather(ctx.family.id, dateKey)
      .then((h) => alive && setHours(h))
      .catch(() => alive && setHours([]));
    return () => {
      alive = false;
    };
  }, [visible, ctx, repo, dateKey]);

  // 今日なら今の時刻、それ以外は朝6時あたりから見せる
  useEffect(() => {
    if (!hours?.length) return;
    const start = Math.max(0, (today ? nowHour : 6) - 1);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ x: start * COL, animated: false }));
  }, [hours, today, nowHour]);

  const temps = (hours ?? []).map((h) => h.temp).filter((x): x is number => x != null);
  const tMax = temps.length ? Math.max(...temps) : 0;
  const tMin = temps.length ? Math.min(...temps) : 0;
  const span = Math.max(1, tMax - tMin);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="閉じる" />
      <View style={[styles.sheet, { backgroundColor: t.background }]}>
        <View style={[styles.grabber, { backgroundColor: t.border }]} />
        <Text style={[styles.title, { color: t.text }]}>{formatDayLabel(date)} の天気</Text>
        {daily && (
          <Text style={[styles.summary, { color: t.textSecondary }]}>
            {weatherCodeToIcon(daily.weather_code).emoji} {weatherCodeToIcon(daily.weather_code).label}
            {daily.temp_max != null && `　最高 ${Math.round(daily.temp_max)}° / 最低 ${Math.round(daily.temp_min ?? 0)}°`}
            {daily.precip_prob != null && `　☂ ${daily.precip_prob}%`}
          </Text>
        )}

        {hours === null ? (
          <ActivityIndicator style={{ marginVertical: 40 }} />
        ) : hours.length === 0 ? (
          <Text style={[styles.empty, { color: t.textMuted }]}>この日の時間ごとの予報はまだありません</Text>
        ) : (
          <View style={styles.tableRow}>
            {/* 左の見出し列 */}
            <View style={styles.legend}>
              <Text style={[styles.legendText, { color: t.textSecondary, height: 20 }]}>時刻</Text>
              <Text style={[styles.legendText, { color: t.textSecondary, height: 30 }]}>天気</Text>
              <Text style={[styles.legendText, { color: t.textSecondary, height: GRAPH + 22 }]}>気温</Text>
              <Text style={[styles.legendText, { color: RAIN, height: BAR + 22 }]}>降水{'\n'}確率</Text>
            </View>
            <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator={false}>
              {hours.map((h) => {
                const isNow = today && h.hour === nowHour;
                const icon = hourlyIcon(h.weather_code, h.hour);
                const y = h.temp == null ? null : ((tMax - h.temp) / span) * (GRAPH - 10);
                const p = h.precip_prob ?? 0;
                return (
                  <View
                    key={h.hour}
                    accessibilityLabel={`${h.hour}時 ${icon.label} ${h.temp ?? '-'}度 降水確率${p}%`}
                    style={[styles.col, isNow && { backgroundColor: t.selected }]}>
                    <Text style={[styles.hour, { color: isNow ? t.accent : t.textSecondary }]}>
                      {isNow ? '今' : `${h.hour}時`}
                    </Text>
                    <Text style={styles.icon}>{icon.emoji}</Text>
                    <View style={{ height: GRAPH }}>
                      {y != null && (
                        <View style={[styles.dot, { top: y, backgroundColor: t.accent }]} />
                      )}
                    </View>
                    <Text style={[styles.temp, { color: t.text }]}>
                      {h.temp == null ? '-' : `${Math.round(h.temp)}°`}
                    </Text>
                    <View style={[styles.barTrack, { height: BAR }]}>
                      <View
                        style={[
                          styles.bar,
                          { height: Math.max(2, (p / 100) * BAR), backgroundColor: RAIN, opacity: 0.25 + (p / 100) * 0.75 },
                        ]}
                      />
                    </View>
                    <Text style={[styles.prob, { color: p >= 50 ? RAIN : t.textSecondary }]}>{p}%</Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        <Text style={[styles.note, { color: t.textMuted }]}>
          {repo.mode === 'demo' ? 'デモのサンプルデータです' : '予報：Open-Meteo'}
        </Text>
        <Pressable onPress={onClose} style={styles.close} accessibilityLabel="天気を閉じる">
          <Text style={{ color: t.textSecondary, fontSize: 15 }}>閉じる</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, paddingBottom: 28 },
  grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '700' },
  summary: { fontSize: 13, marginTop: 4, marginBottom: 12 },
  empty: { paddingVertical: 32, textAlign: 'center' },
  tableRow: { flexDirection: 'row' },
  legend: { width: 34, paddingTop: 6 },
  legendText: { fontSize: 10, lineHeight: 12 },
  col: { width: COL, alignItems: 'center', paddingVertical: 6, borderRadius: 10 },
  hour: { fontSize: 12, height: 20, fontWeight: '600' },
  icon: { fontSize: 20, height: 30 },
  dot: { position: 'absolute', left: -5, width: 10, height: 10, borderRadius: 5 },
  temp: { fontSize: 14, fontWeight: '600', height: 22, fontVariant: ['tabular-nums'] },
  barTrack: { width: 14, justifyContent: 'flex-end' },
  bar: { width: 14, borderRadius: 4 },
  prob: { fontSize: 11, height: 22, marginTop: 4, fontVariant: ['tabular-nums'] },
  note: { fontSize: 11, marginTop: 10 },
  close: { alignItems: 'center', paddingTop: 12 },
});
