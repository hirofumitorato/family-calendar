import { test } from 'node:test';
import assert from 'node:assert/strict';
import { warekiYear } from '../src/lib/wareki.ts';

test('和暦', () => {
  assert.equal(warekiYear(2026, 10, 1), '令和8年');
  assert.equal(warekiYear(2019, 5, 1), '令和元年');
  assert.equal(warekiYear(2019, 4, 30), '平成31年');
  assert.equal(warekiYear(1989, 1, 1), '昭和64年');
  assert.equal(warekiYear(1989, 2, 1), '平成元年');
  assert.equal(warekiYear(2062, 1, 1), '令和44年');
  assert.equal(warekiYear(1800), null);
});
