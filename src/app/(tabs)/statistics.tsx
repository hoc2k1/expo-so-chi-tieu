import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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
import { SUPPORTED_APPS } from '../../constants/defaultData';

export default function StatisticsScreen() {
  const { transactions, categories, setTransactionFilter } = useApp();

  const [timeRange, setTimeRange] = useState<TimeRangePreset>('month');
  const [customStart, setCustomStart] = useState<string>(() => getDefaultMonthStartDisplay());
  const [customEnd, setCustomEnd] = useState<string>(() => getDefaultTodayEndDisplay());
  const [showDateModal, setShowDateModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [activeType, setActiveType] = useState<'expense' | 'income'>('expense');

  // Available banks/wallets for MultiSelectGridModal
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

  // Available categories for MultiSelectGridModal
  const categoryOptions = useMemo<MultiSelectOption[]>(() => {
    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      color: c.color,
      subtitle: c.type === 'expense' ? 'Chi tiêu' : 'Thu nhập',
    }));
  }, [categories]);

  // Filter transactions by timeRange + sources + categoryIds
  const scopedTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // 1. Bank/Wallet source filter
      if (selectedSources.length > 0 && !selectedSources.includes(tx.source)) {
        return false;
      }
      // 2. Category filter
      if (selectedCategoryIds.length > 0 && !selectedCategoryIds.includes(tx.categoryId)) {
        return false;
      }
      // 3. Time range filter
      return isTransactionInTimeRange(
        tx.timestamp,
        tx.date,
        timeRange,
        customStart,
        customEnd
      );
    });
  }, [transactions, selectedSources, selectedCategoryIds, timeRange, customStart, customEnd]);

  // Overall sums
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

  // Breakdown by Category for current activeType (expense/income)
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
          color: cat?.color || '#3B82F6',
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
  }, [scopedTransactions, activeType, totalExpense, totalIncome, categories]);

  // Drill down to transactions screen with all active filters applied
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
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Time Range Selector */}
        <View style={styles.timeRangeBar}>
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
              <TouchableOpacity
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
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Custom DateTime Range Banner */}
        {timeRange === 'custom' && (
          <TouchableOpacity
            style={styles.customRangeBanner}
            onPress={() => setShowDateModal(true)}
          >
            <Ionicons name="calendar-outline" size={16} color="#38BDF8" />
            <Text style={styles.customRangeText}>
              {customStart}  →  {customEnd}
            </Text>
            <Text style={styles.customRangeEdit}>Đổi</Text>
          </TouchableOpacity>
        )}

        {/* Filter Row 2: Ngân hàng/Ví Multi-Select & Phân loại Multi-Select */}
        <View style={styles.dropdownRow}>
          {/* Ngân hàng / Ví Dropdown Button */}
          <TouchableOpacity
            style={[
              styles.dropdownBtn,
              selectedSources.length > 0 && styles.dropdownBtnActiveBank,
            ]}
            onPress={() => setShowBankModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="business-outline"
              size={14}
              color={selectedSources.length > 0 ? '#38BDF8' : '#94A3B8'}
            />
            <Text
              style={[
                styles.dropdownBtnText,
                selectedSources.length > 0 && styles.dropdownBtnTextActive,
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
              color={selectedSources.length > 0 ? '#38BDF8' : '#64748B'}
            />
          </TouchableOpacity>

          {/* Phân loại Dropdown Button */}
          <TouchableOpacity
            style={[
              styles.dropdownBtn,
              selectedCategoryIds.length > 0 && styles.dropdownBtnActiveCategory,
            ]}
            onPress={() => setShowCategoryModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="pricetag-outline"
              size={14}
              color={selectedCategoryIds.length > 0 ? '#10B981' : '#94A3B8'}
            />
            <Text
              style={[
                styles.dropdownBtnText,
                selectedCategoryIds.length > 0 && styles.dropdownBtnTextActive,
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
              color={selectedCategoryIds.length > 0 ? '#10B981' : '#64748B'}
            />
          </TouchableOpacity>

          {/* Reset Filters button */}
          {hasActiveFilter && (
            <TouchableOpacity
              style={styles.resetFilterChip}
              onPress={handleResetFilters}
            >
              <Ionicons name="refresh" size={13} color="#EF4444" />
              <Text style={styles.resetFilterText}>Mặc định</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Active Categories Banner */}
        {selectedCategoryIds.length > 0 && (
          <View style={styles.appliedFilterBanner}>
            <View style={styles.appliedBannerLeft}>
              <Ionicons name="pricetag" size={14} color="#10B981" />
              <Text style={styles.appliedFilterText} numberOfLines={1}>
                Phân loại: <Text style={styles.appliedFilterBold}>
                  {selectedCategoryIds
                    .map((id) => categories.find((c) => c.id === id)?.name || id)
                    .join(', ')}
                </Text>
              </Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedCategoryIds([])}>
              <Ionicons name="close-circle" size={18} color="#38BDF8" />
            </TouchableOpacity>
          </View>
        )}

        {/* Active Banks Banner */}
        {selectedSources.length > 0 && (
          <View style={styles.appliedFilterBanner}>
            <View style={styles.appliedBannerLeft}>
              <Ionicons name="business" size={14} color="#38BDF8" />
              <Text style={styles.appliedFilterText} numberOfLines={1}>
                Nguồn: <Text style={styles.appliedFilterBold}>{selectedSources.join(', ')}</Text>
              </Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedSources([])}>
              <Ionicons name="close-circle" size={18} color="#38BDF8" />
            </TouchableOpacity>
          </View>
        )}

        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Tổng Thu</Text>
            <Text style={[styles.summaryValue, styles.incomeColor]}>
              +{formatCurrency(totalIncome)}
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Tổng Chi</Text>
            <Text style={[styles.summaryValue, styles.expenseColor]}>
              -{formatCurrency(totalExpense)}
            </Text>
          </View>

          <View style={[styles.summaryCard, styles.balanceCard]}>
            <Text style={styles.summaryLabel}>Chênh lệch (Số dư ròng)</Text>
            <Text
              style={[
                styles.summaryValue,
                balanceDiff >= 0 ? styles.incomeColor : styles.expenseColor,
              ]}
            >
              {balanceDiff >= 0 ? '+' : '-'}
              {formatCurrency(balanceDiff)}
            </Text>
          </View>
        </View>

        {/* Type Switcher: Chi tiêu / Thu nhập */}
        <View style={styles.typeSwitcher}>
          <TouchableOpacity
            style={[
              styles.typeSwitchBtn,
              activeType === 'expense' && styles.typeSwitchBtnActiveExpense,
            ]}
            onPress={() => setActiveType('expense')}
          >
            <Ionicons
              name="arrow-up-circle"
              size={16}
              color={activeType === 'expense' ? '#FFFFFF' : '#EF4444'}
            />
            <Text
              style={[
                styles.typeSwitchText,
                activeType === 'expense' && styles.typeSwitchTextActive,
              ]}
            >
              Cơ cấu Chi tiêu
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typeSwitchBtn,
              activeType === 'income' && styles.typeSwitchBtnActiveIncome,
            ]}
            onPress={() => setActiveType('income')}
          >
            <Ionicons
              name="arrow-down-circle"
              size={16}
              color={activeType === 'income' ? '#FFFFFF' : '#10B981'}
            />
            <Text
              style={[
                styles.typeSwitchText,
                activeType === 'income' && styles.typeSwitchTextActive,
              ]}
            >
              Cơ cấu Thu nhập
            </Text>
          </TouchableOpacity>
        </View>

        {/* Circular Pie / Donut Chart with % */}
        {categoryBreakdown.length > 0 && (
          <View style={styles.pieContainer}>
            <Text style={styles.pieTitle}>
              Biểu đồ tròn tỷ trọng {activeType === 'expense' ? 'Chi tiêu' : 'Thu nhập'} (%)
            </Text>
            <PieChartSvg
              data={categoryBreakdown}
              totalAmount={activeType === 'expense' ? totalExpense : totalIncome}
              centerLabel={activeType === 'expense' ? 'Tổng chi' : 'Tổng thu'}
              onPressSlice={(categoryId) => handleDrillDown(categoryId)}
            />
          </View>
        )}

        {/* Detailed Categories List */}
        <View style={styles.breakdownHeader}>
          <Text style={styles.breakdownTitle}>
            Chi tiết theo {activeType === 'expense' ? 'khoản chi' : 'nguồn thu'}
          </Text>
          <Text style={styles.drillDownHint}>Chạm vào mục để xem giao dịch</Text>
        </View>

        {categoryBreakdown.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="pie-chart-outline" size={48} color="#64748B" />
            <Text style={styles.emptyText}>
              Chưa có giao dịch {activeType === 'expense' ? 'chi tiêu' : 'thu nhập'} phù hợp với bộ lọc hiện tại
            </Text>
          </View>
        ) : (
          categoryBreakdown.map((item) => (
            <TouchableOpacity
              key={item.categoryId}
              style={styles.catCard}
              activeOpacity={0.7}
              onPress={() => handleDrillDown(item.categoryId)}
            >
              <View style={styles.catCardTop}>
                <View style={[styles.catIconBox, { backgroundColor: `${item.color}25` }]}>
                  <Ionicons name={item.icon as any} size={20} color={item.color} />
                </View>

                <View style={styles.catInfo}>
                  <View style={styles.catNameRow}>
                    <Text style={styles.catName}>{item.categoryName}</Text>
                    <Text style={styles.catCount}>({item.count} GD)</Text>
                  </View>
                  <Text style={styles.catPercent}>{item.percentage.toFixed(1)}% tổng</Text>
                </View>

                <View style={styles.catAmountBox}>
                  <Text
                    style={[
                      styles.catAmount,
                      activeType === 'expense' ? styles.expenseColor : styles.incomeColor,
                    ]}
                  >
                    {formatCurrency(item.total)}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color="#64748B" />
                </View>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${item.percentage}%`,
                      backgroundColor: item.color,
                    },
                  ]}
                />
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* DateRange Picker Modal */}
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

      {/* Bank & Wallet Multi-Select Grid Modal (2 columns) */}
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

      {/* Category Multi-Select Grid Modal (2 columns) */}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  timeRangeBar: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 4,
    marginBottom: 10,
  },
  timeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  timeBtnActive: {
    backgroundColor: '#3B82F6',
  },
  timeBtnText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  timeBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  customRangeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#38BDF860',
    gap: 8,
  },
  customRangeText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  customRangeEdit: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 5,
  },
  dropdownBtnActiveBank: {
    borderColor: '#38BDF8',
    backgroundColor: '#0284C725',
  },
  dropdownBtnActiveCategory: {
    borderColor: '#10B981',
    backgroundColor: '#05966925',
  },
  dropdownBtnText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  dropdownBtnTextActive: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
  resetFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#EF444420',
    gap: 4,
  },
  resetFilterText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
  },
  appliedFilterBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0284C720',
    borderWidth: 1,
    borderColor: '#0284C740',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 10,
  },
  appliedBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  appliedFilterText: {
    color: '#E2E8F0',
    fontSize: 11,
  },
  appliedFilterBold: {
    fontWeight: '700',
    color: '#38BDF8',
  },
  summaryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  balanceCard: {
    flexBasis: '100%',
    alignItems: 'center',
    backgroundColor: '#1E293B',
  },
  summaryLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  incomeColor: {
    color: '#10B981',
  },
  expenseColor: {
    color: '#EF4444',
  },
  typeSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  typeSwitchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  typeSwitchBtnActiveExpense: {
    backgroundColor: '#EF4444',
  },
  typeSwitchBtnActiveIncome: {
    backgroundColor: '#10B981',
  },
  typeSwitchText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  typeSwitchTextActive: {
    color: '#FFFFFF',
  },
  pieContainer: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  pieTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 12,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  breakdownTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
  drillDownHint: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '600',
  },
  catCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  catCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  catIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  catInfo: {
    flex: 1,
  },
  catNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  catName: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
  catCount: {
    color: '#64748B',
    fontSize: 11,
  },
  catPercent: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  catAmountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  catAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#0F172A',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
    maxWidth: 260,
  },
});
