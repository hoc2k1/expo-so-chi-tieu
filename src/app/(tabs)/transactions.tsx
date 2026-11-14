import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useApp } from '../../contexts/AppContext';
import { Transaction, TimeRangePreset } from '../../models/types';
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

  const [detailModalTx, setDetailModalTx] = useState<Transaction | null>(null);
  const [isEditingTx, setIsEditingTx] = useState(false);
  const [editTxAmount, setEditTxAmount] = useState('');
  const [editTxNote, setEditTxNote] = useState('');
  const [editTxCatId, setEditTxCatId] = useState('');
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);

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

  // Active multi-select category IDs (with fallback to legacy categoryId)
  const activeCategoryIds = useMemo(() => {
    if (rawCategoryIds && rawCategoryIds.length > 0) return rawCategoryIds;
    if (legacyCategoryId && legacyCategoryId !== 'all') return [legacyCategoryId];
    return [];
  }, [rawCategoryIds, legacyCategoryId]);

  // Active multi-select bank/wallet sources (with fallback to legacy source)
  const activeSources = useMemo(() => {
    if (rawSources && rawSources.length > 0) return rawSources;
    if (legacySource && legacySource !== 'all') return [legacySource];
    return [];
  }, [rawSources, legacySource]);

  // Options for Category MultiSelectGridModal
  const categoryOptions = useMemo<MultiSelectOption[]>(() => {
    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      color: c.color,
      subtitle: c.type === 'expense' ? 'Chi tiêu' : 'Thu nhập',
    }));
  }, [categories]);

  // Options for Bank/Wallet MultiSelectGridModal
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

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // 1. Type filter (Chi / Thu)
      if (selectedType !== 'all' && tx.type !== selectedType) return false;

      // 2. Category multi-select filter
      if (activeCategoryIds.length > 0 && !activeCategoryIds.includes(tx.categoryId)) {
        return false;
      }

      // 3. Bank / Wallet multi-select filter
      if (activeSources.length > 0 && !activeSources.includes(tx.source)) {
        return false;
      }

      // 4. Time range / DateRange filter
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

      // 5. Search query
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

  // Group by date for SectionList
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
    selectedTimeRange !== 'all' ||
    searchQuery.trim().length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      {/* Top Bar: Search Input & Add Transaction Button */}
      <View style={styles.topSearchBarRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo ghi chú, phân loại, ngân hàng..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={(val) =>
              setTransactionFilter((prev) => ({ ...prev, searchQuery: val }))
            }
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() =>
                setTransactionFilter((prev) => ({ ...prev, searchQuery: '' }))
              }
            >
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/modal/manual-transaction')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color="#0F172A" />
          <Text style={styles.addBtnText}>Thêm</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Controls */}
      <View style={styles.filterGroup}>
        {/* Row 1: Thu / Chi & DateRange Presets */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRowContent}
        >
          {/* Thu / Chi */}
          <TouchableOpacity
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
              Tất cả Thu/Chi
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
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
                selectedType === 'expense' && styles.filterChipTextActive,
              ]}
            >
              - Chi tiêu
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
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
                selectedType === 'income' && styles.filterChipTextActive,
              ]}
            >
              + Thu nhập
            </Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Quick Date presets */}
          {(['all', 'today', 'week', 'month', 'year'] as TimeRangePreset[]).map(
            (t) => {
              const labels: Record<string, string> = {
                all: 'Mọi lúc',
                today: 'Hôm nay',
                week: 'Tuần này',
                month: 'Tháng này',
                year: 'Năm nay',
              };
              const isSelected = selectedTimeRange === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.filterChip, isSelected && styles.filterChipActive]}
                  onPress={() =>
                    setTransactionFilter((prev) => ({ ...prev, timeRange: t }))
                  }
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      isSelected && styles.filterChipTextActive,
                    ]}
                  >
                    {labels[t]}
                  </Text>
                </TouchableOpacity>
              );
            }
          )}

          {/* DateRange picker trigger */}
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedTimeRange === 'custom' && styles.filterChipActive,
            ]}
            onPress={() => setShowDateModal(true)}
          >
            <Ionicons
              name="calendar"
              size={13}
              color={selectedTimeRange === 'custom' ? '#0F172A' : '#38BDF8'}
            />
            <Text
              style={[
                styles.filterChipText,
                selectedTimeRange === 'custom' && styles.filterChipTextActive,
              ]}
            >
              Chọn DateRange 📅
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Row 2: Ngân hàng / Ví Multi-Select & Phân loại Multi-Select */}
        <View style={styles.dropdownRow}>
          {/* Ngân hàng / Ví Dropdown Button */}
          <TouchableOpacity
            style={[
              styles.dropdownBtn,
              activeSources.length > 0 && styles.dropdownBtnActiveBank,
            ]}
            onPress={() => setShowBankModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="business-outline"
              size={14}
              color={activeSources.length > 0 ? '#38BDF8' : '#94A3B8'}
            />
            <Text
              style={[
                styles.dropdownBtnText,
                activeSources.length > 0 && styles.dropdownBtnTextActive,
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
              color={activeSources.length > 0 ? '#38BDF8' : '#64748B'}
            />
          </TouchableOpacity>

          {/* Phân loại Dropdown Button */}
          <TouchableOpacity
            style={[
              styles.dropdownBtn,
              activeCategoryIds.length > 0 && styles.dropdownBtnActiveCategory,
            ]}
            onPress={() => setShowCategoryModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="pricetag-outline"
              size={14}
              color={activeCategoryIds.length > 0 ? '#10B981' : '#94A3B8'}
            />
            <Text
              style={[
                styles.dropdownBtnText,
                activeCategoryIds.length > 0 && styles.dropdownBtnTextActive,
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
              color={activeCategoryIds.length > 0 ? '#10B981' : '#64748B'}
            />
          </TouchableOpacity>

          {/* Reset Filter Button */}
          {hasActiveFilter && (
            <TouchableOpacity
              style={styles.resetFilterChip}
              onPress={resetTransactionFilter}
            >
              <Ionicons name="refresh" size={13} color="#EF4444" />
              <Text style={styles.resetFilterText}>Xóa lọc</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Active Custom DateRange Banner */}
      {selectedTimeRange === 'custom' && (
        <TouchableOpacity
          style={styles.appliedFilterBanner}
          onPress={() => setShowDateModal(true)}
        >
          <View style={styles.appliedBannerLeft}>
            <Ionicons name="calendar" size={14} color="#38BDF8" />
            <Text style={styles.appliedFilterText}>
              Khoảng ngày: <Text style={styles.appliedFilterBold}>{customStartDate} → {customEndDate}</Text>
            </Text>
          </View>
          <Text style={styles.editDateLink}>Đổi</Text>
        </TouchableOpacity>
      )}

      {/* Active Categories Tags Banner */}
      {activeCategoryIds.length > 0 && (
        <View style={styles.appliedFilterBanner}>
          <View style={styles.appliedBannerLeft}>
            <Ionicons name="pricetag" size={14} color="#10B981" />
            <Text style={styles.appliedFilterText} numberOfLines={1}>
              Phân loại: <Text style={styles.appliedFilterBold}>
                {activeCategoryIds
                  .map((id) => categories.find((c) => c.id === id)?.name || id)
                  .join(', ')}
              </Text>
            </Text>
          </View>
          <TouchableOpacity
            onPress={() =>
              setTransactionFilter((prev) => ({
                ...prev,
                categoryIds: [],
                categoryId: 'all',
              }))
            }
          >
            <Ionicons name="close-circle" size={18} color="#38BDF8" />
          </TouchableOpacity>
        </View>
      )}

      {/* Active Bank Tags Banner */}
      {activeSources.length > 0 && (
        <View style={styles.appliedFilterBanner}>
          <View style={styles.appliedBannerLeft}>
            <Ionicons name="business" size={14} color="#38BDF8" />
            <Text style={styles.appliedFilterText} numberOfLines={1}>
              Nguồn tiền: <Text style={styles.appliedFilterBold}>{activeSources.join(', ')}</Text>
            </Text>
          </View>
          <TouchableOpacity
            onPress={() =>
              setTransactionFilter((prev) => ({
                ...prev,
                sources: [],
                source: 'all',
              }))
            }
          >
            <Ionicons name="close-circle" size={18} color="#38BDF8" />
          </TouchableOpacity>
        </View>
      )}

      {/* Transactions SectionList */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionDateText}>{formatDate(section.date)}</Text>
            <View style={styles.sectionTotals}>
              {section.totalExpense > 0 && (
                <Text style={styles.sectionExpense}>
                  -{formatCurrency(section.totalExpense)}
                </Text>
              )}
              {section.totalIncome > 0 && (
                <Text style={styles.sectionIncome}>
                  +{formatCurrency(section.totalIncome)}
                </Text>
              )}
            </View>
          </View>
        )}
        renderItem={({ item }) => {
          const isIncome = item.type === 'income';
          return (
            <View style={styles.txRow}>
              <TouchableOpacity
                style={styles.txRowMain}
                activeOpacity={0.7}
                onPress={() => setDetailModalTx(item)}
              >
                <View style={styles.txIconBox}>
                  <Ionicons
                    name={isIncome ? 'arrow-down-circle' : 'arrow-up-circle'}
                    size={24}
                    color={isIncome ? '#10B981' : '#EF4444'}
                  />
                </View>

                <View style={styles.txDetails}>
                  <Text style={styles.txCategoryName}>{item.categoryName}</Text>
                  {item.note ? (
                    <View style={styles.txNoteRow}>
                      <Ionicons name="document-text-outline" size={12} color="#38BDF8" />
                      <Text style={styles.txNote} numberOfLines={2}>
                        {item.note}
                      </Text>
                    </View>
                  ) : null}
                  <View style={styles.txSourceBadge}>
                    <Text style={styles.txSourceText}>{item.source}</Text>
                    <Text style={styles.txTimeText}>• {formatTime(item.timestamp)}</Text>
                  </View>
                </View>

                <Text
                  style={[
                    styles.txAmount,
                    isIncome ? styles.txAmountIncome : styles.txAmountExpense,
                  ]}
                >
                  {isIncome ? '+' : '-'} {formatCurrency(item.amount)}
                </Text>
              </TouchableOpacity>

              {/* Direct Delete Button right on list item with confirmation popup */}
              <TouchableOpacity
                style={styles.rowDeleteBtn}
                onPress={() => handleDelete(item)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={54} color="#64748B" />
            <Text style={styles.emptyTitle}>Chưa có giao dịch phù hợp</Text>
            <Text style={styles.emptySubtitle}>
              {hasActiveFilter
                ? 'Thử thay đổi hoặc xóa bớt bộ lọc để tìm kiếm'
                : 'Các giao dịch đã phân loại sẽ hiển thị ở đây'}
            </Text>
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

      {/* Bank & Wallet Multi-Select Grid Modal (2 columns) */}
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

      {/* Category Multi-Select Grid Modal (2 columns) */}
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

      {/* Transaction Detail Modal */}
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
                <TouchableOpacity
                  onPress={() => {
                    setIsEditingTx(false);
                    setDetailModalTx(null);
                  }}
                >
                  <Ionicons name="close" size={24} color="#94A3B8" />
                </TouchableOpacity>
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
                    placeholderTextColor="#64748B"
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
                          <TouchableOpacity
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
                                isSelected && styles.editCatChipTextActive,
                              ]}
                            >
                              {c.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                  </ScrollView>

                  <Text style={styles.editTxLabel}>Ghi chú:</Text>
                  <TextInput
                    style={styles.editTxInput}
                    value={editTxNote}
                    onChangeText={setEditTxNote}
                    placeholder="Nhập ghi chú..."
                    placeholderTextColor="#64748B"
                  />

                  <View style={styles.editTxBtnRow}>
                    <TouchableOpacity
                      style={styles.editTxCancelBtn}
                      onPress={handleCancelEditTx}
                    >
                      <Text style={styles.editTxCancelText}>Hủy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.editTxSaveBtn}
                      onPress={handleSaveEditTx}
                    >
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      <Text style={styles.editTxSaveText}>Lưu thay đổi</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <>
                  <View style={styles.detailAmountBox}>
                    <Text
                      style={[
                        styles.detailAmount,
                        detailModalTx.type === 'income'
                          ? styles.txAmountIncome
                          : styles.txAmountExpense,
                      ]}
                    >
                      {detailModalTx.type === 'income' ? '+' : '-'}{' '}
                      {formatCurrency(detailModalTx.amount)}
                    </Text>
                    <Text style={styles.detailCategory}>{detailModalTx.categoryName}</Text>
                  </View>

                  <View style={styles.detailInfoList}>
                    {/* Ghi chú nổi bật */}
                    <View style={styles.detailNoteCard}>
                      <View style={styles.detailNoteHeader}>
                        <Ionicons name="document-text" size={15} color="#38BDF8" />
                        <Text style={styles.detailNoteLabel}>Ghi chú giao dịch:</Text>
                      </View>
                      <Text style={styles.detailNoteText}>
                        {detailModalTx.note || '(Chưa có ghi chú)'}
                      </Text>
                    </View>

                    <View style={styles.detailInfoRow}>
                      <Text style={styles.detailLabel}>Thời gian:</Text>
                      <Text style={styles.detailValue}>
                        {formatDate(detailModalTx.timestamp)} lúc{' '}
                        {formatTime(detailModalTx.timestamp)}
                      </Text>
                    </View>

                    <View style={styles.detailInfoRow}>
                      <Text style={styles.detailLabel}>Nguồn tiền:</Text>
                      <Text style={styles.detailValue}>{detailModalTx.source}</Text>
                    </View>

                    {detailModalTx.referenceCode ? (
                      <View style={styles.detailInfoRow}>
                        <Text style={styles.detailLabel}>Mã GD:</Text>
                        <Text style={styles.detailValue}>{detailModalTx.referenceCode}</Text>
                      </View>
                    ) : null}

                    {detailModalTx.balanceAfter ? (
                      <View style={styles.detailInfoRow}>
                        <Text style={styles.detailLabel}>Số dư sau GD:</Text>
                        <Text style={styles.detailValue}>
                          {formatCurrency(detailModalTx.balanceAfter)}
                        </Text>
                      </View>
                    ) : null}

                    {detailModalTx.rawContent ? (
                      <View style={styles.rawBoxDetail}>
                        <Text style={styles.rawBoxLabel}>Thông báo gốc:</Text>
                        <Text style={styles.rawBoxContent}>{detailModalTx.rawContent}</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.detailActionsRow}>
                    <TouchableOpacity
                      style={styles.detailEditBtn}
                      onPress={() => handleStartEditTx(detailModalTx)}
                    >
                      <Ionicons name="create-outline" size={18} color="#38BDF8" />
                      <Text style={styles.detailEditText}>Sửa</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.detailDeleteBtn}
                      onPress={() => handleDelete(detailModalTx)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      <Text style={styles.detailDeleteText}>Xóa</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>
      )}

      {/* Custom Confirm Delete Modal */}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  topSearchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#38BDF8',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    gap: 4,
  },
  addBtnText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
  },
  searchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 13,
    marginLeft: 8,
  },
  filterGroup: {
    gap: 6,
    marginBottom: 6,
  },
  filterRowContent: {
    paddingHorizontal: 16,
    gap: 6,
    alignItems: 'center',
  },
  divider: {
    width: 1,
    height: 18,
    backgroundColor: '#334155',
    marginHorizontal: 2,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterChipBank: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  filterChipExpense: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  filterChipIncome: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  filterChipText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  resetFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#EF444420',
    gap: 4,
  },
  resetFilterText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 4,
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
    fontSize: 11,
    fontWeight: '600',
  },
  dropdownBtnTextActive: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
  editDateLink: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  appliedFilterBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0284C720',
    borderWidth: 1,
    borderColor: '#0284C740',
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 6,
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
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingVertical: 8,
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  sectionDateText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTotals: {
    flexDirection: 'row',
    gap: 8,
  },
  sectionExpense: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
  },
  sectionIncome: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  txRowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  txIconBox: {
    marginRight: 10,
  },
  txDetails: {
    flex: 1,
  },
  txCategoryName: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
  txNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  txNote: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  txSourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  txSourceText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '600',
  },
  txTimeText: {
    color: '#64748B',
    fontSize: 10,
    marginLeft: 4,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 8,
    marginRight: 6,
  },
  txAmountExpense: {
    color: '#EF4444',
  },
  txAmountIncome: {
    color: '#10B981',
  },
  rowDeleteBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#EF444418',
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  detailCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#334155',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  detailAmountBox: {
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    marginBottom: 12,
  },
  detailAmount: {
    fontSize: 26,
    fontWeight: '800',
  },
  detailCategory: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 4,
  },
  detailInfoList: {
    gap: 8,
  },
  detailNoteCard: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#38BDF840',
    marginBottom: 4,
  },
  detailNoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  detailNoteLabel: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },
  detailNoteText: {
    color: '#F8FAFC',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  detailInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    color: '#64748B',
    fontSize: 12,
  },
  detailValue: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
  rawBoxDetail: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  rawBoxLabel: {
    color: '#64748B',
    fontSize: 10,
    marginBottom: 4,
  },
  rawBoxContent: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 16,
  },
  detailActionsRow: {
    flexDirection: 'row',
    marginTop: 18,
    gap: 10,
    justifyContent: 'center',
  },
  detailEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#38BDF820',
    borderWidth: 1,
    borderColor: '#38BDF840',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  detailEditText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
  },
  detailDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF444420',
    borderWidth: 1,
    borderColor: '#EF444440',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  detailDeleteText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
  },
  editTxContainer: {
    paddingVertical: 4,
  },
  editTxLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 8,
  },
  editTxInput: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: '#F8FAFC',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  editCatScroll: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  editCatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#0F172A',
    borderRadius: 14,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  editCatChipText: {
    color: '#94A3B8',
    fontSize: 11,
  },
  editCatChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  editTxBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  editTxCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editTxCancelText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '700',
  },
  editTxSaveBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  editTxSaveText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
