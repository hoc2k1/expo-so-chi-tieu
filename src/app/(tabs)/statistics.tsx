import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useApp } from '../../contexts/AppContext';
import { TimeRangePreset } from '../../models/types';
import {
  formatCurrency,
  getDefaultMonthStartDisplay,
  getDefaultTodayEndDisplay,
  isTransactionInTimeRange,
} from '../../utils/formatters';
import { PieChartSvg } from '../../components/PieChartSvg';
import { DateRangePickerModal } from '../../components/DateRangePickerModal';
import { MultiSelectGridModal, MultiSelectOption } from '../../components/MultiSelectGridModal';
import { GardenSprouts } from '../../components/GardenDecor';
import { SUPPORTED_APPS } from '../../constants/defaultData';
import {
  useTheme,
  ThemeColors,
  Spacing,
  Radius,
  Typography,
  TouchTarget,
  Shadows,
} from '../../constants/theme';

export default function StatisticsScreen() {
  const { transactions, categories, setTransactionFilter } = useApp();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [timeRange, setTimeRange] = useState<TimeRangePreset>('month');
  const [customStart, setCustomStart] = useState<string>(() => getDefaultMonthStartDisplay());
  const [customEnd, setCustomEnd] = useState<string>(() => getDefaultTodayEndDisplay());
  const [showDateModal, setShowDateModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [activeType, setActiveType] = useState<'expense' | 'income'>('expense');

  const bankOptions = useMemo<MultiSelectOption[]>(() => {
    const set = new Set<string>();
    transactions.forEach((t) => {
      if (t.source) set.add(t.source);
    });
    SUPPORTED_APPS.forEach((app) => {
      if (app.category !== 'email_sms') {
        set.add(app.name);
      }
    });
    set.add('Tiền mặt');
    return Array.from(set).map((s) => ({
      id: s,
      name: s,
      icon: s === 'Tiền mặt' ? 'cash-outline' : 'business-outline',
    }));
  }, [transactions]);

  const categoryOptions = useMemo<MultiSelectOption[]>(() => {
    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      color: c.color,
      subtitle: c.type === 'expense' ? 'Chi tiêu' : 'Thu nhập',
    }));
  }, [categories]);

  const scopedTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (selectedSources.length > 0 && !selectedSources.includes(tx.source)) {
        return false;
      }
      if (selectedCategoryIds.length > 0 && !selectedCategoryIds.includes(tx.categoryId)) {
        return false;
      }
      return isTransactionInTimeRange(
        tx.timestamp,
        tx.date,
        timeRange,
        customStart,
        customEnd
      );
    });
  }, [transactions, selectedSources, selectedCategoryIds, timeRange, customStart, customEnd]);

  const totalIncome = useMemo(() => {
    return scopedTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [scopedTransactions]);

  const totalExpense = useMemo(() => {
    return scopedTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [scopedTransactions]);

  const balanceDiff = totalIncome - totalExpense;

  const categoryBreakdown = useMemo(() => {
    const targetTxs = scopedTransactions.filter((t) => t.type === activeType);
    const totalTarget = activeType === 'expense' ? totalExpense : totalIncome;

    const map: Record<
      string,
      {
        categoryId: string;
        categoryName: string;
        total: number;
        count: number;
        icon: string;
        color: string;
      }
    > = {};

    targetTxs.forEach((t) => {
      if (!map[t.categoryId]) {
        const cat = categories.find((c) => c.id === t.categoryId);
        map[t.categoryId] = {
          categoryId: t.categoryId,
          categoryName: t.categoryName || cat?.name || 'Chưa phân loại',
          total: 0,
          count: 0,
          icon: cat?.icon || 'pricetag',
          color: cat?.color || colors.primary,
        };
      }
      map[t.categoryId].total += t.amount;
      map[t.categoryId].count += 1;
    });

    const list = Object.values(map).map((item) => ({
      ...item,
      percentage: totalTarget > 0 ? (item.total / totalTarget) * 100 : 0,
    }));

    return list.sort((a, b) => b.total - a.total);
  }, [scopedTransactions, activeType, totalExpense, totalIncome, categories, colors.primary]);

  const handleDrillDown = (categoryId: string) => {
    setTransactionFilter({
      type: activeType,
      categoryIds: [categoryId],
      sources: selectedSources,
      timeRange,
      customStartDate: customStart,
      customEndDate: customEnd,
      searchQuery: '',
    });
    router.push('/(tabs)/transactions');
  };

  const handleResetFilters = () => {
    setTimeRange('month');
    setSelectedSources([]);
    setSelectedCategoryIds([]);
  };

  const hasActiveFilter =
    selectedSources.length > 0 ||
    selectedCategoryIds.length > 0 ||
    timeRange !== 'month';

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Time Range Selector */}
        <View style={styles.timeRangeBar}>
          <GardenSprouts variant="chip" align="left" />
          {(['today', 'week', 'month', 'year', 'custom'] as const).map((t) => {
            const labels: Record<string, string> = {
              today: 'Hôm nay',
              week: 'Tuần',
              month: 'Tháng',
              year: 'Năm',
              custom: 'Tùy chọn',
            };
            const isSelected = timeRange === t;
            return (
              <Pressable
                key={t}
                style={[styles.timeBtn, isSelected && styles.timeBtnActive]}
                onPress={() => {
                  setTimeRange(t);
                  if (t === 'custom') {
                    setShowDateModal(true);
                  }
                }}
              >
                <Text style={[styles.timeBtnText, isSelected && styles.timeBtnTextActive]}>
                  {labels[t]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Custom DateTime Range Banner */}
        {timeRange === 'custom' && (
          <Pressable
            style={styles.customRangeBanner}
            onPress={() => setShowDateModal(true)}
          >
            <Ionicons name="calendar-outline" size={16} color={colors.info} />
            <Text style={styles.customRangeText}>
              {customStart} → {customEnd}
            </Text>
            <Text style={styles.customRangeEdit}>Đổi</Text>
          </Pressable>
        )}

        {/* Filter Row: Bank & Category */}
        <View style={styles.dropdownRow}>
          <Pressable
            style={({ pressed }) => [
              styles.dropdownBtn,
              selectedSources.length > 0 && styles.dropdownBtnActiveBank,
              pressed && { opacity: 0.8 },
            ]}
            onPress={() => setShowBankModal(true)}
          >
            <GardenSprouts variant="chip" align="left" />
            <Ionicons
              name="business-outline"
              size={14}
              color={selectedSources.length > 0 ? colors.info : colors.textSecondary}
            />
            <Text
              style={[
                styles.dropdownBtnText,
                selectedSources.length > 0 && { color: colors.info, fontWeight: '700' },
              ]}
              numberOfLines={1}
            >
              {selectedSources.length === 0
                ? 'Ngân hàng / Ví'
                : `Ngân hàng (${selectedSources.length})`}
            </Text>
            <Ionicons
              name="chevron-down"
              size={13}
              color={selectedSources.length > 0 ? colors.info : colors.textMuted}
            />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.dropdownBtn,
              selectedCategoryIds.length > 0 && styles.dropdownBtnActiveCategory,
              pressed && { opacity: 0.8 },
            ]}
            onPress={() => setShowCategoryModal(true)}
          >
            <GardenSprouts variant="chip" align="right" />
            <Ionicons
              name="pricetag-outline"
              size={14}
              color={selectedCategoryIds.length > 0 ? colors.income : colors.textSecondary}
            />
            <Text
              style={[
                styles.dropdownBtnText,
                selectedCategoryIds.length > 0 && { color: colors.income, fontWeight: '700' },
              ]}
              numberOfLines={1}
            >
              {selectedCategoryIds.length === 0
                ? 'Phân loại'
                : `Phân loại (${selectedCategoryIds.length})`}
            </Text>
            <Ionicons
              name="chevron-down"
              size={13}
              color={selectedCategoryIds.length > 0 ? colors.income : colors.textMuted}
            />
          </Pressable>

          {hasActiveFilter && (
            <Pressable
              style={({ pressed }) => [
                styles.resetFilterChip,
                pressed && { opacity: 0.75 },
              ]}
              onPress={handleResetFilters}
            >
              <Ionicons name="refresh" size={14} color={colors.expense} />
              <Text style={styles.resetFilterText}>Mặc định</Text>
            </Pressable>
          )}
        </View>

        {/* Active Categories Banner */}
        {selectedCategoryIds.length > 0 && (
          <View style={styles.appliedFilterBanner}>
            <View style={styles.appliedBannerLeft}>
              <Ionicons name="pricetag" size={14} color={colors.income} />
              <Text style={styles.appliedFilterText} numberOfLines={1}>
                Phân loại:{' '}
                <Text style={styles.appliedFilterBold}>
                  {selectedCategoryIds
                    .map((id) => categories.find((c) => c.id === id)?.name || id)
                    .join(', ')}
                </Text>
              </Text>
            </View>
            <Pressable
              onPress={() => setSelectedCategoryIds([])}
              hitSlop={TouchTarget.hitSlop}
            >
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>
        )}

        {/* Active Banks Banner */}
        {selectedSources.length > 0 && (
          <View style={styles.appliedFilterBanner}>
            <View style={styles.appliedBannerLeft}>
              <Ionicons name="business" size={14} color={colors.info} />
              <Text style={styles.appliedFilterText} numberOfLines={1}>
                Nguồn:{' '}
                <Text style={styles.appliedFilterBold}>{selectedSources.join(', ')}</Text>
              </Text>
            </View>
            <Pressable
              onPress={() => setSelectedSources([])}
              hitSlop={TouchTarget.hitSlop}
            >
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>
        )}

        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <GardenSprouts variant="chip" align="left" />
            <View style={styles.summaryLabelRow}>
              <View style={[styles.summaryDot, { backgroundColor: colors.income }]} />
              <Text style={styles.summaryLabel}>Tổng Thu</Text>
            </View>
            <Text style={[styles.summaryValue, { color: colors.income }]} numberOfLines={1}>
              +{formatCurrency(totalIncome)}
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <GardenSprouts variant="chip" align="right" />
            <View style={styles.summaryLabelRow}>
              <View style={[styles.summaryDot, { backgroundColor: colors.expense }]} />
              <Text style={styles.summaryLabel}>Tổng Chi</Text>
            </View>
            <Text style={[styles.summaryValue, { color: colors.expense }]} numberOfLines={1}>
              -{formatCurrency(totalExpense)}
            </Text>
          </View>

          <View style={[styles.summaryCard, styles.balanceCard]}>
            <GardenSprouts variant="minimal" />
            <Text style={styles.summaryLabel}>Chênh lệch (Số dư ròng)</Text>
            <Text
              style={[
                styles.balanceValue,
                { color: balanceDiff >= 0 ? colors.income : colors.expense },
              ]}
            >
              {balanceDiff >= 0 ? '+' : '-'}
              {formatCurrency(balanceDiff)}
            </Text>
          </View>
        </View>

        {/* Type Switcher */}
        <View style={styles.typeSwitcher}>
          <GardenSprouts variant="chip" align="both" />
          <Pressable
            style={[
              styles.typeSwitchBtn,
              activeType === 'expense' && styles.typeSwitchBtnActiveExpense,
            ]}
            onPress={() => setActiveType('expense')}
          >
            <Ionicons
              name="arrow-up-circle"
              size={18}
              color={activeType === 'expense' ? '#FFFFFF' : colors.expense}
            />
            <Text
              style={[
                styles.typeSwitchText,
                activeType === 'expense' && styles.typeSwitchTextActive,
              ]}
            >
              Cơ cấu Chi tiêu
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.typeSwitchBtn,
              activeType === 'income' && styles.typeSwitchBtnActiveIncome,
            ]}
            onPress={() => setActiveType('income')}
          >
            <Ionicons
              name="arrow-down-circle"
              size={18}
              color={activeType === 'income' ? '#FFFFFF' : colors.income}
            />
            <Text
              style={[
                styles.typeSwitchText,
                activeType === 'income' && styles.typeSwitchTextActive,
              ]}
            >
              Cơ cấu Thu nhập
            </Text>
          </Pressable>
        </View>

        {/* Donut Chart Card */}
        {categoryBreakdown.length > 0 && (
          <View style={styles.pieContainer}>
            <GardenSprouts variant="card" />
            <Text style={styles.pieTitle}>
              Phân bổ {activeType === 'expense' ? 'Chi tiêu' : 'Thu nhập'} theo danh mục
            </Text>
            <PieChartSvg
              data={categoryBreakdown}
              totalAmount={activeType === 'expense' ? totalExpense : totalIncome}
              centerLabel={activeType === 'expense' ? 'Tổng chi' : 'Tổng thu'}
              onPressSlice={(categoryId) => handleDrillDown(categoryId)}
            />
          </View>
        )}

        {/* Ranked Categories Breakdown */}
        <View style={styles.breakdownHeader}>
          <Text style={styles.breakdownTitle}>
            Xếp hạng {activeType === 'expense' ? 'khoản chi' : 'nguồn thu'} lớn nhất
          </Text>
          <Text style={styles.drillDownHint}>Chạm để xem chi tiết</Text>
        </View>

        {categoryBreakdown.length === 0 ? (
          <View style={styles.emptyContainer}>
            <GardenSprouts variant="minimal" />
            <View style={styles.emptyIconBox}>
              <Ionicons name="pie-chart-outline" size={40} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Chưa có dữ liệu thống kê</Text>
            <Text style={styles.emptyText}>
              Chưa có giao dịch {activeType === 'expense' ? 'chi tiêu' : 'thu nhập'} phù hợp
              với bộ lọc hiện tại.
            </Text>
            <Pressable
              style={({ pressed }) => [styles.emptyCtaBtn, pressed && { opacity: 0.85 }]}
              onPress={() =>
                hasActiveFilter
                  ? handleResetFilters()
                  : router.push('/modal/manual-transaction')
              }
            >
              <Ionicons
                name={hasActiveFilter ? 'refresh' : 'add'}
                size={18}
                color={colors.primary}
              />
              <Text style={styles.emptyCtaText}>
                {hasActiveFilter ? 'Đặt lại bộ lọc' : 'Thêm giao dịch mới'}
              </Text>
            </Pressable>
          </View>
        ) : (
          categoryBreakdown.map((item, idx) => (
            <Pressable
              key={item.categoryId}
              style={({ pressed }) => [styles.catCard, pressed && { opacity: 0.85 }]}
              onPress={() => handleDrillDown(item.categoryId)}
            >
              <View style={styles.catCardTop}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>#{idx + 1}</Text>
                </View>

                <View style={[styles.catIconBox, { backgroundColor: `${item.color}1F` }]}>
                  <Ionicons name={item.icon as any} size={20} color={item.color} />
                </View>

                <View style={styles.catInfo}>
                  <View style={styles.catNameRow}>
                    <Text style={styles.catName} numberOfLines={1}>
                      {item.categoryName}
                    </Text>
                    <Text style={styles.catCount}>({item.count} GD)</Text>
                  </View>
                  <Text style={styles.catPercent}>{item.percentage.toFixed(1)}% tổng</Text>
                </View>

                <View style={styles.catAmountBox}>
                  <Text
                    style={[
                      styles.catAmount,
                      { color: activeType === 'expense' ? colors.expense : colors.income },
                    ]}
                  >
                    {formatCurrency(item.total)}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </View>
              </View>

              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.max(item.percentage, 2)}%`,
                      backgroundColor: item.color,
                    },
                  ]}
                />
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      <DateRangePickerModal
        visible={showDateModal}
        initialStart={customStart}
        initialEnd={customEnd}
        onClose={() => setShowDateModal(false)}
        onApply={(s, e) => {
          setCustomStart(s);
          setCustomEnd(e);
          setTimeRange('custom');
        }}
      />

      <MultiSelectGridModal
        visible={showBankModal}
        title="Lọc theo Ngân hàng & Ví điện tử"
        options={bankOptions}
        selectedIds={selectedSources}
        columns={2}
        allLabel="Tất cả ngân hàng/ví"
        onClose={() => setShowBankModal(false)}
        onApply={(selected) => setSelectedSources(selected)}
      />

      <MultiSelectGridModal
        visible={showCategoryModal}
        title="Lọc theo Phân loại"
        options={categoryOptions}
        selectedIds={selectedCategoryIds}
        columns={2}
        allLabel="Tất cả phân loại"
        onClose={() => setShowCategoryModal(false)}
        onApply={(selected) => setSelectedCategoryIds(selected)}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollView: {
      flex: 1,
    },
    content: {
      padding: Spacing.base,
      paddingBottom: Spacing.xxxl,
      gap: Spacing.md,
    },
    timeRangeBar: {
      flexDirection: 'row',
      gap: Spacing.xs + 2,
    },
    timeBtn: {
      flex: 1,
      minHeight: 38,
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
    customRangeBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.infoSoft,
      borderColor: colors.infoBorder,
      borderWidth: 1,
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      gap: Spacing.sm,
    },
    customRangeText: {
      flex: 1,
      color: colors.text,
      fontSize: 13,
      fontWeight: '600',
    },
    customRangeEdit: {
      color: colors.info,
      fontSize: 12,
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
    summaryContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.md,
    },
    summaryCard: {
      flex: 1,
      minWidth: '45%',
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      padding: Spacing.base,
      borderWidth: 1,
      borderColor: colors.border,
      ...Shadows.card,
    },
    balanceCard: {
      minWidth: '100%',
      alignItems: 'center',
      paddingVertical: Spacing.base,
    },
    summaryLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 4,
    },
    summaryDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    summaryLabel: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    summaryValue: {
      ...Typography.amountMd,
      fontSize: 17,
    },
    balanceValue: {
      ...Typography.amountLg,
      marginTop: 4,
    },
    typeSwitcher: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      padding: 4,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 4,
    },
    typeSwitchBtn: {
      flex: 1,
      minHeight: TouchTarget.minSize,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: Radius.md,
      gap: 6,
    },
    typeSwitchBtnActiveExpense: {
      backgroundColor: colors.expense,
    },
    typeSwitchBtnActiveIncome: {
      backgroundColor: colors.income,
    },
    typeSwitchText: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '700',
    },
    typeSwitchTextActive: {
      color: '#FFFFFF',
    },
    pieContainer: {
      backgroundColor: colors.surface,
      borderRadius: Radius.xl,
      padding: Spacing.base,
      borderWidth: 1,
      borderColor: colors.border,
      ...Shadows.card,
    },
    pieTitle: {
      ...Typography.subtitle,
      color: colors.text,
      marginBottom: Spacing.md,
    },
    breakdownHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: Spacing.xs,
    },
    breakdownTitle: {
      ...Typography.title,
      fontSize: 16,
      color: colors.text,
    },
    drillDownHint: {
      ...Typography.caption,
      color: colors.textMuted,
    },
    catCard: {
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      padding: Spacing.base,
      borderWidth: 1,
      borderColor: colors.border,
      gap: Spacing.sm,
      ...Shadows.card,
    },
    catCardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    rankBadge: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: colors.surfaceSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rankText: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '700',
    },
    catIconBox: {
      width: 40,
      height: 40,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    catInfo: {
      flex: 1,
      gap: 2,
    },
    catNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    catName: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
      flexShrink: 1,
    },
    catCount: {
      color: colors.textMuted,
      fontSize: 12,
    },
    catPercent: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    catAmountBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    catAmount: {
      ...Typography.amountMd,
    },
    progressTrack: {
      height: 6,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: Radius.pill,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: Radius.pill,
    },
    emptyContainer: {
      backgroundColor: colors.surface,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      padding: Spacing.xl,
      alignItems: 'center',
    },
    emptyIconBox: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.md,
    },
    emptyTitle: {
      ...Typography.title,
      color: colors.text,
      marginBottom: Spacing.xs,
    },
    emptyText: {
      ...Typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: Spacing.base,
    },
    emptyCtaBtn: {
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
    emptyCtaText: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '700',
    },
  });
