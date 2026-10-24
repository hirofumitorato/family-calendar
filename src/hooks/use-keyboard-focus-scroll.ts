import { useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, type LayoutChangeEvent, type ScrollViewInstance } from 'react-native';

/**
 * 入力欄にフォーカスしたら、その欄が画面の上のほう（キーボードの上）に来るようスクロールする。
 *
 * 使い方：
 *   const kb = useKeyboardFocusScroll();
 *   <ScrollView ref={kb.scrollRef} contentContainerStyle={{ paddingBottom: 48 + kb.keyboardHeight }}>
 *     <TextInput {...kb.field('memo')} onFocus={kb.focus('memo')} />
 *
 * field() の onLayout は ScrollView の中身の「直下」の要素に付けること（y 座標を中身の先頭からの位置として使うため）。
 */
export function useKeyboardFocusScroll(offset = 12) {
  const scrollRef = useRef<ScrollViewInstance>(null);
  const positions = useRef(new Map<string, number>());
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (e) => setKeyboardHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const scrollTo = (key: string) => {
    const y = positions.current.get(key);
    if (y === undefined) return;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - offset), animated: true });
  };

  const field = (key: string) => ({
    onLayout: (e: LayoutChangeEvent) => {
      positions.current.set(key, e.nativeEvent.layout.y);
    },
  });

  // キーボード分の余白が付いてからでないと下の欄は上まで動かせないので、少し遅れてもう一度合わせる
  const focus = (key: string) => () => {
    scrollTo(key);
    setTimeout(() => scrollTo(key), 300);
  };

  return { scrollRef, field, focus, keyboardHeight };
}
