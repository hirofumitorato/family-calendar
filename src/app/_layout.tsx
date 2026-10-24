import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { AppProvider, useApp } from '@/state/app-store';
import { CalendarPrefsProvider } from '@/state/calendar-prefs';
import { ThemePreferenceProvider, useThemePreference } from '@/state/theme';

SplashScreen.preventAutoHideAsync();

function RootStack() {
  const { status, error } = useApp();

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
          <RootStack />
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
