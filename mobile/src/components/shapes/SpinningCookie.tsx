import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing } from 'react-native';
import { useReducedMotion } from '@/theme';
import { Cookie12 } from './Shape';

type SpinningCookieProps = { color: string; size?: number };

/** Loading indicator of the app: the cookie spins instead of a circular spinner (tokens.md). */
export const SpinningCookie = ({ color, size = 24 }: SpinningCookieProps) => {
  const reducedMotion = useReducedMotion();
  const [turn] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reducedMotion) return;
    const loop = Animated.loop(
      Animated.timing(turn, {
        toValue: 1,
        duration: 1600,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [reducedMotion, turn]);

  const rotate = useMemo(
    () => turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }),
    [turn],
  );

  return (
    <Animated.View
      style={{ transform: [{ rotate }] }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Cookie12 color={color} size={size} />
    </Animated.View>
  );
};
