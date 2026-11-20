import React, { useMemo } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TransactionType } from '../../models/types';
import { GardenSprouts } from '../GardenDecor';
import {
  useTheme,
  ThemeColors,
  Spacing,
  Radius,
  TouchTarget,
} from '../../constants/theme';

interface TypeSwitcherProps {
  value: TransactionType;
  onChange: (type: TransactionType) => void;
  expenseLabel?: string;
  incomeLabel?: string;
  showIcons?: boolean;
  showSprouts?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const TypeSwitcher: React.FC<TypeSwitcherProps> = ({
  value,
  onChange,
  expenseLabel = 'Chi tiêu',
  incomeLabel = 'Thu nhập',
  showIcons = false,
  showSprouts = true,
  style,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const isExpense = value === 'expense';
  const isIncome = value === 'income';

  return (
    <View style={[styles.container, style]}>
      {showSprouts && <GardenSprouts variant="chip" align="both" />}
      <Pressable
        style={[styles.btn, isExpense && styles.btnActiveExpense]}
        onPress={() => onChange('expense')}
        accessibilityRole="button"
      >
        {showIcons && (
          <Ionicons
            name="arrow-up-circle"
            size={18}
            color={isExpense ? colors.onPrimary : colors.expense}
          />
        )}
        <Text style={[styles.text, isExpense && styles.textActive]}>{expenseLabel}</Text>
      </Pressable>

      <Pressable
        style={[styles.btn, isIncome && styles.btnActiveIncome]}
        onPress={() => onChange('income')}
        accessibilityRole="button"
      >
        {showIcons && (
          <Ionicons
            name="arrow-down-circle"
            size={18}
            color={isIncome ? colors.onPrimary : colors.income}
          />
        )}
        <Text style={[styles.text, isIncome && styles.textActive]}>{incomeLabel}</Text>
      </Pressable>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      padding: Spacing.xs,
      borderWidth: 1,
      borderColor: colors.border,
      gap: Spacing.xs,
    },
    btn: {
      flex: 1,
      minHeight: TouchTarget.minSize - 4,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: Radius.md,
      gap: 6,
    },
    btnActiveExpense: {
      backgroundColor: colors.expense,
    },
    btnActiveIncome: {
      backgroundColor: colors.income,
    },
    text: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '700',
    },
    textActive: {
      color: colors.onPrimary,
    },
  });
