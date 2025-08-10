import React, { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
  runOnJS,
} from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

export default function VennDiagram({ startAnimation, onAnimationComplete }) {
  const r = 80;
  const cy = 150;

  const finalLeftX = 120;
  const finalRightX = 180;

  // 0 = far apart, 1 = overlapped
  const progress = useSharedValue(0);

  const leftCircleProps = useAnimatedProps(() => {
    const cx = interpolate(
      progress.value,
      [0, 1],
      [finalLeftX - 120, finalLeftX],
      Extrapolate.CLAMP
    );
    return { cx };
  });

  const rightCircleProps = useAnimatedProps(() => {
    const cx = interpolate(
      progress.value,
      [0, 1],
      [finalRightX + 120, finalRightX],
      Extrapolate.CLAMP
    );
    return { cx };
  });

  const intersectionPathProps = useAnimatedProps(() => {
    const cxLeft = interpolate(progress.value, [0, 1], [finalLeftX - 120, finalLeftX], Extrapolate.CLAMP);
    const cxRight = interpolate(progress.value, [0, 1], [finalRightX + 120, finalRightX], Extrapolate.CLAMP);

    const dist = cxRight - cxLeft;
    if (dist >= 2 * r) return { d: '' };

    const midX = (cxLeft + cxRight) / 2;
    const h = Math.sqrt(r * r - (dist / 2) ** 2);
    const topY = cy - h;
    const bottomY = cy + h;

    const d = `
      M ${midX},${topY}
      A ${r},${r} 0 0,1 ${midX},${bottomY}
      A ${r},${r} 0 0,0 ${midX},${topY}
      Z
    `;
    return { d, fill: '#1a4cb2' };
  });

  useEffect(() => {
    if (startAnimation) {
      progress.value = withSpring(
        1,
        { damping: 9, stiffness: 120 },
        (finished) => {
          'worklet';
          if (finished && onAnimationComplete) {
            // small delay feels nicer; optional
            progress.value = withTiming(1, { duration: 50 });
            runOnJS(onAnimationComplete)(); // ✅ bounce back to JS thread
          }
        }
      );
    }
  }, [startAnimation]);

  return (
    <View>
      <Svg width={300} height={300} viewBox="0 0 300 300">
        <AnimatedCircle
          animatedProps={leftCircleProps}
          cy={cy}
          r={r}
          fill="#006699"
          stroke="black"
          strokeWidth={2}
        />
        <AnimatedCircle
          animatedProps={rightCircleProps}
          cy={cy}
          r={r}
          fill="#3333cc"
          stroke="black"
          strokeWidth={2}
        />
        <AnimatedPath animatedProps={intersectionPathProps} stroke="black" strokeWidth={2} />
      </Svg>
    </View>
  );
}
