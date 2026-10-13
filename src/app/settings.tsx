import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/state/app-store';

// 天気予報の地点。まずは主要都市から選ぶ形にし、後で expo-location による現在地取得を追加する。
const LOCATIONS = [
  { name: '札幌', latitude: 43.06, longitude: 141.35 },
  { name: '仙台', latitude: 38.27, longitude: 140.87 },
  { name: '東京', latitude: 35.68, longitude: 139.77 },
  { name: '横浜', latitude: 35.44, longitude: 139.64 },
  { name: '名古屋', latitude: 35.18, longitude: 136.91 },
  { name: '大阪', latitude: 34.69, longitude: 135.5 },
  { name: '広島', latitude: 34.39, longitude: 132.46 },
  { name: '福岡', latitude: 33.59, longitude: 130.4 },
  { name: '那覇', latitude: 26.21, longitude: 127.68 },
];

export default function SettingsScreen() {
  const t = useTheme();
  const { repo, ctx, reload } = useApp();
  if (!ctx) return null;

  const section = [styles.section, { backgroundColor: t.backgroundElement }];
  const title = [styles.sectionTitle, { color: t.textSecondary }];

  return (
    <ScrollView style={{ backgroundColor: t.background }} contentContainerStyle={styles.root}>
      {repo.mode === 'demo' && (
        <View style={[section, { backgroundColor: t.today }]}>
          <Text style={{ color: t.text }}>
            デモモードで動作中です。.env に Supabase の URL とキーを設定すると、家族で共有できるようになります。
          </Text>
        </View>
      )}

      <Text style={title}>家族</Text>
      <View style={section}>
        <Text style={[styles.big, { color: t.text }]}>{ctx.family.name}</Text>
        <Pressable
          onPress={() =>
            Share.share({ message: `かぞくカレンダーの招待コード：${ctx.family.invite_code}` })
          }>
          <Text style={{ color: t.accent, marginTop: 6 }}>招待コード {ctx.family.invite_code} を共有</Text>
        </Pressable>
      </View>

      <Text style={title}>メンバー</Text>
      <View style={section}>
        {ctx.members.map((m) => (
          <View key={m.user_id} style={styles.member}>
            <View style={[styles.dot, { backgroundColor: m.color }]} />
            <Text style={{ color: t.text, flex: 1 }}>{m.display_name}</Text>
            {m.role === 'owner' && <Text style={{ color: t.textSecondary, fontSize: 12 }}>作成者</Text>}
          </View>
        ))}
      </View>

      <Text style={title}>天気予報の地点（現在：{ctx.family.location_name ?? '未設定'}）</Text>
      <View style={[section, styles.chips]}>
        {LOCATIONS.map((l) => {
          const active = l.name === ctx.family.location_name;
          return (
            <Pressable
              key={l.name}
              onPress={async () => {
                await repo.updateFamilyLocation(ctx.family.id, l);
                await reload();
              }}
              style={[styles.chip, { borderColor: t.border }, active && { backgroundColor: t.accent, borderColor: t.accent }]}>
              <Text style={{ color: active ? '#fff' : t.text }}>{l.name}</Text>
            </Pressable>
          );
        })}
      </View>

      {repo.mode === 'supabase' && (
        <Pressable
          style={[section, { alignItems: 'center' }]}
          onPress={() =>
            Alert.alert('ログアウトしますか？', undefined, [
              { text: 'キャンセル', style: 'cancel' },
              { text: 'ログアウト', style: 'destructive', onPress: () => repo.signOut() },
            ])
          }>
          <Text style={{ color: t.sunday }}>ログアウト</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { padding: 16, gap: 8, paddingBottom: 48 },
  section: { borderRadius: 12, padding: 14 },
  sectionTitle: { fontSize: 12, marginTop: 12 },
  big: { fontSize: 18, fontWeight: '700' },
  member: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
});
