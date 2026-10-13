// 日本の祝日をオフラインで計算する（2020年以降の祝日法に準拠）。
// 春分・秋分は近似式（1980〜2099年で有効）。正式には前年2月の官報で確定するため、
// 厳密さが必要になったら内閣府の祝日CSVで上書きする。

function key(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** m月の第n月曜日 */
function nthMonday(y: number, m: number, n: number): number {
  const firstDow = new Date(y, m - 1, 1).getDay();
  const firstMonday = 1 + ((8 - firstDow) % 7);
  return firstMonday + (n - 1) * 7;
}

function vernalEquinox(y: number): number {
  return Math.floor(20.8431 + 0.242194 * (y - 1980) - Math.floor((y - 1980) / 4));
}

function autumnalEquinox(y: number): number {
  return Math.floor(23.2488 + 0.242194 * (y - 1980) - Math.floor((y - 1980) / 4));
}

const cache = new Map<number, Map<string, string>>();

/** 指定年の祝日（'YYYY-MM-DD' → 名称） */
export function getJapaneseHolidays(year: number): Map<string, string> {
  const cached = cache.get(year);
  if (cached) return cached;

  const base: [number, number, string][] = [
    [1, 1, '元日'],
    [1, nthMonday(year, 1, 2), '成人の日'],
    [2, 11, '建国記念の日'],
    [2, 23, '天皇誕生日'],
    [3, vernalEquinox(year), '春分の日'],
    [4, 29, '昭和の日'],
    [5, 3, '憲法記念日'],
    [5, 4, 'みどりの日'],
    [5, 5, 'こどもの日'],
    [7, nthMonday(year, 7, 3), '海の日'],
    [8, 11, '山の日'],
    [9, nthMonday(year, 9, 3), '敬老の日'],
    [9, autumnalEquinox(year), '秋分の日'],
    [10, nthMonday(year, 10, 2), 'スポーツの日'],
    [11, 3, '文化の日'],
    [11, 23, '勤労感謝の日'],
  ];

  const result = new Map<string, string>();
  for (const [m, d, name] of base) result.set(key(year, m, d), name);

  const isHoliday = (d: Date) => result.has(key(d.getFullYear(), d.getMonth() + 1, d.getDate()));

  // 国民の休日：祝日に挟まれた平日
  for (const [m, d] of base) {
    const next = new Date(year, m - 1, d + 1);
    const nextNext = new Date(year, m - 1, d + 2);
    if (!isHoliday(next) && isHoliday(nextNext) && next.getDay() !== 0) {
      result.set(key(year, next.getMonth() + 1, next.getDate()), '国民の休日');
    }
  }

  // 振替休日：祝日が日曜なら、その後の最初の「祝日でない日」
  for (const [m, d] of base) {
    const date = new Date(year, m - 1, d);
    if (date.getDay() !== 0) continue;
    let sub = new Date(year, m - 1, d + 1);
    while (isHoliday(sub)) sub = new Date(sub.getFullYear(), sub.getMonth(), sub.getDate() + 1);
    result.set(key(sub.getFullYear(), sub.getMonth() + 1, sub.getDate()), '振替休日');
  }

  cache.set(year, result);
  return result;
}

/** 'YYYY-MM-DD' が祝日なら名称、そうでなければ undefined */
export function getHolidayName(dateKey: string): string | undefined {
  const year = Number(dateKey.slice(0, 4));
  return getJapaneseHolidays(year).get(dateKey);
}
