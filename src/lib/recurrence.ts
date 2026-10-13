// 繰り返し予定の展開（RRULE のサブセット）
// 対応: FREQ=DAILY|WEEKLY|MONTHLY|YEARLY, INTERVAL, COUNT, UNTIL, BYDAY(WEEKLYのみ)
// 例: 'FREQ=WEEKLY;BYDAY=MO,WE'  'FREQ=MONTHLY;COUNT=12'  'FREQ=YEARLY'

export type Occurrence = { start: Date; end: Date };

type Rule = {
  freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval: number;
  count?: number;
  until?: Date;
  byDay?: number[]; // 0 = 日曜
};

const DAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const MAX_ITERATIONS = 5000;

export function parseRRule(rrule: string): Rule | null {
  const parts = Object.fromEntries(
    rrule
      .replace(/^RRULE:/, '')
      .split(';')
      .map((p) => p.split('=') as [string, string]),
  );
  const freq = parts.FREQ;
  if (!['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(freq)) return null;

  const rule: Rule = { freq: freq as Rule['freq'], interval: Math.max(1, Number(parts.INTERVAL ?? 1)) };
  if (parts.COUNT) rule.count = Number(parts.COUNT);
  if (parts.UNTIL) {
    const m = /^(\d{4})(\d{2})(\d{2})/.exec(parts.UNTIL);
    if (m) rule.until = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 23, 59, 59);
  }
  if (parts.BYDAY) {
    rule.byDay = parts.BYDAY.split(',')
      .map((c: string) => DAY_CODES.indexOf(c.slice(-2)))
      .filter((i: number) => i >= 0);
  }
  return rule;
}

function shift(base: Date, rule: Rule, step: number): Date {
  const d = new Date(base);
  switch (rule.freq) {
    case 'DAILY':
      d.setDate(d.getDate() + step * rule.interval);
      break;
    case 'WEEKLY':
      d.setDate(d.getDate() + step * rule.interval * 7);
      break;
    case 'MONTHLY':
      d.setMonth(d.getMonth() + step * rule.interval);
      break;
    case 'YEARLY':
      d.setFullYear(d.getFullYear() + step * rule.interval);
      break;
  }
  return d;
}

/** Date → 'YYYY-MM-DD'（ローカル日付）。lib 内で完結させるため date.ts と同等の実装を持つ */
function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * 予定を [from, to) の範囲で展開する。rrule が無ければ範囲と重なる場合のみ1件返す。
 * MONTHLY/YEARLY で存在しない日（31日・2/29など）はスキップする（RFC 5545 と同じ挙動）。
 * exdates（'YYYY-MM-DD'）に含まれる日の回は出さない。COUNT の数え方には影響しない（RFC 5545 の EXDATE と同じ）。
 */
export function expandOccurrences(
  startsAt: Date,
  endsAt: Date,
  rrule: string | null | undefined,
  from: Date,
  to: Date,
  exdates: readonly string[] = [],
): Occurrence[] {
  const duration = endsAt.getTime() - startsAt.getTime();
  const overlaps = (s: Date) => s < to && s.getTime() + duration >= from.getTime();

  const rule = rrule ? parseRRule(rrule) : null;
  if (!rule) return overlaps(startsAt) ? [{ start: startsAt, end: endsAt }] : [];

  const result: Occurrence[] = [];
  let emitted = 0;

  const emit = (s: Date): boolean => {
    if (rule.until && s > rule.until) return false;
    if (rule.count !== undefined && emitted >= rule.count) return false;
    emitted++;
    if (exdates.includes(dateKey(s))) return true;
    if (overlaps(s)) result.push({ start: s, end: new Date(s.getTime() + duration) });
    return true;
  };

  for (let step = 0; step < MAX_ITERATIONS; step++) {
    const anchor = shift(startsAt, rule, step);
    if (anchor >= to && rule.freq !== 'WEEKLY') break;

    if (rule.freq === 'WEEKLY' && rule.byDay?.length) {
      // その週（日曜始まり）の指定曜日を順に出す
      const weekStart = new Date(anchor);
      weekStart.setDate(anchor.getDate() - anchor.getDay());
      if (weekStart >= to) break;
      let stop = false;
      for (const dow of [...rule.byDay].sort((a, b) => a - b)) {
        const s = new Date(weekStart);
        s.setDate(weekStart.getDate() + dow);
        if (s < startsAt) continue;
        if (!emit(s)) {
          stop = true;
          break;
        }
      }
      if (stop) break;
      continue;
    }

    if (rule.freq === 'WEEKLY' && anchor >= to) break;
    // 月末日ずれ（1/31 + 1ヶ月 = 3/3 など）はスキップ
    if ((rule.freq === 'MONTHLY' || rule.freq === 'YEARLY') && anchor.getDate() !== startsAt.getDate()) {
      continue;
    }
    if (!emit(anchor)) break;
  }

  return result;
}

/**
 * 「以降の予定を削除」用：occurrenceDate の前日までで繰り返しを打ち切った RRULE を返す。
 * COUNT は UNTIL と併用できないため取り除く。
 * occurrenceDate が最初の回以前なら null（＝予定ごと削除すべき）を返す。
 */
export function truncateRRuleBefore(
  rrule: string,
  startsAt: Date,
  occurrenceDate: Date,
): string | null {
  const firstDay = new Date(startsAt.getFullYear(), startsAt.getMonth(), startsAt.getDate());
  const occDay = new Date(occurrenceDate.getFullYear(), occurrenceDate.getMonth(), occurrenceDate.getDate());
  if (occDay <= firstDay) return null;

  const prev = new Date(occDay.getFullYear(), occDay.getMonth(), occDay.getDate() - 1);
  const until = dateKey(prev).replace(/-/g, '');
  const parts = rrule
    .replace(/^RRULE:/, '')
    .split(';')
    .filter((p) => p && !p.startsWith('UNTIL=') && !p.startsWith('COUNT='));
  return [...parts, `UNTIL=${until}`].join(';');
}
