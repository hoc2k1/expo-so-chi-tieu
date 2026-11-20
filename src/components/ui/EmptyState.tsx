import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChibiStrawberry, ChibiMood } from '../ChibiStrawberry';
import { GardenBox } from '../GardenDecor';
import { SpringPressable } from '../Motion';
import {
  useTheme,
  ThemeColors,
  Spacing,
  Radius,
  Typography,
  TouchTarget,
} from '../../constants/theme';

interface EmptyStateProps {
  title: string;
  subtitle: string;
  mood?: ChibiMood;
  mascotSize?: number;
  ctaLabel?: string;
  ctaIcon?: keyof typeof Ionicons.glyphMap;
  onCtaPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  subtitle,
  mood = 'chill',
  mascotSize = 92,
  ctaLabel,
  ctaIcon = 'add',
  onCtaPress,
  style,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <GardenBox variant="minimal" style={[{ marginTop: Spacing.md }, style]} contentStyle={styles.container}>
      <ChibiStrawberry size={mascotSize} mood={mood} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      {ctaLabel && onCtaPress && (
        <SpringPressable style={styles.ctaBtn} onPress={onCtaPress} accessibilityRole="button">
          <Ionicons name={ctaIcon} size={18} color={colors.primary} />
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </SpringPressable>
      )}
    </GardenBox>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      padding: Spacing.xl,
      alignItems: 'center',
      marginBottom: Spacing.lg,
    },
    title: {
      ...Typography.title,
      color: colors.text,
      marginTop: Spacing.xs,
      marginBottom: Spacing.xs,
      textAlign: 'center',
    },
    subtitle: {
      ...Typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: Spacing.base,
    },
    ctaBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.primaryBorder,
      paddingHorizontal: Spacing.base,
      minHeight: TouchTarget.minSize,
      borderRadius: Radius.pill,
      gap: 6,
    },
    ctaText: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '700',
    },
  });
