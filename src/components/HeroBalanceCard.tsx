import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '../utils/formatters';
import { ChibiStrawberry } from './ChibiStrawberry';
import { GardenBox } from './GardenDecor';
import { AnimatedCurrency, SpringPressable } from './Motion';
import {
  useTheme,
  ThemeColors,
  Spacing,
  Radius,
  Typography,
  TouchTarget,
  Shadows,
} from '../constants/theme';

interface HeroBalanceCardProps {
  currentMonthLabel: string;
  monthlyBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  onOpenStatistics: () => void;
}

export const HeroBalanceCard: React.FC<HeroBalanceCardProps> = ({
  currentMonthLabel,
  monthlyBalance,
  monthlyIncome,
  monthlyExpense,
  onOpenStatistics,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <GardenBox
      variant="card"
      style={{ marginTop: Spacing.sm, marginBottom: Spacing.md }}
      contentStyle={styles.heroCard}
    >
      <View style={styles.heroTopRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroLabel}>Số dư ròng tháng này</Text>
          <Text style={styles.heroMonthBadge}>{currentMonthLabel}</Text>
        </View>
        <ChibiStrawberry size={62} mood="happy" style={{ marginRight: 6 }} />
        <SpringPressable
          style={styles.heroChartBtn}
          onPress={onOpenStatistics}
          hitSlop={TouchTarget.hitSlop}
          accessibilityLabel="Xem thống kê"
        >
          <Ionicons name="bar-chart-outline" size={18} color={colors.heroText} />
        </SpringPressable>
      </View>

      <AnimatedCurrency
        value={monthlyBalance}
        format={formatCurrency}
        prefix={monthlyBalance < 0 ? '-' : ''}
        style={styles.heroAmount}
      />

      <View style={styles.heroSplitRow}>
        <View style={styles.heroStatBox}>
          <View style={styles.heroStatHeader}>
            <View style={[styles.heroDot, { backgroundColor: colors.income }]} />
            <Text style={styles.heroStatLabel}>Tổng thu</Text>
          </View>
          <AnimatedCurrency
            value={monthlyIncome}
            format={formatCurrency}
            prefix="+"
            style={[styles.heroStatValue, { color: colors.income }]}
          />
        </View>

        <View style={styles.heroDivider} />

        <View style={styles.heroStatBox}>
          <View style={styles.heroStatHeader}>
            <View style={[styles.heroDot, { backgroundColor: colors.expense }]} />
            <Text style={styles.heroStatLabel}>Tổng chi</Text>
          </View>
          <AnimatedCurrency
            value={monthlyExpense}
            format={formatCurrency}
            prefix="-"
            style={[styles.heroStatValue, { color: colors.expense }]}
          />
        </View>
      </View>
    </GardenBox>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    heroCard: {
      backgroundColor: colors.heroBackground,
      borderRadius: Radius.xl,
      padding: Spacing.lg,
      borderWidth: 1,
      borderColor: colors.heroBorder,
      ...Shadows.hero,
    },
    heroTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    heroLabel: {
      color: colors.heroTextMuted,
      fontSize: 13,
      fontWeight: '600',
    },
    heroMonthBadge: {
      color: colors.heroText,
      fontSize: 12,
      fontWeight: '700',
      marginTop: 2,
      opacity: 0.85,
    },
    heroChartBtn: {
      width: TouchTarget.minSize,
      height: TouchTarget.minSize,
      borderRadius: Radius.md,
      backgroundColor: colors.heroSurface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.heroBorder,
    },
    heroAmount: {
      ...Typography.heroAmount,
      color: colors.heroText,
      marginTop: Spacing.sm,
      marginBottom: Spacing.base,
    },
    heroSplitRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.heroSurface,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      borderWidth: 1,
      borderColor: colors.heroBorder,
    },
    heroStatBox: {
      flex: 1,
      gap: Spacing.xs,
    },
    heroStatHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    heroDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    heroStatLabel: {
      color: colors.heroTextMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    heroStatValue: {
      ...Typography.amountMd,
    },
    heroDivider: {
      width: 1,
      height: 32,
      backgroundColor: colors.heroBorder,
      marginHorizontal: Spacing.md,
    },
  });
