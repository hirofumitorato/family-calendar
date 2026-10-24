// 純粋ロジックのテスト。実行: npm test（Node 22.6+ の型ストリップで直接実行）
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildMonthGrid, toDateKey, weeksInMonth } from '../src/lib/date.ts';
import { getJapaneseHolidays } from '../src/lib/holidays.ts';
import { expandOccurrences, truncateRRuleBefore } from '../src/lib/recurrence.ts';
import { buildRepeat, describeRepeat, parseRepeat } from '../src/lib/repeat.ts';
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
