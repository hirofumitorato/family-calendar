// アナログ時計の文字盤で時刻を選ぶための計算。外部依存なし。
//
// 時の文字盤（24時間）：外側の輪に 1〜12（12 が上）、内側の輪に 13〜23 と 0（00 が上）。
// 分の文字盤：外側の輪に 00, 05, …, 55。5分単位で選ぶ（以前の予定の 7分 などは表示だけできる）。
// 角度は「上（12時の方向）が 0 度、時計回り」。

/** 外側・内側の輪の半径（文字盤の直径に対する比率） */
export const OUTER_R = 0.4;
export const INNER_R = 0.27;
/** これより中心に近ければ内側の輪 */
const INNER_LIMIT = (OUTER_R + INNER_R) / 2;

/** 中心からの角度（度、上が 0、時計回り）と距離 */
export function polar(x: number, y: number, size: number): { angle: number; dist: number } {
  const c = size / 2;
  const dx = x - c;
  const dy = y - c;
  let angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
  if (angle < 0) angle += 360;
  return { angle, dist: Math.hypot(dx, dy) / size };
}

/** 文字盤の上の点 → 時（0〜23） */
export function pointToHour(x: number, y: number, size: number): number {
  const { angle, dist } = polar(x, y, size);
  const idx = Math.round(angle / 30) % 12;
  if (dist < INNER_LIMIT) return idx === 0 ? 0 : idx + 12;
  return idx === 0 ? 12 : idx;
}

/** 文字盤の上の点 → 分（0〜59）。snap=5 なら5分単位 */
export function pointToMinute(x: number, y: number, size: number, snap: 1 | 5 = 1): number {
  const { angle } = polar(x, y, size);
  const step = 6 * snap;
  return (Math.round(angle / step) * snap) % 60;
}

/** 時（0〜23）の位置：角度と、内側の輪かどうか */
export function hourPosition(h: number): { angle: number; radius: number } {
  const inner = h === 0 || h > 12;
  return { angle: (h % 12) * 30, radius: inner ? INNER_R : OUTER_R };
}

/** 分（0〜59）の位置 */
export function minutePosition(m: number): { angle: number; radius: number } {
  return { angle: m * 6, radius: OUTER_R };
}

/** 角度と半径（比率）→ 文字盤の上の座標 */
export function toXY(angle: number, radius: number, size: number): { x: number; y: number } {
  const rad = (angle * Math.PI) / 180;
  return { x: size / 2 + Math.sin(rad) * radius * size, y: size / 2 - Math.cos(rad) * radius * size };
}

/** 'HH:mm' の時・分を入れ替える */
export function withHour(time: string, h: number): string {
  const m = time.split(':')[1] ?? '00';
  return `${String(h).padStart(2, '0')}:${m.padStart(2, '0')}`;
}
export function withMinute(time: string, m: number): string {
  const h = time.split(':')[0] ?? '00';
  return `${h.padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
