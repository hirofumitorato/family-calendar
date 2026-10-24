import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import { parseDateKey, startOfDay } from '@/lib/date';
import { taikaiunDays } from '@/lib/kaiun';
import { STAR_NAMES, birthStars } from '@/lib/kyusei';
import type { NewCalendarEvent } from '@/lib/types';
import { useApp } from '@/state/app-store';
import { useCalendarPrefs } from '@/state/calendar-prefs';
import { confirm, notify } from '@/utils/dialog';

const KAIUN = 'kaiun';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseBirth(text: string): Date | null {
  if (!DATE_RE.test(text)) return null;
  const d = parseDateKey(text);
  const [y, m, day] = text.split('-').map(Number);
  if (d.getFullYear() !== y || d.getMonth() + 1 !== m || d.getDate() !== day) return null;
  if (y < 1930 || d > new Date()) return null;
  return d;
}

/**
 * 開運カレンダーの設定シート。
 * 生年月日から本命星・月命星を出し、年に数日の「大開運日」を普通の予定として追加する（あとから個別に削除もできる）。
 * 毎日の最大吉方は予定にせず、カレンダーのマスの右下に方角だけ表示する。
 * 生年月日の入力があるので、キーボードと重ならないよう画面の上に出す。
 */
export function KaiunSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { repo, ctx, defaultCalendar, bumpRevision } = useApp();
  const prefs = useCalendarPrefs();
  const people = ctx?.people ?? [];
  const me = people.find((p) => p.user_id === ctx?.userId) ?? people[0];

  const [personId, setPersonId] = useState<string | undefined>(prefs.kaiun?.personId ?? me?.id);
  const [birth, setBirth] = useState(prefs.kaiun?.birthDate ?? '');
  const [busy, setBusy] = useState(false);

  // 開くたびに保存済みの設定を入れ直す
  useEffect(() => {
    if (!visible) return;
    setPersonId(prefs.kaiun?.personId ?? me?.id);
    setBirth(prefs.kaiun?.birthDate ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const birthDate = parseBirth(birth);
  const stars = birthDate ? birthStars(birthDate) : null;

  // 開運の予定は本人だけが見る想定なので、自分の個人カレンダーに入れる
  const calendar =
    ctx?.calendars.find((c) => c.visibility === 'personal' && c.owner_id === ctx.userId) ?? defaultCalendar;

  const removeFuture = async () => {
    if (!ctx) return 0;
    return repo.deleteEventsBySource(
      ctx.calendars.map((c) => c.id),
      KAIUN,
      startOfDay(new Date()),
    );
  };

  const create = async () => {
    if (!birthDate || !stars) return notify('生年月日を YYYY-MM-DD の形式で入力してください');
    if (!calendar || !personId) return;
    setBusy(true);
    try {
      const today = startOfDay(new Date());
      // 今日から1年分の大開運日
      const end = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
      const days = Math.round((end.getTime() - today.getTime()) / 86400000);
      const list = taikaiunDays(today, days, stars.honmei, stars.getsumei);
      const events: NewCalendarEvent[] = list.map((k) => {
        const s = new Date(k.date);
        const e = new Date(k.date);
        e.setHours(23, 59, 0, 0);
        return {
          calendar_id: calendar.id,
          title: k.title,
          icon: '🌟',
          member_id: personId,
          all_day: true,
          starts_at: s.toISOString(),
          ends_at: e.toISOString(),
          rrule: null,
          exdates: [],
          remind_minutes_before: [],
          location: null,
          memo: k.memo,
          source: KAIUN,
        };
      });
      // 作り直すときは、今日以降の開運の予定を入れ替える
      await removeFuture();
      await repo.createEvents(events);
      prefs.update({ kaiun: { personId, birthDate: birth, months: 12 } });
      bumpRevision();
      onClose();
      notify(
        events.length ? `これから1年の大開運日（${events.length}日）を予定に追加しました` : 'これから1年に大開運日はありませんでした',
        '毎日の最大吉方は、カレンダーのマスの右下に方角で表示されます',
      );
    } catch (e) {
      notify('追加できませんでした', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    const ok = await confirm('開運カレンダーをオフにしますか？', {
      message: '今日以降の 🌟 大開運日の予定も削除します（過去の分は残ります）',
      okText: 'オフにする',
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await removeFuture();
      prefs.update({ kaiun: null });
      bumpRevision();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.wrap}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="閉じる" />
        <View style={[styles.sheet, { backgroundColor: t.background, paddingTop: insets.top + 12 }]}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={[styles.title, { color: t.text }]}>🧭 開運カレンダー</Text>
            <Text style={[styles.desc, { color: t.textSecondary }]}>
              九星気学で、生年月日から本命星・月命星を出します。{'\n'}
              ・年に数日の「大開運日」（月盤と日盤が揃い、年盤とも吉方位が重なる日）を 🌟 の予定として追加します。普通の予定と同じように削除できます。{'\n'}
              ・毎日の「最大吉方」は予定にせず、カレンダーのマスの右下に方角だけ小さく表示します。
            </Text>

            <Text style={[styles.label, { color: t.textSecondary }]}>誰の開運カレンダー？</Text>
            <View style={styles.chips}>
              {people.map((p) => {
                const active = p.id === personId;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => setPersonId(p.id)}
                    style={[styles.chip, { borderColor: p.color }, active && { backgroundColor: p.color }]}>
                    <Text style={{ color: active ? '#fff' : t.text, fontSize: 13 }}>{p.name}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.label, { color: t.textSecondary }]}>生年月日</Text>
            <TextInput
              value={birth}
              onChangeText={setBirth}
              placeholder="例：1990-04-15"
              placeholderTextColor={t.textMuted}
              keyboardType="numbers-and-punctuation"
              accessibilityLabel="生年月日"
              style={[styles.input, { color: t.text, backgroundColor: t.backgroundElement }]}
            />
            <Text style={[styles.stars, { color: stars ? t.text : t.textMuted }]}>
              {stars
                ? `本命星 ${STAR_NAMES[stars.honmei]} ／ 月命星 ${STAR_NAMES[stars.getsumei]}`
                : '生年月日を入れると九星が表示されます'}
            </Text>

            <Pressable
              onPress={create}
              disabled={busy}
              accessibilityLabel="開運の予定を追加"
              style={[styles.primary, { backgroundColor: t.accent, opacity: busy ? 0.6 : 1 }]}>
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryText}>{prefs.kaiun ? '設定を保存して作り直す' : '開運カレンダーを始める'}</Text>
              )}
            </Pressable>
            {prefs.kaiun && (
              <Pressable onPress={turnOff} disabled={busy} style={styles.secondary} accessibilityLabel="開運カレンダーをオフ">
                <Text style={{ color: t.sunday, fontSize: 15 }}>開運カレンダーをオフにする</Text>
              </Pressable>
            )}
            <Pressable onPress={onClose} style={styles.secondary}>
              <Text style={{ color: t.textSecondary, fontSize: 15 }}>閉じる</Text>
            </Pressable>
            <Text style={[styles.note, { color: t.textMuted }]}>
              方位はアプリ内で計算した参考情報です。流派によって異なることがあります。大開運日の予定のメモに、八雲院（yakumoin.info）の大開運日一覧へのリンクを入れています。
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: { maxHeight: '92%', borderBottomLeftRadius: 16, borderBottomRightRadius: 16, paddingHorizontal: 16, paddingBottom: 12 },
  title: { fontSize: 18, fontWeight: '700' },
  desc: { fontSize: 12, lineHeight: 18, marginTop: 6 },
  label: { fontSize: 12, marginTop: 14, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  input: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  stars: { fontSize: 14, fontWeight: '600', marginTop: 8 },
  primary: { marginTop: 18, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondary: { paddingVertical: 10, alignItems: 'center' },
  note: { fontSize: 11, lineHeight: 16, marginTop: 4 },
});
