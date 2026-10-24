import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MemberBadge } from '@/components/member-badge';
import { useTheme } from '@/hooks/use-theme';
import { eventLook } from '@/utils/event-look';
import { formatDayLabel, formatTime, isSameDay } from '@/lib/date';
import { describeRepeat } from '@/lib/repeat';
import type { EventOccurrence } from '@/lib/types';

function reminderLabel(minutes: number): string {
  if (minutes >= 24 * 60 && minutes % (24 * 60) === 0) return minutes === 24 * 60 ? '前日' : `${minutes / (24 * 60)}日前`;
  if (minutes >= 60 && minutes % 60 === 0) return `${minutes / 60}時間前`;
  return `${minutes}分前`;
}

/** 日時の表示。例：10月28日(水) 16:00〜17:00 ／ 10月28日(水) 終日 ／ 10月28日(水) 10:00 〜 10月29日(木) 17:00 */
function whenLabel(o: EventOccurrence): string {
  if (o.event.all_day) {
    return isSameDay(o.start, o.end)
      ? `${formatDayLabel(o.start)} 終日`
      : `${formatDayLabel(o.start)} 〜 ${formatDayLabel(o.end)}（終日）`;
  }
  return isSameDay(o.start, o.end)
    ? `${formatDayLabel(o.start)} ${formatTime(o.start)}〜${formatTime(o.end)}`
    : `${formatDayLabel(o.start)} ${formatTime(o.start)} 〜 ${formatDayLabel(o.end)} ${formatTime(o.end)}`;
}

/**
 * 予定の内容を見るだけのシート（タップで開く）。ここから編集・削除もできる。
 * 入力欄はないので、画面下からのシートでよい。
 */
export function EventDetailSheet({
  occurrence: o,
  onClose,
  onEdit,
  onDelete,
}: {
  occurrence: EventOccurrence | null;
  onClose: () => void;
  onEdit: (o: EventOccurrence) => void;
  onDelete: (o: EventOccurrence) => void;
}) {
  const t = useTheme();

  return (
    <Modal visible={o !== null} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="閉じる" />
      {o && (
        <View style={[styles.sheet, { backgroundColor: t.background }]}>
          <View style={[styles.grabber, { backgroundColor: t.border }]} />
          <ScrollView contentContainerStyle={{ paddingBottom: 8 }}>
            <View
              style={[
                styles.titleRow,
                { backgroundColor: eventLook(o.color, o.event.all_day, t).bg, borderLeftColor: o.color },
              ]}>
              {/* 誰の予定か：タイトルの先頭に小さく */}
              <MemberBadge person={o.member} size="medium" outlined={o.event.all_day} />
              <Text style={[styles.title, { color: eventLook(o.color, o.event.all_day, t).text }]}>
                {o.event.icon ? `${o.event.icon} ` : ''}
                {o.event.title}
              </Text>
            </View>

            <Row icon="🕒" label="日時" value={whenLabel(o)} />
            {o.event.rrule && <Row icon="🔁" label="繰り返し" value={describeRepeat(o.event.rrule)} />}
            {o.event.location && <Row icon="📍" label="場所" value={o.event.location} />}
            {o.event.remind_minutes_before.length > 0 && (
              <Row icon="🔔" label="通知" value={o.event.remind_minutes_before.map(reminderLabel).join('、')} />
            )}
            <Row
              icon={o.calendar.visibility === 'personal' ? '🔒' : '👪'}
              label="公開範囲"
              value={o.calendar.visibility === 'personal' ? '自分だけ' : '家族に共有'}
            />
            {o.event.memo && (
              <View style={[styles.memo, { backgroundColor: t.backgroundElement }]}>
                <Text style={[styles.memoLabel, { color: t.textSecondary }]}>メモ</Text>
                <Text style={[styles.memoText, { color: t.text }]}>
                  {/* メモ内の URL はタップで開けるようにする */}
                  {o.event.memo.split(/(https?:\/\/[^\s]+)/).map((part, i) =>
                    /^https?:\/\//.test(part) ? (
                      <Text
                        key={i}
                        accessibilityRole="link"
                        onPress={() => Linking.openURL(part)}
                        style={{ color: t.saturday, textDecorationLine: 'underline' }}>
                        {part}
                      </Text>
                    ) : (
                      part
                    ),
                  )}
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable
              accessibilityLabel="この予定を編集"
              onPress={() => onEdit(o)}
              style={[styles.action, { backgroundColor: t.accent }]}>
              <Text style={[styles.actionText, { color: '#fff' }]}>編集</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="この予定を削除"
              onPress={() => onDelete(o)}
              style={[styles.action, { backgroundColor: t.backgroundElement }]}>
              <Text style={[styles.actionText, { color: t.sunday }]}>削除</Text>
            </Pressable>
          </View>
          <Pressable onPress={onClose} style={styles.close} accessibilityLabel="閉じる">
            <Text style={{ color: t.textSecondary, fontSize: 15 }}>閉じる</Text>
          </Pressable>
        </View>
      )}
    </Modal>
  );
}

function Row({ icon, label, value }: { icon: string; label: string; value: string }) {
  const t = useTheme();
  return (
    <View style={styles.row} accessibilityLabel={`${label}：${value}`}>
      <Text style={styles.rowIcon}>{icon}</Text>
      <Text style={[styles.rowValue, { color: t.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: { maxHeight: '80%', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, paddingBottom: 28 },
  grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    borderRadius: 12,
    borderLeftWidth: 5,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  colorBar: { width: 5, borderRadius: 3 },
  title: { flex: 1, fontSize: 22, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 7 },
  rowIcon: { fontSize: 16, width: 22, textAlign: 'center' },
  rowValue: { flex: 1, fontSize: 16, lineHeight: 22 },
  memo: { borderRadius: 12, padding: 12, marginTop: 8 },
  memoLabel: { fontSize: 12, marginBottom: 4 },
  memoText: { fontSize: 15, lineHeight: 22 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  action: { flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  actionText: { fontSize: 16, fontWeight: '700' },
  close: { alignItems: 'center', paddingVertical: 12 },
});
