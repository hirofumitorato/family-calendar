import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  hourPosition,
  minutePosition,
  pointToHour,
  pointToMinute,
  toXY,
  withHour,
  withMinute,
} from '../src/lib/clock-dial.ts';

const S = 260;

test('時：外側は 1〜12、内側は 13〜23 と 0', () => {
  for (let h = 0; h < 24; h++) {
    const p = hourPosition(h);
    const { x, y } = toXY(p.angle, p.radius, S);
    assert.equal(pointToHour(x, y, S), h, `${h}時`);
  }
  // 真上の外側は 12、内側は 0
  assert.equal(pointToHour(S / 2, S * 0.1, S), 12);
  assert.equal(pointToHour(S / 2, S * 0.23, S), 0);
  // 右（3時の方向）の外側は 3、内側は 15
  assert.equal(pointToHour(S * 0.9, S / 2, S), 3);
  assert.equal(pointToHour(S * 0.77, S / 2, S), 15);
});

test('分：なぞると1分単位、タップは5分単位', () => {
  for (const m of [0, 7, 15, 33, 59]) {
    const p = minutePosition(m);
    const { x, y } = toXY(p.angle, p.radius, S);
    assert.equal(pointToMinute(x, y, S), m, `${m}分`);
  }
  const p = minutePosition(17);
  const { x, y } = toXY(p.angle, p.radius, S);
  assert.equal(pointToMinute(x, y, S, 5), 15);
  // 58分あたりをタップすると 0 分（60 にはならない）
  const q = minutePosition(58);
  const r = toXY(q.angle, q.radius, S);
  assert.equal(pointToMinute(r.x, r.y, S, 5), 0);
});

test('時刻の入れ替え', () => {
  assert.equal(withHour('10:30', 7), '07:30');
  assert.equal(withMinute('10:30', 5), '10:05');
});
