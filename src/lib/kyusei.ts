// 九星気学：本命星・月命星、日盤（日家九星）と吉方位
// 暦の境目（節入り・夏至・冬至）は koyomi-data.ts の天文計算データを使う。
import { SETSU, SETSU_FROM_YEAR, SOLSTICE } from './koyomi-data.ts';

export const STAR_NAMES = ['', '一白水星', '二黒土星', '三碧木星', '四緑木星', '五黄土星', '六白金星', '七赤金星', '八白土星', '九紫火星'];

export type Direction = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
export const DIRECTIONS: Direction[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
export const DIRECTION_NAMES: Record<Direction, string> = {
  N: '北', NE: '北東', E: '東', SE: '南東', S: '南', SW: '南西', W: '西', NW: '北西',
};
const OPPOSITE: Record<Direction, Direction> = {
  N: 'S', NE: 'SW', E: 'W', SE: 'NW', S: 'N', SW: 'NE', W: 'E', NW: 'SE',
};
/** 後天定位盤で中宮から飛ぶ順番（中宮→北西→西→北東→南→北→南西→東→南東） */
const FLIGHT: (Direction | 'C')[] = ['C', 'NW', 'W', 'NE', 'S', 'N', 'SW', 'E', 'SE'];
/** 各星の定位 */
const HOME: (Direction | 'C')[] = ['C', 'N', 'SW', 'E', 'SE', 'C', 'NW', 'W', 'NE', 'S'];
/** 五行：0 木・1 火・2 土・3 金・4 水 */
const ELEMENT = [-1, 4, 2, 0, 0, 2, 3, 3, 2, 1];
/** 十二支の方位（日破に使う） */
const BRANCH_DIR: Direction[] = ['N', 'NE', 'NE', 'E', 'SE', 'SE', 'S', 'SW', 'SW', 'W', 'NW', 'NW'];
/** 月の天道（節月 1=寅月(2月)〜12=丑月(1月)） */
const TENDO: Direction[] = ['S', 'SW', 'N', 'W', 'NW', 'E', 'N', 'NE', 'S', 'E', 'SE', 'W'];

const STEMS = '甲乙丙丁戊己庚辛壬癸';
const BRANCHES = '子丑寅卯辰巳午未申酉戌亥';

function dayNumber(y: number, m: number, d: number): number {
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}
function dn(date: Date): number {
  return dayNumber(date.getFullYear(), date.getMonth() + 1, date.getDate());
}
const mod = (a: number, n: number) => ((a % n) + n) % n;

function setsuDay(year: number, month: number): number {
  const row = SETSU.split(',')[year - SETSU_FROM_YEAR];
  if (!row) throw new RangeError(`暦データの範囲外です: ${year}年`);
  return Number(row[month - 1]);
}
function solstice(year: number): { geshi: number; toji: number } {
  const v = SOLSTICE.split(',')[year - SETSU_FROM_YEAR];
  if (!v) throw new RangeError(`暦データの範囲外です: ${year}年`);
  return { geshi: dayNumber(year, 6, Number(v.slice(0, 2))), toji: dayNumber(year, 12, Number(v.slice(2, 4))) };
}

/** 九星の年（立春で切り替わる）と節月（1=寅月〜12=丑月） */
export function solarMonth(date: Date): { year: number; month: number } {
  let y = date.getFullYear();
  let g = date.getMonth() + 1;
  if (date.getDate() < setsuDay(y, g)) {
    g -= 1;
    if (g === 0) {
      g = 12;
      y -= 1;
    }
  }
  if (g === 1) return { year: y - 1, month: 12 }; // 丑月（1月の小寒〜立春前）は前年
  return { year: y, month: g - 1 };
}

export function yearStar(kyuseiYear: number): number {
  return mod(11 - mod(kyuseiYear, 9), 9) || 9;
}

export function monthStar(kyuseiYear: number, month: number): number {
  const ys = yearStar(kyuseiYear);
  const first = [1, 4, 7].includes(ys) ? 8 : [2, 5, 8].includes(ys) ? 2 : 5; // 寅月の星
  return mod(first - (month - 1) - 1, 9) + 1;
}

/** 生年月日から本命星・月命星 */
export function birthStars(birth: Date): { honmei: number; getsumei: number } {
  const { year, month } = solarMonth(birth);
  return { honmei: yearStar(year), getsumei: monthStar(year, month) };
}

/** 日の干支（0 = 甲子 … 59 = 癸亥） */
export function dayKanshiIndex(date: Date): number {
  // 2026-10-24 は 辛未（7）
  return mod(dn(date) - dayNumber(2026, 10, 24) + 7, 60);
}
export function dayKanshi(date: Date): string {
  const i = dayKanshiIndex(date);
  return STEMS[i % 10] + BRANCHES[i % 12];
}

/** 夏至・冬至に最も近い甲子の日（遁の切り替え日） */
function nearestKoshi(day: number): number {
  const k = mod(day - dayNumber(2026, 10, 24) + 7, 60);
  return k <= 30 ? day - k : day + (60 - k);
}

/** 日家九星（日盤の中宮の星）。冬至近くの甲子から陽遁（一白から順）、夏至近くの甲子から陰遁（九紫から逆） */
export function dayStar(date: Date): number {
  const d = dn(date);
  const y = date.getFullYear();
  const switches: { day: number; yang: boolean }[] = [];
  for (const yy of [y - 1, y]) {
    const s = solstice(yy);
    switches.push({ day: nearestKoshi(s.geshi), yang: false }, { day: nearestKoshi(s.toji), yang: true });
  }
  const start = switches.filter((s) => s.day <= d).sort((a, b) => b.day - a.day)[0];
  const n = d - start.day;
  return start.yang ? mod(n, 9) + 1 : 9 - mod(n, 9);
}

/** 盤の各方位にある星 */
export function board(center: number): Record<Direction | 'C', number> {
  const out = {} as Record<Direction | 'C', number>;
  FLIGHT.forEach((pos, i) => {
    out[pos] = mod(center - 1 + i, 9) + 1;
  });
  return out;
}

/** その星にとって相性の良い星（相生・比和。五黄を除く） */
export function goodStars(star: number): Set<number> {
  const e = ELEMENT[star];
  const good = new Set<number>();
  for (let s = 1; s <= 9; s++) {
    if (s === 5 || s === star) continue;
    const x = ELEMENT[s];
    if (x === e || x === mod(e + 1, 5) || e === mod(x + 1, 5)) good.add(s);
  }
  return good;
}

export type DirectionLuck = {
  direction: Direction;
  star: number;
  /** 凶方位の種類（五黄殺・暗剣殺・本命殺・本命的殺・月命殺・月命的殺・日破・定位対冲） */
  bad: string[];
  /** 本命星にとって吉 */
  good: boolean;
  /** 本命星・月命星の両方にとって吉 */
  best: boolean;
  tendo: boolean;
};

/** その日の日盤の吉方位（本命星・月命星で判定） */
export function dailyDirections(date: Date, honmei: number, getsumei?: number): {
  center: number;
  kanshi: string;
  tendo: Direction;
  directions: DirectionLuck[];
} {
  const center = dayStar(date);
  const b = board(center);
  const pos = (star: number) => DIRECTIONS.find((d) => b[d] === star);
  const five = pos(5);
  const hon = pos(honmei);
  const getsu = getsumei ? pos(getsumei) : undefined;
  const breakDir = OPPOSITE[BRANCH_DIR[dayKanshiIndex(date) % 12]];
  const tendo = TENDO[solarMonth(date).month - 1];
  const goodH = goodStars(honmei);
  const goodG = getsumei ? goodStars(getsumei) : null;

  const directions = DIRECTIONS.map((dir) => {
    const star = b[dir];
    const bad: string[] = [];
    if (dir === five) bad.push('五黄殺');
    if (five && dir === OPPOSITE[five]) bad.push('暗剣殺');
    if (dir === hon) bad.push('本命殺');
    if (hon && dir === OPPOSITE[hon]) bad.push('本命的殺');
    if (getsu && dir === getsu) bad.push('月命殺');
    if (getsu && dir === OPPOSITE[getsu]) bad.push('月命的殺');
    if (dir === breakDir) bad.push('日破');
    const home = HOME[star];
    if (home !== 'C' && dir === OPPOSITE[home]) bad.push('定位対冲');
    const good = bad.length === 0 && goodH.has(star);
    const best = good && (goodG ? goodG.has(star) : true);
    return { direction: dir, star, bad, good, best, tendo: dir === tendo };
  });
  return { center, kanshi: dayKanshi(date), tendo, directions };
}
