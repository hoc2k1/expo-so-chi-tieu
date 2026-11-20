import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { Easing, FadeInDown, FadeOutRight, LinearTransition } from 'react-native-reanimated';
import { PendingTransaction } from '../models/types';
import { formatCurrency, formatRelativeTime } from '../utils/formatters';
import { GardenSprouts } from './GardenDecor';
import { SpringPressable } from './Motion';
import {
  useTheme,
  ThemeColors,
  Spacing,
  Radius,
  Typography,
  TouchTarget,
  Shadows,
} from '../constants/theme';

interface PendingTransactionCardProps {
  item: PendingTransaction;
  index: number;
  isBatchMode: boolean;
  isSelected: boolean;
  isExpanded: boolean;
  onToggleSelect: (id: string) => void;
  onLongPress: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onDelete: (item: PendingTransaction) => void;
  onClassify: (id: string) => void;
}

export const PendingTransactionCard: React.FC<PendingTransactionCardProps> = ({
  item,
  index,
  isBatchMode,
  isSelected,
  isExpanded,
  onToggleSelect,
  onLongPress,
  onToggleExpand,
  onDelete,
  onClassify,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isIncome = item.type === 'income';

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 6) * 45)
        .duration(260)
        .easing(Easing.inOut(Easing.ease))}
      exiting={FadeOutRight.duration(220).easing(Easing.inOut(Easing.ease))}
      layout={LinearTransition.duration(240).easing(Easing.inOut(Easing.ease))}
    >
      <Pressable
        delayLongPress={280}
        onLongPress={() => onLongPress(item.id)}
        onPress={() => {
          if (isBatchMode) {
            onToggleSelect(item.id);
          }
        }}
        style={({ pressed }) => [
          styles.card,
          item.isSuspectedDuplicate && styles.cardDuplicate,
          isSelected && styles.cardSelected,
          pressed && { opacity: 0.92 },
        ]}
      >
        <GardenSprouts variant="minimal" />
        {item.isSuspectedDuplicate && (
          <View style={styles.duplicateBanner}>
            <View style={styles.duplicateBannerHeader}>
              <Ionicons name="warning" size={16} color={colors.warning} />
              <Text style={styles.duplicateBannerText}>
                {item.duplicateReason ||
                  'Cảnh báo: Có thể trùng với giao dịch cùng ngân hàng trước đó'}
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.duplicateDiscardBtn,
                pressed && { opacity: 0.75 },
              ]}
              onPress={() => onDelete(item)}
            >
              <Ionicons name="trash-bin-outline" size={14} color={colors.expense} />
              <Text style={styles.duplicateDiscardBtnText}>Bỏ qua / Xóa trùng</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.cardHeader}>
          {isBatchMode && (
            <Pressable
              style={styles.checkbox}
              onPress={() => onToggleSelect(item.id)}
              hitSlop={TouchTarget.hitSlop}
            >
              <Ionicons
                name={isSelected ? 'checkbox' : 'square-outline'}
                size={22}
                color={isSelected ? colors.income : colors.textMuted}
              />
            </Pressable>
          )}

          <View style={styles.sourceTag}>
            <Ionicons name="business-outline" size={14} color={colors.info} />
            <Text style={styles.sourceText}>{item.source}</Text>
          </View>

          <Text style={styles.timeText}>{formatRelativeTime(item.timestamp)}</Text>
        </View>

        <View style={styles.amountRow}>
          <Text
            style={[
              styles.amountText,
              { color: isIncome ? colors.income : colors.expense },
            ]}
          >
            {isIncome ? '+' : '-'} {formatCurrency(item.amount)}
          </Text>
          <View
            style={[
              styles.typeBadge,
              {
                backgroundColor: isIncome ? colors.incomeSoft : colors.expenseSoft,
                borderColor: isIncome ? colors.incomeBorder : colors.expenseBorder,
              },
            ]}
          >
            <Text
              style={[
                styles.typeBadgeText,
                { color: isIncome ? colors.income : colors.expense },
              ]}
            >
              {isIncome ? 'Thu nhập' : 'Chi tiêu'}
            </Text>
          </View>
        </View>

        {item.suggestedCategoryName && (
          <View style={styles.suggestionBox}>
            <Ionicons name="sparkles-outline" size={15} color={colors.income} />
            <Text style={styles.suggestionText}>
              Gợi ý:{' '}
              <Text style={styles.suggestionHighlight}>{item.suggestedCategoryName}</Text>
              {item.suggestedNote ? ` • ${item.suggestedNote}` : ''}
            </Text>
          </View>
        )}

        {item.rawContent ? (
          <Pressable
            style={({ pressed }) => [styles.rawContentBox, pressed && { opacity: 0.8 }]}
            onPress={() => {
              if (isBatchMode) {
                onToggleSelect(item.id);
              } else {
                onToggleExpand(item.id);
              }
            }}
          >
            <Text
              style={styles.rawContentText}
              numberOfLines={isExpanded ? undefined : 2}
            >
              {item.rawContent}
            </Text>
            <Text style={styles.expandHint}>
              {isExpanded ? 'Thu gọn ▲' : 'Xem nội dung gốc ▼'}
            </Text>
          </Pressable>
        ) : null}

        {!isBatchMode && (
          <View style={styles.cardActions}>
            <Pressable
              style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.75 }]}
              onPress={() => onDelete(item)}
              accessibilityRole="button"
            >
              <Ionicons name="close" size={16} color={colors.textSecondary} />
              <Text style={styles.deleteBtnText}>Bỏ qua</Text>
            </Pressable>

            <SpringPressable
              style={styles.classifyBtn}
              onPress={() => onClassify(item.id)}
              accessibilityRole="button"
            >
              <Ionicons name="checkmark-circle" size={18} color={colors.onPrimary} />
              <Text style={styles.classifyBtnText}>Phân loại ngay</Text>
            </SpringPressable>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      padding: Spacing.base,
      marginBottom: Spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      ...Shadows.card,
    },
    cardDuplicate: {
      borderColor: colors.warningBorder,
      borderWidth: 1.5,
    },
    cardSelected: {
      borderColor: colors.income,
      borderWidth: 2,
      backgroundColor: colors.incomeSoft,
    },
    duplicateBanner: {
      backgroundColor: colors.warningSoft,
      borderRadius: Radius.md,
      padding: Spacing.sm,
      marginBottom: Spacing.md,
      borderWidth: 1,
      borderColor: colors.warningBorder,
    },
    duplicateBannerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    duplicateBannerText: {
      color: colors.warning,
      fontSize: 12,
      fontWeight: '600',
      flex: 1,
    },
    duplicateDiscardBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-end',
      backgroundColor: colors.expenseSoft,
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xs + 2,
      borderRadius: Radius.sm,
      marginTop: Spacing.sm,
      gap: Spacing.xs,
    },
    duplicateDiscardBtnText: {
      color: colors.expense,
      fontSize: 11,
      fontWeight: '700',
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.sm,
      gap: Spacing.sm,
    },
    checkbox: {
      paddingRight: 2,
    },
    sourceTag: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.infoSoft,
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xs,
      borderRadius: Radius.sm,
      gap: Spacing.xs,
    },
    sourceText: {
      color: colors.info,
      fontSize: 12,
      fontWeight: '700',
    },
    timeText: {
      color: colors.textMuted,
      fontSize: 12,
      marginLeft: 'auto',
    },
    amountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.sm,
    },
    amountText: {
      ...Typography.amountLg,
    },
    typeBadge: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xs,
      borderRadius: Radius.pill,
      borderWidth: 1,
    },
    typeBadgeText: {
      fontSize: 11,
      fontWeight: '700',
    },
    suggestionBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.incomeSoft,
      padding: Spacing.sm,
      borderRadius: Radius.md,
      marginBottom: Spacing.sm,
      gap: Spacing.xs + 2,
    },
    suggestionText: {
      color: colors.textSecondary,
      fontSize: 12,
      flex: 1,
    },
    suggestionHighlight: {
      color: colors.income,
      fontWeight: '700',
    },
    rawContentBox: {
      backgroundColor: colors.surfaceSecondary,
      padding: Spacing.sm + 2,
      borderRadius: Radius.md,
      marginBottom: Spacing.md,
    },
    rawContentText: {
      color: colors.textSecondary,
      fontSize: 12,
      lineHeight: 17,
    },
    expandHint: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '600',
      marginTop: Spacing.xs,
      textAlign: 'right',
    },
    cardActions: {
      flexDirection: 'row',
      gap: Spacing.sm,
      marginTop: 2,
    },
    deleteBtn: {
      flex: 1,
      minHeight: TouchTarget.minSize,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceSecondary,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      gap: Spacing.xs,
    },
    deleteBtnText: {
      color: colors.textSecondary,
      fontWeight: '600',
      fontSize: 13,
    },
    classifyBtn: {
      flex: 2,
      minHeight: TouchTarget.minSize,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.income,
      borderRadius: Radius.md,
      gap: 6,
    },
    classifyBtnText: {
      color: colors.onPrimary,
      fontWeight: '700',
      fontSize: 14,
    },
  });
