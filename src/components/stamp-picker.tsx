import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ScrollViewInstance,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Stamp } from '@/components/stamp';
import { useRecentStamps } from '@/hooks/use-recent-stamps';
import { useTheme } from '@/hooks/use-theme';
import { STAMP_CATEGORIES, allStamps, searchStamps, type StampItem } from '@/lib/stamp-catalog';

const RECENT = '__recent__';

/**
 * スタンプ（予定のアイコン）を選ぶ画面。
 * 検索欄があるので、キーボードに隠れないよう画面の上から出す。
 * カテゴリのタブ・検索・最近使ったもの。
 */
export function StampPicker({
  visible,
  title = 'スタンプを選ぶ',
  value,
  onSelect,
  onClose,
  allowClear = true,
}: {
  visible: boolean;
  title?: string;
  value?: string | null;
  onSelect: (value: string | null) => void;
  onClose: () => void;
  allowClear?: boolean;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { recent, remember } = useRecentStamps();
  const [tab, setTab] = useState<string>(RECENT);
  const [query, setQuery] = useState('');
  const gridRef = useRef<ScrollViewInstance>(null);

  // 開くたびに：最近使ったものがあればそこから、なければ最初のカテゴリから
  useEffect(() => {
    if (!visible) return;
    setQuery('');
    setTab(recent.length ? RECENT : STAMP_CATEGORIES[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    gridRef.current?.scrollTo({ y: 0, animated: false });
  }, [tab, query]);

  const labelOf = useMemo(() => new Map(allStamps().map((s) => [s.value, s.label])), []);

  const items: StampItem[] = query.trim()
    ? searchStamps(query)
    : tab === RECENT
      ? recent.map((v) => ({ value: v, label: labelOf.get(v) ?? '' }))
      : (STAMP_CATEGORIES.find((c) => c.id === tab)?.items ?? []);

  const pick = (v: string) => {
    remember(v);
    onSelect(v);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.sheet, { backgroundColor: t.background, paddingTop: insets.top + 8 }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: t.text }]}>{title}</Text>
          <View style={{ flex: 1 }} />
          {allowClear && (
            <Pressable onPress={() => onSelect(null)} hitSlop={8} accessibilityLabel="スタンプなし">
              <Text style={{ color: t.textSecondary, fontSize: 15 }}>なし</Text>
            </Pressable>
          )}
          <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="スタンプ選びを閉じる">
            <Text style={{ color: t.accent, fontSize: 15, fontWeight: '600' }}>閉じる</Text>
          </Pressable>
        </View>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="さがす（例：ゴミ、病院、いぬ）"
          placeholderTextColor={t.textMuted}
          accessibilityLabel="スタンプをさがす"
          returnKeyType="search"
          style={[styles.search, { backgroundColor: t.backgroundElement, color: t.text }]}
        />

        {!query.trim() && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs} contentContainerStyle={styles.tabsInner}>
            {[{ id: RECENT, name: '🕘 最近' }, ...STAMP_CATEGORIES].map((c) => {
              const active = c.id === tab;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setTab(c.id)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`カテゴリ ${c.name}`}
                  style={[styles.tab, active && { backgroundColor: t.text }]}>
                  <Text style={{ color: active ? t.background : t.textSecondary, fontSize: 14, fontWeight: active ? '700' : '500' }}>
                    {c.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <ScrollView ref={gridRef} style={{ flex: 1 }} contentContainerStyle={styles.grid} keyboardShouldPersistTaps="handled">
          {items.length === 0 && (
            <Text style={[styles.empty, { color: t.textMuted }]}>
              {query.trim() ? '見つかりませんでした' : 'まだありません。使ったスタンプがここに並びます'}
            </Text>
          )}
          {items.map((it) => {
            const selected = it.value === value;
            return (
              <Pressable
                key={it.value}
                onPress={() => pick(it.value)}
                accessibilityLabel={`スタンプ ${it.label}`}
                style={({ pressed }) => [
                  styles.cell,
                  { backgroundColor: pressed || selected ? t.selected : t.backgroundElement },
                  selected && { borderColor: t.accent, borderWidth: 2 },
                ]}>
                <Stamp value={it.value} size={34} />
                <Text style={[styles.cellLabel, { color: t.textSecondary }]} numberOfLines={1}>
                  {it.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="閉じる" />
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    height: '82%',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 18, paddingHorizontal: 4, marginBottom: 8 },
  title: { fontSize: 17, fontWeight: '700' },
  search: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 15 },
  tabs: { flexGrow: 0, marginTop: 8 },
  tabsInner: { gap: 4, paddingRight: 8 },
  tab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingTop: 10, paddingBottom: 16, gap: 6 },
  cell: {
    width: '15%', // 1行に6個
    aspectRatio: 0.86,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    gap: 3,
  },
  cellLabel: { fontSize: 9 },
  empty: { paddingVertical: 32, textAlign: 'center', width: '100%' },
});
