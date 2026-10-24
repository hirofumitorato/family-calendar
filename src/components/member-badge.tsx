import { StyleSheet, Text, View } from 'react-native';


import { useTheme } from '@/hooks/use-theme';
import type { Person } from '@/lib/types';

/** 誰の予定かを示す小さなバッジ。予定の先頭（左端）に置く */
export function MemberBadge({
  person,
  size = 'small',
  outlined = false,
}: {
  person: Person | null;
  size?: 'small' | 'medium';
  /** 濃い色の上に置くとき、白い縁で見分けられるようにする */
  outlined?: boolean;
}) {
  const t = useTheme();
  const medium = size === 'medium';
  // 未指定なら何も出さない
  if (!person) return null;
  return (
    <View
      accessibilityLabel={`${person.name}の予定`}
      style={[
        styles.badge,
        medium && styles.badgeMedium,
        { backgroundColor: person.color },
        outlined && styles.outlined,
      ]}>
      <Text
        numberOfLines={1}
        style={[styles.text, medium && styles.textMedium, { color: '#fff' }]}>
        {person.name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1, maxWidth: 60, alignSelf: 'center' },
  badgeMedium: { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, maxWidth: 90 },
  text: { fontSize: 10, fontWeight: '700' },
  textMedium: { fontSize: 12 },
  outlined: { borderWidth: 1, borderColor: '#fff' },
});

/** 複数人のバッジを縦に並べる（多いときは max 人まで＋「+n」） */
export function MemberBadges({
  people,
  max = 3,
  size = 'small',
  outlined = false,
  direction = 'column',
}: {
  people: Person[];
  max?: number;
  size?: 'small' | 'medium';
  outlined?: boolean;
  direction?: 'row' | 'column';
}) {
  const t = useTheme();
  if (!people.length) return null;
  const shown = people.length > max ? people.slice(0, max - 1) : people;
  const rest = people.length - shown.length;
  return (
    <View style={{ flexDirection: direction, gap: 2, alignItems: direction === 'column' ? 'flex-start' : 'center' }}>
      {shown.map((p) => (
        <MemberBadge key={p.id} person={p} size={size} outlined={outlined} />
      ))}
      {rest > 0 && (
        <Text style={{ fontSize: size === 'medium' ? 12 : 10, fontWeight: '700', color: outlined ? '#fff' : t.textSecondary }}>
          +{rest}
        </Text>
      )}
    </View>
  );
}
