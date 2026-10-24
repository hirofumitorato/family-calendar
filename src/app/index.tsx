import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DayDetail } from '@/components/day-detail';
import { MonthGrid } from '@/components/month-grid';
import { SwipePager } from '@/components/swipe-pager';
import { DayColorPicker } from '@/components/day-color-picker';
import { DeleteEventSheet } from '@/components/delete-event-sheet';
import { EventDetailSheet } from '@/components/event-detail-sheet';
import { deleteEventWithScope } from '@/data/delete-event';
import { useTheme } from '@/hooks/use-theme';
import { warekiYear } from '@/lib/wareki';
import { addMonths, formatDayLabel, startOfDay, toDateKey } from '@/lib/date';
import type { EventOccurrence } from '@/lib/types';
import { useApp, useMonthData } from '@/state/app-store';

export default function CalendarScreen() {
  const router = useRouter();
  const t = useTheme();
  const { repo, defaultCalendar, bumpRevision } = useApp();
  const [cursor, setCursor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selected, setSelected] = useState(() => startOfDay(new Date()));
  const [colorTarget, setColorTarget] = useState<Date | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EventOccurrence | null>(null);
  const [viewTarget, setViewTarget] = useState<EventOccurrence | null>(null);

  const openEditor = (o: EventOccurrence) =>
    router.push({ pathname: '/event/[id]', params: { id: o.event.id, occurrence: o.start.toISOString() } });

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const data = useMonthData(year, month);
  const wareki = warekiYear(year, month + 1, 1);
  const now = new Date();
  const isThisMonth = now.getFullYear() === year && now.getMonth() === month;

  // 月を切り替えたら、その月に今日があれば今日、なければ1日を選択する
  const move = (n: number) => {
    const next = addMonths(cursor, n);
    setCursor(next);
    const now = new Date();
    const hasToday = now.getFullYear() === next.getFullYear() && now.getMonth() === next.getMonth();
    setSelected(hasToday ? startOfDay(now) : next);
  };
  const goToday = () => {
    const now = new Date();
    setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelected(startOfDay(now));
  };

  const setDayColor = async (color: string | null) => {
    const target = colorTarget;
    setColorTarget(null);
    if (!target || !defaultCalendar) return;
    await repo.setDayColor(defaultCalendar.id, toDateKey(target), color);
    bumpRevision();
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: t.background }]} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => move(-1)} hitSlop={12} accessibilityLabel="前の月">
          <Text style={[styles.nav, { color: t.text }]}>‹</Text>
        </Pressable>
        <View style={styles.titleBox}>
          <Text style={[styles.month, { color: t.text }]}>
            {year}年{month + 1}月
          </Text>
          {/* 和暦（その月の1日時点） */}
          {wareki && <Text style={[styles.wareki, { color: t.textSecondary }]}>{wareki}</Text>}
        </View>
        <Pressable onPress={() => move(1)} hitSlop={12} accessibilityLabel="次の月">
          <Text style={[styles.nav, { color: t.text }]}>›</Text>
        </Pressable>
        {/* どれだけ遠くの年月へ行っても、ここを押せば今日の月にすぐ戻れる */}
        <Pressable
          onPress={goToday}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="今日に戻る"
          style={[
            styles.todayBtn,
            isThisMonth ? { borderColor: t.border } : { borderColor: t.accent, backgroundColor: t.accent },
          ]}>
          <Text style={{ color: isThisMonth ? t.textSecondary : '#fff', fontSize: 12, fontWeight: '700' }}>今日</Text>
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => router.push('/settings')} hitSlop={8} accessibilityLabel="設定">
          <Text style={styles.gear}>⚙️</Text>
        </Pressable>
      </View>

      {/* 上：カレンダー。横スワイプで月を切り替え（左→翌月、右→前月） */}
      <SwipePager onPrev={() => move(-1)} onNext={() => move(1)}>
        <MonthGrid
          year={year}
          month={month}
          selected={selected}
          onSelect={(d) => {
            setSelected(d);
            if (d.getMonth() !== month) setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
          }}
          onLongPress={(d) => {
            setSelected(d);
            setColorTarget(d);
          }}
          data={data}
        />
      </SwipePager>

      {/* 下：予定の詳細エリア。画面下に固定し、予定が多いときはこの中だけスクロールする */}
      <ScrollView
        style={[styles.detail, { borderTopColor: t.border }]}
        contentContainerStyle={{ paddingBottom: 96 }}>
        <DayDetail
          date={selected}
          data={data}
          onPressEvent={setViewTarget}
          onEditEvent={openEditor}
          onDeleteEvent={setDeleteTarget}
          onRemoveSticker={async (s) => {
            await repo.removeSticker(s.id);
            bumpRevision();
          }}
        />
      </ScrollView>

      <Pressable
        accessibilityLabel="予定を追加"
        onPress={() => router.push({ pathname: '/event/new', params: { date: toDateKey(selected) } })}
        style={[styles.fab, { backgroundColor: t.accent }]}>
        <Text style={styles.fabText}>＋</Text>
      </Pressable>

      <EventDetailSheet
        occurrence={viewTarget}
        onClose={() => setViewTarget(null)}
        onEdit={(o) => {
          setViewTarget(null);
          openEditor(o);
        }}
        onDelete={(o) => {
          setViewTarget(null);
          setDeleteTarget(o);
        }}
      />

      <DeleteEventSheet
        target={deleteTarget && { event: deleteTarget.event, occurrenceStart: deleteTarget.start }}
        onClose={() => setDeleteTarget(null)}
        onSelect={async (scope) => {
          const target = deleteTarget;
          setDeleteTarget(null);
          if (!target) return;
          await deleteEventWithScope(repo, target.event, target.start, scope);
          bumpRevision();
        }}
      />

      <DayColorPicker
        visible={colorTarget !== null}
        title={colorTarget ? `${formatDayLabel(colorTarget)} のマスの色` : ''}
        current={colorTarget ? data.colorByDay.get(toDateKey(colorTarget)) ?? null : null}
        onSelect={setDayColor}
        onClose={() => setColorTarget(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  titleBox: { alignItems: 'center', minWidth: 112 },
  wareki: { fontSize: 11, marginTop: -2 },
  todayBtn: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 4 },
  nav: { fontSize: 28, lineHeight: 30, paddingHorizontal: 4 },
  month: { fontSize: 20, fontWeight: '700' },
  pill: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 4 },
  gear: { fontSize: 20 },
  detail: { flex: 1, borderTopWidth: StyleSheet.hairlineWidth },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 32,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 30 },
});
