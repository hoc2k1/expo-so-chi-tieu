import React, { useMemo } from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeColors, Spacing } from '../../constants/theme';

interface SaveTemplateCheckboxProps {
  checked: boolean;
  label: string;
  onToggle: () => void;
}

export function SaveTemplateCheckbox({
  checked,
  label,
  onToggle,
}: SaveTemplateCheckboxProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable style={styles.checkboxRow} onPress={onToggle}>
      <Ionicons
        name={checked ? 'checkbox' : 'square-outline'}
        size={18}
        color={checked ? colors.primary : colors.textMuted}
      />
      <Text style={styles.checkboxLabel}>{label}</Text>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    checkboxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: Spacing.sm,
      gap: 6,
    },
    checkboxLabel: {
      color: colors.textSecondary,
      fontSize: 11,
    },
  });
