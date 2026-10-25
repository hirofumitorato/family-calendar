import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const KEY = 'recent-stamps';
const MAX = 28;

/** 最近使ったスタンプ（この端末だけに保存） */
export function useRecentStamps() {
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => {
        if (v) setRecent(JSON.parse(v));
      })
      .catch(() => {});
  }, []);

  const remember = useCallback((value: string) => {
    setRecent((cur) => {
      const next = [value, ...cur.filter((x) => x !== value)].slice(0, MAX);
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return { recent, remember };
}
