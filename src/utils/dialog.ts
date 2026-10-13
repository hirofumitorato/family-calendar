import { Alert, Platform } from 'react-native';

// react-native-web の Alert.alert は何も表示しないため、Web では window.alert / confirm を使う。

/** お知らせ（OKのみ） */
export function notify(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

/** 確認ダイアログ。OK なら true */
export function confirm(
  title: string,
  options: { message?: string; okText?: string; destructive?: boolean } = {},
): Promise<boolean> {
  const { message, okText = 'OK', destructive = false } = options;
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(message ? `${title}\n\n${message}` : title));
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'キャンセル', style: 'cancel', onPress: () => resolve(false) },
        { text: okText, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
