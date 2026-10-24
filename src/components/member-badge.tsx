import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import type { Person } from '@/lib/types';

/** 誰の予定かを示す小さなバッジ。予定の先頭（左端）に置く */
export function MemberBadge({ person, size = 'small' }: { person: Person | null; size?: 'small' | 'medium' }) {
  const t = useTheme();
  const medium = size === 'medium';
  return (
    <View
      accessibilityLabel={`${person ? person.name : 'みんな'}の予定`}
      style={[
        styles.badge,
        medium && styles.badgeMedium,
        { backgroundColor: person ? person.color : t.border },
      ]}>
      <Text
        numberOfLines={1}
        style={[styles.text, medium && styles.textMedium, { color: person ? '#fff' : t.textSecondary }]}>
        {person ? person.name : 'みんな'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1, maxWidth: 60, alignSelf: 'center' },
  badgeMedium: { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, maxWidth: 90 },
  text: { fontSize: 10, fontWeight: '700' },
  textMedium: { fontSize: 12 },
});
