import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Text, StyleSheet, Animated, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeColors, Radius, Spacing, TouchTarget } from '../constants/theme';

export interface ToastData {
  id: number;
  message: string;
  type?: 'success' | 'info' | 'error';
}

interface ToastProps {
  toast: ToastData | null;
  onHide: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ toast, onHide, duration = 2500 }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [translateY] = useState(() => new Animated.Value(-80));
  const [opacity] = useState(() => new Animated.Value(0));

  const handleDismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -80,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
    });
  }, [translateY, opacity, onHide]);

  useEffect(() => {
    if (!toast) {
      translateY.setValue(-80);
      opacity.setValue(0);
      return;
    }

    Animated.parallel([
      Animated.spring(translateY, {
        toValue: Math.max(insets.top + 10, 24),
        useNativeDriver: true,
        tension: 70,
        friction: 9,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      handleDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, [toast, insets.top, duration, handleDismiss, translateY, opacity]);

  if (!toast) return null;

  const type = toast.type || 'success';
  const iconName =
    type === 'success'
      ? 'checkmark-circle'
      : type === 'error'
      ? 'alert-circle'
      : 'information-circle';
  const iconColor =
    type === 'success' ? colors.income : type === 'error' ? colors.expense : colors.info;
  const borderColor =
    type === 'success'
      ? colors.incomeBorder
      : type === 'error'
      ? colors.expenseBorder
      : colors.infoBorder;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
          borderColor,
        },
      ]}
      pointerEvents="box-none"
    >
      <Pressable
        style={({ pressed }) => [styles.innerContent, pressed && { opacity: 0.85 }]}
        onPress={handleDismiss}
        accessibilityRole="alert"
      >
        <Ionicons name={iconName} size={22} color={iconColor} style={styles.icon} />
        <Text style={styles.message} numberOfLines={2}>
          {toast.message}
        </Text>
        <Pressable
          onPress={handleDismiss}
          hitSlop={TouchTarget.hitSlop}
          accessibilityLabel="Đóng thông báo"
          style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
        >
          <Ionicons name="close" size={16} color={colors.textSecondary} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      top: 0,
      left: Spacing.base,
      right: Spacing.base,
      zIndex: 99999,
      backgroundColor: colors.surfaceElevated,
      borderRadius: Radius.lg,
      borderWidth: 1.5,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.22,
      shadowRadius: 12,
      elevation: 99999,
    },
    innerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.base,
      minHeight: TouchTarget.minSize,
    },
    icon: {
      marginRight: Spacing.sm,
    },
    message: {
      flex: 1,
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
      lineHeight: 19,
    },
    closeBtn: {
      padding: Spacing.xs,
    },
  });
