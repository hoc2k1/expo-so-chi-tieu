import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useTheme,
  ThemeColors,
  Spacing,
  Radius,
} from '../../constants/theme';

interface SettingRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  disabled?: boolean;
  isLast?: boolean;
  rightElement?: React.ReactNode;
  showChevron?: boolean;
}

export const SettingRow: React.FC<SettingRowProps> = ({
  icon,
  iconColor,
  iconBg,
  title,
  subtitle,
  onPress,
  disabled,
  isLast = false,
  rightElement,
  showChevron = false,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const content = (
    <>
      <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={19} color={iconColor} />
      </View>
      <View style={styles.texts}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {rightElement}
      {showChevron && <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.row,
          isLast && styles.rowLast,
          pressed && { opacity: 0.75 },
        ]}
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
      >
        {content}
      </Pressable>
    );
  }

  return <View style={[styles.row, isLast && styles.rowLast]}>{content}</View>;
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.base,
      paddingVertical: Spacing.md,
      minHeight: 62,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
      gap: Spacing.md,
    },
    rowLast: {
      borderBottomWidth: 0,
    },
    iconBox: {
      width: 38,
      height: 38,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    texts: {
      flex: 1,
      gap: 2,
    },
    title: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    subtitle: {
      color: colors.textSecondary,
      fontSize: 12,
      lineHeight: 16,
    },
  });
