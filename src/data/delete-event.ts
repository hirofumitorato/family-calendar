import type { CalendarRepository } from '@/data/repository';
import { toDateKey } from '@/lib/date';
import { truncateRRuleBefore } from '@/lib/recurrence';
import type { CalendarEvent, DeleteScope } from '@/lib/types';

/**
 * 予定を削除する。繰り返し予定は範囲を選べる。
 * - this:      その回だけ（exdates に追加）
 * - following: その回以降（RRULE を前日で打ち切り。最初の回なら予定ごと削除）
 * - all:       予定ごと削除
 */
export async function deleteEventWithScope(
  repo: CalendarRepository,
  event: CalendarEvent,
  occurrenceStart: Date,
  scope: DeleteScope,
): Promise<void> {
  if (!event.rrule || scope === 'all') {
    await repo.deleteEvent(event.id);
    return;
  }

  if (scope === 'this') {
    const key = toDateKey(occurrenceStart);
    const exdates = Array.from(new Set([...(event.exdates ?? []), key])).sort();
    await repo.updateEvent(event.id, { exdates });
    return;
  }

  const truncated = truncateRRuleBefore(event.rrule, new Date(event.starts_at), occurrenceStart);
  if (truncated === null) {
    await repo.deleteEvent(event.id);
  } else {
    await repo.updateEvent(event.id, { rrule: truncated });
  }
}
