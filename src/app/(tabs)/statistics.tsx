import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useApp } from '../../contexts/AppContext';
import { formatCurrency } from '../../utils/formatters';

type TimeRange = 'today' | 'week' | 'month' | 'year';

export default function StatisticsScreen() {
  const { transactions, categories } = useApp();

  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [activeType, setActiveType] = useState<'expense' | 'income'>('expense');

  // Filter transactions by timeRange
  const scopedTransactions = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return transactions.filter((tx) => {
      const txDate = new Date(tx.timestamp);
      if (timeRange === 'today') {
        return tx.date === todayStr;
      }
      if (timeRange === 'week') {
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return txDate >= oneWeekAgo;
      }
      if (timeRange === 'month') {
        return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
      }
      if (timeRange === 'year') {
        return txDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [transactions, timeRange]);

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

  // Drill down to transactions
  const handleDrillDown = (categoryId: string) => {
    router.push({
      pathname: '/(tabs)/transactions',
      params: {
        filterCategoryId: categoryId,
        filterType: activeType,
        filterTimeRange: timeRange,
      },
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Time Range Selector */}
      <View style={styles.timeRangeBar}>
        {(['today', 'week', 'month', 'year'] as const).map((t) => {
          const labels = {
            today: 'Hôm nay',
            week: 'Tuần này',
            month: 'Tháng này',
            year: 'Năm nay',
          };
          const isSelected = timeRange === t;
          return (
            <TouchableOpacity
              key={t}
              style={[styles.timeBtn, isSelected && styles.timeBtnActive]}
              onPress={() => setTimeRange(t)}
            >
              <Text style={[styles.timeBtnText, isSelected && styles.timeBtnTextActive]}>
                {labels[t]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

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

      {/* Visual Proportion Bar (Pie representation in horizontal gradient segments) */}
      {categoryBreakdown.length > 0 && (
        <View style={styles.pieContainer}>
          <Text style={styles.pieTitle}>Tỷ trọng các nhóm danh mục</Text>
          <View style={styles.proportionalBar}>
            {categoryBreakdown.map((item) => (
              <View
                key={item.categoryId}
                style={{
                  width: `${Math.max(item.percentage, 2)}%`,
                  backgroundColor: item.color,
                  height: 18,
                }}
              />
            ))}
          </View>
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
            Chưa có giao dịch {activeType === 'expense' ? 'chi tiêu' : 'thu nhập'} trong khoảng thời gian này
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
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
    marginBottom: 16,
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
    fontSize: 12,
    fontWeight: '600',
  },
  timeBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
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
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  pieTitle: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  proportionalBar: {
    flexDirection: 'row',
    borderRadius: 9,
    overflow: 'hidden',
    height: 18,
    backgroundColor: '#334155',
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

