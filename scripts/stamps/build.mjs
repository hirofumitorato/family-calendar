// 絵のスタンプの画像を作る。
// Fluent Emoji（https://github.com/microsoft/fluentui-emoji 、MIT License）の Color SVG を PNG にして
// assets/stamps/ に置き、src/constants/stamp-images.ts（絵文字 → require の対応表）を書き出す。
//
// 使い方:
//   git clone --depth 1 --filter=blob:none --sparse https://github.com/microsoft/fluentui-emoji.git /tmp/fluent
//   (cd /tmp/fluent && git sparse-checkout set --no-cone '/LICENSE' '/assets/*/Color/*.svg' '/assets/*/Default/Color/*.svg' '/assets/*/metadata.json')
//   npm i --prefix /tmp/stamptools @resvg/resvg-js sharp
//   node --experimental-strip-types scripts/stamps/build.mjs /tmp/fluent /tmp/stamptools
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const [fluentDir, toolsDir] = process.argv.slice(2);
const req = createRequire(path.join(path.resolve(toolsDir), 'package.json'));
const { Resvg } = req('@resvg/resvg-js');
const sharp = req('sharp');
const { emojiGlyphs } = await import('../../src/lib/stamp-catalog.ts');

const SIZE = 96; // 表示は最大 36pt 前後なので、2〜3倍の画面でもきれいに見える大きさ
const strip = (s) => s.replace(/️/g, '');
const codepoints = (s) => Array.from(strip(s)).map((c) => c.codePointAt(0).toString(16)).join('-');

// glyph → svg のパス
const index = new Map();
for (const name of fs.readdirSync(path.join(fluentDir, 'assets'))) {
  const dir = path.join(fluentDir, 'assets', name);
  const metaPath = path.join(dir, 'metadata.json');
  if (!fs.existsSync(metaPath)) continue;
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  for (const sub of ['Color', path.join('Default', 'Color')]) {
    const d = path.join(dir, sub);
    if (!fs.existsSync(d)) continue;
    const svg = fs.readdirSync(d).find((f) => f.endsWith('.svg'));
    if (svg) {
      index.set(strip(meta.glyph), path.join(d, svg));
      break;
    }
  }
}

const outDir = path.resolve('assets/stamps');
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const entries = [];
const missing = [];
let bytes = 0;
for (const glyph of emojiGlyphs()) {
  const svgPath = index.get(strip(glyph));
  if (!svgPath) {
    missing.push(glyph);
    continue;
  }
  const png = new Resvg(fs.readFileSync(svgPath), { fitTo: { mode: 'width', value: SIZE } }).render().asPng();
  const file = `${codepoints(glyph)}.png`;
  const out = await sharp(png).png({ palette: true, quality: 90, effort: 10 }).toBuffer();
  fs.writeFileSync(path.join(outDir, file), out);
  bytes += out.length;
  entries.push([glyph, file]);
}

fs.copyFileSync(path.join(fluentDir, 'LICENSE'), path.join(outDir, 'LICENSE-fluentui-emoji.txt'));

const lines = entries
  .sort((a, b) => a[1].localeCompare(b[1]))
  .map(([g, f]) => `  ${JSON.stringify(strip(g))}: require('../../assets/stamps/${f}'),`);
fs.writeFileSync(
  'src/constants/stamp-images.ts',
  `// 自動生成：scripts/stamps/build.mjs（Fluent Emoji, MIT License — assets/stamps/LICENSE-fluentui-emoji.txt）\n` +
    `// キーは異体字セレクタ（U+FE0F）を除いた絵文字\n` +
    `/* eslint-disable */\n` +
    `export const STAMP_IMAGES: Record<string, number> = {\n${lines.join('\n')}\n};\n`,
);
console.log(`images: ${entries.length}, ${(bytes / 1024).toFixed(0)} KB total`);
if (missing.length) console.log('missing:', missing.join(' '));
