import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

/** 'system' = 端末の設定に合わせる */
export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'theme-preference';

type ThemeState = {
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  /** 実際に使う配色 */
  scheme: 'light' | 'dark';
};

const ThemeContext = createContext<ThemeState | null>(null);

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [preference, setPref] = useState<ThemePreference>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === 'light' || v === 'dark' || v === 'system') setPref(v);
      })
      .catch(() => {});
  }, []);

  const setPreference = (p: ThemePreference) => {
    setPref(p);
    AsyncStorage.setItem(STORAGE_KEY, p).catch(() => {});
  };

  const scheme = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;

  return (
    <ThemeContext.Provider value={{ preference, setPreference, scheme }}>{children}</ThemeContext.Provider>
  );
}

export function useThemePreference(): ThemeState {
  const v = useContext(ThemeContext);
  if (!v) throw new Error('useThemePreference must be used within ThemePreferenceProvider');
  return v;
}
