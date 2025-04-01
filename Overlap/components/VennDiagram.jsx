import React, { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path, G } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
  withRepeat,
  withTiming,
  interpolate,
  Extrapolate,
  runOnJS,
} from 'react-native-reanimated';

// Wrap Circle and Path in Reanimated for prop animations
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);
// We'll animate transform on a <G> (group) to show a star pulsing
const AnimatedG = Animated.createAnimatedComponent(G);

/**
 * VennDiagram with a Sparkly Star effect.
 * - Moves two circles from far apart to overlapping with a single spring.
 * - Then triggers a pulsing star shape at the center.
 */
export default function VennDiagram({ startAnimation, onAnimationComplete }) {
  // Circle radius & vertical center
  const r = 80;
  const cy = 150;

  // Where circles finally meet
  const finalLeftX = 120;
  const finalRightX = 180;

  // 1) progress: controls circle separation (0 = far apart, 1 = overlapped)
  const progress = useSharedValue(0);

  // 2) sparkle: controls the pulsing scale of the star
  //    (1 = normal size, >1 = bigger star)
  const sparkle = useSharedValue(1);

  // Animate left circle’s centerX from finalLeftX - 120 => finalLeftX
  const leftCircleProps = useAnimatedProps(() => {
    const cx = interpolate(
      progress.value,
      [0, 1],
      [finalLeftX - 120, finalLeftX],
      Extrapolate.CLAMP
    );
    return { cx };
  });

  // Animate right circle’s centerX from finalRightX + 120 => finalRightX
  const rightCircleProps = useAnimatedProps(() => {
    const cx = interpolate(
      progress.value,
      [0, 1],
      [finalRightX + 120, finalRightX],
      Extrapolate.CLAMP
    );
    return { cx };
  });

  // Overlap path
  const intersectionPathProps = useAnimatedProps(() => {
    // Current X positions
    const cxLeft = interpolate(
      progress.value,
      [0, 1],
      [finalLeftX - 120, finalLeftX],
      Extrapolate.CLAMP
    );
    const cxRight = interpolate(
      progress.value,
      [0, 1],
      [finalRightX + 120, finalRightX],
      Extrapolate.CLAMP
    );

    const dist = cxRight - cxLeft;
    if (dist >= 2 * r) {
      // No overlap
      return { d: '' };
    }

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
    return {
      d,
      fill: '#1a4cb2', // Overlap color
    };
  });

  // Star path is centered at (0,0), we'll animate it via a <G transform="...">
  // Quick 5-point star around the origin, radius ~30.
  const starPath =
    'M 0 -30 L 9 -9 L 29 -9 L 14 3 L 18 23 L 0 12 L -18 23 L -14 3 L -29 -9 L -9 -9 Z';

  // We'll animate the scale of <G> so the star pulses
  const animatedStarProps = useAnimatedStyle(() => {
    // We'll do a manual transform string for <G>
    // translate(150,150) moves it to the center,
    // scale(...) does the pulse,
    // translate(-150,-150) resets origin.
    const scale = sparkle.value;
    return {
      transform: [
        { translateX: 150 },
        { translateY: 150 },
        { scale: scale },
        { translateX: -150 },
        { translateY: -150 },
      ],
    };
  });

  // Once circles are overlapped, start the star pulse
  const startSparkle = () => {
    sparkle.value = withRepeat(
      // Pulse up to 1.5 then back
      withTiming(1.5, { duration: 700 }),
      -1, // infinite repeats
      true // reverse
    );
  };

  useEffect(() => {
    if (startAnimation) {
      // Single spring from progress=0 -> 1
      progress.value = withSpring(
        1,
        {
          damping: 9,
          stiffness: 120,
        },
        (finished) => {
          if (finished) {
            // Start the star pulsing
            startSparkle();
            // Optionally let parent know the Venn is done
            if (onAnimationComplete) {
              runOnJS(onAnimationComplete)();
            }
          }
        }
      );
    }
  }, [startAnimation]);

  return (
    <View>
      <Svg width={300} height={300} viewBox="0 0 300 300">
        {/* Left Circle */}
        <AnimatedCircle
          animatedProps={leftCircleProps}
          cy={cy}
          r={r}
          fill="#006699"
          stroke="black"
          strokeWidth={2}
        />

        {/* Right Circle */}
        <AnimatedCircle
          animatedProps={rightCircleProps}
          cy={cy}
          r={r}
          fill="#3333cc"
          stroke="black"
          strokeWidth={2}
        />

        {/* Overlap Path */}
        <AnimatedPath
          animatedProps={intersectionPathProps}
          stroke="black"
          strokeWidth={2}
        />

        {/* Sparkly Star (in a group with a pulsing scale) */}
        <AnimatedG style={animatedStarProps}>
          <Path d={starPath} fill="gold" stroke="orange" strokeWidth={1} />
        </AnimatedG>
      </Svg>
    </View>
  );
}
