import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  STAMP_CATEGORIES,
  allStamps,
  emojiGlyphs,
  parseStamp,
  searchStamps,
  stampAsText,
  textStamp,
  textStampLayout,
} from '../src/lib/stamp-catalog.ts';

test('文字スタンプの値の形と読み戻し', () => {
  const v = textStamp('#1E88E5', '早番');
  assert.equal(v, 'tx:#1E88E5:早番');
  assert.deepEqual(parseStamp(v), { kind: 'text', color: '#1E88E5', label: '早番' });
  assert.deepEqual(parseStamp('🐶'), { kind: 'emoji', glyph: '🐶' });
  assert.equal(stampAsText(v), '［早番］');
  assert.equal(stampAsText('🐶'), '🐶');
  assert.equal(stampAsText(null), '');
});

test('文字スタンプの行分け', () => {
  assert.deepEqual(textStampLayout('休').lines, ['休']);
  assert.deepEqual(textStampLayout('早番').lines, ['早番']);
  assert.deepEqual(textStampLayout('給料日').lines, ['給料日']);
  assert.deepEqual(textStampLayout('夜勤明け').lines, ['夜勤', '明け']);
  assert.deepEqual(textStampLayout('燃えないゴミ').lines, ['燃えな', 'いゴミ']);
});

test('カタログ：名前が空でない・カテゴリ内で重複しない・十分な数', () => {
  for (const c of STAMP_CATEGORIES) {
    const values = c.items.map((i) => i.value);
    assert.equal(new Set(values).size, values.length, `${c.name} に重複`);
    for (const it of c.items) {
      assert.ok(it.label.length > 0, `${c.name}: 名前なし ${it.value}`);
      assert.ok(!/\s/.test(it.value), `${c.name}: 値に空白 ${it.value}`);
    }
  }
  assert.ok(allStamps().length >= 400);
});

test('絵のスタンプはすべて画像がある', () => {
  const table = fs.readFileSync(new URL('../src/constants/stamp-images.ts', import.meta.url), 'utf8');
  for (const g of emojiGlyphs()) {
    assert.ok(table.includes(JSON.stringify(g.replace(/️/g, ''))), `画像なし ${g}`);
  }
});

test('検索：ひらがなでもカタカナの名前が見つかる', () => {
  const r = searchStamps('ごみ').map((s) => s.label);
  assert.ok(r.includes('燃えるゴミ'));
  assert.ok(searchStamps('病院').length >= 2);
  assert.equal(searchStamps('').length, 0);
});
