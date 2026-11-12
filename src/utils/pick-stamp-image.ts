import { Platform } from 'react-native';

import { squareCrop } from '@/lib/stamp-catalog';

/** スタンプの画像の一辺（px）。スマホの画面で 36pt 前後に出しても十分きれいな大きさ */
const SIZE = 160;
/** これより大きければ JPEG にして小さくする（data URL の文字数） */
const MAX_PNG = 120_000;

/** この環境で画像を選べるか（今は Web だけ。アプリは画像を選ぶ部品が入っていない） */
export const canPickStampImage = Platform.OS === 'web' && typeof document !== 'undefined';

/**
 * 画像ファイルを選んでもらい、中央を正方形に切り抜いて 160px に縮め、data URL にして返す。
 * 選ばなかったら null。
 */
export function pickStampImage(): Promise<string | null> {
  if (!canPickStampImage) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      fileToStampDataUrl(file).then(resolve, reject);
    };
    input.click();
  });
}

export async function fileToStampDataUrl(file: Blob): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, ng) => {
      const el = new window.Image();
      el.onload = () => ok(el);
      el.onerror = () => ng(new Error('画像を読み込めませんでした'));
      el.src = url;
    });
    const { sx, sy, side } = squareCrop(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const g = canvas.getContext('2d');
    if (!g) throw new Error('画像を処理できませんでした');
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, sx, sy, side, side, 0, 0, SIZE, SIZE);
    const png = canvas.toDataURL('image/png');
    return png.length <= MAX_PNG ? png : canvas.toDataURL('image/jpeg', 0.88);
  } finally {
    URL.revokeObjectURL(url);
  }
}
