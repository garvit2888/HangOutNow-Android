import React, { useEffect, useMemo } from 'react';
import { Animated, Easing, useWindowDimensions, ViewStyle } from 'react-native';
import Colors from '@/constants/colors';

const EDGE_PADDING = 8; // distance from absolute edge

function useLoop(duration: number, delay: number = 0) {
  const progress = useMemo(() => new Animated.Value(0), []);
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(progress, {
          toValue: 1,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [progress, duration, delay]);
  return progress;
}

function positionAlongPerimeter(t: number, w: number, h: number, pad: number) {
  // Move around the rectangle edges clockwise
  const width = w - pad * 2;
  const height = h - pad * 2;
  const perimeter = 2 * (width + height);
  const d = t * perimeter;
  let x = pad, y = pad;
  if (d <= width) {
    // top edge left->right
    x = pad + d;
    y = pad;
  } else if (d <= width + height) {
    // right edge top->bottom
    x = pad + width;
    y = pad + (d - width);
  } else if (d <= width + height + width) {
    // bottom edge right->left
    x = pad + (width - (d - (width + height)));
    y = pad + height;
  } else {
    // left edge bottom->top
    x = pad;
    y = pad + (height - (d - (width + height + width)));
  }
  return { x, y };
}

type BubbleDef = {
  size: number;
  color: string;
  duration: number;
  delay: number;
  opacity: number;
};

const DEFAULT_BUBBLES: BubbleDef[] = [
  { size: 10, color: Colors.secondary, duration: 12000, delay: 0, opacity: 0.45 },
  { size: 12, color: Colors.secondary, duration: 14000, delay: 600, opacity: 0.35 },
  { size: 8, color: Colors.white, duration: 10000, delay: 1200, opacity: 0.25 },
  { size: 14, color: Colors.white, duration: 16000, delay: 1800, opacity: 0.2 },
];

export default function EdgeBubbles({ bubbles = DEFAULT_BUBBLES, style }: { bubbles?: BubbleDef[]; style?: ViewStyle }) {
  const { width, height } = useWindowDimensions();
  return (
    <>
      {bubbles.map((b, idx) => {
        const progress = useLoop(b.duration, b.delay);
        // We can't directly compute x,y in styles; instead interpolate with a listener via transform mapping
        // Use Animated.Code-like approach: compute translateX/Y via mapping of progress to perimeter
        const ranges = [0, 0.25, 0.5, 0.75, 1];
        const topY = EDGE_PADDING;
        const leftX = EDGE_PADDING;
        const rightX = width - EDGE_PADDING - b.size;
        const bottomY = height - EDGE_PADDING - b.size;
        const translateX = progress.interpolate({
          inputRange: ranges,
          outputRange: [leftX, rightX, rightX, leftX, leftX],
        });
        const translateY = progress.interpolate({
          inputRange: ranges,
          outputRange: [topY, topY, bottomY, bottomY, topY],
        });
        const bubbleStyle: any = {
          position: 'absolute',
          width: b.size,
          height: b.size,
          borderRadius: b.size / 2,
          backgroundColor: b.color,
          opacity: b.opacity,
          pointerEvents: 'none',
        };
        return (
          <Animated.View
            key={idx}
            style={[bubbleStyle, { transform: [{ translateX }, { translateY }] }, style]}
          />
        );
      })}
    </>
  );
}
