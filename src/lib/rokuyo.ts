// 六曜（旧暦の月＋日から決まる）
import { LUNAR_MONTHS } from './koyomi-data.ts';

export const ROKUYO = ['大安', '赤口', '先勝', '友引', '先負', '仏滅'] as const;
export type Rokuyo = (typeof ROKUYO)[number];

type LunarMonth = { day: number; num: number; leap: boolean };

/** 'YYYYMMDD' or Date → 1970-01-01 からの日数（ローカル日付基準） */
function dayNumber(y: number, m: number, d: number): number {
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}

let parsed: LunarMonth[] | null = null;
function months(): LunarMonth[] {
  if (!parsed) {
    parsed = LUNAR_MONTHS.split(',').map((s) => ({
      day: dayNumber(Number(s.slice(0, 4)), Number(s.slice(4, 6)), Number(s.slice(6, 8))),
      num: Number(s.slice(8, 10)),
      leap: s.endsWith('L'),
    }));
  }
  return parsed;
}

/** 旧暦の日付。データ範囲外（1989〜2062年の外）なら null */
export function toLunar(date: Date): { month: number; day: number; leap: boolean } | null {
  const n = dayNumber(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const list = months();
  if (n < list[0].day || n >= list[list.length - 1].day) return null;
  let lo = 0;
  let hi = list.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (list[mid].day <= n) lo = mid;
    else hi = mid - 1;
  }
  const m = list[lo];
  return { month: m.num, day: n - m.day + 1, leap: m.leap };
}

export function getRokuyo(date: Date): Rokuyo | null {
  const l = toLunar(date);
  return l ? ROKUYO[(l.month + l.day) % 6] : null;
}
