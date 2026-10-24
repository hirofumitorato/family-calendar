// 純粋ロジックのテスト。実行: npm test（Node 22.6+ の型ストリップで直接実行）
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildMonthGrid, keepEndAfterStart, toDateKey, weeksInMonth } from '../src/lib/date.ts';
import { getJapaneseHolidays } from '../src/lib/holidays.ts';
import { expandOccurrences, truncateRRuleBefore } from '../src/lib/recurrence.ts';
import { buildRepeat, describeRepeat, parseRepeat } from '../src/lib/repeat.ts';
import { DIRECTION_NAMES, birthStars, dailyDirections, dayKanshi, dayStar, monthStar, solarMonth, taikaiunDirections, yearStar } from '../src/lib/kyusei.ts';
import { bestDirectionNames, taikaiunDays } from '../src/lib/kaiun.ts';
import { getRokuyo, toLunar } from '../src/lib/rokuyo.ts';
import { weatherCodeToIcon } from '../src/lib/weather.ts';

test('月グリッドは日曜始まりの42日', () => {
  const grid = buildMonthGrid(2026, 9); // 2026年10月（1日は木曜）
  assert.equal(grid.length, 42);
  assert.equal(grid[0].getDay(), 0);
  assert.equal(toDateKey(grid[0]), '2026-09-27');
  assert.equal(toDateKey(grid[4]), '2026-10-01');
});

test('2026年の祝日（シルバーウィーク・振替休日を含む）', () => {
  const h = getJapaneseHolidays(2026);
  assert.equal(h.get('2026-01-12'), '成人の日');
  assert.equal(h.get('2026-03-20'), '春分の日');
  assert.equal(h.get('2026-05-06'), '振替休日'); // 5/3(日) → 5/4,5/5 が祝日なので 5/6
  assert.equal(h.get('2026-09-21'), '敬老の日');
  assert.equal(h.get('2026-09-22'), '国民の休日');
  assert.equal(h.get('2026-09-23'), '秋分の日');
  assert.equal(h.get('2026-10-12'), 'スポーツの日');
  assert.equal(h.get('2026-11-23'), '勤労感謝の日');
  assert.equal(h.size, 18);
});

test('2025年の振替休日', () => {
  const h = getJapaneseHolidays(2025);
  assert.equal(h.get('2025-02-24'), '振替休日'); // 天皇誕生日 2/23(日)
  assert.equal(h.get('2025-11-24'), '振替休日'); // 勤労感謝の日 11/23(日)
});

// 'YYYY-MM-DD' だけだとUTC扱いになるため、ローカル0時に揃える
const range = (a: string, b: string) => [new Date(`${a}T00:00:00`), new Date(`${b}T00:00:00`)] as const;

test('単発予定は範囲と重なるときだけ返す', () => {
  const s = new Date('2026-10-05T10:00:00');
  const e = new Date('2026-10-05T11:00:00');
  assert.equal(expandOccurrences(s, e, null, ...range('2026-10-01', '2026-11-01')).length, 1);
  assert.equal(expandOccurrences(s, e, null, ...range('2026-11-01', '2026-12-01')).length, 0);
});

test('毎週月・木の繰り返し', () => {
  const s = new Date('2026-10-01T08:00:00'); // 木
  const e = new Date('2026-10-01T08:30:00');
  const occ = expandOccurrences(s, e, 'FREQ=WEEKLY;BYDAY=MO,TH', ...range('2026-10-01', '2026-10-16'));
  assert.deepEqual(
    occ.map((o) => toDateKey(o.start)),
    ['2026-10-01', '2026-10-05', '2026-10-08', '2026-10-12', '2026-10-15'],
  );
});

test('COUNT と UNTIL', () => {
  const s = new Date('2026-10-01T09:00:00');
  const e = new Date('2026-10-01T10:00:00');
  assert.equal(expandOccurrences(s, e, 'FREQ=DAILY;COUNT=3', ...range('2026-10-01', '2026-11-01')).length, 3);
  assert.equal(
    expandOccurrences(s, e, 'FREQ=DAILY;UNTIL=20261005', ...range('2026-10-01', '2026-11-01')).length,
    5,
  );
});

test('毎月31日は31日がある月だけ', () => {
  const s = new Date('2026-01-31T12:00:00');
  const e = new Date('2026-01-31T13:00:00');
  const occ = expandOccurrences(s, e, 'FREQ=MONTHLY', ...range('2026-01-01', '2026-06-01'));
  assert.deepEqual(occ.map((o) => toDateKey(o.start)), ['2026-01-31', '2026-03-31', '2026-05-31']);
});

test('毎年の誕生日は過去開始でも表示範囲に出る', () => {
  const s = new Date('1950-10-16T00:00:00');
  const e = new Date('1950-10-16T23:59:00');
  const occ = expandOccurrences(s, e, 'FREQ=YEARLY', ...range('2026-10-01', '2026-11-01'));
  assert.deepEqual(occ.map((o) => toDateKey(o.start)), ['2026-10-16']);
});

test('この予定のみ削除（exdates）', () => {
  const s = new Date('2026-10-01T09:00:00');
  const e = new Date('2026-10-01T10:00:00');
  const occ = expandOccurrences(s, e, 'FREQ=DAILY;COUNT=5', ...range('2026-10-01', '2026-11-01'), ['2026-10-03']);
  // COUNT=5 は除外前の回数なので、残るのは4回
  assert.deepEqual(
    occ.map((o) => toDateKey(o.start)),
    ['2026-10-01', '2026-10-02', '2026-10-04', '2026-10-05'],
  );
});

test('以降の予定を削除（UNTIL で打ち切り）', () => {
  const s = new Date('2026-10-01T08:00:00'); // 木
  const e = new Date('2026-10-01T08:30:00');
  const rule = truncateRRuleBefore('FREQ=WEEKLY;BYDAY=MO,TH;COUNT=20', s, new Date('2026-10-12T08:00:00'));
  assert.equal(rule, 'FREQ=WEEKLY;BYDAY=MO,TH;UNTIL=20261011');
  const occ = expandOccurrences(s, e, rule, ...range('2026-10-01', '2026-11-01'));
  assert.deepEqual(occ.map((o) => toDateKey(o.start)), ['2026-10-01', '2026-10-05', '2026-10-08']);
  // 最初の回を指定したら予定ごと削除
  assert.equal(truncateRRuleBefore('FREQ=DAILY', s, new Date('2026-10-01T08:00:00')), null);
});

test('天気コード → アイコン', () => {
  assert.equal(weatherCodeToIcon(0).emoji, '☀️');
  assert.equal(weatherCodeToIcon(3).emoji, '☁️');
  assert.equal(weatherCodeToIcon(63).emoji, '☔');
  assert.equal(weatherCodeToIcon(73).emoji, '❄️');
});

test('繰り返しの読み書き（曜日指定・UNTIL の引き継ぎ）', () => {
  assert.deepEqual(parseRepeat('FREQ=WEEKLY;BYDAY=TH,MO'), { freq: 'WEEKLY', byDay: [1, 4] });
  assert.deepEqual(parseRepeat(null), { freq: null, byDay: [] });
  assert.equal(buildRepeat({ freq: 'WEEKLY', byDay: [4, 1] }), 'FREQ=WEEKLY;BYDAY=MO,TH');
  assert.equal(buildRepeat({ freq: null, byDay: [] }), null);
  // 頻度が同じなら UNTIL を残す。変えたら消す
  assert.equal(
    buildRepeat({ freq: 'WEEKLY', byDay: [1] }, 'FREQ=WEEKLY;BYDAY=MO,TH;UNTIL=20261231'),
    'FREQ=WEEKLY;BYDAY=MO;UNTIL=20261231',
  );
  assert.equal(buildRepeat({ freq: 'MONTHLY', byDay: [] }, 'FREQ=WEEKLY;UNTIL=20261231'), 'FREQ=MONTHLY');
  assert.equal(describeRepeat('FREQ=WEEKLY;BYDAY=MO,TH'), '毎週 月・木');
  assert.equal(describeRepeat('FREQ=YEARLY'), '毎年');
});

test('月に必要な週の数', () => {
  assert.equal(weeksInMonth(2026, 9), 5); // 2026年10月（1日が木曜）
  assert.equal(weeksInMonth(2026, 7), 6); // 2026年8月（1日が土曜・31日）
  assert.equal(weeksInMonth(2026, 1), 4); // 2026年2月（1日が日曜・28日）
});

test('六曜・旧暦', () => {
  const d = (s: string) => new Date(`${s}T12:00:00`);
  assert.equal(getRokuyo(d('2026-10-24')), '仏滅');
  assert.equal(getRokuyo(d('2026-01-15')), '先勝');
  assert.equal(getRokuyo(d('2026-06-20')), '仏滅');
  // 2033年問題：2033-12-22 から閏11月
  assert.deepEqual(toLunar(d('2033-12-22')), { month: 11, day: 1, leap: true });
  // 旧正月 2026-02-17
  assert.deepEqual(toLunar(d('2026-02-17')), { month: 1, day: 1, leap: false });
});

test('九星：年・月・本命星・月命星', () => {
  const d = (s: string) => new Date(`${s}T12:00:00`);
  assert.equal(yearStar(2026), 1); // 2026年は一白
  assert.equal(yearStar(1990), 1);
  assert.deepEqual(solarMonth(d('2026-10-24')), { year: 2026, month: 9 }); // 戌月
  assert.deepEqual(solarMonth(d('2026-02-03')), { year: 2025, month: 12 }); // 立春前は前年の丑月
  assert.equal(monthStar(2026, 9), 9); // 2026年10月の月盤は九紫
  // 1985-06-15 生まれ：1985年＝六白、午月 → 月命星
  const s = birthStars(d('1985-06-15'));
  assert.equal(s.honmei, 6);
  assert.equal(s.getsumei, monthStar(1985, 5));
});

test('日盤（八雲院の表示と照合した日）', () => {
  const d = (s: string) => new Date(`${s}T12:00:00`);
  assert.equal(dayKanshi(d('2026-10-24')), '辛未');
  assert.equal(dayKanshi(d('2026-01-15')), '己丑');
  assert.equal(dayKanshi(d('2026-06-20')), '乙丑');
  assert.equal(dayStar(d('2026-10-24')), 8);
  assert.equal(dayStar(d('2026-01-15')), 8); // 陽遁
  assert.equal(dayStar(d('2026-06-20')), 8); // 陰遁に切り替わった翌日

  const pick = (r: ReturnType<typeof dailyDirections>) =>
    Object.fromEntries(r.directions.map((x) => [x.direction, x.best ? '最大吉方' : x.good ? '吉方' : x.bad.join('、') || 'なし']));
  // 本命一白・月命一白 2026-10-24
  assert.deepEqual(pick(dailyDirections(d('2026-10-24'), 1, 1)), {
    N: '最大吉方', NE: '暗剣殺、日破、定位対冲', E: '本命的殺、月命的殺', SE: '最大吉方',
    S: '最大吉方', SW: '五黄殺', W: '本命殺、月命殺', NW: 'なし',
  });
  // 本命一白・月命二黒：北・南は吉方、南東は最大吉方
  const r2 = pick(dailyDirections(d('2026-10-24'), 1, 2));
  assert.equal(r2.N, '吉方');
  assert.equal(r2.SE, '最大吉方');
  assert.equal(r2.S, '吉方');
  assert.equal(dailyDirections(d('2026-10-24'), 1, 1).tendo, 'S');
  assert.equal(dailyDirections(d('2026-01-15'), 1, 1).tendo, 'W');
  assert.equal(dailyDirections(d('2026-06-20'), 1, 1).tendo, 'NW');
});

test('開運カレンダー：大開運日の予定と毎日の最大吉方', () => {
  const days = taikaiunDays(new Date('2026-01-01T00:00:00'), 365, 6, 1);
  assert.deepEqual(days.map((d) => `${d.date.getMonth() + 1}/${d.date.getDate()} ${d.title}`), [
    '9/7 大開運日 南西・北西',
    '9/16 大開運日 南西',
    '9/25 大開運日 北西',
    '10/4 大開運日 南西・北西',
  ]);
  assert.match(days[0].memo, /good_luck_list\/id\/6\/1\/2026/);
  assert.deepEqual(bestDirectionNames(new Date('2026-10-24T00:00:00'), 1, 1), ['北', '南東', '南']);
});

test('大開運日（八雲院 本命六白・月命一白 2026年の一覧と照合）', () => {
  const hits: string[] = [];
  for (let d = new Date(2026, 0, 1); d.getFullYear() === 2026; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    const r = taikaiunDirections(d, 6, 1);
    if (r.length) hits.push(`${d.getMonth() + 1}/${d.getDate()} ${r.map((x) => DIRECTION_NAMES[x]).join('、')}`);
  }
  assert.deepEqual(hits, ['9/7 南西、北西', '9/16 南西', '9/25 北西', '10/4 南西、北西']);
});

test('開始を変えたら終了が前にならないよう調整', () => {
  const prev = { startDate: '2026-10-06', startTime: '10:00', endDate: '2026-10-06', endTime: '11:30' };
  // 終了より前に動かした → そのまま
  assert.deepEqual(keepEndAfterStart(prev, { startDate: '2026-10-06', startTime: '09:00' }), { endDate: '2026-10-06', endTime: '11:30' });
  // 終了を越えた → 長さ（1時間30分）を保つ
  assert.deepEqual(keepEndAfterStart(prev, { startDate: '2026-10-06', startTime: '23:00' }), { endDate: '2026-10-07', endTime: '00:30' });
  assert.deepEqual(keepEndAfterStart(prev, { startDate: '2026-10-08', startTime: '10:00' }), { endDate: '2026-10-08', endTime: '11:30' });
});
