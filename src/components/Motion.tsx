import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, PressableProps, StyleProp, Text, TextStyle, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const AnimatedPressableView = Animated.createAnimatedComponent(Pressable);

interface SpringPressableProps extends PressableProps {
  scaleTo?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/**
 * Gentle spring-bounce pressable for buttons & interactive chibi cards.
 */
export const SpringPressable: React.FC<SpringPressableProps> = ({
  scaleTo = 0.96,
  style,
  onPressIn,
  onPressOut,
  children,
  ...rest
}) => {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressableView
      {...rest}
      onPressIn={(e) => {
        scale.set(withSpring(scaleTo, { damping: 16, stiffness: 280 }));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withSpring(1, { damping: 14, stiffness: 220 }));
        onPressOut?.(e);
      }}
      style={[animStyle, style]}
    >
      {children}
    </AnimatedPressableView>
  );
};

interface AnimatedCurrencyProps {
  value: number;
  format: (n: number) => string;
  prefix?: string;
  style?: StyleProp<TextStyle>;
  duration?: number;
}

/**
 * Smoothly counts currency amounts on Hero Card using requestAnimationFrame.
 */
export const AnimatedCurrency: React.FC<AnimatedCurrencyProps> = ({
  value,
  format,
  prefix = '',
  style,
  duration = 520,
}) => {
  const [displayVal, setDisplayVal] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    const startVal = prevRef.current;
    const endVal = value;
    if (startVal === endVal) return;

    let rafId = 0;
    const startTime = Date.now();

    const step = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(1, elapsed / duration);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      const current = Math.round(startVal + (endVal - startVal) * eased);
      setDisplayVal(current);

      if (t < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        prevRef.current = endVal;
      }
    };

    rafId = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(rafId);
      prevRef.current = endVal;
    };
  }, [value, duration]);

  return (
    <Text style={style}>
      {prefix}
      {format(displayVal)}
    </Text>
  );
};

interface ChibiCategoryBadgeProps {
  icon: string;
  color: string;
  size?: number;
}

/**
 * Cute pastel sticker-style rounded icon badge for categories.
 */
export const ChibiCategoryBadge: React.FC<ChibiCategoryBadgeProps> = ({
  icon,
  color,
  size = 42,
}) => {
  const iconSize = Math.round(size * 0.48);
  const radius = Math.round(size * 0.38);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: `${color}1F`,
        borderWidth: 1.5,
        borderColor: `${color}45`,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={(icon as any) || 'pricetag'} size={iconSize} color={color} />
    </View>
  );
};

interface AnimatedTabIconProps {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  size: number;
  focused: boolean;
}

/**
 * Soft spring bounce for active bottom tab bar icon.
 */
export const AnimatedTabIcon: React.FC<AnimatedTabIconProps> = ({
  name,
  color,
  size,
  focused,
}) => {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (focused) {
      scale.value = withSequence(
        withSpring(1.18, { damping: 12, stiffness: 300 }),
        withSpring(1, { damping: 14, stiffness: 240 })
      );
    } else {
      scale.value = withSpring(1, { damping: 16, stiffness: 240 });
    }
  }, [focused, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animStyle}>
      <Ionicons name={name} size={size} color={color} />
    </Animated.View>
  );
};

interface FadeInUpViewProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  offsetY?: number;
  triggerKey?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Lightweight native-thread fade-up wrapper triggered on screen focus or refresh.
 */
export const FadeInUpView: React.FC<FadeInUpViewProps> = ({
  children,
  delay = 0,
  duration = 240,
  offsetY = 14,
  triggerKey = 0,
  style,
}) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(offsetY);

  const play = useCallback(() => {
    opacity.set(0);
    translateY.set(offsetY);
    const timing = { duration, easing: Easing.out(Easing.cubic) };
    opacity.set(withDelay(delay, withTiming(1, timing)));
    translateY.set(withDelay(delay, withTiming(0, timing)));
  }, [delay, duration, offsetY, opacity, translateY]);

  useFocusEffect(
    useCallback(() => {
      play();
    }, [play])
  );

  useEffect(() => {
    if (triggerKey > 0) play();
  }, [triggerKey, play]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={[style, animStyle]}>{children}</Animated.View>;
};
