// 日付ユーティリティ（端末ローカル時刻基準）。外部依存なし。

export const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const;

/** Date → 'YYYY-MM-DD'（ローカル日付） */
export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 'YYYY-MM-DD' → ローカル0時の Date */
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes());
}

export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * 月表示用のマス目（日曜始まり・6週 = 42日）を返す。
 * month は 0 始まり（0 = 1月）。
 */
export function buildMonthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const start = addDays(first, -first.getDay());
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

/** 表示範囲 [from, to) */
export function monthGridRange(year: number, month: number): { from: Date; to: Date } {
  const grid = buildMonthGrid(year, month);
  return { from: grid[0], to: addDays(grid[41], 1) };
}

/** 'HH:mm' */
export function formatTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** 例: '10月13日(火)' */
export function formatDayLabel(d: Date): string {
  return `${d.getMonth() + 1}月${d.getDate()}日(${WEEKDAY_LABELS[d.getDay()]})`;
}

/** 'HH:mm' 文字列を検証してパース。不正なら null */
export function parseTime(text: string): { h: number; m: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return { h, m };
}

/** その月の表示に必要な週の数（日曜始まり。4〜6） */
export function weeksInMonth(year: number, month: number): number {
  const firstDow = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  return Math.ceil((firstDow + days) / 7);
}

/**
 * 開始を変えたとき、終了が開始より前にならないよう調整する。
 * 終了が開始以前になったら、元の長さ（なければ1時間）を保って終了をずらす。
 */
export function keepEndAfterStart(
  prev: { startDate: string; startTime: string; endDate: string; endTime: string },
  next: { startDate: string; startTime: string },
): { endDate: string; endTime: string } {
  const at = (d: string, t: string) => {
    const [y, m, day] = d.split('-').map(Number);
    const [h, min] = t.split(':').map(Number);
    return new Date(y, m - 1, day, h, min);
  };
  const ps = at(prev.startDate, prev.startTime);
  const pe = at(prev.endDate, prev.endTime);
  const ns = at(next.startDate, next.startTime);
  if (pe > ns) return { endDate: prev.endDate, endTime: prev.endTime };
  const length = pe > ps ? pe.getTime() - ps.getTime() : 60 * 60 * 1000;
  const ne = new Date(ns.getTime() + length);
  return { endDate: toDateKey(ne), endTime: formatTime(ne) };
}
