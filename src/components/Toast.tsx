import React, { useEffect, useState, useCallback } from 'react';
import { Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

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
        toValue: insets.top + 10,
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
    type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#38BDF8';
  const borderColor =
    type === 'success' ? '#10B98160' : type === 'error' ? '#EF444460' : '#38BDF860';

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
      <TouchableOpacity
        style={styles.innerContent}
        activeOpacity={0.9}
        onPress={handleDismiss}
      >
        <Ionicons name={iconName} size={22} color={iconColor} style={styles.icon} />
        <Text style={styles.message} numberOfLines={2}>
          {toast.message}
        </Text>
        <TouchableOpacity
          onPress={handleDismiss}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={16} color="#94A3B8" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    zIndex: 99999,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    borderWidth: 1.5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
  },
  innerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  icon: {
    marginRight: 10,
  },
  message: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19,
  },
});
