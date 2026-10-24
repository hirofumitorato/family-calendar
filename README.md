# 👪 かぞくカレンダー (family-calendar)

iPhone / Android 両対応の家族向けカレンダーアプリ。Expo（React Native）＋ Supabase。

- 月表示カレンダー（祝日・振替休日・国民の休日をオフライン計算）
- 天気予報アイコン ☀️☁️☔️ を日付マスに表示（Open-Meteo）
- 「自分／家族／すべて」の表示切り替え（個人カレンダーは本人以外に見えない）
- 予定ごとのアイコン、日付マスに貼れるスタンプ
- 繰り返し予定（毎日／毎週／毎月／毎年）
- 家族の端末へリアルタイム同期（Supabase Realtime）

要件と今後のTODOは [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md)。

## まず動かす（デモモード）

Supabase を設定しなくても、端末内のサンプルデータで画面を確認できます。

```bash
npm install
npx expo start
```

スマホに **Expo Go** を入れて QR コードを読み取ると実機で動きます（iPhone / Android どちらも可）。

## Supabase に接続する

1. Supabase でプロジェクトを作成
2. マイグレーションを適用

   ```bash
   npx supabase link --project-ref <project-ref>
   npx supabase db push
   ```

3. `.env.example` を `.env` にコピーして URL と anon key を設定
4. 天気取得の Edge Function をデプロイ

   ```bash
   npx supabase functions deploy fetch-weather --no-verify-jwt
   ```

5. pg_cron で1日4回実行（SQL Editor で実行。`<project-ref>` と service_role キーを置き換え）

   ```sql
   create extension if not exists pg_cron;
   create extension if not exists pg_net;

   select cron.schedule(
     'fetch-weather',
     '5 */6 * * *',
     $$
     select net.http_post(
       url := 'https://<project-ref>.supabase.co/functions/v1/fetch-weather',
       headers := jsonb_build_object('Authorization', 'Bearer <service_role_key>')
     );
     $$
   );
   ```

   本番では service_role キーを SQL に直書きせず、Vault（`vault.decrypted_secrets`）から読むのがおすすめです。

## 家族のスマホにインストールする（EAS Build）

`preview` プロフィールは家族の端末に直接入れる用（Android は APK、iPhone は登録した端末だけに入る Ad Hoc）。

```bash
npx eas-cli@latest login
npx eas-cli@latest init                                   # app.json に projectId が入る
npx eas-cli@latest env:push --environment preview --path .env   # Supabase の URL / キーを EAS へ
npx eas-cli@latest build -p android --profile preview     # Android（APK）
npx eas-cli@latest device:create                          # iPhone を登録（端末ごと）
npx eas-cli@latest build -p ios --profile preview         # iPhone（Apple Developer Program が必要）
```

ビルドが終わると表示される URL / QR コードをスマホで開くとインストールできます。
JS だけの修正は `npx eas-cli@latest update --channel preview` で配信できるようにする予定（expo-updates の導入が必要）。

## 構成

```
src/
  app/                 画面（Expo Router）
    index.tsx          月カレンダー＋選択日の詳細
    event/new.tsx      予定の追加
    event/[id].tsx     予定の編集・削除
    settings.tsx       家族・招待コード・天気の地点
    sign-in.tsx        ログイン（Supabase 接続時のみ）
    onboarding.tsx     家族の作成／招待コードで参加
  components/          MonthGrid, DayDetail, EventForm, StickerPicker, ViewModeToggle
  data/                CalendarRepository（demo / supabase の2実装）
  lib/                 日付・祝日・繰り返し展開・天気コード変換（純粋関数、テストあり）
  state/app-store.tsx  ログイン状態・表示モード・月データ取得
supabase/
  migrations/          スキーマ＋RLS＋RPC（create_family / join_family）
  functions/fetch-weather/  Open-Meteo → weather_daily
tests/                 lib のユニットテスト
```

## コマンド

```bash
npm test            # lib のユニットテスト（Node 22.6+）
npm run typecheck   # tsc --noEmit
npx expo start      # 開発サーバー
```

## 配布

家族だけで使う場合はストア公開不要です。

- iOS: `npx eas-cli build -p ios` → TestFlight（Apple Developer 登録が必要）
- Android: `npx eas-cli build -p android` → APK を直接配布 or Google Play 内部テスト
