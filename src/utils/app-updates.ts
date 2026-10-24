import * as Updates from 'expo-updates';
import { Platform } from 'react-native';

/**
 * EAS Update（修正をアプリに自動で届ける仕組み）。
 * Expo Go・開発中・Web では使えない（expo-updates の API が失敗する）ので、その場合は何もしない。
 */
export function updatesSupported(): boolean {
  return !__DEV__ && Platform.OS !== 'web' && Updates.isEnabled;
}

/** 新しいバージョンがあればダウンロードまで行う。ダウンロードできたら true */
export async function fetchNewUpdate(): Promise<boolean> {
  if (!updatesSupported()) return false;
  const check = await Updates.checkForUpdateAsync();
  if (!check.isAvailable) return false;
  const fetched = await Updates.fetchUpdateAsync();
  return fetched.isNew;
}

/** ダウンロード済みの新しいバージョンで再起動する */
export function restartToApply(): Promise<void> {
  return Updates.reloadAsync();
}

/** 今動いているバージョンの説明（設定画面用） */
export function currentVersionLabel(): string {
  if (!updatesSupported()) return __DEV__ ? '開発版（Expo Go など）' : 'アップデート未設定';
  const at = Updates.createdAt;
  const date = at
    ? `${at.getFullYear()}/${at.getMonth() + 1}/${at.getDate()} ${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`
    : '';
  return Updates.isEmbeddedLaunch ? `インストール時のまま（${Updates.channel ?? ''}）` : `${date} の更新（${Updates.channel ?? ''}）`;
}
