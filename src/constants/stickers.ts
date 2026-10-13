// 予定アイコン・日付スタンプのプリセット。
// まずは絵文字で実装し、後からオリジナル画像（Supabase Storage）に拡張する想定。
// 画像スタンプは sticker 値を 'img:<storage path>' の形式で保存する。

export type StickerGroup = { label: string; items: string[] };

/** 予定に付けるアイコン */
export const EVENT_ICON_GROUPS: StickerGroup[] = [
  { label: 'イベント', items: ['🎂', '🎉', '🎁', '💐', '🎄', '🎍', '🎃', '💍'] },
  { label: '生活', items: ['🏥', '💊', '🦷', '💇', '🛒', '🍽️', '🧹', '🗑️'] },
  { label: '子ども', items: ['🏫', '🎒', '📚', '⚽', '🎹', '🏊', '✏️', '👶'] },
  { label: 'おでかけ', items: ['✈️', '🚗', '🚃', '🏕️', '♨️', '🎢', '🏖️', '🗻'] },
  { label: 'しごと', items: ['💼', '💻', '📞', '📝', '💰', '🏦', '📦', '⏰'] },
];

/** 日付マスに貼るスタンプ */
export const DAY_STICKER_GROUPS: StickerGroup[] = [
  { label: 'きもち', items: ['😊', '🥰', '😆', '😴', '😢', '😤', '🤒', '👍'] },
  { label: 'マーク', items: ['⭐', '❤️', '💮', '✅', '❗', '🔥', '🍀', '🌸'] },
  { label: 'できごと', items: ['🍰', '🍺', '🍜', '🏃', '🧘', '📖', '🎮', '🎬'] },
];

/** スタンプ値が画像参照かどうか */
export function isImageSticker(value: string): boolean {
  return value.startsWith('img:');
}

/** メンバーに割り当てる色の候補 */
export const MEMBER_COLORS = [
  '#3B82F6',
  '#10B981',
  '#F97316',
  '#EC4899',
  '#8B5CF6',
  '#EAB308',
  '#06B6D4',
  '#EF4444',
];

/** 日付セルに付けられる背景色 */
export const DAY_COLORS = [
  { label: 'あか', value: '#EF4444' },
  { label: 'オレンジ', value: '#F97316' },
  { label: 'きいろ', value: '#EAB308' },
  { label: 'みどり', value: '#22C55E' },
  { label: 'みずいろ', value: '#06B6D4' },
  { label: 'あお', value: '#3B82F6' },
  { label: 'むらさき', value: '#8B5CF6' },
  { label: 'ピンク', value: '#EC4899' },
  { label: 'グレー', value: '#6B7280' },
];

/** セル背景用に薄くした色（ライト／ダーク両方で文字が読めるよう半透明にする） */
export function dayColorFill(hex: string): string {
  return `${hex}38`;
}
