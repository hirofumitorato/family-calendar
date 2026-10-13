import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DayDetail } from '@/components/day-detail';
import { MonthGrid } from '@/components/month-grid';
import { StickerPicker } from '@/components/sticker-picker';
import { ViewModeToggle } from '@/components/view-mode-toggle';
import { DAY_STICKER_GROUPS } from '@/constants/stickers';
import { useTheme } from '@/hooks/use-theme';
import { addMonths, startOfDay, toDateKey } from '@/lib/date';
import { useApp, useMonthData } from '@/state/app-store';

export default function CalendarScreen() {
  const t = useTheme();
  const { repo, viewMode, setViewMode, defaultCalendar, bumpRevision } = useApp();
  const [cursor, setCursor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selected, setSelected] = useState(() => startOfDay(new Date()));
  const [pickerOpen, setPickerOpen] = useState(false);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const data = useMonthData(year, month);

  const move = (n: number) => setCursor((c) => addMonths(c, n));
  const goToday = () => {
    const now = new Date();
    setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelected(startOfDay(now));
  };

  const addSticker = async (value: string | null) => {
    setPickerOpen(false);
    if (!value || !defaultCalendar) return;
    await repo.addSticker(defaultCalendar.id, toDateKey(selected), value);
    bumpRevision();
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: t.background }]} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => move(-1)} hitSlop={12} accessibilityLabel="前の月">
          <Text style={[styles.nav, { color: t.text }]}>‹</Text>
        </Pressable>
        <Pressable onPress={goToday} accessibilityLabel="今日に戻る">
          <Text style={[styles.month, { color: t.text }]}>
            {year}年{month + 1}月
          </Text>
        </Pressable>
        <Pressable onPress={() => move(1)} hitSlop={12} accessibilityLabel="次の月">
          <Text style={[styles.nav, { color: t.text }]}>›</Text>
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable onPress={goToday} style={[styles.pill, { borderColor: t.border }]}>
          <Text style={{ color: t.text, fontSize: 13 }}>今日</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/settings')} hitSlop={8} accessibilityLabel="設定">
          <Text style={styles.gear}>⚙️</Text>
        </Pressable>
      </View>

      <View style={styles.toggle}>
        <ViewModeToggle value={viewMode} onChange={setViewMode} />
      </View>

      <ScrollView>
        <MonthGrid
          year={year}
          month={month}
          selected={selected}
          onSelect={(d) => {
            setSelected(d);
            if (d.getMonth() !== month) setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
          }}
          data={data}
        />
        <DayDetail
          date={selected}
          data={data}
          onPressEvent={(o) => router.push({ pathname: '/event/[id]', params: { id: o.event.id } })}
          onAddSticker={() => setPickerOpen(true)}
          onRemoveSticker={async (s) => {
            await repo.removeSticker(s.id);
            bumpRevision();
          }}
        />
        <View style={{ height: 96 }} />
      </ScrollView>

      <Pressable
        accessibilityLabel="予定を追加"
        onPress={() => router.push({ pathname: '/event/new', params: { date: toDateKey(selected) } })}
        style={[styles.fab, { backgroundColor: t.accent }]}>
        <Text style={styles.fabText}>＋</Text>
      </Pressable>

      <StickerPicker
        visible={pickerOpen}
        title="スタンプを貼る"
        groups={DAY_STICKER_GROUPS}
        onSelect={addSticker}
        onClose={() => setPickerOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 8 },
  nav: { fontSize: 28, lineHeight: 30, paddingHorizontal: 4 },
  month: { fontSize: 20, fontWeight: '700' },
  pill: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 4 },
  gear: { fontSize: 20 },
  toggle: { paddingHorizontal: 16, paddingBottom: 8 },
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
