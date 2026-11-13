import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useApp } from '../../contexts/AppContext';
import { PendingTransaction } from '../../models/types';
import { formatCurrency, formatRelativeTime } from '../../utils/formatters';
import { ConfirmModal } from '../../components/ConfirmModal';

export default function PendingQueueScreen() {
  const {
    pendingTransactions,
    isPermissionGranted,
    requestPermission,
    syncCachedNotifications,
    deletePending,
    batchDeletePending,
    showToast,
  } = useApp();

  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedContentId, setExpandedContentId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

  const handleLongPressItem = (id: string) => {
    if (!isBatchMode) {
      setIsBatchMode(true);
      setSelectedIds([id]);
    } else {
      toggleSelect(id);
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      const next = selectedIds.filter((item) => item !== id);
      setSelectedIds(next);
      if (next.length === 0) {
        setIsBatchMode(false);
      }
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === pendingTransactions.length) {
      setSelectedIds([]);
      setIsBatchMode(false);
    } else {
      setSelectedIds(pendingTransactions.map((p) => p.id));
    }
  };

  const exitBatchMode = () => {
    setIsBatchMode(false);
    setSelectedIds([]);
  };

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    setDeleteConfirm({
      title: 'Xác nhận xóa hàng chờ',
      message: `Bạn có chắc chắn muốn xóa ${selectedIds.length} thông báo khỏi hàng chờ?`,
      onConfirm: async () => {
        const count = selectedIds.length;
        await batchDeletePending(selectedIds);
        setSelectedIds([]);
        setIsBatchMode(false);
        showToast(`Đã xóa ${count} thông báo khỏi hàng chờ`, 'info');
      },
    });
  };

  const handleDeleteSingle = (item: PendingTransaction) => {
    setDeleteConfirm({
      title: 'Bỏ qua thông báo',
      message: `Bạn có chắc muốn bỏ qua thông báo ${item.source} (${formatCurrency(item.amount)})?`,
      onConfirm: async () => {
        await deletePending(item.id);
        showToast('Đã bỏ qua thông báo', 'info');
      },
    });
  };

  const handleBatchClassify = () => {
    if (selectedIds.length === 0) return;
    router.push({
      pathname: '/modal/classify',
      params: { batchIds: JSON.stringify(selectedIds) },
    });
    setIsBatchMode(false);
    setSelectedIds([]);
  };

  const renderItem = ({ item }: { item: PendingTransaction }) => {
    const isSelected = selectedIds.includes(item.id);
    const isIncome = item.type === 'income';
    const isExpanded = expandedContentId === item.id;

    return (
      <TouchableOpacity
        activeOpacity={0.88}
        delayLongPress={280}
        onLongPress={() => handleLongPressItem(item.id)}
        onPress={() => {
          if (isBatchMode) {
            toggleSelect(item.id);
          }
        }}
        style={[
          styles.card,
          item.isSuspectedDuplicate && styles.cardDuplicate,
          isSelected && styles.cardSelected,
        ]}
      >
        {/* Soft Duplicate Warning Banner */}
        {item.isSuspectedDuplicate && (
          <View style={styles.duplicateBanner}>
            <View style={styles.duplicateBannerHeader}>
              <Ionicons name="warning" size={16} color="#F59E0B" />
              <Text style={styles.duplicateBannerText}>
                {item.duplicateReason || 'Cảnh báo: Có thể trùng với giao dịch cùng ngân hàng trước đó'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.duplicateDiscardBtn}
              onPress={() => handleDeleteSingle(item)}
            >
              <Ionicons name="trash-bin-outline" size={14} color="#EF4444" />
              <Text style={styles.duplicateDiscardBtnText}>Bỏ qua / Xóa trùng</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.cardHeader}>
          {isBatchMode && (
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => toggleSelect(item.id)}
            >
              <Ionicons
                name={isSelected ? 'checkbox' : 'square-outline'}
                size={22}
                color={isSelected ? '#10B981' : '#64748B'}
              />
            </TouchableOpacity>
          )}

          <View style={styles.sourceTag}>
            <Ionicons name="business-outline" size={14} color="#38BDF8" />
            <Text style={styles.sourceText}>{item.source}</Text>
          </View>

          <Text style={styles.timeText}>{formatRelativeTime(item.timestamp)}</Text>
        </View>

        {/* Amount & Type */}
        <View style={styles.amountRow}>
          <Text
            style={[
              styles.amountText,
              isIncome ? styles.amountIncome : styles.amountExpense,
            ]}
          >
            {isIncome ? '+' : '-'} {formatCurrency(item.amount)}
          </Text>
          <View
            style={[
              styles.typeBadge,
              isIncome ? styles.typeBadgeIncome : styles.typeBadgeExpense,
            ]}
          >
            <Text
              style={[
                styles.typeBadgeText,
                isIncome ? styles.typeBadgeTextIncome : styles.typeBadgeTextExpense,
              ]}
            >
              {isIncome ? 'Thu nhập' : 'Chi tiêu'}
            </Text>
          </View>
        </View>

        {/* Auto Rule Suggestion */}
        {item.suggestedCategoryName && (
          <View style={styles.suggestionBox}>
            <Ionicons name="bulb-outline" size={15} color="#10B981" />
            <Text style={styles.suggestionText}>
              Gợi ý tự động:{' '}
              <Text style={styles.suggestionHighlight}>
                {item.suggestedCategoryName}
              </Text>
              {item.suggestedNote ? ` • ${item.suggestedNote}` : ''}
            </Text>
          </View>
        )}

        {/* Raw Notification Content */}
        {item.rawContent ? (
          <TouchableOpacity
            style={styles.rawContentBox}
            activeOpacity={0.7}
            onPress={() => {
              if (isBatchMode) {
                toggleSelect(item.id);
              } else {
                setExpandedContentId(isExpanded ? null : item.id);
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
          </TouchableOpacity>
        ) : null}

        {/* Actions */}
        {!isBatchMode && (
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleDeleteSingle(item)}
            >
              <Ionicons name="close" size={16} color="#94A3B8" />
              <Text style={styles.deleteBtnText}>Bỏ qua</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.classifyBtn}
              onPress={() =>
                router.push({
                  pathname: '/modal/classify',
                  params: { pendingId: item.id },
                })
              }
            >
              <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
              <Text style={styles.classifyBtnText}>Phân loại ngay</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      {/* Permission Warning Banner for Android */}
      {Platform.OS === 'android' && !isPermissionGranted && (
        <View style={styles.permBanner}>
          <Ionicons name="notifications-off" size={20} color="#F59E0B" />
          <View style={styles.permTextContainer}>
            <Text style={styles.permTitle}>Chưa cấp quyền đọc thông báo</Text>
            <Text style={styles.permSubtitle}>
              Cần cấp quyền để tự động bắt thông báo từ app ngân hàng khi chạy ngầm
            </Text>
          </View>
          <TouchableOpacity
            style={styles.permBtn}
            onPress={() => requestPermission()}
          >
            <Text style={styles.permBtnText}>Cấp quyền</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Top Action Bar or Long-Press Selection Bar */}
      {isBatchMode ? (
        <View style={styles.batchHeaderBar}>
          <View style={styles.batchHeaderLeft}>
            <TouchableOpacity style={styles.batchCloseBtn} onPress={exitBatchMode}>
              <Ionicons name="close" size={20} color="#F8FAFC" />
            </TouchableOpacity>
            <Text style={styles.batchCountText}>
              Đã chọn {selectedIds.length}/{pendingTransactions.length}
            </Text>
          </View>

          <TouchableOpacity style={styles.selectAllBtn} onPress={handleSelectAll}>
            <Ionicons
              name={
                selectedIds.length === pendingTransactions.length
                  ? 'checkbox'
                  : 'square-outline'
              }
              size={16}
              color="#38BDF8"
            />
            <Text style={styles.selectAllText}>
              {selectedIds.length === pendingTransactions.length
                ? 'Bỏ chọn hết'
                : 'Chọn tất cả'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.topActions}>
          <TouchableOpacity
            style={styles.actionPill}
            onPress={() => router.push('/modal/manual-transaction')}
          >
            <Ionicons name="add-circle" size={18} color="#10B981" />
            <Text style={styles.actionPillText}>+ Thêm giao dịch</Text>
          </TouchableOpacity>

          {Platform.OS === 'android' && (
            <TouchableOpacity
              style={styles.actionPill}
              onPress={() => syncCachedNotifications()}
            >
              <Ionicons name="sync" size={16} color="#38BDF8" />
              <Text style={styles.actionPillText}>Đồng bộ thông báo</Text>
            </TouchableOpacity>
          )}

          {pendingTransactions.length > 0 && (
            <Text style={styles.longPressHint}>Nhấn giữ thẻ để chọn nhiều</Text>
          )}
        </View>
      )}

      {/* Pending List */}
      <FlatList
        data={pendingTransactions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="checkmark-done-circle" size={64} color="#10B981" />
            </View>
            <Text style={styles.emptyTitle}>Hàng chờ đang trống!</Text>
            <Text style={styles.emptySubtitle}>
              Khi có thông báo biến động số dư từ app ngân hàng hoặc ví điện tử (kể cả khi tắt app chạy ngầm), giao dịch sẽ tự động xuất hiện ở đây để bạn phân loại.
            </Text>
          </View>
        }
      />

      {/* Batch Floating Bar */}
      {isBatchMode && selectedIds.length > 0 && (
        <View style={styles.batchFooter}>
          <TouchableOpacity
            style={styles.batchDeleteBtn}
            onPress={handleBatchDelete}
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
            <Text style={styles.batchDeleteBtnText}>Xóa ({selectedIds.length})</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.batchClassifyBtn}
            onPress={handleBatchClassify}
          >
            <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
            <Text style={styles.batchClassifyBtnText}>
              Phân loại ({selectedIds.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}
      {/* Custom Confirm Modal */}
      <ConfirmModal
        visible={!!deleteConfirm}
        title={deleteConfirm?.title || ''}
        message={deleteConfirm?.message || ''}
        confirmText="Xác nhận xóa"
        cancelText="Hủy"
        type="danger"
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={async () => {
          if (deleteConfirm) {
            await deleteConfirm.onConfirm();
            setDeleteConfirm(null);
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
  permBanner: {
    backgroundColor: '#1E293B',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
  },
  permTextContainer: {
    flex: 1,
    marginLeft: 10,
  },
  permTitle: {
    color: '#F8FAFC',
    fontWeight: '700',
    fontSize: 13,
  },
  permSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  permBtn: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  permBtnText: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 12,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    flexWrap: 'wrap',
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  actionPillText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
  longPressHint: {
    color: '#64748B',
    fontSize: 11,
    marginLeft: 'auto',
    fontStyle: 'italic',
  },
  batchHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#10B98160',
  },
  batchHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  batchCloseBtn: {
    padding: 2,
  },
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#0F172A',
    borderRadius: 8,
  },
  selectAllText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },
  batchCountText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardDuplicate: {
    borderColor: '#F59E0B',
    backgroundColor: '#1C1917',
  },
  cardSelected: {
    borderColor: '#10B981',
    backgroundColor: '#064E3B35',
  },
  duplicateBanner: {
    backgroundColor: '#78350F40',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F59E0B60',
    flexDirection: 'column',
    gap: 6,
  },
  duplicateBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  duplicateBannerText: {
    color: '#FCD34D',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  duplicateDiscardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#EF444420',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
    marginTop: 2,
  },
  duplicateDiscardBtnText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  checkbox: {
    marginRight: 8,
  },
  sourceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  sourceText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  timeText: {
    color: '#64748B',
    fontSize: 11,
    marginLeft: 'auto',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  amountText: {
    fontSize: 20,
    fontWeight: '800',
  },
  amountExpense: {
    color: '#EF4444',
  },
  amountIncome: {
    color: '#10B981',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeExpense: {
    backgroundColor: '#EF444420',
  },
  typeBadgeIncome: {
    backgroundColor: '#10B98120',
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  typeBadgeTextExpense: {
    color: '#EF4444',
  },
  typeBadgeTextIncome: {
    color: '#10B981',
  },
  suggestionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#064E3B30',
    borderWidth: 1,
    borderColor: '#10B98140',
    borderRadius: 6,
    padding: 6,
    marginTop: 6,
    gap: 6,
  },
  suggestionText: {
    color: '#A7F3D0',
    fontSize: 11,
    flex: 1,
  },
  suggestionHighlight: {
    fontWeight: '700',
    color: '#34D399',
  },
  rawContentBox: {
    backgroundColor: '#0F172A',
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
  },
  rawContentText: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 16,
  },
  expandHint: {
    color: '#38BDF8',
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#334155',
    gap: 4,
  },
  deleteBtnText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  classifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#10B981',
    gap: 4,
  },
  classifyBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIconBox: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#10B98115',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  batchFooter: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  batchDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF444420',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  batchDeleteBtnText: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 13,
  },
  batchClassifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  batchClassifyBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
