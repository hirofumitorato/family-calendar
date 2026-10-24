import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { describeRepeat } from '@/lib/repeat';
import type { EventTemplate, Person } from '@/lib/types';
import { confirm } from '@/utils/dialog';

export const UNCATEGORIZED = '未分類';
const ALL = '__all__';

/** テンプレートのジャンル一覧（ジャンル設定の順 → テンプレートにだけあるもの → 未分類） */
export function templateGenres(templates: EventTemplate[], order: string[] = []): string[] {
  const seen: string[] = [...order];
  for (const t of templates) {
    const g = t.category?.trim() || UNCATEGORIZED;
    if (!seen.includes(g)) seen.push(g);
  }
  return [...seen.filter((g) => g !== UNCATEGORIZED), ...seen.filter((g) => g === UNCATEGORIZED)];
}

/**
 * 予定テンプレートを「ジャンル → テンプレート」の2段階プルダウンで選ぶ。
 * テンプレート一覧から編集・削除・新規作成もできる。
 */
export function TemplatePicker({
  templates,
  genres: genreOrder = [],
  people,
  onApply,
  onEdit,
  onDelete,
  onCreate,
}: {
  templates: EventTemplate[];
  /** ジャンル設定の並び順 */
  genres?: string[];
  people: Person[];
  onApply: (t: EventTemplate) => void;
  onEdit: (t: EventTemplate) => void;
  onDelete: (t: EventTemplate) => Promise<void>;
  /** 新しいテンプレートを作る（選択中のジャンルを初期値に） */
  onCreate: (genre: string | null) => void;
}) {
  const t = useTheme();
  const genres = useMemo(() => templateGenres(templates, genreOrder), [templates, genreOrder]);
  const [genre, setGenre] = useState<string>(ALL);
  const [applied, setApplied] = useState<EventTemplate | null>(null);
  const [open, setOpen] = useState<'genre' | 'template' | null>(null);

  const inGenre = templates.filter(
    (tpl) => genre === ALL || (tpl.category?.trim() || UNCATEGORIZED) === genre,
  );
  const personOf = (id: string | null) => (id ? people.find((p) => p.id === id) : undefined);
  const subtitle = (tpl: EventTemplate) =>
    [
      personOf(tpl.member_id)?.name,
      tpl.rrule ? describeRepeat(tpl.rrule) : null,
      tpl.all_day ? '終日' : tpl.start_time,
    ]
      .filter(Boolean)
      .join('・');

  return (
    <View>
      {/* プルダウンは1つ。タップ → ジャンル → テンプレートの順に選ぶ */}
      <Dropdown
        label="テンプレート"
        value={
          applied
            ? `${applied.category?.trim() || UNCATEGORIZED} › ${applied.icon ?? ''}${applied.title}`
            : 'ジャンルから選ぶ'
        }
        placeholder={!applied}
        onPress={() => setOpen('genre')}
      />

      {/* 1段目：ジャンル */}
      <Sheet visible={open === 'genre'} title="ジャンルを選ぶ" onClose={() => setOpen(null)}>
        {[ALL, ...genres].map((g) => {
          const count = g === ALL ? templates.length : templates.filter((x) => (x.category?.trim() || UNCATEGORIZED) === g).length;
          const active = g === genre;
          return (
            <Pressable
              key={g}
              accessibilityLabel={`ジャンル ${g === ALL ? 'すべて' : g}`}
              onPress={() => {
                setGenre(g);
                // ジャンルを選んだら、そのままテンプレート一覧へ
                setOpen('template');
              }}
              style={({ pressed }) => [
                styles.option,
                { backgroundColor: pressed || active ? t.selected : t.backgroundElement },
              ]}>
              <Text style={[styles.optionTitle, { color: t.text }]}>{g === ALL ? 'すべて' : g}</Text>
              <Text style={{ color: t.textSecondary }}>{count}件 ›</Text>
            </Pressable>
          );
        })}
      </Sheet>

      {/* 2段目：テンプレート */}
      <Sheet
        visible={open === 'template'}
        title={genre === ALL ? 'テンプレートを選ぶ' : `${genre} のテンプレート`}
        onBack={() => setOpen('genre')}
        onClose={() => setOpen(null)}>
        {inGenre.length === 0 && (
          <Text style={{ color: t.textMuted, paddingVertical: 12 }}>このジャンルのテンプレートはありません</Text>
        )}
        {inGenre.map((tpl) => {
          const color = personOf(tpl.member_id)?.color;
          return (
            <View
              key={tpl.id}
              style={[styles.option, { backgroundColor: t.backgroundElement, borderLeftColor: color ?? t.border }, styles.templateOption]}>
              <Pressable
                style={{ flex: 1 }}
                accessibilityLabel={`テンプレート ${tpl.title}`}
                onPress={() => {
                  onApply(tpl);
                  setApplied(tpl);
                  setOpen(null);
                }}>
                <Text style={[styles.optionTitle, { color: t.text }]} numberOfLines={1}>
                  {tpl.icon ? `${tpl.icon} ` : ''}
                  {tpl.title}
                </Text>
                <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                  {subtitle(tpl)}
                </Text>
              </Pressable>
              <Pressable
                hitSlop={6}
                accessibilityLabel={`${tpl.title} を編集`}
                onPress={() => {
                  setOpen(null);
                  onEdit(tpl);
                }}
                style={styles.optionAction}>
                <Text style={{ color: t.accent, fontWeight: '600' }}>編集</Text>
              </Pressable>
              <Pressable
                hitSlop={6}
                accessibilityLabel={`${tpl.title} を削除`}
                onPress={async () => {
                  const ok = await confirm(`テンプレート「${tpl.title}」を削除しますか？`, {
                    okText: '削除',
                    destructive: true,
                  });
                  if (!ok) return;
                  await onDelete(tpl);
                  if (applied?.id === tpl.id) setApplied(null);
                }}
                style={styles.optionAction}>
                <Text style={{ color: t.sunday, fontWeight: '600' }}>削除</Text>
              </Pressable>
            </View>
          );
        })}
        <Pressable
          accessibilityLabel="新しいテンプレート"
          onPress={() => {
            setOpen(null);
            onCreate(genre === ALL || genre === UNCATEGORIZED ? null : genre);
          }}
          style={[styles.newRow, { borderColor: t.border }]}>
          <Text style={{ color: t.accent, fontWeight: '600' }}>＋ 新しいテンプレート</Text>
        </Pressable>
      </Sheet>
    </View>
  );
}

function Dropdown({
  label,
  value,
  placeholder,
  onPress,
  style,
}: {
  label: string;
  value: string;
  placeholder?: boolean;
  onPress: () => void;
  style?: object;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}：${value}`}
      style={[styles.dropdown, { backgroundColor: t.backgroundElement, borderColor: t.border }, style]}>
      <Text style={{ color: t.textSecondary, fontSize: 10 }}>{label}</Text>
      <View style={styles.dropdownValue}>
        <Text style={{ color: placeholder ? t.textMuted : t.text, fontSize: 14, flex: 1 }} numberOfLines={1}>
          {value}
        </Text>
        <Text style={{ color: t.textSecondary, fontSize: 12 }}>▼</Text>
      </View>
    </Pressable>
  );
}

function Sheet({
  visible,
  title,
  onClose,
  onBack,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  onBack?: () => void;
  children: React.ReactNode;
}) {
  const t = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="閉じる" />
      <View style={[styles.sheet, { backgroundColor: t.background }]}>
        <View style={styles.sheetHeader}>
          {onBack ? (
            <Pressable onPress={onBack} hitSlop={10} accessibilityLabel="ジャンルに戻る">
              <Text style={{ color: t.accent, fontSize: 15 }}>‹ ジャンル</Text>
            </Pressable>
          ) : (
            <View style={{ width: 70 }} />
          )}
          <Text style={[styles.sheetTitle, { color: t.text }]} numberOfLines={1}>
            {title}
          </Text>
          <Pressable onPress={onClose} hitSlop={10} style={{ width: 70, alignItems: 'flex-end' }}>
            <Text style={{ color: t.textSecondary, fontSize: 15 }}>閉じる</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ gap: 8, paddingBottom: 32 }}>{children}</ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  dropdown: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  dropdownValue: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: { maxHeight: '70%', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sheetTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700' },
  option: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  templateOption: { borderLeftWidth: 4, paddingRight: 4 },
  optionTitle: { fontSize: 15, fontWeight: '600', flex: 1 },
  optionAction: { paddingHorizontal: 10, paddingVertical: 8 },
  newRow: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, padding: 14, alignItems: 'center' },
});
