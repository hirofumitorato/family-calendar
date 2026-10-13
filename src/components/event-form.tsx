import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { StickerPicker } from '@/components/sticker-picker';
import { EVENT_ICON_GROUPS } from '@/constants/stickers';
import { useTheme } from '@/hooks/use-theme';
import { formatTime, parseDateKey, parseTime, toDateKey } from '@/lib/date';
import type { Calendar, CalendarEvent, NewCalendarEvent } from '@/lib/types';
import { notify } from '@/utils/dialog';

const REPEATS = [
  { label: 'なし', value: null },
  { label: '毎日', value: 'FREQ=DAILY' },
  { label: '毎週', value: 'FREQ=WEEKLY' },
  { label: '毎月', value: 'FREQ=MONTHLY' },
  { label: '毎年', value: 'FREQ=YEARLY' },
] as const;

const REMINDERS = [
  { label: 'なし', value: [] as number[] },
  { label: '10分前', value: [10] },
  { label: '1時間前', value: [60] },
  { label: '前日', value: [24 * 60] },
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function EventForm({
  calendars,
  initial,
  defaultCalendarId,
  defaultDate,
  onSubmit,
  onDelete,
}: {
  calendars: Calendar[];
  initial?: CalendarEvent;
  defaultCalendarId?: string;
  defaultDate: string;
  onSubmit: (value: NewCalendarEvent) => Promise<void>;
  /** 削除ボタン。確認（範囲選択）は呼び出し側で行う */
  onDelete?: () => void;
}) {
  const t = useTheme();
  const initStart = initial ? new Date(initial.starts_at) : parseDateKey(defaultDate);
  const initEnd = initial ? new Date(initial.ends_at) : parseDateKey(defaultDate);

  const [title, setTitle] = useState(initial?.title ?? '');
  const [icon, setIcon] = useState<string | null>(initial?.icon ?? null);
  const [calendarId, setCalendarId] = useState(initial?.calendar_id ?? defaultCalendarId ?? calendars[0]?.id);
  const [allDay, setAllDay] = useState(initial?.all_day ?? false);
  const [startDate, setStartDate] = useState(toDateKey(initStart));
  const [endDate, setEndDate] = useState(toDateKey(initEnd));
  const [startTime, setStartTime] = useState(initial ? formatTime(initStart) : '10:00');
  const [endTime, setEndTime] = useState(initial ? formatTime(initEnd) : '11:00');
  const [rrule, setRrule] = useState<string | null>(initial?.rrule ?? null);
  const [remind, setRemind] = useState<number[]>(initial?.remind_minutes_before ?? []);
  const [location, setLocation] = useState(initial?.location ?? '');
  const [memo, setMemo] = useState(initial?.memo ?? '');
  const [iconPicker, setIconPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!title.trim()) return notify('タイトルを入力してください');
    if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate)) {
      return notify('日付は YYYY-MM-DD の形式で入力してください');
    }
    const s = parseDateKey(startDate);
    const e = parseDateKey(endDate);
    if (allDay) {
      e.setHours(23, 59, 0, 0);
    } else {
      const st = parseTime(startTime);
      const et = parseTime(endTime);
      if (!st || !et) return notify('時刻は HH:mm の形式で入力してください');
      s.setHours(st.h, st.m, 0, 0);
      e.setHours(et.h, et.m, 0, 0);
    }
    if (e < s) return notify('終了は開始より後にしてください');
    if (!calendarId) return notify('カレンダーを選択してください');

    setSaving(true);
    try {
      await onSubmit({
        calendar_id: calendarId,
        title: title.trim(),
        icon,
        all_day: allDay,
        starts_at: s.toISOString(),
        ends_at: e.toISOString(),
        rrule,
        exdates: initial?.exdates ?? [],
        remind_minutes_before: remind,
        location: location.trim() || null,
        memo: memo.trim() || null,
      });
    } catch (err) {
      notify('保存できませんでした', err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const input = [styles.input, { color: t.text, backgroundColor: t.backgroundElement }];
  const label = [styles.label, { color: t.textSecondary }];


  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.root, { backgroundColor: t.background }]}>
        <View style={styles.titleRow}>
          <Pressable
            onPress={() => setIconPicker(true)}
            accessibilityLabel="アイコンを選ぶ"
            style={[styles.iconButton, { backgroundColor: t.backgroundElement }]}>
            <Text style={{ fontSize: 24 }}>{icon ?? '🙂'}</Text>
          </Pressable>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="タイトル"
            placeholderTextColor={t.textMuted}
            style={[...input, { flex: 1, fontSize: 18 }]}
            autoFocus={!initial}
          />
        </View>

        <Text style={label}>カレンダー</Text>
        <Chips
          options={calendars.map((c) => ({
            label: `${c.visibility === 'personal' ? '🔒' : '👪'} ${c.name}`,
            value: c.id,
            color: c.color,
          }))}
          value={calendarId}
          onChange={setCalendarId}
        />

        <View style={styles.switchRow}>
          <Text style={[styles.label, { color: t.text, marginTop: 0 }]}>終日</Text>
          <Switch value={allDay} onValueChange={setAllDay} />
        </View>

        <Text style={label}>開始</Text>
        <View style={styles.row}>
          <TextInput value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" style={[...input, { flex: 2 }]} />
          {!allDay && (
            <TextInput value={startTime} onChangeText={setStartTime} placeholder="HH:mm" style={[...input, { flex: 1 }]} />
          )}
        </View>
        <Text style={label}>終了</Text>
        <View style={styles.row}>
          <TextInput value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" style={[...input, { flex: 2 }]} />
          {!allDay && (
            <TextInput value={endTime} onChangeText={setEndTime} placeholder="HH:mm" style={[...input, { flex: 1 }]} />
          )}
        </View>

        <Text style={label}>繰り返し</Text>
        <Chips options={REPEATS} value={rrule} onChange={setRrule} />

        <Text style={label}>通知</Text>
        <Chips
          options={REMINDERS}
          value={remind}
          onChange={setRemind}
          eq={(a, b) => a.join() === b.join()}
        />

        <Text style={label}>場所</Text>
        <TextInput value={location} onChangeText={setLocation} placeholder="場所" placeholderTextColor={t.textMuted} style={input} />

        <Text style={label}>メモ</Text>
        <TextInput
          value={memo}
          onChangeText={setMemo}
          placeholder="メモ"
          placeholderTextColor={t.textMuted}
          multiline
          style={[...input, { minHeight: 80, textAlignVertical: 'top' }]}
        />

        <Pressable
          disabled={saving}
          onPress={submit}
          style={[styles.primary, { backgroundColor: t.accent, opacity: saving ? 0.6 : 1 }]}>
          <Text style={styles.primaryText}>{saving ? '保存中…' : '保存'}</Text>
        </Pressable>

        {onDelete && (
          <Pressable
            onPress={onDelete}
            style={styles.danger}>
            <Text style={{ color: t.sunday, fontSize: 15 }}>削除</Text>
          </Pressable>
        )}
      </ScrollView>

      <StickerPicker
        visible={iconPicker}
        title="アイコンを選ぶ"
        groups={EVENT_ICON_GROUPS}
        allowClear
        onSelect={(v) => {
          setIcon(v);
          setIconPicker(false);
        }}
        onClose={() => setIconPicker(false)}
      />
    </KeyboardAvoidingView>
  );
}

function Chips<T>({
  options,
  value,
  onChange,
  eq = (a, b) => a === b,
}: {
  options: readonly { label: string; value: T; color?: string }[];
  value: T;
  onChange: (v: T) => void;
  eq?: (a: T, b: T) => boolean;
}) {
  const t = useTheme();
  return (
    <View style={styles.chips}>
      {options.map((o) => {
        const active = eq(o.value, value);
        return (
          <Pressable
            key={o.label}
            onPress={() => onChange(o.value)}
            style={[
              styles.chip,
              { borderColor: o.color ?? t.border },
              active && { backgroundColor: o.color ?? t.accent, borderColor: o.color ?? t.accent },
            ]}>
            <Text style={{ color: active ? '#fff' : t.text, fontSize: 13 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { padding: 16, paddingBottom: 48 },
  titleRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  iconButton: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 12, marginTop: 16, marginBottom: 6 },
  input: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  row: { flexDirection: 'row', gap: 8 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  primary: { marginTop: 28, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  danger: { marginTop: 12, paddingVertical: 12, alignItems: 'center' },
});
