import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useAppUpdates } from '@/hooks/use-app-updates';
import { AppProvider, useApp } from '@/state/app-store';
import { CalendarPrefsProvider } from '@/state/calendar-prefs';
import { CustomStampsProvider } from '@/state/custom-stamps';
import { ThemePreferenceProvider, useThemePreference } from '@/state/theme';

SplashScreen.preventAutoHideAsync();

function RootStack() {
  const { status, error } = useApp();
  // 修正（EAS Update）を自動で受け取る
  useAppUpdates();

  useEffect(() => {
    if (status !== 'loading') SplashScreen.hideAsync();
  }, [status]);

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }
  if (status === 'error') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text>読み込みに失敗しました：{error}</Text>
      </View>
    );
  }

  return (
    // SDK 58 から iOS 26+ ではヘッダーが既定で透明（内容がヘッダーの下に潜る）になったため、不透明に固定する
    <Stack screenOptions={{ headerTransparent: false }}>
      <Stack.Protected guard={status === 'signed-out'}>
        <Stack.Screen name="sign-in" options={{ title: 'ログイン' }} />
      </Stack.Protected>
      <Stack.Protected guard={status === 'no-family'}>
        <Stack.Screen name="onboarding" options={{ title: '家族の設定', headerBackVisible: false }} />
      </Stack.Protected>
      <Stack.Protected guard={status === 'ready'}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="event/new" options={{ title: '予定を追加', presentation: 'modal' }} />
        <Stack.Screen name="event/[id]" options={{ title: '予定を編集', presentation: 'modal' }} />
        <Stack.Screen name="template/[id]" options={{ title: 'テンプレート', presentation: 'modal' }} />
        <Stack.Screen name="settings" options={{ title: '設定' }} />
      </Stack.Protected>
    </Stack>
  );
}

function ThemedRoot() {
  const { scheme } = useThemePreference();
  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <AppProvider>
        <CalendarPrefsProvider>
          <CustomStampsProvider>
            <RootStack />
          </CustomStampsProvider>
        </CalendarPrefsProvider>
      </AppProvider>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemePreferenceProvider>
      <ThemedRoot />
    </ThemePreferenceProvider>
  );
}

/**
 * 画面の表示中にエラーが起きたとき、真っ白にせずに知らせる（Expo Router が使う）。
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12, backgroundColor: '#FFF4EA' }}>
      <Text style={{ fontSize: 18, fontWeight: '700', color: '#2A2420' }}>エラーが起きました</Text>
      <Text style={{ fontSize: 13, color: '#7A6E66', textAlign: 'center' }}>{error.message}</Text>
      <Pressable
        onPress={retry}
        accessibilityRole="button"
        style={{ marginTop: 8, backgroundColor: '#E8641B', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 }}>
        <Text style={{ color: '#fff', fontWeight: '700' }}>もう一度</Text>
      </Pressable>
    </View>
  );
}
