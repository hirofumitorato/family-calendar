import { useRef, type ReactNode } from 'react';
import { Animated, PanResponder, View, useWindowDimensions } from 'react-native';

/**
 * 横スワイプで前後に切り替えるコンテナ（月表示用）。
 * - 左へスワイプ → onNext、右へスワイプ → onPrev
 * - 横方向の動きが縦よりはっきり大きいときだけ反応するので、縦スクロールやタップ・長押しは妨げない
 * - 追加ライブラリなし（React Native 標準の PanResponder / Animated）。Expo Go・Web でも動く
 */
export function SwipePager({
  children,
  onPrev,
  onNext,
}: {
  children: ReactNode;
  onPrev: () => void;
  onNext: () => void;
}) {
  const { width } = useWindowDimensions();
  const translateX = useRef(new Animated.Value(0)).current;
  const animating = useRef(false);
  // PanResponder は一度だけ作るので、最新のコールバックは ref 経由で参照する
  const handlers = useRef({ onPrev, onNext, width });
  handlers.current = { onPrev, onNext, width };

  const isHorizontal = (dx: number, dy: number) => Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.5;

  const responder = useRef(
    PanResponder.create({
      // 子（日付マスの Pressable）より先に、横方向の動きだけを奪う
      onMoveShouldSetPanResponderCapture: (_e, g) => !animating.current && isHorizontal(g.dx, g.dy),
      onMoveShouldSetPanResponder: (_e, g) => !animating.current && isHorizontal(g.dx, g.dy),
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_e, g) => translateX.setValue(g.dx),
      onPanResponderRelease: (_e, g) => {
        const { width: w, onPrev: prev, onNext: next } = handlers.current;
        const threshold = Math.min(80, w * 0.2);
        const goNext = g.dx < -threshold || g.vx < -0.5;
        const goPrev = g.dx > threshold || g.vx > 0.5;

        if (!goNext && !goPrev) {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
          return;
        }

        animating.current = true;
        const dir = goNext ? -1 : 1;
        // いまの月を画面外へ流す → 月を切り替える → 反対側から新しい月を入れる
        Animated.timing(translateX, { toValue: dir * w, duration: 140, useNativeDriver: true }).start(() => {
          (goNext ? next : prev)();
          translateX.setValue(-dir * w);
          Animated.timing(translateX, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
            animating.current = false;
          });
        });
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
      },
    }),
  ).current;

  return (
    <View style={{ overflow: 'hidden' }} {...responder.panHandlers}>
      <Animated.View style={{ transform: [{ translateX }] }}>{children}</Animated.View>
    </View>
  );
}
