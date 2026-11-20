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
import { TimeRangePreset, TransactionType } from '../../models/types';
import {
  formatCurrency,
  getDefaultMonthStartDisplay,
  getDefaultTodayEndDisplay,
  isTransactionInTimeRange,
} from '../../utils/formatters';
import { useFilterOptions } from '../../hooks/useFilterOptions';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { PieChartSvg } from '../../components/PieChartSvg';
import { DateRangePickerModal } from '../../components/DateRangePickerModal';
import { MultiSelectGridModal } from '../../components/MultiSelectGridModal';
import { GardenSprouts } from '../../components/GardenDecor';
import { ChibiCategoryBadge, FadeInUpView } from '../../components/Motion';
import { EmptyState } from '../../components/ui/EmptyState';
import { TypeSwitcher } from '../../components/ui/TypeSwitcher';
import {
  TimeRangeBar,
  FilterDropdownRow,
  AppliedFilterBanners,
} from '../../components/ui/FilterBar';
import {
  useTheme,
  ThemeColors,
  Spacing,
  Radius,
  Typography,
  Shadows,
} from '../../constants/theme';

export default function StatisticsScreen() {
  const { transactions, categories, setTransactionFilter } = useApp();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { categoryOptions, bankOptions } = useFilterOptions(transactions, categories);
  const { refreshControl, refreshKey } = usePullToRefresh();

  const [timeRange, setTimeRange] = useState<TimeRangePreset>('month');
  const [customStart, setCustomStart] = useState<string>(() => getDefaultMonthStartDisplay());
  const [customEnd, setCustomEnd] = useState<string>(() => getDefaultTodayEndDisplay());
  const [showDateModal, setShowDateModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [activeType, setActiveType] = useState<TransactionType>('expense');

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

  const totalIncome = useMemo(
    () =>
      scopedTransactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0),
    [scopedTransactions]
  );

  const totalExpense = useMemo(
    () =>
      scopedTransactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0),
    [scopedTransactions]
  );

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

    return Object.values(map)
      .map((item) => ({
        ...item,
        percentage: totalTarget > 0 ? (item.total / totalTarget) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
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
        refreshControl={refreshControl}
      >
        <FadeInUpView triggerKey={refreshKey} style={{ gap: Spacing.md }}>
        <TimeRangeBar
          value={timeRange}
          onChange={setTimeRange}
          onCustomPress={() => setShowDateModal(true)}
          sproutAlign="left"
        />

        <FilterDropdownRow
          selectedSourcesCount={selectedSources.length}
          selectedCategoriesCount={selectedCategoryIds.length}
          hasActiveFilter={hasActiveFilter}
          resetLabel="Mặc định"
          onOpenBankModal={() => setShowBankModal(true)}
          onOpenCategoryModal={() => setShowCategoryModal(true)}
          onReset={handleResetFilters}
        />

        <AppliedFilterBanners
          timeRange={timeRange}
          customStartDate={customStart}
          customEndDate={customEnd}
          activeCategoryIds={selectedCategoryIds}
          activeSources={selectedSources}
          categories={categories}
          onEditCustomDate={() => setShowDateModal(true)}
          onClearCategories={() => setSelectedCategoryIds([])}
          onClearSources={() => setSelectedSources([])}
        />

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

        <TypeSwitcher
          value={activeType}
          onChange={setActiveType}
          expenseLabel="Cơ cấu Chi tiêu"
          incomeLabel="Cơ cấu Thu nhập"
          showIcons
        />

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
          <EmptyState
            title="Chưa có dữ liệu thống kê"
            subtitle={`Chưa có giao dịch ${activeType === 'expense' ? 'chi tiêu' : 'thu nhập'} phù hợp với bộ lọc hiện tại.`}
            mood="curious"
            mascotSize={88}
            ctaLabel={hasActiveFilter ? 'Đặt lại bộ lọc' : 'Thêm giao dịch mới'}
            ctaIcon={hasActiveFilter ? 'refresh' : 'add'}
            onCtaPress={() =>
              hasActiveFilter
                ? handleResetFilters()
                : router.push('/modal/manual-transaction')
            }
          />
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

                <ChibiCategoryBadge icon={item.icon} color={item.color} size={40} />

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
        </FadeInUpView>
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
    summaryContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
    },
    summaryCard: {
      flex: 1,
      minWidth: '47%',
      backgroundColor: colors.surface,
      padding: Spacing.md,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      gap: Spacing.xs,
      ...Shadows.card,
    },
    summaryLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    summaryDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    balanceCard: {
      width: '100%',
      minWidth: '100%',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: Spacing.md,
    },
    summaryLabel: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    summaryValue: {
      ...Typography.amountMd,
    },
    balanceValue: {
      ...Typography.amountLg,
      fontSize: 18,
    },
    pieContainer: {
      backgroundColor: colors.surface,
      borderRadius: Radius.xl,
      padding: Spacing.base,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      ...Shadows.card,
    },
    pieTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
      marginBottom: Spacing.xs,
    },
    breakdownHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: Spacing.xs,
    },
    breakdownTitle: {
      ...Typography.subtitle,
      color: colors.text,
    },
    drillDownHint: {
      ...Typography.caption,
      color: colors.textMuted,
    },
    catCard: {
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      padding: Spacing.md,
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
      width: 28,
      height: 28,
      borderRadius: Radius.sm,
      backgroundColor: colors.surfaceSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rankText: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
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
      color: colors.textSecondary,
      fontSize: 12,
    },
    catPercent: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    catAmountBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    catAmount: {
      ...Typography.amountMd,
      fontSize: 15,
    },
    progressTrack: {
      height: 7,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: Radius.pill,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: Radius.pill,
    },
  });
