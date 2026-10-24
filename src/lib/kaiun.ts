// 開運カレンダー：本命星・月命星から、日ごとの「最大吉方」「天道吉方」を予定として作る
import { DIRECTION_NAMES, STAR_NAMES, dailyDirections } from './kyusei.ts';

export type KaiunDay = {
  date: Date;
  title: string;
  memo: string;
};

function ymd(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * from から days 日分の吉方位を調べ、最大吉方または天道吉方がある日だけ返す。
 * - 最大吉方：本命星・月命星の両方にとって吉で、凶方位（五黄殺・暗剣殺・本命殺・的殺・日破など）でない方位
 * - 天道吉方：天道の方位が、本命星にとって吉方でもある
 */
export function kaiunDays(from: Date, days: number, honmei: number, getsumei: number): KaiunDay[] {
  const out: KaiunDay[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
    const r = dailyDirections(date, honmei, getsumei);
    const best = r.directions.filter((d) => d.best);
    const tendoLucky = r.directions.find((d) => d.tendo && d.good);
    if (best.length === 0 && !tendoLucky) continue;

    const parts: string[] = [];
    if (best.length) parts.push(`最大吉方 ${best.map((d) => DIRECTION_NAMES[d.direction]).join('・')}`);
    if (tendoLucky) parts.push(`天道吉方 ${DIRECTION_NAMES[tendoLucky.direction]}`);

    const lines = r.directions.map((d) => {
      const label = d.best ? '◎ 最大吉方' : d.good ? '○ 吉方' : d.bad.length ? `× ${d.bad.join('・')}` : '－';
      return `${DIRECTION_NAMES[d.direction]}：${label}${d.tendo ? '（天道）' : ''}`;
    });
    out.push({
      date,
      title: parts.join(' ／ '),
      memo: [
        `本命星 ${STAR_NAMES[honmei]}・月命星 ${STAR_NAMES[getsumei]}`,
        `日盤 中宮 ${STAR_NAMES[r.center]}（${r.kanshi}）`,
        '',
        ...lines,
        '',
        '※ アプリ内で計算した参考情報です。流派により異なる場合があります。',
        `八雲院で確認：https://yakumoin.info/daily/direction/date/${ymd(date)}`,
      ].join('\n'),
    });
  }
  return out;
}
