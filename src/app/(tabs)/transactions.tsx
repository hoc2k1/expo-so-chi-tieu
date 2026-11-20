import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  Pressable,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useApp } from '../../contexts/AppContext';
import { Transaction } from '../../models/types';
import {
  formatCurrency,
  formatDate,
  formatTime,
  isTransactionInTimeRange,
} from '../../utils/formatters';
import { useFilterOptions } from '../../hooks/useFilterOptions';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { MultiSelectGridModal } from '../../components/MultiSelectGridModal';
import { DateRangePickerModal } from '../../components/DateRangePickerModal';
import { ConfirmModal } from '../../components/ConfirmModal';
import { GardenBox, GardenSprouts } from '../../components/GardenDecor';
import { ChibiCategoryBadge, FadeInUpView, SpringPressable } from '../../components/Motion';
import { TransactionDetailModal } from '../../components/TransactionDetailModal';
import { EmptyState } from '../../components/ui/EmptyState';
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
  TouchTarget,
  Shadows,
} from '../../constants/theme';

export default function TransactionsScreen() {
  const {
    transactions,
    categories,
    deleteTransaction,
    updateTransaction,
    transactionFilter,
    setTransactionFilter,
    resetTransactionFilter,
    showToast,
  } = useApp();

  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { categoryMap, categoryOptions, bankOptions } = useFilterOptions(
    transactions,
    categories
  );
  const { refreshControl, refreshKey } = usePullToRefresh();

  const [detailModalTx, setDetailModalTx] = useState<Transaction | null>(null);
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const {
    type: selectedType,
    categoryIds: rawCategoryIds,
    sources: rawSources,
    categoryId: legacyCategoryId,
    source: legacySource,
    timeRange: selectedTimeRange,
    customStartDate,
    customEndDate,
    searchQuery = '',
  } = transactionFilter;

  const activeCategoryIds = useMemo(() => {
    if (rawCategoryIds && rawCategoryIds.length > 0) return rawCategoryIds;
    if (legacyCategoryId && legacyCategoryId !== 'all') return [legacyCategoryId];
    return [];
  }, [rawCategoryIds, legacyCategoryId]);

  const activeSources = useMemo(() => {
    if (rawSources && rawSources.length > 0) return rawSources;
    if (legacySource && legacySource !== 'all') return [legacySource];
    return [];
  }, [rawSources, legacySource]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (selectedType !== 'all' && tx.type !== selectedType) return false;
      if (activeCategoryIds.length > 0 && !activeCategoryIds.includes(tx.categoryId)) {
        return false;
      }
      if (activeSources.length > 0 && !activeSources.includes(tx.source)) {
        return false;
      }
      if (
        !isTransactionInTimeRange(
          tx.timestamp,
          tx.date,
          selectedTimeRange,
          customStartDate,
          customEndDate
        )
      ) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const noteMatch = tx.note.toLowerCase().includes(q);
        const catMatch = tx.categoryName.toLowerCase().includes(q);
        const sourceMatch = tx.source.toLowerCase().includes(q);
        const rawMatch = tx.rawContent ? tx.rawContent.toLowerCase().includes(q) : false;
        if (!noteMatch && !catMatch && !sourceMatch && !rawMatch) return false;
      }
      return true;
    });
  }, [
    transactions,
    selectedType,
    activeCategoryIds,
    activeSources,
    selectedTimeRange,
    customStartDate,
    customEndDate,
    searchQuery,
  ]);

  const sections = useMemo(() => {
    const map: Record<
      string,
      { date: string; data: Transaction[]; totalExpense: number; totalIncome: number }
    > = {};

    filteredTransactions.forEach((tx) => {
      const d = tx.date || formatDate(tx.timestamp);
      if (!map[d]) {
        map[d] = { date: d, data: [], totalExpense: 0, totalIncome: 0 };
      }
      map[d].data.push(tx);
      if (tx.type === 'expense') map[d].totalExpense += tx.amount;
      else map[d].totalIncome += tx.amount;
    });

    return Object.values(map).sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredTransactions]);

  const hasActiveFilter =
    selectedType !== 'all' ||
    activeCategoryIds.length > 0 ||
    activeSources.length > 0 ||
    selectedTimeRange !== 'month' ||
    searchQuery.trim().length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      {/* Search + Add Row */}
      <View style={[styles.topSearchBarRow, { paddingTop: Spacing.md }]}>
        <GardenBox variant="input" style={{ flex: 1 }} contentStyle={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.primary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm ghi chú, danh mục, ngân hàng..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={(val) =>
              setTransactionFilter((prev) => ({ ...prev, searchQuery: val }))
            }
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() =>
                setTransactionFilter((prev) => ({ ...prev, searchQuery: '' }))
              }
              hitSlop={TouchTarget.hitSlop}
            >
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </Pressable>
          )}
        </GardenBox>

        <SpringPressable
          style={styles.addBtn}
          onPress={() => router.push('/modal/manual-transaction')}
          accessibilityRole="button"
        >
          <GardenSprouts variant="chip" align="right" />
          <Ionicons name="add" size={20} color={colors.onPrimary} />
          <Text style={styles.addBtnText}>Thêm</Text>
        </SpringPressable>
      </View>

      {/* Filter Controls */}
      <View style={styles.filterGroup}>
        <View style={styles.typeFilterRow}>
          <GardenSprouts variant="chip" align="left" />
          <Pressable
            style={[styles.filterChip, selectedType === 'all' && styles.filterChipActive]}
            onPress={() => setTransactionFilter((prev) => ({ ...prev, type: 'all' }))}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedType === 'all' && styles.filterChipTextActive,
              ]}
            >
              Tất cả
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.filterChip,
              selectedType === 'expense' && styles.filterChipExpense,
            ]}
            onPress={() =>
              setTransactionFilter((prev) => ({
                ...prev,
                type: prev.type === 'expense' ? 'all' : 'expense',
              }))
            }
          >
            <Text
              style={[
                styles.filterChipText,
                selectedType === 'expense' && styles.filterChipTextExpense,
              ]}
            >
              Chi tiêu
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.filterChip,
              selectedType === 'income' && styles.filterChipIncome,
            ]}
            onPress={() =>
              setTransactionFilter((prev) => ({
                ...prev,
                type: prev.type === 'income' ? 'all' : 'income',
              }))
            }
          >
            <Text
              style={[
                styles.filterChipText,
                selectedType === 'income' && styles.filterChipTextIncome,
              ]}
            >
              Thu nhập
            </Text>
          </Pressable>
        </View>

        <TimeRangeBar
          value={selectedTimeRange}
          onChange={(t) => setTransactionFilter((prev) => ({ ...prev, timeRange: t }))}
          onCustomPress={() => setShowDateModal(true)}
          sproutAlign="right"
        />

        <FilterDropdownRow
          selectedSourcesCount={activeSources.length}
          selectedCategoriesCount={activeCategoryIds.length}
          hasActiveFilter={hasActiveFilter}
          resetLabel="Xóa lọc"
          onOpenBankModal={() => setShowBankModal(true)}
          onOpenCategoryModal={() => setShowCategoryModal(true)}
          onReset={resetTransactionFilter}
        />
      </View>

      <AppliedFilterBanners
        timeRange={selectedTimeRange}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        activeCategoryIds={activeCategoryIds}
        activeSources={activeSources}
        categories={categories}
        onEditCustomDate={() => setShowDateModal(true)}
        onClearCategories={() =>
          setTransactionFilter((prev) => ({
            ...prev,
            categoryIds: [],
            categoryId: 'all',
          }))
        }
        onClearSources={() =>
          setTransactionFilter((prev) => ({
            ...prev,
            sources: [],
            source: 'all',
          }))
        }
        bannerStyle={styles.bannerMargin}
      />

      {/* Transactions SectionList */}
      <FadeInUpView triggerKey={refreshKey} style={{ flex: 1 }}>
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          refreshControl={refreshControl}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionDateText}>{formatDate(section.date)}</Text>
              <View style={styles.sectionTotals}>
                {section.totalIncome > 0 && (
                  <View style={styles.sectionBadgeIncome}>
                    <Text style={styles.sectionIncome}>
                      +{formatCurrency(section.totalIncome)}
                    </Text>
                  </View>
                )}
                {section.totalExpense > 0 && (
                  <View style={styles.sectionBadgeExpense}>
                    <Text style={styles.sectionExpense}>
                      -{formatCurrency(section.totalExpense)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
          renderItem={({ item, index }) => {
            const isIncome = item.type === 'income';
            const cat = categoryMap[item.categoryId];
            const catColor = cat?.color || (isIncome ? colors.income : colors.expense);
            const catIcon = (cat?.icon || (isIncome ? 'arrow-down' : 'pricetag')) as any;

            return (
              <Animated.View
                entering={FadeInDown.delay(index < 6 ? index * 35 : 0).duration(240)}
                style={styles.txCard}
              >
              <Pressable
                style={({ pressed }) => [styles.txRowMain, pressed && { opacity: 0.78 }]}
                onPress={() => setDetailModalTx(item)}
              >
                <ChibiCategoryBadge icon={catIcon} color={catColor} size={42} />

                <View style={styles.txDetails}>
                  <Text style={styles.txCategoryName} numberOfLines={1}>
                    {item.note || item.categoryName}
                  </Text>
                  <Text style={styles.txCategoryTag} numberOfLines={1}>
                    {item.categoryName}
                  </Text>
                  <View style={styles.txMetaRow}>
                    <View style={styles.txSourceBadge}>
                      <Text style={styles.txSourceBadgeText} numberOfLines={1}>
                        {item.source}
                      </Text>
                    </View>
                    <Text style={styles.txTimeText}>{formatTime(item.timestamp)}</Text>
                  </View>
                </View>

                <View style={styles.txRightCol}>
                  <Text
                    style={[
                      styles.txAmount,
                      { color: isIncome ? colors.income : colors.expense },
                    ]}
                  >
                    {isIncome ? '+' : '-'}
                    {formatCurrency(item.amount)}
                  </Text>
                  <View
                    style={[
                      styles.txTypePill,
                      {
                        backgroundColor: isIncome
                          ? colors.incomeSoft
                          : colors.expenseSoft,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.txTypePillText,
                        { color: isIncome ? colors.income : colors.expense },
                      ]}
                    >
                      {isIncome ? 'Thu' : 'Chi'}
                    </Text>
                  </View>
                </View>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.rowDeleteBtn,
                  pressed && { opacity: 0.65 },
                ]}
                onPress={() => setTxToDelete(item)}
                hitSlop={TouchTarget.hitSlop}
                accessibilityLabel="Xóa giao dịch"
              >
                <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
              </Pressable>
            </Animated.View>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            title="Chưa có giao dịch phù hợp"
            subtitle={
              hasActiveFilter
                ? 'Thử thay đổi hoặc xóa bớt bộ lọc để xem thêm giao dịch'
                : 'Các giao dịch đã phân loại hoặc ghi chép thủ công sẽ hiển thị tại đây'
            }
            mood="curious"
            mascotSize={92}
            ctaLabel={hasActiveFilter ? 'Đặt lại bộ lọc' : 'Thêm giao dịch mới'}
            ctaIcon={hasActiveFilter ? 'refresh' : 'add'}
            onCtaPress={() =>
              hasActiveFilter
                ? resetTransactionFilter()
                : router.push('/modal/manual-transaction')
            }
          />
        }
        />
      </FadeInUpView>

      <DateRangePickerModal
        visible={showDateModal}
        initialStart={customStartDate}
        initialEnd={customEndDate}
        onClose={() => setShowDateModal(false)}
        onApply={(s, e) => {
          setTransactionFilter((prev) => ({
            ...prev,
            timeRange: 'custom',
            customStartDate: s,
            customEndDate: e,
          }));
        }}
      />

      <MultiSelectGridModal
        visible={showBankModal}
        title="Lọc theo Ngân hàng & Ví điện tử"
        options={bankOptions}
        selectedIds={activeSources}
        columns={2}
        allLabel="Tất cả ngân hàng/ví"
        onClose={() => setShowBankModal(false)}
        onApply={(selected) => {
          setTransactionFilter((prev) => ({
            ...prev,
            sources: selected,
            source: 'all',
          }));
        }}
      />

      <MultiSelectGridModal
        visible={showCategoryModal}
        title="Lọc theo Phân loại"
        options={categoryOptions}
        selectedIds={activeCategoryIds}
        columns={2}
        allLabel="Tất cả phân loại"
        onClose={() => setShowCategoryModal(false)}
        onApply={(selected) => {
          setTransactionFilter((prev) => ({
            ...prev,
            categoryIds: selected,
            categoryId: 'all',
          }));
        }}
      />

      <TransactionDetailModal
        transaction={detailModalTx}
        categories={categories}
        onClose={() => setDetailModalTx(null)}
        onSaveEdit={async (updatedTx) => {
          await updateTransaction(updatedTx);
          setDetailModalTx(updatedTx);
          showToast('Đã cập nhật giao dịch thành công!', 'success');
        }}
        onDelete={(tx) => setTxToDelete(tx)}
        onValidationError={(msg) => showToast(msg, 'error')}
      />

      <ConfirmModal
        visible={!!txToDelete}
        title="Xác nhận xóa giao dịch"
        message={
          txToDelete
            ? `Bạn có chắc chắn muốn xóa giao dịch "${txToDelete.categoryName} - ${formatCurrency(txToDelete.amount)}" (${txToDelete.source}) không? Dữ liệu đã xóa không thể khôi phục.`
            : ''
        }
        confirmText="Xóa giao dịch"
        cancelText="Hủy"
        type="danger"
        onCancel={() => setTxToDelete(null)}
        onConfirm={async () => {
          if (txToDelete) {
            await deleteTransaction(txToDelete.id);
            if (detailModalTx?.id === txToDelete.id) {
              setDetailModalTx(null);
            }
            setTxToDelete(null);
            showToast('Đã xóa giao dịch thành công!', 'info');
          }
        }}
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
    topSearchBarRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: Spacing.base,
      marginTop: Spacing.md,
      marginBottom: Spacing.sm,
      gap: Spacing.sm,
    },
    searchBar: {
      flex: 1,
      minHeight: TouchTarget.minSize,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.base,
      gap: Spacing.sm,
    },
    searchInput: {
      flex: 1,
      color: colors.text,
      fontSize: 14,
      paddingVertical: 10,
    },
    addBtn: {
      minHeight: TouchTarget.minSize,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      paddingHorizontal: Spacing.base,
      borderRadius: Radius.pill,
      gap: Spacing.xs,
    },
    addBtnText: {
      color: colors.onPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
    filterGroup: {
      paddingHorizontal: Spacing.base,
      paddingBottom: Spacing.sm,
      gap: Spacing.sm,
    },
    typeFilterRow: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: Radius.md,
      padding: Spacing.xs,
      borderWidth: 1,
      borderColor: colors.border,
      gap: Spacing.xs,
    },
    filterChip: {
      flex: 1,
      minHeight: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: Radius.sm,
    },
    filterChipActive: {
      backgroundColor: colors.primary,
    },
    filterChipExpense: {
      backgroundColor: colors.expenseSoft,
    },
    filterChipIncome: {
      backgroundColor: colors.incomeSoft,
    },
    filterChipText: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '600',
    },
    filterChipTextActive: {
      color: colors.onPrimary,
      fontWeight: '700',
    },
    filterChipTextExpense: {
      color: colors.expense,
      fontWeight: '700',
    },
    filterChipTextIncome: {
      color: colors.income,
      fontWeight: '700',
    },
    bannerMargin: {
      marginHorizontal: Spacing.base,
      marginBottom: Spacing.sm,
    },
    listContent: {
      padding: Spacing.base,
      paddingTop: Spacing.xs,
      paddingBottom: Spacing.xxxl,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: Spacing.sm,
      marginTop: Spacing.sm,
    },
    sectionDateText: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '700',
    },
    sectionTotals: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    sectionBadgeIncome: {
      backgroundColor: colors.incomeSoft,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderRadius: Radius.pill,
    },
    sectionIncome: {
      color: colors.income,
      fontSize: 12,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
    sectionBadgeExpense: {
      backgroundColor: colors.expenseSoft,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderRadius: Radius.pill,
    },
    sectionExpense: {
      color: colors.expense,
      fontSize: 12,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
    txCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: Spacing.sm,
      paddingLeft: Spacing.md,
      paddingRight: Spacing.xs,
      ...Shadows.card,
    },
    txRowMain: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.md,
      gap: Spacing.md,
    },
    txDetails: {
      flex: 1,
      gap: 3,
    },
    txCategoryName: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    txMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 2,
    },
    txCategoryTag: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '600',
    },
    txSourceBadge: {
      backgroundColor: colors.surfaceSecondary,
      borderRadius: Radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 7,
      paddingVertical: 2,
      flexShrink: 1,
    },
    txSourceBadgeText: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '600',
    },
    txTimeText: {
      color: colors.textMuted,
      fontSize: 12,
    },
    txRightCol: {
      alignItems: 'flex-end',
      gap: Spacing.xs,
    },
    txAmount: {
      ...Typography.amountMd,
    },
    txTypePill: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderRadius: Radius.pill,
    },
    txTypePillText: {
      fontSize: 10,
      fontWeight: '700',
    },
    rowDeleteBtn: {
      width: TouchTarget.minSize,
      height: TouchTarget.minSize,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
