import { useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Switch, Text, View } from 'react-native';

import { PeopleSheet } from '@/components/people-sheet';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/state/app-store';
import { useThemePreference } from '@/state/theme';
import { confirm } from '@/utils/dialog';

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
  const { preference, setPreference, scheme } = useThemePreference();
  const [peopleOpen, setPeopleOpen] = useState(false);
  if (!ctx) return null;
  const followSystem = preference === 'system';

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

      <Text style={title}>表示</Text>
      <View style={section}>
        <View style={styles.switchRow}>
          <Text style={{ color: t.text, flex: 1 }}>端末の設定に合わせる</Text>
          <Switch
            value={followSystem}
            onValueChange={(v) => setPreference(v ? 'system' : scheme)}
            accessibilityLabel="端末の設定に合わせる"
          />
        </View>
        <View style={[styles.divider, { backgroundColor: t.border }]} />
        <View style={[styles.switchRow, followSystem && { opacity: 0.4 }]}>
          <Text style={{ color: t.text, flex: 1 }}>ダークモード</Text>
          <Switch
            value={scheme === 'dark'}
            disabled={followSystem}
            onValueChange={(v) => setPreference(v ? 'dark' : 'light')}
            accessibilityLabel="ダークモード"
          />
        </View>
      </View>

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

      <Text style={title}>誰の予定？に出る人</Text>
      <View style={section}>
        {ctx.people.map((p) => (
          <View key={p.id} style={styles.member}>
            <View style={[styles.dot, { backgroundColor: p.color }]} />
            <Text style={{ color: t.text, flex: 1 }}>{p.name}</Text>
            {p.user_id && <Text style={{ color: t.textSecondary, fontSize: 12 }}>アカウントあり</Text>}
          </View>
        ))}
        <Pressable onPress={() => setPeopleOpen(true)} accessibilityLabel="人を追加・編集" style={{ marginTop: 6 }}>
          <Text style={{ color: t.accent, fontWeight: '600' }}>＋ 追加・編集</Text>
        </Pressable>
      </View>

      <Text style={title}>天気予報の地点（現在：{ctx.family.location_name ?? '未設定'}）</Text>
      {repo.mode === 'demo' && (
        <Text style={[styles.note, { color: t.textSecondary }]}>
          デモモードの天気はサンプルデータです。Supabase 接続後は Open-Meteo の実際の予報が表示されます。
        </Text>
      )}
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
          onPress={async () => {
            if (await confirm('ログアウトしますか？', { okText: 'ログアウト', destructive: true })) {
              await repo.signOut();
            }
          }}>
          <Text style={{ color: t.sunday }}>ログアウト</Text>
        </Pressable>
      )}
      <PeopleSheet visible={peopleOpen} onClose={() => setPeopleOpen(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { padding: 16, gap: 8, paddingBottom: 48 },
  section: { borderRadius: 12, padding: 14 },
  sectionTitle: { fontSize: 12, marginTop: 12 },
  switchRow: { flexDirection: 'row', alignItems: 'center', minHeight: 36 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 8 },
  note: { fontSize: 11 },
  big: { fontSize: 18, fontWeight: '700' },
  member: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
});
