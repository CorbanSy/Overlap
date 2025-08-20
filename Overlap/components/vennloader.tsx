// VennLoader.tsx
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Circle, Mask, G } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  size?: number; // overall square size
  colorA?: string;
  colorB?: string;
  overlapColor?: string;
};

export default function VennLoader({
  size = 128,
  colorA = '#F5A623',        // Primary orange accent
  colorB = '#AAAAAA',        // Secondary gray
  overlapColor = '#1B1F24',  // Dark gray for overlap
}: Props) {
  const R = size * 0.27;        // circle radius
  const cy = size * 0.50;
  const sepMin = R * 0.65;      // closest centers (big overlap)
  const sepMax = R * 1.35;      // farthest centers (small overlap)

  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.cubic) }),
        withTiming(0, { duration: 800, easing: Easing.inOut(Easing.cubic) })
      ),
      -1,
      false
    );
  }, [t]);

  const aProps = useAnimatedProps(() => {
    const sep = sepMin + (sepMax - sepMin) * t.value;
    const cx = (size / 2) - sep / 2;
    const scale = 1 + 0.04 * Math.sin(t.value * Math.PI); // gentle breathe
    return {
      cx,
      cy,
      r: R * scale,
    } as any;
  });

  const bProps = useAnimatedProps(() => {
    const sep = sepMin + (sepMax - sepMin) * t.value;
    const cx = (size / 2) + sep / 2;
    const scale = 1 + 0.04 * Math.sin((1 - t.value) * Math.PI);
    return {
      cx,
      cy,
      r: R * scale,
    } as any;
  });

  // Mask uses Circle A to reveal the overlapping part of Circle B
  const maskAProps = aProps;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          {/* Orange gradient for primary circle */}
          <RadialGradient id="gradA" cx="50%" cy="50%" r="60%">
            <Stop offset="0%" stopColor={colorA} stopOpacity={0.9} />
            <Stop offset="100%" stopColor={colorA} stopOpacity={0.3} />
          </RadialGradient>
          
          {/* Gray gradient for secondary circle */}
          <RadialGradient id="gradB" cx="50%" cy="50%" r="60%">
            <Stop offset="0%" stopColor={colorB} stopOpacity={0.8} />
            <Stop offset="100%" stopColor={colorB} stopOpacity={0.2} />
          </RadialGradient>
          
          {/* Dark overlap gradient */}
          <RadialGradient id="gradOverlap" cx="50%" cy="50%" r="65%">
            <Stop offset="0%" stopColor={overlapColor} stopOpacity={0.9} />
            <Stop offset="100%" stopColor={overlapColor} stopOpacity={0.4} />
          </RadialGradient>

          <Mask id="maskA">
            <AnimatedCircle animatedProps={maskAProps} fill="#fff" />
          </Mask>
        </Defs>

        {/* Base circles */}
        <AnimatedCircle animatedProps={aProps} fill="url(#gradA)" />
        <AnimatedCircle animatedProps={bProps} fill="url(#gradB)" />

        {/* Overlap: draw B again but masked by A and tinted */}
        <G mask="url(#maskA)">
          <AnimatedCircle animatedProps={bProps} fill="url(#gradOverlap)" />
        </G>
      </Svg>
    </View>
  );
}