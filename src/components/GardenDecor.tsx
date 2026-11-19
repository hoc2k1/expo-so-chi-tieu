import React, { useEffect } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Radius, Shadows, useTheme } from '../constants/theme';

interface GardenSproutsProps {
  /** Which corners show subtle sprouting leaves/grass (kept to 2–3 max for minimalist feel) */
  variant?: 'input' | 'card' | 'minimal';
}

/**
 * Minimalist Nature UI sprouting leaves, grass blades, and tiny white daisies
 * peeking out at 2–3 border points — never wrapping the whole border.
 */
export const GardenSprouts: React.FC<GardenSproutsProps> = ({ variant = 'input' }) => {
  const { isDark } = useTheme();
  const sway = useSharedValue(0);

  useEffect(() => {
    sway.value = withRepeat(
      withSequence(
        withTiming(3, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        withTiming(-2, { duration: 2200, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, [sway]);

  const leafSwayStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${sway.value}deg` }],
  }));

  const leafMain = isDark ? '#8AB963' : '#94C36F';
  const leafLight = isDark ? '#A8CC83' : '#B6DB8F';
  const leafDark = isDark ? '#69994A' : '#73A654';
  const petal = isDark ? '#F4F6EC' : '#FFFFFF';
  const flowerCenter = '#F8CF64';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Position 1: Top-left small sprouting leaves */}
      <Animated.View style={[styles.topLeftLeaf, leafSwayStyle]}>
        <Svg width={38} height={22} viewBox="0 0 38 22">
          <Path
            d="M15 20 C12 13, 6 9, 4 6 C10 6, 15 10, 17 17 Z"
            fill={leafLight}
          />
          <Path
            d="M17 19 C17 10, 22 4, 28 2 C27 9, 23 16, 18 19 Z"
            fill={leafMain}
          />
          <Path
            d="M27 14 C30 11, 34 10, 36 11 C34 14, 31 15, 27 14 Z"
            fill={leafLight}
            opacity={0.9}
          />
        </Svg>
      </Animated.View>

      {/* Position 2: Bottom-left grass tuft + tiny daisy */}
      <View style={styles.bottomLeftGrass}>
        <Svg width={44} height={30} viewBox="0 0 44 30">
          <Path d="M12 28 C6 20, 4 12, 6 4 C8 12, 12 19, 17 26 Z" fill={leafLight} />
          <Path d="M15 28 C12 21, 12 14, 15 8 C17 15, 18 21, 21 27 Z" fill={leafMain} />
          <Path d="M18 28 C23 23, 30 22, 37 26 C30 28, 24 29, 18 28 Z" fill={leafDark} />
          {/* Tiny white daisy */}
          <Circle cx="16" cy="21" r="2.2" fill={petal} />
          <Circle cx="19" cy="23.2" r="2.2" fill={petal} />
          <Circle cx="17.8" cy="26.5" r="2.2" fill={petal} />
          <Circle cx="14.2" cy="26.5" r="2.2" fill={petal} />
          <Circle cx="13" cy="23.2" r="2.2" fill={petal} />
          <Circle cx="16" cy="24" r="2.1" fill={flowerCenter} />
        </Svg>
      </View>

      {/* Position 3: Bottom-right tiny grass + daisy (shown on input & card variants) */}
      {variant !== 'minimal' && (
        <View style={styles.bottomRightGrass}>
          <Svg width={48} height={22} viewBox="0 0 48 22">
            <Path d="M8 20 C6 15, 7 10, 10 6 C11 11, 12 16, 14 20 Z" fill={leafMain} />
            <Path d="M14 20 C15 14, 18 9, 22 6 C21 12, 20 16, 18 20 Z" fill={leafLight} />
            <Path d="M16 20 C22 16, 30 15, 38 19 C32 21, 24 21, 16 20 Z" fill={leafDark} opacity={0.85} />
            {/* Tiny white daisy */}
            <Circle cx="28" cy="14" r="1.9" fill={petal} />
            <Circle cx="30.6" cy="16" r="1.9" fill={petal} />
            <Circle cx="29.6" cy="18.8" r="1.9" fill={petal} />
            <Circle cx="26.4" cy="18.8" r="1.9" fill={petal} />
            <Circle cx="25.4" cy="16" r="1.9" fill={petal} />
            <Circle cx="28" cy="16.8" r="1.8" fill={flowerCenter} />
          </Svg>
        </View>
      )}
    </View>
  );
};

interface GardenBoxProps {
  children: React.ReactNode;
  variant?: 'input' | 'card' | 'minimal';
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}

/**
 * Minimalist Nature UI container: cream/surface fill, #A8CC83 border, 26px radius,
 * subtle leaf-green shadow, and 2–3 sprouting grass/leaf clusters on the border.
 */
export const GardenBox: React.FC<GardenBoxProps> = ({
  children,
  variant = 'card',
  style,
  contentStyle,
}) => {
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.outerWrap, style]}>
      <View
        style={[
          styles.box,
          {
            backgroundColor: variant === 'input' ? colors.surface : colors.heroBackground,
            borderColor: isDark ? colors.heroBorder : '#A8CC83',
            borderRadius: variant === 'input' ? Radius.xxl : Radius.xl,
          },
          Shadows.card,
          contentStyle,
        ]}
      >
        {children}
      </View>
      <GardenSprouts variant={variant} />
    </View>
  );
};

const styles = StyleSheet.create({
  outerWrap: {
    position: 'relative',
    overflow: 'visible',
  },
  box: {
    borderWidth: 1.5,
  },
  topLeftLeaf: {
    position: 'absolute',
    top: -15,
    left: 20,
  },
  bottomLeftGrass: {
    position: 'absolute',
    bottom: -4,
    left: -5,
  },
  bottomRightGrass: {
    position: 'absolute',
    bottom: -3,
    right: 22,
  },
});
