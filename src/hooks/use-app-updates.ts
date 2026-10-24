import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { fetchNewUpdate, restartToApply, updatesSupported } from '@/utils/app-updates';
import { confirm } from '@/utils/dialog';

const MIN_INTERVAL = 10 * 60 * 1000; // アプリに戻るたびに確認しすぎないよう10分あける

/**
 * 起動時と、アプリに戻ってきたときに新しいバージョンを確認する。
 * 見つかったら裏でダウンロードし、「今すぐ再起動」するか聞く。
 * 「あとで」を選んでも、次にアプリを起動し直したときに新しいバージョンになる。
 */
export function useAppUpdates() {
  const last = useRef(0);
  const asking = useRef(false);

  useEffect(() => {
    if (!updatesSupported()) return;
    const run = async () => {
      const now = Date.now();
      if (asking.current || now - last.current < MIN_INTERVAL) return;
      last.current = now;
      try {
        if (!(await fetchNewUpdate())) return;
        asking.current = true;
        const ok = await confirm('新しいバージョンがあります', {
          message: '今すぐ再起動して更新しますか？（あとでも、次に開いたときに更新されます）',
          okText: '再起動',
        });
        asking.current = false;
        if (ok) await restartToApply();
      } catch {
        // 圏外などで失敗しても、次の機会にまた確認する
        asking.current = false;
      }
    };
    run();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') run();
    });
    return () => sub.remove();
  }, []);
}
