import type { ThemeColors } from '@/constants/theme';

/**
 * 予定の見た目（カレンダー・予定一覧・編集画面のタイトルで共通）。
 * 終日＝濃い色に白い文字、時間指定＝淡い色に通常の文字。
 */
export function eventLook(color: string, allDay: boolean, t: ThemeColors) {
  return allDay
    ? { bg: color, bar: color, text: '#fff', sub: 'rgba(255,255,255,0.85)', solid: true }
    : { bg: `${color}33`, bar: color, text: t.text, sub: t.textSecondary, solid: false };
}
