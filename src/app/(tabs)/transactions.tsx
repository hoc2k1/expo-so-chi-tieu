import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useApp } from '../../contexts/AppContext';
import { Transaction } from '../../models/types';
import { formatCurrency, formatDate, formatTime } from '../../utils/formatters';

export default function TransactionsScreen() {
  const { transactions, categories, deleteTransaction } = useApp();
  const params = useLocalSearchParams<{
    filterCategoryId?: string;
    filterType?: string;
    filterTimeRange?: string;
  }>();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'expense' | 'income'>(
    params.filterType === 'expense' || params.filterType === 'income' ? params.filterType : 'all'
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    params.filterCategoryId || 'all'
  );
  const [selectedTimeRange, setSelectedTimeRange] = useState<'all' | 'today' | 'week' | 'month' | 'year'>(
    params.filterTimeRange && ['all', 'today', 'week', 'month', 'year'].includes(params.filterTimeRange)
      ? (params.filterTimeRange as any)
      : 'all'
  );
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [detailModalTx, setDetailModalTx] = useState<Transaction | null>(null);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return transactions.filter((tx) => {
      // 1. Type filter
      if (selectedType !== 'all' && tx.type !== selectedType) return false;

      // 2. Category filter
      if (selectedCategoryId !== 'all' && tx.categoryId !== selectedCategoryId) return false;

      // 3. Source filter
      if (selectedSource !== 'all' && tx.source !== selectedSource) return false;

      // 4. Time range filter
      if (selectedTimeRange !== 'all') {
        const txDate = new Date(tx.timestamp);
        if (selectedTimeRange === 'today') {
          if (tx.date !== todayStr) return false;
        } else if (selectedTimeRange === 'week') {
          const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (txDate < oneWeekAgo) return false;
        } else if (selectedTimeRange === 'month') {
          const isSameMonth =
            txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
          if (!isSameMonth) return false;
        } else if (selectedTimeRange === 'year') {
          if (txDate.getFullYear() !== now.getFullYear()) return false;
        }
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
  }, [transactions, selectedType, selectedCategoryId, selectedSource, selectedTimeRange, searchQuery]);

  // Group by date for SectionList
  const sections = useMemo(() => {
    const map: Record<string, { date: string; data: Transaction[]; totalExpense: number; totalIncome: number }> = {};

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
    Alert.alert('Xác nhận xóa', 'Bạn có chắc chắn muốn xóa giao dịch này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          await deleteTransaction(tx.id);
          setDetailModalTx(null);
        },
      },
    ]);
  };

  const hasActiveFilter =
    selectedType !== 'all' ||
    selectedCategoryId !== 'all' ||
    selectedTimeRange !== 'all' ||
    selectedSource !== 'all' ||
    searchQuery.trim().length > 0;

  const resetFilters = () => {
    setSelectedType('all');
    setSelectedCategoryId('all');
    setSelectedTimeRange('all');
    setSelectedSource('all');
    setSearchQuery('');
  };

  return (
    <View style={styles.container}>
      {/* Search Input */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#94A3B8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm theo ghi chú, phân loại, ngân hàng..."
          placeholderTextColor="#64748B"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Horizontal Scroll */}
      <View style={styles.filterScroll}>
        {/* Time filters */}
        {(['all', 'today', 'week', 'month', 'year'] as const).map((t) => {
          const labels = {
            all: 'Tất cả time',
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
              onPress={() => setSelectedTimeRange(t)}
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
        })}

        {/* Type filters */}
        <TouchableOpacity
          style={[
            styles.filterChip,
            selectedType === 'expense' && styles.filterChipExpense,
          ]}
          onPress={() => setSelectedType(selectedType === 'expense' ? 'all' : 'expense')}
        >
          <Text
            style={[
              styles.filterChipText,
              selectedType === 'expense' && styles.filterChipTextActive,
            ]}
          >
            Chi tiêu
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            selectedType === 'income' && styles.filterChipIncome,
          ]}
          onPress={() => setSelectedType(selectedType === 'income' ? 'all' : 'income')}
        >
          <Text
            style={[
              styles.filterChipText,
              selectedType === 'income' && styles.filterChipTextActive,
            ]}
          >
            Thu nhập
          </Text>
        </TouchableOpacity>

        {hasActiveFilter && (
          <TouchableOpacity style={styles.resetFilterChip} onPress={resetFilters}>
            <Ionicons name="refresh" size={12} color="#EF4444" />
            <Text style={styles.resetFilterText}>Xóa lọc</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Selected Category or Source Indicator */}
      {selectedCategoryId !== 'all' && (
        <View style={styles.appliedFilterBanner}>
          <Text style={styles.appliedFilterText}>
            Đang lọc Phân loại:{' '}
            <Text style={styles.appliedFilterBold}>
              {categories.find((c) => c.id === selectedCategoryId)?.name || selectedCategoryId}
            </Text>
          </Text>
          <TouchableOpacity onPress={() => setSelectedCategoryId('all')}>
            <Ionicons name="close" size={16} color="#38BDF8" />
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
            <TouchableOpacity
              style={styles.txRow}
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
                <Text style={styles.txNote} numberOfLines={1}>
                  {item.note}
                </Text>
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

      {/* Transaction Detail Modal */}
      {detailModalTx && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setDetailModalTx(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.detailCard}>
              <View style={styles.detailHeader}>
                <Text style={styles.detailTitle}>Chi tiết giao dịch</Text>
                <TouchableOpacity onPress={() => setDetailModalTx(null)}>
                  <Ionicons name="close" size={24} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <View style={styles.detailAmountBox}>
                <Text
                  style={[
                    styles.detailAmount,
                    detailModalTx.type === 'income'
                      ? styles.txAmountIncome
                      : styles.txAmountExpense,
                  ]}
                >
                  {detailModalTx.type === 'income' ? '+' : '-'} {formatCurrency(detailModalTx.amount)}
                </Text>
                <Text style={styles.detailCategory}>{detailModalTx.categoryName}</Text>
              </View>

              <View style={styles.detailInfoList}>
                <View style={styles.detailInfoRow}>
                  <Text style={styles.detailLabel}>Ghi chú:</Text>
                  <Text style={styles.detailValue}>{detailModalTx.note}</Text>
                </View>

                <View style={styles.detailInfoRow}>
                  <Text style={styles.detailLabel}>Thời gian:</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(detailModalTx.timestamp)} lúc {formatTime(detailModalTx.timestamp)}
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

              <View style={styles.detailActions}>
                <TouchableOpacity
                  style={styles.detailDeleteBtn}
                  onPress={() => handleDelete(detailModalTx)}
                >
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  <Text style={styles.detailDeleteText}>Xóa giao dịch</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 13,
    marginLeft: 8,
  },
  filterScroll: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 6,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
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
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#EF444420',
    gap: 4,
  },
  resetFilterText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '600',
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
  appliedFilterText: {
    color: '#38BDF8',
    fontSize: 12,
  },
  appliedFilterBold: {
    fontWeight: '700',
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
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#334155',
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
  txNote: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 1,
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
  },
  txAmountExpense: {
    color: '#EF4444',
  },
  txAmountIncome: {
    color: '#10B981',
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
  detailActions: {
    marginTop: 18,
    alignItems: 'center',
  },
  detailDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF444420',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  detailDeleteText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
  },
});
