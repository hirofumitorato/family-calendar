import { useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Switch, Text, View } from 'react-native';

import { KaiunSheet } from '@/components/kaiun-sheet';
import { PeopleSheet } from '@/components/people-sheet';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/state/app-store';
import { useCalendarPrefs } from '@/state/calendar-prefs';
import { useThemePreference } from '@/state/theme';
import { currentVersionLabel, fetchNewUpdate, restartToApply, updatesSupported } from '@/utils/app-updates';
import { confirm, notify } from '@/utils/dialog';

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
  const [kaiunOpen, setKaiunOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const prefs = useCalendarPrefs();
  if (!ctx) return null;
  const kaiunPerson = prefs.kaiun ? ctx.people.find((p) => p.id === prefs.kaiun?.personId) : null;
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

      <Text style={title}>表示するカレンダー</Text>
      <View style={section}>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.text }}>六曜</Text>
            <Text style={[styles.note, { color: t.textSecondary }]}>日付の横に大安・仏滅などを表示</Text>
          </View>
          <Switch
            value={prefs.rokuyo}
            onValueChange={(v) => prefs.update({ rokuyo: v })}
            accessibilityLabel="六曜カレンダー"
          />
        </View>
        <View style={[styles.divider, { backgroundColor: t.border }]} />
        <Pressable
          onPress={() => setKaiunOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`開運カレンダー ${prefs.kaiun ? 'オン' : 'オフ'}`}
          style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.text }}>🧭 開運カレンダー</Text>
            <Text style={[styles.note, { color: t.textSecondary }]}>
              {prefs.kaiun
                ? `オン：${kaiunPerson?.name ?? ''}（${prefs.kaiun.birthDate.replace(/-/g, '/')} 生まれ）`
                : 'オフ：九星気学で大開運日と毎日の最大吉方を表示'}
            </Text>
          </View>
          <Text style={{ color: t.accent, fontWeight: '600' }}>{prefs.kaiun ? '変更 ›' : '設定 ›'}</Text>
        </Pressable>
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

      <Text style={title}>アプリのバージョン</Text>
      <View style={section}>
        <Text style={{ color: t.text }}>{currentVersionLabel()}</Text>
        <Pressable
          disabled={checking}
          accessibilityLabel="アップデートを確認"
          onPress={async () => {
            if (!updatesSupported()) {
              notify('この環境では確認できません', 'インストールしたアプリで使えます（Expo Go では git pull で反映）');
              return;
            }
            setChecking(true);
            try {
              if (await fetchNewUpdate()) {
                if (await confirm('新しいバージョンがあります', { message: '再起動して更新しますか？', okText: '再起動' })) {
                  await restartToApply();
                }
              } else {
                notify('最新のバージョンです');
              }
            } catch {
              notify('確認できませんでした', '通信できる場所でもう一度お試しください');
            } finally {
              setChecking(false);
            }
          }}
          style={{ marginTop: 8 }}>
          <Text style={{ color: t.accent, fontWeight: '600' }}>{checking ? '確認中…' : 'アップデートを確認'}</Text>
        </Pressable>
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
      <KaiunSheet visible={kaiunOpen} onClose={() => setKaiunOpen(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { padding: 16, gap: 8, paddingBottom: 48 },
  section: { borderRadius: 12, padding: 14 },
  sectionTitle: { fontSize: 12, marginTop: 12 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 36 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 8 },
  note: { fontSize: 11 },
  big: { fontSize: 18, fontWeight: '700' },
  member: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
});
