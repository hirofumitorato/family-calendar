import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

/** 開運カレンダーの設定（誰の・生年月日・何か月分作るか） */
export type KaiunSettings = {
  personId: string;
  /** 'YYYY-MM-DD' */
  birthDate: string;
  months: number;
};

/** 「表示するカレンダー」の設定。端末ごとに保存する */
export type CalendarPrefs = {
  rokuyo: boolean;
  kaiun: KaiunSettings | null;
};

const STORAGE_KEY = 'calendar-prefs';
const DEFAULTS: CalendarPrefs = { rokuyo: true, kaiun: null };

type State = CalendarPrefs & { update: (patch: Partial<CalendarPrefs>) => void };

const Ctx = createContext<State | null>(null);

export function CalendarPrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<CalendarPrefs>(DEFAULTS);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => v && setPrefs({ ...DEFAULTS, ...JSON.parse(v) }))
      .catch(() => {});
  }, []);

  const update = (patch: Partial<CalendarPrefs>) => {
    setPrefs((cur) => {
      const next = { ...cur, ...patch };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  return <Ctx.Provider value={{ ...prefs, update }}>{children}</Ctx.Provider>;
}

export function useCalendarPrefs(): State {
  const v = useContext(Ctx);
  if (!v) throw new Error('useCalendarPrefs must be used within CalendarPrefsProvider');
  return v;
}
