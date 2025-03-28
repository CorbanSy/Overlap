import React, { useRef, useEffect } from 'react';
import { View, Animated, Easing } from 'react-native';
import Svg, { Circle, Path, Text } from 'react-native-svg';

// Create an Animated wrapper for the <Circle> component
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function VennDiagram({ startAnimation, onAnimationComplete }) {
  // Final positions for the two circles (for a proper overlap)
  const finalLeftCx = 120;
  const finalRightCx = 180;
  
  // Start positions so that circles are initially apart (no overlap)
  const leftCx = useRef(new Animated.Value(90)).current;   // starts left of finalLeftCx
  const rightCx = useRef(new Animated.Value(210)).current;  // starts right of finalRightCx

  // Circle radius and constant center y-coordinate
  const r = 80;
  const cy = 150;
  
  // When startAnimation is true, animate the circles into their final positions
  useEffect(() => {
    if (startAnimation) {
      Animated.parallel([
        Animated.timing(leftCx, {
          toValue: finalLeftCx,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false, // Must be false for SVG attributes
        }),
        Animated.timing(rightCx, {
          toValue: finalRightCx,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]).start(() => {
        // Notify parent when animation completes
        if (onAnimationComplete) {
          onAnimationComplete();
        }
      });
    }
  }, [startAnimation]);

  // For two circles with centers at (120,150) and (180,150) and r = 80:
  // The distance between centers d = 60, and a = d/2 = 30.
  // h = sqrt(r^2 - a^2) = sqrt(6400 - 900) ≈ 74.16.
  // Intersection points are approximately (150, 150 - 74.16) and (150, 150 + 74.16).
  const h = Math.sqrt(r * r - 30 * 30); // ≈ 74.16

  // Define the path for the intersection (lens shape) using two arcs.
  // First arc: along the left circle from the upper intersection to the lower.
  // Second arc: along the right circle from the lower intersection back to the upper.
  const intersectionPath = `
    M150,${cy - h}
    A${r},${r} 0 0,0 150,${cy + h}
    A${r},${r} 0 0,1 150,${cy - h}
    Z
  `;

  return (
    <View>
      {/* Updated SVG container: width and height set to 300 */}
      <Svg width={300} height={300} viewBox="0 0 300 300">
        {/* Left Circle (Animated) */}
        <AnimatedCircle
          cx={leftCx}
          cy={cy}
          r={r}
          fill="#006699"
        />
        {/* Right Circle (Animated) */}
        <AnimatedCircle
          cx={rightCx}
          cy={cy}
          r={r}
          fill="#3333cc"
        />
        {/* Intersection Region */}
        <Path
          d={intersectionPath}
          fill="#1a4cbf"  // Color for the overlapped area
        />
        {/* Center Text */}
        <Text
          x="150"
          y="165"
          textAnchor="middle"
          fontSize="50"  // Big text size
          fill="#ffffff"
          fontWeight="bold"
        >
          Overlap
        </Text>
      </Svg>
    </View>
  );
}
