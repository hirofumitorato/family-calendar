import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ColorPopover } from '@/components/color-popover';
import { MemberStripe } from '@/components/member-stripe';
import { EventGradient, gradientColorsOf } from '@/components/event-gradient';
import { StartEndPanel } from '@/components/start-end-panel';
import { GenreSheet } from '@/components/genre-sheet';
import { PeopleSheet } from '@/components/people-sheet';
import { Stamp } from '@/components/stamp';
import { StampPicker } from '@/components/stamp-picker';
import { TemplatePicker } from '@/components/template-picker';
import { useGenres } from '@/hooks/use-genres';
import { useKeyboardFocusScroll } from '@/hooks/use-keyboard-focus-scroll';
import { useTheme } from '@/hooks/use-theme';
import { WEEKDAY_LABELS, formatTime, keepEndAfterStart, parseDateKey, parseTime, toDateKey } from '@/lib/date';
import { buildRepeat, parseRepeat, type RepeatFreq } from '@/lib/repeat';
import type {
  Calendar,
  CalendarEvent,
  EventTemplate,
  NewCalendarEvent,
  NewEventTemplate,
  Person,
} from '@/lib/types';
import { notify } from '@/utils/dialog';
import { eventLook } from '@/utils/event-look';

const REPEATS: { label: string; value: RepeatFreq | null }[] = [
  { label: 'なし', value: null },
  { label: '毎日', value: 'DAILY' },
  { label: '毎週', value: 'WEEKLY' },
  { label: '毎月', value: 'MONTHLY' },
  { label: '毎年', value: 'YEARLY' },
];

const REMINDERS = [
  { label: 'なし', value: [] as number[] },
  { label: '10分前', value: [10] },
  { label: '1時間前', value: [60] },
  { label: '前日', value: [24 * 60] },
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type TemplateInput = Omit<NewEventTemplate, 'family_id'>;

type Props = {
  calendars: Calendar[];
  people: Person[];
  defaultCalendarId?: string;
  /** テンプレート（ピッカーの表示とジャンル候補に使う） */
  templates?: EventTemplate[];
} & (
  | {
      /** 予定の追加・編集 */
      mode?: 'event';
      initial?: CalendarEvent;
      defaultDate: string;
      onSubmit: (value: NewCalendarEvent) => Promise<void>;
      /** 削除ボタン。確認（範囲選択）は呼び出し側で行う */
      onDelete?: () => void;
      /** 「テンプレートに保存」がオンのとき、保存時に呼ばれる */
      onSaveTemplate?: (template: TemplateInput) => Promise<void>;
      /** テンプレートピッカーの操作 */
      onEditTemplate?: (template: EventTemplate) => void;
      onCreateTemplate?: (genre: string | null) => void;
      onDeleteTemplate?: (template: EventTemplate) => Promise<void>;
    }
  | {
      /** テンプレートの追加・編集（日付は持たず、時間・繰り返し・ジャンルを保存する） */
      mode: 'template';
      initialTemplate?: EventTemplate;
      defaultGenre?: string | null;
      onSubmitTemplate: (value: TemplateInput) => Promise<void>;
      onDelete?: () => void;
    }
);

export function EventForm(props: Props) {
  const { calendars, people, defaultCalendarId, templates = [] } = props;
  const isTemplate = props.mode === 'template';
  const initial = props.mode !== 'template' ? props.initial : undefined;
  const tpl0 = props.mode === 'template' ? props.initialTemplate : undefined;
  const defaultDate = props.mode !== 'template' ? props.defaultDate : toDateKey(new Date());

  const t = useTheme();
  const initStart = initial ? new Date(initial.starts_at) : parseDateKey(defaultDate);
  const initEnd = initial ? new Date(initial.ends_at) : parseDateKey(defaultDate);
  const initRepeat = parseRepeat(initial?.rrule ?? tpl0?.rrule);

  const [title, setTitle] = useState(initial?.title ?? tpl0?.title ?? '');
  const [icon, setIcon] = useState<string | null>(initial?.icon ?? tpl0?.icon ?? null);
  // 誰の予定か（複数選べる）。新しい予定は、だれも選んでいない状態から始める
  const [memberIds, setMemberIds] = useState<string[]>(
    initial ? initial.member_ids ?? [] : tpl0 ? tpl0.member_ids ?? [] : [],
  );
  const [calendarId, setCalendarId] = useState(
    initial?.calendar_id ?? tpl0?.calendar_id ?? defaultCalendarId ?? calendars[0]?.id,
  );
  const [allDay, setAllDay] = useState(initial?.all_day ?? tpl0?.all_day ?? false);
  const [startDate, setStartDate] = useState(toDateKey(initStart));
  const [endDate, setEndDate] = useState(toDateKey(initEnd));
  const [startTime, setStartTime] = useState(initial ? formatTime(initStart) : tpl0?.start_time ?? '10:00');
  const [endTime, setEndTime] = useState(initial ? formatTime(initEnd) : tpl0?.end_time ?? '11:00');
  const [freq, setFreq] = useState<RepeatFreq | null>(initRepeat.freq);
  const [byDay, setByDay] = useState<number[]>(initRepeat.byDay);
  const [remind, setRemind] = useState<number[]>(initial?.remind_minutes_before ?? tpl0?.remind_minutes_before ?? []);
  const [location, setLocation] = useState(initial?.location ?? tpl0?.location ?? '');
  const [memo, setMemo] = useState(initial?.memo ?? tpl0?.memo ?? '');
  const [genre, setGenre] = useState<string | null>(
    tpl0?.category ?? (props.mode === 'template' ? props.defaultGenre ?? null : null),
  );
  const [color, setColor] = useState<string | null>(initial?.color ?? tpl0?.color ?? null);
  const [genreSheet, setGenreSheet] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [iconPicker, setIconPicker] = useState(false);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  // 時計の文字盤を指でなぞっている間は、画面がスクロールしないように止める
  const [dialTouching, setDialTouching] = useState(false);
  // 入力欄がキーボードに隠れないよう、フォーカスした欄を画面の上のほうへスクロールする
  const kb = useKeyboardFocusScroll();

  const { genres: genreList } = useGenres();
  const genres = genreList.map((g) => g.name);

  // 開始を変えたら、終了が開始より前にならないようにずらす
  const changeStart = (next: { startDate?: string; startTime?: string }) => {
    const sd = next.startDate ?? startDate;
    const st = next.startTime ?? startTime;
    const end = keepEndAfterStart({ startDate, startTime, endDate, endTime }, { startDate: sd, startTime: st });
    setStartDate(sd);
    setStartTime(st);
    setEndDate(end.endDate);
    setEndTime(end.endTime);
  };

  // 選んでいた人が削除されたら未指定に戻す
  useEffect(() => {
    const alive = memberIds.filter((id) => people.some((p) => p.id === id));
    if (alive.length !== memberIds.length) setMemberIds(alive);
  }, [people, memberIds]);

  const toggleMember = (id: string) =>
    setMemberIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  // 選んだ順ではなく、一覧の並び順で持つ（帯の色の順番がいつも同じになるように）
  const orderedMembers = people.filter((p) => memberIds.includes(p.id));
  const titleGradient = gradientColorsOf(color, orderedMembers.map((p) => p.color));

  const startWeekday = DATE_RE.test(startDate) ? parseDateKey(startDate).getDay() : new Date().getDay();
  const weeklyDays = freq === 'WEEKLY' && byDay.length === 0 ? [startWeekday] : byDay;

  const selectFreq = (f: RepeatFreq | null) => {
    setFreq(f);
    if (f === 'WEEKLY' && byDay.length === 0) setByDay([startWeekday]);
  };

  const toggleDay = (d: number) =>
    setByDay((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort((a, b) => a - b)));

  const applyTemplate = (tpl: EventTemplate) => {
    setTitle(tpl.title);
    setIcon(tpl.icon);
    setMemberIds((tpl.member_ids ?? []).filter((id) => people.some((p) => p.id === id)));
    if (tpl.calendar_id && calendars.some((c) => c.id === tpl.calendar_id)) setCalendarId(tpl.calendar_id);
    setAllDay(tpl.all_day);
    if (tpl.start_time) setStartTime(tpl.start_time);
    if (tpl.end_time) setEndTime(tpl.end_time);
    const r = parseRepeat(tpl.rrule);
    setFreq(r.freq);
    setByDay(r.byDay);
    setRemind(tpl.remind_minutes_before);
    setLocation(tpl.location ?? '');
    setMemo(tpl.memo ?? '');
    setGenre(tpl.category ?? null);
    setColor(tpl.color ?? null);
  };

  const templateValue = (): TemplateInput => ({
    category: genre,
    color,
    title: title.trim(),
    icon,
    member_ids: orderedMembers.map((p) => p.id),
    calendar_id: calendarId ?? null,
    all_day: allDay,
    start_time: allDay ? null : startTime,
    end_time: allDay ? null : endTime,
    // テンプレートには「以降を削除」で付いた UNTIL などは持たせない
    rrule: buildRepeat({ freq, byDay: weeklyDays }),
    remind_minutes_before: remind,
    location: location.trim() || null,
    memo: memo.trim() || null,
  });

  const submit = async () => {
    if (saving) return;
    if (!title.trim()) return notify('タイトルを入力してください');
    if (!allDay && (!parseTime(startTime) || !parseTime(endTime))) {
      return notify('時刻は HH:mm の形式で入力してください');
    }

    if (props.mode === 'template') {
      setSaving(true);
      try {
        await props.onSubmitTemplate(templateValue());
      } catch (err) {
        notify('保存できませんでした', err instanceof Error ? err.message : String(err));
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate)) {
      return notify('日付は YYYY-MM-DD の形式で入力してください');
    }
    const s = parseDateKey(startDate);
    const e = parseDateKey(endDate);
    if (allDay) {
      e.setHours(23, 59, 0, 0);
    } else {
      const st = parseTime(startTime)!;
      const et = parseTime(endTime)!;
      s.setHours(st.h, st.m, 0, 0);
      e.setHours(et.h, et.m, 0, 0);
    }
    if (e < s) return notify('終了は開始より後にしてください');
    if (!calendarId) return notify('カレンダーを選択してください');

    setSaving(true);
    try {
      if (saveAsTemplate && props.onSaveTemplate) await props.onSaveTemplate(templateValue());
      await props.onSubmit({
        calendar_id: calendarId,
        title: title.trim(),
        icon,
        member_ids: orderedMembers.map((p) => p.id),
        all_day: allDay,
        starts_at: s.toISOString(),
        ends_at: e.toISOString(),
        rrule: buildRepeat({ freq, byDay: weeklyDays }, initial?.rrule),
        exdates: initial?.exdates ?? [],
        remind_minutes_before: remind,
        location: location.trim() || null,
        memo: memo.trim() || null,
        color,
      });
    } catch (err) {
      notify('保存できませんでした', err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  // カレンダーに表示される色（予定の色 → 誰の予定かの色 → カレンダーの色）
  const autoColor =
    orderedMembers[0]?.color ?? calendars.find((c) => c.id === calendarId)?.color ?? t.accent;
  const shownColor = color ?? autoColor;

  const input = [styles.input, { color: t.text, backgroundColor: t.backgroundElement }];
  const label = [styles.label, { color: t.textSecondary }];
  const picker =
    props.mode !== 'template' && !initial && props.onEditTemplate
      ? {
          onEdit: props.onEditTemplate,
          onCreate: props.onCreateTemplate ?? (() => {}),
          onDelete: props.onDeleteTemplate ?? (async () => {}),
        }
      : null;

  return (
    <View style={{ flex: 1 }}>
      {/* キーボードで下の保存ボタンが隠れても押せるよう、ヘッダー右にも保存を置く */}
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={submit} hitSlop={10} accessibilityLabel="保存" disabled={saving}>
              <Text style={[styles.headerSave, { color: t.accent, opacity: saving ? 0.5 : 1 }]}>保存</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView
        ref={kb.scrollRef}
        scrollEnabled={!dialTouching}
        style={{ backgroundColor: t.background }}
        // キーボードが出ている間は、その高さ分の余白を足して一番下の欄も上まで動かせるようにする
        contentContainerStyle={[styles.root, { paddingBottom: 48 + kb.keyboardHeight }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive">
        {picker && (
          <View style={{ marginBottom: 16 }}>
            <Text style={[label, { marginTop: 0 }]}>テンプレートから入力</Text>
            <TemplatePicker
              templates={templates}
              genres={genres}
              people={people}
              onApply={applyTemplate}
              onEdit={picker.onEdit}
              onCreate={picker.onCreate}
              onDelete={picker.onDelete}
            />
          </View>
        )}

        {/* ジャンル（テンプレートとして保存するときに使う）。タイトルの上で選び、追加・編集もできる */}
        <View style={[styles.labelRow, { marginTop: 4 }]}>
          <Text style={[styles.label, { color: t.textSecondary, marginTop: 0, marginBottom: 0 }]}>ジャンル</Text>
          <Pressable onPress={() => setGenreSheet(true)} hitSlop={8} accessibilityLabel="ジャンルを追加・編集">
            <Text style={{ color: t.accent, fontSize: 13, fontWeight: '600' }}>＋ 追加・編集</Text>
          </Pressable>
        </View>
        <View style={[styles.chips, { marginBottom: 14 }]}>
          {[null, ...genres].map((g) => {
            const active = g === genre;
            return (
              <Pressable
                key={g ?? '__none__'}
                accessibilityLabel={`ジャンル ${g ?? 'なし'} にする`}
                accessibilityState={{ selected: active }}
                onPress={() => setGenre(g)}
                style={[styles.chip, { borderColor: t.border }, active && { backgroundColor: t.accent, borderColor: t.accent }]}>
                <Text style={{ color: active ? '#fff' : t.text, fontSize: 13 }}>{g ?? 'なし'}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.titleRow} {...kb.field('title')}>
          <Pressable
            onPress={() => setIconPicker(true)}
            accessibilityLabel="スタンプを選ぶ"
            style={[styles.iconButton, { backgroundColor: t.backgroundElement }]}>
            {icon ? <Stamp value={icon} size={34} /> : <Stamp value="😊" size={28} style={{ opacity: 0.45 }} />}
          </Pressable>
          {/* タイトル欄はカレンダーでの見え方と同じ色（終日＝濃い色、時間指定＝淡い色）。
              複数人なら選んだ人の色のグラデーション */}
          <View
            style={[
              styles.titleBox,
              { backgroundColor: titleGradient.length > 1 ? 'transparent' : eventLook(shownColor, allDay, t).bg },
            ]}>
            <EventGradient colors={titleGradient} allDay={allDay} />
            {/* 左端の帯：選んだ人の色で分割（4人なら4色）。予定の色を指定したらその1色 */}
            <MemberStripe colors={color ? [] : orderedMembers.map((p) => p.color)} fallback={shownColor} width={6} />
            <TextInput
              value={title}
              onChangeText={setTitle}
              onFocus={kb.focus('title')}
              placeholder={isTemplate ? 'テンプレート名（予定のタイトル）' : 'タイトル'}
              placeholderTextColor={allDay ? 'rgba(255,255,255,0.75)' : t.textMuted}
              style={[styles.titleInput, { color: allDay ? '#fff' : t.text }]}
              returnKeyType="done"
            />
            <Pressable
              onPress={() => setColorOpen(true)}
              hitSlop={8}
              accessibilityLabel={`予定の色を選ぶ（${color ? color : '自動'}）`}
              style={[styles.colorButton, { backgroundColor: shownColor, borderColor: allDay ? '#fff' : t.background }]}>
            </Pressable>
          </View>
        </View>
        {/* 予定の色：タイトル欄の丸と同じ。わかりやすいよう文字でも出す */}
        <Pressable
          onPress={() => setColorOpen(true)}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="予定の色を変える"
          style={styles.colorLink}>
          <View style={[styles.colorLinkDot, { backgroundColor: shownColor }]} />
          <Text style={{ color: t.accent, fontSize: 12, fontWeight: '600' }}>予定の色を変える</Text>
          {color === null && <Text style={{ color: t.textMuted, fontSize: 11 }}>（今は自動）</Text>}
        </Pressable>

        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: t.textSecondary, marginTop: 0, marginBottom: 0 }]}>
            誰の予定？（複数選べます）
          </Text>
          <Pressable onPress={() => setPeopleOpen(true)} hitSlop={8} accessibilityLabel="人を追加・編集">
            <Text style={{ color: t.accent, fontSize: 13, fontWeight: '600' }}>＋ 追加・編集</Text>
          </Pressable>
        </View>
        {/* 複数選べる（押すたびに ✓ が付いたり外れたりする） */}
        <View style={styles.chips}>
          {people.map((p) => {
            const active = memberIds.includes(p.id);
            return (
              <Pressable
                key={p.id}
                onPress={() => toggleMember(p.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: active }}
                accessibilityLabel={`${p.name}${active ? '（選択中）' : ''}`}
                style={[styles.chip, styles.checkChip, { borderColor: p.color }, active && { backgroundColor: p.color }]}>
                <View style={[styles.checkbox, { borderColor: active ? '#fff' : p.color }, active && { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                  {active && <Text style={styles.checkMark}>✓</Text>}
                </View>
                <Text style={{ color: active ? '#fff' : t.text, fontSize: 13 }}>{p.name}</Text>
              </Pressable>
            );
          })}
        </View>


        <Text style={label}>公開範囲</Text>
        <Chips
          options={calendars.map((c) => ({
            label: c.visibility === 'personal' ? '🔒 自分だけ' : '👪 家族に共有',
            value: c.id,
          }))}
          value={calendarId}
          onChange={setCalendarId}
        />

        {/* 開始 ▶ 終了 ｜ 終日。日付はカレンダー、時刻は時計の文字盤で選ぶ（テンプレートは時刻だけ） */}
        <StartEndPanel
          startDate={isTemplate ? null : startDate}
          startTime={startTime}
          endDate={isTemplate ? null : endDate}
          endTime={endTime}
          allDay={allDay}
          onChangeAllDay={setAllDay}
          onChangeStart={({ date, time }) => changeStart({ startDate: date, startTime: time })}
          onChangeEnd={({ date, time }) => {
            if (date) setEndDate(date);
            if (time) setEndTime(time);
          }}
          onDialTouching={setDialTouching}
        />

        <Text style={label}>繰り返し</Text>
        <Chips options={REPEATS} value={freq} onChange={selectFreq} />
        {freq === 'WEEKLY' && (
          <View style={[styles.chips, { marginTop: 8 }]}>
            {WEEKDAY_LABELS.map((w, d) => {
              const active = weeklyDays.includes(d);
              return (
                <Pressable
                  key={w}
                  accessibilityLabel={`${w}曜日`}
                  accessibilityState={{ selected: active }}
                  onPress={() => toggleDay(d)}
                  style={[
                    styles.dayChip,
                    { borderColor: t.border },
                    active && { backgroundColor: t.accent, borderColor: t.accent },
                  ]}>
                  <Text
                    style={{
                      color: active ? '#fff' : d === 0 ? t.sunday : d === 6 ? t.saturday : t.text,
                      fontSize: 13,
                    }}>
                    {w}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <Text style={label}>通知</Text>
        <Chips options={REMINDERS} value={remind} onChange={setRemind} eq={(a, b) => a.join() === b.join()} />

        <Text style={label}>場所</Text>
        <TextInput
          {...kb.field('location')}
          onFocus={kb.focus('location')}
          value={location}
          onChangeText={setLocation}
          placeholder="場所"
          placeholderTextColor={t.textMuted}
          style={input}
        />

        <Text style={label}>メモ</Text>
        <TextInput
          {...kb.field('memo')}
          onFocus={kb.focus('memo')}
          value={memo}
          onChangeText={setMemo}
          placeholder="メモ"
          placeholderTextColor={t.textMuted}
          multiline
          style={[...input, { minHeight: 80, textAlignVertical: 'top' }]}
        />

        {props.mode !== 'template' && props.onSaveTemplate && (
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.text, fontSize: 15 }}>この内容をテンプレートに保存</Text>
              <Text style={{ color: t.textSecondary, fontSize: 11, marginTop: 2 }}>
                上で選んだジャンルに保存され、次回から「テンプレートから入力」で選べます
              </Text>
            </View>
            <Switch value={saveAsTemplate} onValueChange={setSaveAsTemplate} accessibilityLabel="テンプレートに保存" />
          </View>
        )}

        <Pressable
          disabled={saving}
          onPress={submit}
          style={[styles.primary, { backgroundColor: t.accent, opacity: saving ? 0.6 : 1 }]}>
          <Text style={styles.primaryText}>{saving ? '保存中…' : '保存'}</Text>
        </Pressable>

        {props.onDelete && (
          <Pressable onPress={props.onDelete} style={styles.danger}>
            <Text style={{ color: t.sunday, fontSize: 15 }}>{isTemplate ? 'このテンプレートを削除' : '削除'}</Text>
          </Pressable>
        )}
      </ScrollView>

      <StampPicker
        visible={iconPicker}
        value={icon}
        onSelect={(v) => {
          setIcon(v);
          setIconPicker(false);
        }}
        onClose={() => setIconPicker(false)}
      />
      <PeopleSheet visible={peopleOpen} onClose={() => setPeopleOpen(false)} />
      <GenreSheet visible={genreSheet} onClose={() => setGenreSheet(false)} />
      <ColorPopover
        visible={colorOpen}
        value={color}
        autoColor={autoColor}
        onChange={setColor}
        onClose={() => setColorOpen(false)}
      />
    </View>
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
            key={`${o.label}-${String(o.value)}`}
            onPress={() => onChange(o.value)}
            accessibilityState={{ selected: active }}
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
  headerSave: { fontSize: 17, fontWeight: '700', paddingHorizontal: 4 },
  titleRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  titleBox: { zIndex: 0,
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    overflow: 'hidden',
    paddingRight: 8,
    minHeight: 48,
  },
  titleInput: { flex: 1, minWidth: 0, fontSize: 18, fontWeight: '600', paddingHorizontal: 10, paddingVertical: 10 },
  colorButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  colorLink: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: 5, marginTop: 6 },
  colorLinkDot: { width: 10, height: 10, borderRadius: 5 },
  iconButton: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 12, marginTop: 16, marginBottom: 6 },
  // 見出しと「＋ 追加・編集」を同じ高さに揃え、下の選択肢との間をあける
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, marginBottom: 10 },
  checkChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 8 },
  checkbox: { width: 16, height: 16, borderRadius: 4, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  checkMark: { color: '#fff', fontSize: 11, fontWeight: '800', lineHeight: 13 },
  input: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  row: { flexDirection: 'row', gap: 8 },
  dateInput: { flex: 2, minWidth: 0 },
  timeInput: { flex: 1, minWidth: 0 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  dayChip: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  primary: { marginTop: 28, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  danger: { marginTop: 12, paddingVertical: 12, alignItems: 'center' },
});
