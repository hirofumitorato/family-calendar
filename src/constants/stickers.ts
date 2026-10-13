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
