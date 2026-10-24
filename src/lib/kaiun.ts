// 開運カレンダー
//  - 予定として入れるのは「大開運日」だけ（年に数日）
//  - 毎日の「最大吉方」は予定にせず、カレンダーのマスの右下に方角だけ小さく表示する
import { DIRECTION_NAMES, STAR_NAMES, dailyDirections, taikaiunDirections } from './kyusei.ts';

export type KaiunDay = {
  date: Date;
  title: string;
  memo: string;
};

/** その日の最大吉方（本命星・月命星の両方にとって吉）の方角名 */
export function bestDirectionNames(date: Date, honmei: number, getsumei: number): string[] {
  try {
    return dailyDirections(date, honmei, getsumei)
      .directions.filter((d) => d.best)
      .map((d) => DIRECTION_NAMES[d.direction]);
  } catch {
    return []; // 暦データの範囲外
  }
}

/**
 * from から days 日分のうち「大開運日」を返す。
 * 大開運日：月盤と日盤が揃い（中宮が同じ星）、年盤・月盤・日盤のすべてで本命星にとって吉の方位がある日。
 */
export function taikaiunDays(from: Date, days: number, honmei: number, getsumei: number): KaiunDay[] {
  const out: KaiunDay[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
    const dirs = taikaiunDirections(date, honmei, getsumei);
    if (!dirs.length) continue;
    const names = dirs.map((d) => DIRECTION_NAMES[d]).join('・');
    out.push({
      date,
      title: `大開運日 ${names}`,
      memo: [
        `本命星 ${STAR_NAMES[honmei]}・月命星 ${STAR_NAMES[getsumei]}`,
        '',
        `年盤・月盤・日盤のすべてで吉となる方位：${names}`,
        '月盤と日盤が揃う日に、年盤の吉方位とも重なる、年に数日の大開運日です。',
        '',
        '※ アプリ内で計算した参考情報です。流派により異なる場合があります。',
        `八雲院で確認：https://yakumoin.info/kyusei/good_luck_list/id/${honmei}/${getsumei}/${date.getFullYear()}`,
      ].join('\n'),
    });
  }
  return out;
}
