import React, { useMemo } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Category, TimeRangePreset } from '../../models/types';
import { GardenSprouts } from '../GardenDecor';
import {
  useTheme,
  ThemeColors,
  Spacing,
  Radius,
  TouchTarget,
} from '../../constants/theme';

const TIME_RANGE_PRESETS: { id: TimeRangePreset; label: string }[] = [
  { id: 'today', label: 'Hôm nay' },
  { id: 'week', label: 'Tuần' },
  { id: 'month', label: 'Tháng' },
  { id: 'year', label: 'Năm' },
  { id: 'custom', label: 'Tùy chọn' },
];

interface TimeRangeBarProps {
  value: TimeRangePreset;
  onChange: (preset: TimeRangePreset) => void;
  onCustomPress: () => void;
  sproutAlign?: 'left' | 'right';
}

export const TimeRangeBar: React.FC<TimeRangeBarProps> = ({
  value,
  onChange,
  onCustomPress,
  sproutAlign = 'right',
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.timeRangeBar}>
      <GardenSprouts variant="chip" align={sproutAlign} />
      {TIME_RANGE_PRESETS.map((t) => {
        const isSelected = value === t.id;
        return (
          <Pressable
            key={t.id}
            style={[styles.timeBtn, isSelected && styles.timeBtnActive]}
            onPress={() => {
              onChange(t.id);
              if (t.id === 'custom') {
                onCustomPress();
              }
            }}
          >
            <Text style={[styles.timeBtnText, isSelected && styles.timeBtnTextActive]}>
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

interface FilterDropdownRowProps {
  selectedSourcesCount: number;
  selectedCategoriesCount: number;
  hasActiveFilter: boolean;
  resetLabel?: string;
  onOpenBankModal: () => void;
  onOpenCategoryModal: () => void;
  onReset: () => void;
}

export const FilterDropdownRow: React.FC<FilterDropdownRowProps> = ({
  selectedSourcesCount,
  selectedCategoriesCount,
  hasActiveFilter,
  resetLabel = 'Xóa lọc',
  onOpenBankModal,
  onOpenCategoryModal,
  onReset,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.dropdownRow}>
      <Pressable
        style={({ pressed }) => [
          styles.dropdownBtn,
          selectedSourcesCount > 0 && styles.dropdownBtnActiveBank,
          pressed && { opacity: 0.8 },
        ]}
        onPress={onOpenBankModal}
      >
        <GardenSprouts variant="chip" align="left" />
        <Ionicons
          name="business-outline"
          size={14}
          color={selectedSourcesCount > 0 ? colors.info : colors.textSecondary}
        />
        <Text
          style={[
            styles.dropdownBtnText,
            selectedSourcesCount > 0 && { color: colors.info, fontWeight: '700' },
          ]}
          numberOfLines={1}
        >
          {selectedSourcesCount === 0
            ? 'Ngân hàng / Ví'
            : `Ngân hàng (${selectedSourcesCount})`}
        </Text>
        <Ionicons
          name="chevron-down"
          size={13}
          color={selectedSourcesCount > 0 ? colors.info : colors.textMuted}
        />
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.dropdownBtn,
          selectedCategoriesCount > 0 && styles.dropdownBtnActiveCategory,
          pressed && { opacity: 0.8 },
        ]}
        onPress={onOpenCategoryModal}
      >
        <GardenSprouts variant="chip" align="right" />
        <Ionicons
          name="pricetag-outline"
          size={14}
          color={selectedCategoriesCount > 0 ? colors.income : colors.textSecondary}
        />
        <Text
          style={[
            styles.dropdownBtnText,
            selectedCategoriesCount > 0 && { color: colors.income, fontWeight: '700' },
          ]}
          numberOfLines={1}
        >
          {selectedCategoriesCount === 0
            ? 'Phân loại'
            : `Phân loại (${selectedCategoriesCount})`}
        </Text>
        <Ionicons
          name="chevron-down"
          size={13}
          color={selectedCategoriesCount > 0 ? colors.income : colors.textMuted}
        />
      </Pressable>

      {hasActiveFilter && (
        <Pressable
          style={({ pressed }) => [styles.resetFilterChip, pressed && { opacity: 0.75 }]}
          onPress={onReset}
          hitSlop={TouchTarget.hitSlop}
        >
          <Ionicons name="refresh" size={14} color={colors.expense} />
          <Text style={styles.resetFilterText}>{resetLabel}</Text>
        </Pressable>
      )}
    </View>
  );
};

interface AppliedFilterBannersProps {
  timeRange: TimeRangePreset;
  customStartDate?: string;
  customEndDate?: string;
  activeCategoryIds: string[];
  activeSources: string[];
  categories: Category[];
  onEditCustomDate: () => void;
  onClearCategories: () => void;
  onClearSources: () => void;
  bannerStyle?: StyleProp<ViewStyle>;
}

export const AppliedFilterBanners: React.FC<AppliedFilterBannersProps> = ({
  timeRange,
  customStartDate,
  customEndDate,
  activeCategoryIds,
  activeSources,
  categories,
  onEditCustomDate,
  onClearCategories,
  onClearSources,
  bannerStyle,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <>
      {timeRange === 'custom' && (
        <Pressable
          style={[styles.appliedFilterBanner, bannerStyle]}
          onPress={onEditCustomDate}
        >
          <View style={styles.appliedBannerLeft}>
            <Ionicons name="calendar" size={14} color={colors.info} />
            <Text style={styles.appliedFilterText}>
              Khoảng ngày:{' '}
              <Text style={styles.appliedFilterBold}>
                {customStartDate} → {customEndDate}
              </Text>
            </Text>
          </View>
          <Text style={styles.editDateLink}>Đổi</Text>
        </Pressable>
      )}

      {activeCategoryIds.length > 0 && (
        <View style={[styles.appliedFilterBanner, bannerStyle]}>
          <View style={styles.appliedBannerLeft}>
            <Ionicons name="pricetag" size={14} color={colors.income} />
            <Text style={styles.appliedFilterText} numberOfLines={1}>
              Phân loại:{' '}
              <Text style={styles.appliedFilterBold}>
                {activeCategoryIds
                  .map((id) => categories.find((c) => c.id === id)?.name || id)
                  .join(', ')}
              </Text>
            </Text>
          </View>
          <Pressable onPress={onClearCategories} hitSlop={TouchTarget.hitSlop}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>
      )}

      {activeSources.length > 0 && (
        <View style={[styles.appliedFilterBanner, bannerStyle]}>
          <View style={styles.appliedBannerLeft}>
            <Ionicons name="business" size={14} color={colors.info} />
            <Text style={styles.appliedFilterText} numberOfLines={1}>
              Nguồn tiền:{' '}
              <Text style={styles.appliedFilterBold}>{activeSources.join(', ')}</Text>
            </Text>
          </View>
          <Pressable onPress={onClearSources} hitSlop={TouchTarget.hitSlop}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>
      )}
    </>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    timeRangeBar: {
      flexDirection: 'row',
      gap: Spacing.xs + 2,
    },
    timeBtn: {
      flex: 1,
      minHeight: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: Radius.sm,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    timeBtnActive: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.primary,
    },
    timeBtnText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    timeBtnTextActive: {
      color: colors.primary,
      fontWeight: '700',
    },
    dropdownRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    dropdownBtn: {
      flex: 1,
      minHeight: 40,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: Spacing.sm,
      gap: 4,
    },
    dropdownBtnActiveBank: {
      backgroundColor: colors.infoSoft,
      borderColor: colors.infoBorder,
    },
    dropdownBtnActiveCategory: {
      backgroundColor: colors.incomeSoft,
      borderColor: colors.incomeBorder,
    },
    dropdownBtnText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
      flexShrink: 1,
    },
    resetFilterChip: {
      minHeight: 40,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.expenseSoft,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.expenseBorder,
      paddingHorizontal: Spacing.md,
      gap: 4,
    },
    resetFilterText: {
      color: colors.expense,
      fontSize: 12,
      fontWeight: '700',
    },
    appliedFilterBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    appliedBannerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      flex: 1,
    },
    appliedFilterText: {
      color: colors.textSecondary,
      fontSize: 12,
      flex: 1,
    },
    appliedFilterBold: {
      color: colors.text,
      fontWeight: '700',
    },
    editDateLink: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '700',
      marginLeft: Spacing.sm,
    },
  });
