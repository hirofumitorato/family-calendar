import { test } from 'node:test';
import assert from 'node:assert/strict';
import { demoHourlyFromDaily, hourlyIcon } from '../src/lib/weather.ts';

test('夜の晴れは月', () => {
  assert.equal(hourlyIcon(0, 22).emoji, '🌙');
  assert.equal(hourlyIcon(0, 12).emoji, '☀️');
  assert.equal(hourlyIcon(61, 22).emoji, '☔');
});

test('デモの時間別：最高は昼過ぎ、最低は早朝、範囲内', () => {
  const h = demoHourlyFromDaily({ date: '2026-10-25', weather_code: 0, temp_max: 22, temp_min: 14, precip_prob: 10 });
  assert.equal(h.length, 24);
  assert.equal(h[14].temp, 22);
  assert.equal(h[5].temp, 14);
  for (const x of h) {
    assert.ok(x.temp! >= 14 && x.temp! <= 22);
    assert.ok(x.precip_prob! >= 0 && x.precip_prob! <= 100);
  }
});
