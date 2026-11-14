import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  Pressable,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useApp } from '../../contexts/AppContext';
import { Transaction } from '../../models/types';
import {
  formatCurrency,
  formatDate,
  formatTime,
  isTransactionInTimeRange,
} from '../../utils/formatters';
import { MultiSelectGridModal, MultiSelectOption } from '../../components/MultiSelectGridModal';
import { DateRangePickerModal } from '../../components/DateRangePickerModal';
import { ConfirmModal } from '../../components/ConfirmModal';
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

  const [detailModalTx, setDetailModalTx] = useState<Transaction | null>(null);
  const [isEditingTx, setIsEditingTx] = useState(false);
  const [editTxAmount, setEditTxAmount] = useState('');
  const [editTxNote, setEditTxNote] = useState('');
  const [editTxCatId, setEditTxCatId] = useState('');
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const categoryMap = useMemo(() => {
    const map: Record<string, { icon: string; color: string }> = {};
    for (const c of categories) {
      map[c.id] = { icon: c.icon, color: c.color };
    }
    return map;
  }, [categories]);

  const handleStartEditTx = (tx: Transaction) => {
    setIsEditingTx(true);
    setEditTxAmount(tx.amount.toString());
    setEditTxNote(tx.note || '');
    setEditTxCatId(tx.categoryId || '');
  };

  const handleCancelEditTx = () => {
    setIsEditingTx(false);
  };

  const handleSaveEditTx = async () => {
    if (!detailModalTx) return;
    const cleanAmt = parseInt(editTxAmount.replace(/[^0-9]/g, ''), 10);
    if (!cleanAmt || cleanAmt <= 0) {
      showToast('Vui lòng nhập số tiền hợp lệ', 'error');
      return;
    }
    const chosenCat = categories.find((c) => c.id === editTxCatId);
    const updatedTx: Transaction = {
      ...detailModalTx,
      amount: cleanAmt,
      note: editTxNote.trim() || (chosenCat ? chosenCat.name : detailModalTx.note),
      categoryId: chosenCat ? chosenCat.id : detailModalTx.categoryId,
      categoryName: chosenCat ? chosenCat.name : detailModalTx.categoryName,
    };
    await updateTransaction(updatedTx);
    setDetailModalTx(updatedTx);
    setIsEditingTx(false);
    showToast('Đã cập nhật giao dịch thành công!', 'success');
  };

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

  const categoryOptions = useMemo<MultiSelectOption[]>(() => {
    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      color: c.color,
      subtitle: c.type === 'expense' ? 'Chi tiêu' : 'Thu nhập',
    }));
  }, [categories]);

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
      if (tx.type === 'expense') {
        map[d].totalExpense += tx.amount;
      } else {
        map[d].totalIncome += tx.amount;
      }
    });

    return Object.values(map).sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredTransactions]);

  const handleDelete = (tx: Transaction) => {
    setTxToDelete(tx);
  };

  const hasActiveFilter =
    selectedType !== 'all' ||
    activeCategoryIds.length > 0 ||
    activeSources.length > 0 ||
    selectedTimeRange !== 'month' ||
    searchQuery.trim().length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      {/* Search + Add Row */}
      <View style={styles.topSearchBarRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
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
        </View>

        <Pressable
          style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.85 }]}
          onPress={() => router.push('/modal/manual-transaction')}
          accessibilityRole="button"
        >
          <Ionicons name="add" size={20} color={colors.onPrimary} />
          <Text style={styles.addBtnText}>Thêm</Text>
        </Pressable>
      </View>

      {/* Filter Controls */}
      <View style={styles.filterGroup}>
        {/* Row 1: Type Segmented Filter */}
        <View style={styles.typeFilterRow}>
          <Pressable
            style={[
              styles.filterChip,
              selectedType === 'all' && styles.filterChipActive,
            ]}
            onPress={() =>
              setTransactionFilter((prev) => ({ ...prev, type: 'all' }))
            }
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

        {/* Row 2: Time Range Selector */}
        <View style={styles.timeRangeBar}>
          {(['today', 'week', 'month', 'year', 'custom'] as const).map((t) => {
            const labels: Record<string, string> = {
              today: 'Hôm nay',
              week: 'Tuần',
              month: 'Tháng',
              year: 'Năm',
              custom: 'Tùy chọn',
            };
            const isSelected = selectedTimeRange === t;
            return (
              <Pressable
                key={t}
                style={[styles.timeBtn, isSelected && styles.timeBtnActive]}
                onPress={() => {
                  setTransactionFilter((prev) => ({ ...prev, timeRange: t }));
                  if (t === 'custom') {
                    setShowDateModal(true);
                  }
                }}
              >
                <Text
                  style={[
                    styles.timeBtnText,
                    isSelected && styles.timeBtnTextActive,
                  ]}
                >
                  {labels[t]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Row 3: Bank / Category Multi-Select & Reset */}
        <View style={styles.dropdownRow}>
          <Pressable
            style={({ pressed }) => [
              styles.dropdownBtn,
              activeSources.length > 0 && styles.dropdownBtnActiveBank,
              pressed && { opacity: 0.8 },
            ]}
            onPress={() => setShowBankModal(true)}
          >
            <Ionicons
              name="business-outline"
              size={14}
              color={activeSources.length > 0 ? colors.info : colors.textSecondary}
            />
            <Text
              style={[
                styles.dropdownBtnText,
                activeSources.length > 0 && { color: colors.info, fontWeight: '700' },
              ]}
              numberOfLines={1}
            >
              {activeSources.length === 0
                ? 'Ngân hàng / Ví'
                : `Ngân hàng (${activeSources.length})`}
            </Text>
            <Ionicons
              name="chevron-down"
              size={13}
              color={activeSources.length > 0 ? colors.info : colors.textMuted}
            />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.dropdownBtn,
              activeCategoryIds.length > 0 && styles.dropdownBtnActiveCategory,
              pressed && { opacity: 0.8 },
            ]}
            onPress={() => setShowCategoryModal(true)}
          >
            <Ionicons
              name="pricetag-outline"
              size={14}
              color={activeCategoryIds.length > 0 ? colors.income : colors.textSecondary}
            />
            <Text
              style={[
                styles.dropdownBtnText,
                activeCategoryIds.length > 0 && { color: colors.income, fontWeight: '700' },
              ]}
              numberOfLines={1}
            >
              {activeCategoryIds.length === 0
                ? 'Phân loại'
                : `Phân loại (${activeCategoryIds.length})`}
            </Text>
            <Ionicons
              name="chevron-down"
              size={13}
              color={activeCategoryIds.length > 0 ? colors.income : colors.textMuted}
            />
          </Pressable>

          {hasActiveFilter && (
            <Pressable
              style={({ pressed }) => [
                styles.resetFilterChip,
                pressed && { opacity: 0.75 },
              ]}
              onPress={resetTransactionFilter}
              hitSlop={TouchTarget.hitSlop}
            >
              <Ionicons name="refresh" size={14} color={colors.expense} />
              <Text style={styles.resetFilterText}>Xóa lọc</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Active Filter Banners */}
      {selectedTimeRange === 'custom' && (
        <Pressable
          style={styles.appliedFilterBanner}
          onPress={() => setShowDateModal(true)}
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
        <View style={styles.appliedFilterBanner}>
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
          <Pressable
            onPress={() =>
              setTransactionFilter((prev) => ({
                ...prev,
                categoryIds: [],
                categoryId: 'all',
              }))
            }
            hitSlop={TouchTarget.hitSlop}
          >
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>
      )}

      {activeSources.length > 0 && (
        <View style={styles.appliedFilterBanner}>
          <View style={styles.appliedBannerLeft}>
            <Ionicons name="business" size={14} color={colors.info} />
            <Text style={styles.appliedFilterText} numberOfLines={1}>
              Nguồn tiền:{' '}
              <Text style={styles.appliedFilterBold}>{activeSources.join(', ')}</Text>
            </Text>
          </View>
          <Pressable
            onPress={() =>
              setTransactionFilter((prev) => ({
                ...prev,
                sources: [],
                source: 'all',
              }))
            }
            hitSlop={TouchTarget.hitSlop}
          >
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>
      )}

      {/* Transactions SectionList */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
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
        renderItem={({ item }) => {
          const isIncome = item.type === 'income';
          const cat = categoryMap[item.categoryId];
          const catColor = cat?.color || (isIncome ? colors.income : colors.expense);
          const catIcon = (cat?.icon || (isIncome ? 'arrow-down' : 'pricetag')) as any;

          return (
            <View style={styles.txCard}>
              <Pressable
                style={({ pressed }) => [styles.txRowMain, pressed && { opacity: 0.78 }]}
                onPress={() => setDetailModalTx(item)}
              >
                <View style={[styles.txIconBox, { backgroundColor: `${catColor}1F` }]}>
                  <Ionicons name={catIcon} size={20} color={catColor} />
                </View>

                <View style={styles.txDetails}>
                  <Text style={styles.txCategoryName} numberOfLines={1}>
                    {item.note || item.categoryName}
                  </Text>
                  <View style={styles.txMetaRow}>
                    <Text style={styles.txCategoryTag} numberOfLines={1}>
                      {item.categoryName}
                    </Text>
                    <Text style={styles.txTimeText}>
                      • {item.source} • {formatTime(item.timestamp)}
                    </Text>
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
                onPress={() => handleDelete(item)}
                hitSlop={TouchTarget.hitSlop}
                accessibilityLabel="Xóa giao dịch"
              >
                <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
              </Pressable>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="receipt-outline" size={44} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Chưa có giao dịch phù hợp</Text>
            <Text style={styles.emptySubtitle}>
              {hasActiveFilter
                ? 'Thử thay đổi hoặc xóa bớt bộ lọc để xem thêm giao dịch'
                : 'Các giao dịch đã phân loại hoặc ghi chép thủ công sẽ hiển thị tại đây'}
            </Text>
            <Pressable
              style={({ pressed }) => [styles.emptyCtaBtn, pressed && { opacity: 0.85 }]}
              onPress={() =>
                hasActiveFilter
                  ? resetTransactionFilter()
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
        }
      />

      {/* DateRange Picker Modal */}
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

      {/* Bank & Wallet Multi-Select Grid Modal */}
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

      {/* Category Multi-Select Grid Modal */}
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

      {/* Transaction Detail & Edit Modal */}
      {detailModalTx && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            setIsEditingTx(false);
            setDetailModalTx(null);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.detailCard}>
              <View style={styles.detailHeader}>
                <Text style={styles.detailTitle}>
                  {isEditingTx ? 'Chỉnh sửa giao dịch' : 'Chi tiết giao dịch'}
                </Text>
                <Pressable
                  style={styles.modalCloseBtn}
                  onPress={() => {
                    setIsEditingTx(false);
                    setDetailModalTx(null);
                  }}
                  hitSlop={TouchTarget.hitSlop}
                >
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </Pressable>
              </View>

              {isEditingTx ? (
                <View style={styles.editTxContainer}>
                  <Text style={styles.editTxLabel}>Số tiền (đ):</Text>
                  <TextInput
                    style={styles.editTxInput}
                    keyboardType="numeric"
                    value={editTxAmount}
                    onChangeText={setEditTxAmount}
                    placeholder="Nhập số tiền..."
                    placeholderTextColor={colors.textMuted}
                  />

                  <Text style={styles.editTxLabel}>Danh mục phân loại:</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.editCatScroll}
                  >
                    {categories
                      .filter((c) => c.type === detailModalTx.type)
                      .map((c) => {
                        const isSelected = editTxCatId === c.id;
                        return (
                          <Pressable
                            key={c.id}
                            style={[
                              styles.editCatChip,
                              isSelected && {
                                backgroundColor: c.color,
                                borderColor: c.color,
                              },
                            ]}
                            onPress={() => setEditTxCatId(c.id)}
                          >
                            <Ionicons
                              name={c.icon as any}
                              size={14}
                              color={isSelected ? '#FFFFFF' : c.color}
                              style={{ marginRight: 4 }}
                            />
                            <Text
                              style={[
                                styles.editCatChipText,
                                isSelected && { color: '#FFFFFF', fontWeight: '700' },
                              ]}
                            >
                              {c.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                  </ScrollView>

                  <Text style={styles.editTxLabel}>Ghi chú:</Text>
                  <TextInput
                    style={styles.editTxInput}
                    value={editTxNote}
                    onChangeText={setEditTxNote}
                    placeholder="Nhập ghi chú..."
                    placeholderTextColor={colors.textMuted}
                  />

                  <View style={styles.editTxBtnRow}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.editTxCancelBtn,
                        pressed && { opacity: 0.75 },
                      ]}
                      onPress={handleCancelEditTx}
                    >
                      <Text style={styles.editTxCancelText}>Hủy</Text>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [
                        styles.editTxSaveBtn,
                        pressed && { opacity: 0.85 },
                      ]}
                      onPress={handleSaveEditTx}
                    >
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      <Text style={styles.editTxSaveText}>Lưu thay đổi</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <>
                  <View style={styles.detailAmountBox}>
                    <Text
                      style={[
                        styles.detailAmount,
                        {
                          color:
                            detailModalTx.type === 'income'
                              ? colors.income
                              : colors.expense,
                        },
                      ]}
                    >
                      {detailModalTx.type === 'income' ? '+' : '-'}{' '}
                      {formatCurrency(detailModalTx.amount)}
                    </Text>
                    <Text style={styles.detailCategory}>{detailModalTx.categoryName}</Text>
                  </View>

                  <View style={styles.detailInfoList}>
                    <View style={styles.detailNoteCard}>
                      <View style={styles.detailNoteHeader}>
                        <Ionicons name="document-text" size={15} color={colors.primary} />
                        <Text style={styles.detailNoteLabel}>Ghi chú giao dịch</Text>
                      </View>
                      <Text style={styles.detailNoteText}>
                        {detailModalTx.note || '(Chưa có ghi chú)'}
                      </Text>
                    </View>

                    <View style={styles.detailInfoRow}>
                      <Text style={styles.detailLabel}>Thời gian</Text>
                      <Text style={styles.detailValue}>
                        {formatDate(detailModalTx.timestamp)} lúc{' '}
                        {formatTime(detailModalTx.timestamp)}
                      </Text>
                    </View>

                    <View style={styles.detailInfoRow}>
                      <Text style={styles.detailLabel}>Nguồn tiền</Text>
                      <Text style={styles.detailValue}>{detailModalTx.source}</Text>
                    </View>

                    {detailModalTx.referenceCode ? (
                      <View style={styles.detailInfoRow}>
                        <Text style={styles.detailLabel}>Mã GD</Text>
                        <Text style={styles.detailValue}>{detailModalTx.referenceCode}</Text>
                      </View>
                    ) : null}

                    {detailModalTx.balanceAfter ? (
                      <View style={styles.detailInfoRow}>
                        <Text style={styles.detailLabel}>Số dư sau GD</Text>
                        <Text style={styles.detailValue}>
                          {formatCurrency(detailModalTx.balanceAfter)}
                        </Text>
                      </View>
                    ) : null}

                    {detailModalTx.rawContent ? (
                      <View style={styles.rawBoxDetail}>
                        <Text style={styles.rawBoxLabel}>Thông báo gốc</Text>
                        <Text style={styles.rawBoxContent}>{detailModalTx.rawContent}</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.detailActionsRow}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.detailEditBtn,
                        pressed && { opacity: 0.78 },
                      ]}
                      onPress={() => handleStartEditTx(detailModalTx)}
                    >
                      <Ionicons name="create-outline" size={18} color={colors.primary} />
                      <Text style={styles.detailEditText}>Chỉnh sửa</Text>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [
                        styles.detailDeleteBtn,
                        pressed && { opacity: 0.78 },
                      ]}
                      onPress={() => handleDelete(detailModalTx)}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.expense} />
                      <Text style={styles.detailDeleteText}>Xóa</Text>
                    </Pressable>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>
      )}

      {/* Confirm Delete Modal */}
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
      backgroundColor: colors.surface,
      paddingHorizontal: Spacing.md,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      gap: Spacing.sm,
    },
    searchInput: {
      flex: 1,
      color: colors.text,
      fontSize: 14,
      paddingVertical: 8,
    },
    addBtn: {
      minHeight: TouchTarget.minSize,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      paddingHorizontal: Spacing.base,
      borderRadius: Radius.md,
      gap: 4,
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
      padding: 4,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 4,
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
      marginHorizontal: Spacing.base,
      marginBottom: Spacing.sm,
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
      paddingHorizontal: 8,
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
      paddingHorizontal: 8,
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
    txIconBox: {
      width: 42,
      height: 42,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
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
      gap: 4,
    },
    txCategoryTag: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '600',
      flexShrink: 1,
    },
    txTimeText: {
      color: colors.textMuted,
      fontSize: 12,
    },
    txRightCol: {
      alignItems: 'flex-end',
      gap: 4,
    },
    txAmount: {
      ...Typography.amountMd,
    },
    txTypePill: {
      paddingHorizontal: 8,
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
    emptyContainer: {
      backgroundColor: colors.surface,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      padding: Spacing.xl,
      alignItems: 'center',
      marginTop: Spacing.lg,
    },
    emptyIconBox: {
      width: 68,
      height: 68,
      borderRadius: 34,
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
    emptySubtitle: {
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
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.scrim,
      justifyContent: 'center',
      alignItems: 'center',
      padding: Spacing.lg,
    },
    detailCard: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: colors.surfaceElevated,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      padding: Spacing.lg,
    },
    detailHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.base,
    },
    detailTitle: {
      ...Typography.title,
      color: colors.text,
    },
    modalCloseBtn: {
      width: TouchTarget.minSize,
      height: TouchTarget.minSize,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: -8,
    },
    detailAmountBox: {
      alignItems: 'center',
      paddingVertical: Spacing.base,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: Radius.lg,
      marginBottom: Spacing.base,
    },
    detailAmount: {
      ...Typography.display,
      fontVariant: ['tabular-nums'],
    },
    detailCategory: {
      color: colors.textSecondary,
      fontSize: 14,
      fontWeight: '600',
      marginTop: 4,
    },
    detailInfoList: {
      gap: Spacing.sm,
      marginBottom: Spacing.lg,
    },
    detailNoteCard: {
      backgroundColor: colors.primarySoft,
      padding: Spacing.md,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.primaryBorder,
    },
    detailNoteHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 4,
    },
    detailNoteLabel: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '700',
    },
    detailNoteText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '500',
    },
    detailInfoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    detailLabel: {
      color: colors.textSecondary,
      fontSize: 13,
    },
    detailValue: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '600',
    },
    rawBoxDetail: {
      backgroundColor: colors.surfaceSecondary,
      padding: Spacing.md,
      borderRadius: Radius.md,
      marginTop: Spacing.xs,
    },
    rawBoxLabel: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '700',
      marginBottom: 4,
    },
    rawBoxContent: {
      color: colors.textSecondary,
      fontSize: 12,
      lineHeight: 17,
    },
    detailActionsRow: {
      flexDirection: 'row',
      gap: Spacing.md,
    },
    detailEditBtn: {
      flex: 1,
      minHeight: TouchTarget.minSize,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primarySoft,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.primaryBorder,
      gap: 6,
    },
    detailEditText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '700',
    },
    detailDeleteBtn: {
      flex: 1,
      minHeight: TouchTarget.minSize,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.expenseSoft,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.expenseBorder,
      gap: 6,
    },
    detailDeleteText: {
      color: colors.expense,
      fontSize: 14,
      fontWeight: '700',
    },
    editTxContainer: {
      gap: Spacing.sm,
    },
    editTxLabel: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '600',
      marginTop: 4,
    },
    editTxInput: {
      minHeight: TouchTarget.minSize,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: Spacing.md,
      color: colors.text,
      fontSize: 15,
      fontWeight: '600',
    },
    editCatScroll: {
      maxHeight: 48,
    },
    editCatChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceSecondary,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: Spacing.sm,
    },
    editCatChipText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '600',
    },
    editTxBtnRow: {
      flexDirection: 'row',
      gap: Spacing.md,
      marginTop: Spacing.md,
    },
    editTxCancelBtn: {
      flex: 1,
      minHeight: TouchTarget.minSize,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    editTxCancelText: {
      color: colors.textSecondary,
      fontSize: 14,
      fontWeight: '600',
    },
    editTxSaveBtn: {
      flex: 1.5,
      minHeight: TouchTarget.minSize,
      flexDirection: 'row',
      backgroundColor: colors.primary,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    editTxSaveText: {
      color: colors.onPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
  });
