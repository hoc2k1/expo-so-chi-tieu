import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useApp } from '../../contexts/AppContext';
import { PendingTransaction, Transaction } from '../../models/types';
import { formatCurrency, formatRelativeTime } from '../../utils/formatters';
import { useCategoryMap } from '../../hooks/useFilterOptions';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { ConfirmModal } from '../../components/ConfirmModal';
import { GardenSprouts } from '../../components/GardenDecor';
import { ChibiCategoryBadge, FadeInUpView, SpringPressable } from '../../components/Motion';
import { HeroBalanceCard } from '../../components/HeroBalanceCard';
import { PendingTransactionCard } from '../../components/PendingTransactionCard';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  useTheme,
  ThemeColors,
  Spacing,
  Radius,
  Typography,
  TouchTarget,
  Shadows,
} from '../../constants/theme';

export default function OverviewScreen() {
  const {
    transactions,
    categories,
    pendingTransactions,
    isPermissionGranted,
    isPostNotificationGranted,
    requestPermission,
    requestPostNotificationPermission,
    syncCachedNotifications,
    deletePending,
    batchDeletePending,
    showToast,
  } = useApp();

  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const categoryMap = useCategoryMap(categories);
  const { refreshControl, refreshKey } = usePullToRefresh();

  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedContentId, setExpandedContentId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

  const { monthlyIncome, monthlyExpense, monthlyBalance, currentMonthLabel } = useMemo(() => {
    const now = new Date();
    const curMonth = now.getMonth();
    const curYear = now.getFullYear();

    let inc = 0;
    let exp = 0;
    for (const tx of transactions) {
      const d = new Date(tx.timestamp);
      if (d.getMonth() === curMonth && d.getFullYear() === curYear) {
        if (tx.type === 'income') inc += tx.amount;
        else exp += tx.amount;
      }
    }

    return {
      monthlyIncome: inc,
      monthlyExpense: exp,
      monthlyBalance: inc - exp,
      currentMonthLabel: `Tháng ${curMonth + 1}/${curYear}`,
    };
  }, [transactions]);

  const recentTransactions = useMemo(
    () => [...transactions].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5),
    [transactions]
  );

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      const next = selectedIds.filter((item) => item !== id);
      setSelectedIds(next);
      if (next.length === 0) setIsBatchMode(false);
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleLongPressItem = (id: string) => {
    if (!isBatchMode) {
      setIsBatchMode(true);
      setSelectedIds([id]);
    } else {
      toggleSelect(id);
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

  const renderRecentTxRow = (tx: Transaction) => {
    const isIncome = tx.type === 'income';
    const cat = categoryMap[tx.categoryId];
    const catColor = cat?.color || (isIncome ? colors.income : colors.expense);
    const catIcon = (cat?.icon || (isIncome ? 'arrow-down' : 'cart')) as any;

    return (
      <Pressable
        key={tx.id}
        style={({ pressed }) => [styles.recentRow, pressed && { opacity: 0.78 }]}
        onPress={() => router.push('/(tabs)/transactions')}
        accessibilityRole="button"
      >
        <ChibiCategoryBadge icon={catIcon} color={catColor} size={42} />
        <View style={styles.recentInfo}>
          <Text style={styles.recentTitle} numberOfLines={1}>
            {tx.note || tx.categoryName}
          </Text>
          <Text style={styles.recentMeta} numberOfLines={1}>
            {tx.categoryName} • {tx.source} • {formatRelativeTime(tx.timestamp)}
          </Text>
        </View>
        <Text
          style={[
            styles.recentAmount,
            { color: isIncome ? colors.income : colors.expense },
          ]}
        >
          {isIncome ? '+' : '-'}
          {formatCurrency(tx.amount)}
        </Text>
      </Pressable>
    );
  };

  const ListHeader = (
    <View style={styles.headerSection}>
      {Platform.OS === 'android' && !isPermissionGranted && (
        <View style={styles.permBanner}>
          <View style={styles.permIconBox}>
            <Ionicons name="notifications-off" size={20} color={colors.warning} />
          </View>
          <View style={styles.permTextContainer}>
            <Text style={styles.permTitle}>Chưa cấp quyền đọc thông báo</Text>
            <Text style={styles.permSubtitle}>
              Cần cấp quyền để tự động bắt thông báo biến động số dư khi chạy ngầm
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.permBtn, pressed && { opacity: 0.85 }]}
            onPress={() => requestPermission()}
            accessibilityRole="button"
          >
            <Text style={styles.permBtnText}>Cấp quyền</Text>
          </Pressable>
        </View>
      )}

      {Platform.OS === 'android' && isPermissionGranted && !isPostNotificationGranted && (
        <View style={styles.permBanner}>
          <View style={styles.permIconBox}>
            <Ionicons name="notifications-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.permTextContainer}>
            <Text style={styles.permTitle}>Bật Bubble số chờ ngoài icon</Text>
            <Text style={styles.permSubtitle}>
              Cho phép thông báo để hiển thị số giao dịch đang chờ ngay ngoài icon ứng dụng
            </Text>
          </View>
          <SpringPressable
            style={styles.permBtn}
            onPress={() => requestPostNotificationPermission()}
            accessibilityRole="button"
          >
            <Text style={styles.permBtnText}>Bật ngay</Text>
          </SpringPressable>
        </View>
      )}

      <HeroBalanceCard
        currentMonthLabel={currentMonthLabel}
        monthlyBalance={monthlyBalance}
        monthlyIncome={monthlyIncome}
        monthlyExpense={monthlyExpense}
        onOpenStatistics={() => router.push('/(tabs)/statistics')}
      />

      <View style={styles.quickActionsRow}>
        <SpringPressable
          style={styles.primaryActionBtn}
          onPress={() => router.push('/modal/manual-transaction')}
          accessibilityRole="button"
        >
          <GardenSprouts variant="chip" align="left" />
          <Ionicons name="add-circle" size={20} color={colors.onPrimary} />
          <Text style={styles.primaryActionText}>Thêm giao dịch</Text>
        </SpringPressable>

        {Platform.OS === 'android' ? (
          <SpringPressable
            style={styles.secondaryActionBtn}
            onPress={() =>
              syncCachedNotifications({ forceRescan: true, showFeedbackToast: true })
            }
            accessibilityRole="button"
          >
            <GardenSprouts variant="chip" align="right" />
            <Ionicons name="sync" size={18} color={colors.primary} />
            <Text style={styles.secondaryActionText}>Đồng bộ</Text>
          </SpringPressable>
        ) : (
          <SpringPressable
            style={styles.secondaryActionBtn}
            onPress={() => router.push('/(tabs)/transactions')}
            accessibilityRole="button"
          >
            <GardenSprouts variant="chip" align="right" />
            <Ionicons name="receipt-outline" size={18} color={colors.primary} />
            <Text style={styles.secondaryActionText}>Sổ giao dịch</Text>
          </SpringPressable>
        )}
      </View>

      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Hàng chờ phân loại</Text>
          {pendingTransactions.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{pendingTransactions.length}</Text>
            </View>
          )}
        </View>
        {pendingTransactions.length > 0 && (
          <Text style={styles.longPressHint}>Nhấn giữ để chọn nhiều</Text>
        )}
      </View>
    </View>
  );

  const ListFooter =
    recentTransactions.length > 0 ? (
      <View style={styles.recentSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Giao dịch gần nhất</Text>
          <Pressable
            onPress={() => router.push('/(tabs)/transactions')}
            hitSlop={TouchTarget.hitSlop}
            style={({ pressed }) => [styles.seeAllBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.seeAllText}>Xem tất cả</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </Pressable>
        </View>
        <View style={{ position: 'relative', overflow: 'visible' }}>
          <View style={styles.recentCard}>{recentTransactions.map(renderRecentTxRow)}</View>
          <GardenSprouts variant="minimal" />
        </View>
      </View>
    ) : null;

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      {isBatchMode && (
        <View style={styles.batchHeaderBar}>
          <View style={styles.batchHeaderLeft}>
            <Pressable
              style={({ pressed }) => [styles.batchCloseBtn, pressed && { opacity: 0.7 }]}
              onPress={exitBatchMode}
              hitSlop={TouchTarget.hitSlop}
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </Pressable>
            <Text style={styles.batchCountText}>
              Đã chọn {selectedIds.length}/{pendingTransactions.length}
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [styles.selectAllBtn, pressed && { opacity: 0.75 }]}
            onPress={handleSelectAll}
          >
            <Ionicons
              name={
                selectedIds.length === pendingTransactions.length
                  ? 'checkbox'
                  : 'square-outline'
              }
              size={18}
              color={colors.primary}
            />
            <Text style={styles.selectAllText}>
              {selectedIds.length === pendingTransactions.length
                ? 'Bỏ chọn hết'
                : 'Chọn tất cả'}
            </Text>
          </Pressable>
        </View>
      )}

      <FadeInUpView triggerKey={refreshKey} style={{ flex: 1 }}>
        <FlatList
          data={pendingTransactions}
          keyExtractor={(item) => item.id}
          refreshControl={refreshControl}
          renderItem={({ item, index }) => (
            <PendingTransactionCard
              item={item}
              index={index}
              isBatchMode={isBatchMode}
              isSelected={selectedIds.includes(item.id)}
              isExpanded={expandedContentId === item.id}
              onToggleSelect={toggleSelect}
              onLongPress={handleLongPressItem}
              onToggleExpand={(id) =>
                setExpandedContentId((prev) => (prev === id ? null : id))
              }
              onDelete={handleDeleteSingle}
              onClassify={(id) =>
                router.push({ pathname: '/modal/classify', params: { pendingId: id } })
              }
            />
          )}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={ListFooter ?? undefined}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              title="Hàng chờ đang trống"
              subtitle="Thông báo biến động số dư từ ngân hàng hoặc ví điện tử sẽ tự động xuất hiện tại đây để bạn phân loại nhanh chóng."
              mood="chill"
              mascotSize={94}
              ctaLabel="Ghi chép giao dịch mới"
              ctaIcon="add"
              onCtaPress={() => router.push('/modal/manual-transaction')}
            />
          }
        />
      </FadeInUpView>

      {isBatchMode && selectedIds.length > 0 && (
        <View style={styles.batchFooter}>
          <Pressable
            style={({ pressed }) => [styles.batchDeleteBtn, pressed && { opacity: 0.8 }]}
            onPress={handleBatchDelete}
          >
            <Ionicons name="trash-outline" size={18} color={colors.expense} />
            <Text style={styles.batchDeleteBtnText}>Xóa ({selectedIds.length})</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.batchClassifyBtn, pressed && { opacity: 0.85 }]}
            onPress={handleBatchClassify}
          >
            <Ionicons name="checkmark-done" size={18} color={colors.onPrimary} />
            <Text style={styles.batchClassifyBtnText}>
              Phân loại ({selectedIds.length})
            </Text>
          </Pressable>
        </View>
      )}

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

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    listContent: {
      padding: Spacing.base,
      paddingBottom: Spacing.xxxl + 40,
    },
    headerSection: {
      gap: Spacing.base,
      marginBottom: Spacing.sm,
    },
    permBanner: {
      backgroundColor: colors.warningSoft,
      borderWidth: 1,
      borderColor: colors.warningBorder,
      padding: Spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: Radius.lg,
      gap: Spacing.md,
    },
    permIconBox: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    permTextContainer: {
      flex: 1,
    },
    permTitle: {
      color: colors.text,
      fontWeight: '700',
      fontSize: 13,
    },
    permSubtitle: {
      color: colors.textSecondary,
      fontSize: 11,
      marginTop: 2,
      lineHeight: 15,
    },
    permBtn: {
      backgroundColor: colors.warning,
      paddingHorizontal: Spacing.md,
      minHeight: TouchTarget.minSize - 6,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    permBtnText: {
      color: colors.onPrimary,
      fontWeight: '700',
      fontSize: 12,
    },
    quickActionsRow: {
      flexDirection: 'row',
      gap: Spacing.md,
    },
    primaryActionBtn: {
      flex: 1.4,
      minHeight: TouchTarget.minSize + 4,
      backgroundColor: colors.primary,
      borderRadius: Radius.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      paddingHorizontal: Spacing.base,
    },
    primaryActionText: {
      color: colors.onPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
    secondaryActionBtn: {
      flex: 1,
      minHeight: TouchTarget.minSize + 4,
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      paddingHorizontal: Spacing.base,
    },
    secondaryActionText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: Spacing.xs,
    },
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    sectionTitle: {
      ...Typography.title,
      fontSize: 16,
      color: colors.text,
    },
    countBadge: {
      backgroundColor: colors.expenseSoft,
      borderColor: colors.expenseBorder,
      borderWidth: 1,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderRadius: Radius.pill,
    },
    countBadgeText: {
      color: colors.expense,
      fontSize: 12,
      fontWeight: '700',
    },
    longPressHint: {
      ...Typography.caption,
      color: colors.textMuted,
    },
    recentSection: {
      marginTop: Spacing.sm,
      gap: Spacing.sm,
    },
    seeAllBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: TouchTarget.minSize - 8,
      gap: 2,
    },
    seeAllText: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '600',
    },
    recentCard: {
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      ...Shadows.card,
    },
    recentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: Spacing.md,
      minHeight: 60,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
      gap: Spacing.md,
    },
    recentInfo: {
      flex: 1,
      gap: 2,
    },
    recentTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    recentMeta: {
      color: colors.textSecondary,
      fontSize: 12,
    },
    recentAmount: {
      ...Typography.amountMd,
    },
    batchHeaderBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surfaceElevated,
      paddingHorizontal: Spacing.base,
      paddingVertical: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    batchHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    batchCloseBtn: {
      width: TouchTarget.minSize,
      height: TouchTarget.minSize,
      borderRadius: Radius.md,
      backgroundColor: colors.surfaceSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    batchCountText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '700',
    },
    selectAllBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primarySoft,
      paddingHorizontal: Spacing.md,
      minHeight: TouchTarget.minSize - 4,
      borderRadius: Radius.md,
      gap: 6,
    },
    selectAllText: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '700',
    },
    batchFooter: {
      position: 'absolute',
      bottom: Spacing.base,
      left: Spacing.base,
      right: Spacing.base,
      flexDirection: 'row',
      gap: Spacing.md,
      backgroundColor: colors.surfaceElevated,
      padding: Spacing.md,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      ...Shadows.hero,
    },
    batchDeleteBtn: {
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
    batchDeleteBtnText: {
      color: colors.expense,
      fontWeight: '700',
      fontSize: 14,
    },
    batchClassifyBtn: {
      flex: 2,
      minHeight: TouchTarget.minSize,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      borderRadius: Radius.md,
      gap: 6,
    },
    batchClassifyBtnText: {
      color: colors.onPrimary,
      fontWeight: '700',
      fontSize: 14,
    },
  });
