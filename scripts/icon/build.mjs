// アプリのアイコン一式を作る：node scripts/icon/build.mjs /tmp/stamptools
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const req = createRequire(path.join(path.resolve(process.argv[2]), 'package.json'));
const { Resvg } = req('@resvg/resvg-js');
const sharp = req('sharp');
const here = path.dirname(new URL(import.meta.url).pathname);
const out = (f) => path.resolve(here, '../../assets/images', f);
const svg = (f) => fs.readFileSync(path.join(here, f), 'utf8');
const render = (s, size) => new Resvg(s, { fitTo: { mode: 'width', value: size } }).render().asPng();

const mark = svg('mark.svg');
const bg = svg('background.svg');

// iPhone / Web 用：背景＋マーク（角丸は OS が付ける）
const full = bg.replace('</svg>', mark.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '') + '</svg>');
const icon1024 = render(full, 1024);
fs.writeFileSync(out('icon.png'), await sharp(icon1024).png({ compressionLevel: 9 }).toBuffer());

// Android アダプティブアイコン：前景はマークを小さめに（端末ごとに丸・角丸などに切り抜かれるため）
const fg = await sharp(render(mark, 1024)).resize(840, 840).extend({ top: 92, bottom: 92, left: 92, right: 92, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
fs.writeFileSync(out('android-icon-foreground.png'), fg);
fs.writeFileSync(out('android-icon-background.png'), await sharp(render(bg, 1024)).png().toBuffer());
// モノクロ（Android 13 のテーマアイコン）：形だけを白で
const monoSvg = mark
  .replace(/fill="#[0-9A-Fa-f]{6}"/g, 'fill="#FFFFFF"')
  .replace(/stroke="#FFFFFF"/g, 'stroke="#000000"')
  .replace(/stroke="#C24E0E"/g, 'stroke="#000000"')
  .replace(/<filter[\s\S]*?<\/filter>/, '')
  .replace(' filter="url(#shadow)"', '');
// 白一色だと人が紙に溶けるので、人の部分は抜く（透明）
const monoCut = monoSvg.replace(/<g>\s*<circle[\s\S]*?<\/g>/, (g) =>
  g.replace(/fill="#FFFFFF"/g, 'fill="#000000"'));
const monoRaw = await sharp(render(monoCut, 1024)).resize(840, 840).extend({ top: 92, bottom: 92, left: 92, right: 92, background: { r: 0, g: 0, b: 0, alpha: 0 } }).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
// 黒い部分を透明にする
const { data, info } = monoRaw;
for (let i = 0; i < data.length; i += 4) {
  if (data[i] < 128 && data[i + 3] > 0) data[i + 3] = 0;
}
fs.writeFileSync(out('android-icon-monochrome.png'), await sharp(data, { raw: info }).png().toBuffer());

// 起動画面用（背景色は app.json）
fs.writeFileSync(out('splash-icon.png'), await sharp(render(mark, 1024)).resize(512, 512).png().toBuffer());
// ブラウザのタブ用・iPhone のホーム画面用（Web 版）
fs.writeFileSync(out('favicon.png'), await sharp(icon1024).resize(48, 48).png().toBuffer());
fs.mkdirSync(path.resolve(here, '../../public'), { recursive: true });
fs.writeFileSync(path.resolve(here, '../../public/apple-touch-icon.png'), await sharp(icon1024).resize(180, 180).png().toBuffer());
fs.writeFileSync(path.resolve(here, '../../public/icon-512.png'), await sharp(icon1024).resize(512, 512).png().toBuffer());
console.log('ok');
