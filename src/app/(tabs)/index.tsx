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
import Animated, { Easing, FadeInDown, FadeOutRight, LinearTransition } from 'react-native-reanimated';
import { useApp } from '../../contexts/AppContext';
import { PendingTransaction, Transaction } from '../../models/types';
import { formatCurrency, formatRelativeTime } from '../../utils/formatters';
import { ConfirmModal } from '../../components/ConfirmModal';
import { ChibiStrawberry } from '../../components/ChibiStrawberry';
import { GardenBox, GardenSprouts } from '../../components/GardenDecor';
import { AnimatedCurrency, ChibiCategoryBadge, SpringPressable } from '../../components/Motion';
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

  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedContentId, setExpandedContentId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

  // Monthly financial summary for Hero Card
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

  // Top 5 most recent classified transactions for Overview preview
  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5);
  }, [transactions]);

  const categoryMap = useMemo(() => {
    const map: Record<string, { icon: string; color: string }> = {};
    for (const c of categories) {
      map[c.id] = { icon: c.icon, color: c.color };
    }
    return map;
  }, [categories]);

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

  const renderPendingItem = ({ item, index }: { item: PendingTransaction; index: number }) => {
    const isSelected = selectedIds.includes(item.id);
    const isIncome = item.type === 'income';
    const isExpanded = expandedContentId === item.id;

    return (
      <Animated.View
        entering={FadeInDown.delay(Math.min(index, 6) * 45)
          .duration(260)
          .easing(Easing.inOut(Easing.ease))}
        exiting={FadeOutRight.duration(220).easing(Easing.inOut(Easing.ease))}
        layout={LinearTransition.duration(240).easing(Easing.inOut(Easing.ease))}
      >
        <Pressable
          delayLongPress={280}
          onLongPress={() => handleLongPressItem(item.id)}
          onPress={() => {
            if (isBatchMode) {
              toggleSelect(item.id);
            }
          }}
          style={({ pressed }) => [
            styles.card,
            item.isSuspectedDuplicate && styles.cardDuplicate,
            isSelected && styles.cardSelected,
            pressed && { opacity: 0.92 },
          ]}
        >
        <GardenSprouts variant="minimal" />
        {item.isSuspectedDuplicate && (
          <View style={styles.duplicateBanner}>
            <View style={styles.duplicateBannerHeader}>
              <Ionicons name="warning" size={16} color={colors.warning} />
              <Text style={styles.duplicateBannerText}>
                {item.duplicateReason ||
                  'Cảnh báo: Có thể trùng với giao dịch cùng ngân hàng trước đó'}
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.duplicateDiscardBtn,
                pressed && { opacity: 0.75 },
              ]}
              onPress={() => handleDeleteSingle(item)}
            >
              <Ionicons name="trash-bin-outline" size={14} color={colors.expense} />
              <Text style={styles.duplicateDiscardBtnText}>Bỏ qua / Xóa trùng</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.cardHeader}>
          {isBatchMode && (
            <Pressable
              style={styles.checkbox}
              onPress={() => toggleSelect(item.id)}
              hitSlop={TouchTarget.hitSlop}
            >
              <Ionicons
                name={isSelected ? 'checkbox' : 'square-outline'}
                size={22}
                color={isSelected ? colors.income : colors.textMuted}
              />
            </Pressable>
          )}

          <View style={styles.sourceTag}>
            <Ionicons name="business-outline" size={14} color={colors.info} />
            <Text style={styles.sourceText}>{item.source}</Text>
          </View>

          <Text style={styles.timeText}>{formatRelativeTime(item.timestamp)}</Text>
        </View>

        <View style={styles.amountRow}>
          <Text
            style={[
              styles.amountText,
              { color: isIncome ? colors.income : colors.expense },
            ]}
          >
            {isIncome ? '+' : '-'} {formatCurrency(item.amount)}
          </Text>
          <View
            style={[
              styles.typeBadge,
              {
                backgroundColor: isIncome ? colors.incomeSoft : colors.expenseSoft,
                borderColor: isIncome ? colors.incomeBorder : colors.expenseBorder,
              },
            ]}
          >
            <Text
              style={[
                styles.typeBadgeText,
                { color: isIncome ? colors.income : colors.expense },
              ]}
            >
              {isIncome ? 'Thu nhập' : 'Chi tiêu'}
            </Text>
          </View>
        </View>

        {item.suggestedCategoryName && (
          <View style={styles.suggestionBox}>
            <Ionicons name="sparkles-outline" size={15} color={colors.income} />
            <Text style={styles.suggestionText}>
              Gợi ý:{' '}
              <Text style={styles.suggestionHighlight}>{item.suggestedCategoryName}</Text>
              {item.suggestedNote ? ` • ${item.suggestedNote}` : ''}
            </Text>
          </View>
        )}

        {item.rawContent ? (
          <Pressable
            style={({ pressed }) => [styles.rawContentBox, pressed && { opacity: 0.8 }]}
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
          </Pressable>
        ) : null}

        {!isBatchMode && (
          <View style={styles.cardActions}>
            <Pressable
              style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.75 }]}
              onPress={() => handleDeleteSingle(item)}
              accessibilityRole="button"
            >
              <Ionicons name="close" size={16} color={colors.textSecondary} />
              <Text style={styles.deleteBtnText}>Bỏ qua</Text>
            </Pressable>

            <SpringPressable
              style={styles.classifyBtn}
              onPress={() =>
                router.push({
                  pathname: '/modal/classify',
                  params: { pendingId: item.id },
                })
              }
              accessibilityRole="button"
            >
              <Ionicons name="checkmark-circle" size={18} color={colors.onPrimary} />
              <Text style={styles.classifyBtnText}>Phân loại ngay</Text>
            </SpringPressable>
          </View>
        )}
        </Pressable>
      </Animated.View>
    );
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
      {/* Permission Warning Banner for Android */}
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

      {/* Android Bubble Permission Banner (Android 13+) */}
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

      {/* Hero Balance Garden Card */}
      <GardenBox variant="card" style={{ marginTop: 8, marginBottom: Spacing.md }} contentStyle={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroLabel}>Số dư ròng tháng này</Text>
            <Text style={styles.heroMonthBadge}>{currentMonthLabel}</Text>
          </View>
          <ChibiStrawberry size={62} mood="happy" style={{ marginRight: 6 }} />
          <SpringPressable
            style={styles.heroChartBtn}
            onPress={() => router.push('/(tabs)/statistics')}
            hitSlop={TouchTarget.hitSlop}
            accessibilityLabel="Xem thống kê"
          >
            <Ionicons name="bar-chart-outline" size={18} color={colors.heroText} />
          </SpringPressable>
        </View>

        <AnimatedCurrency
          value={monthlyBalance}
          format={formatCurrency}
          prefix={monthlyBalance < 0 ? '-' : ''}
          style={styles.heroAmount}
        />

        <View style={styles.heroSplitRow}>
          <View style={styles.heroStatBox}>
            <View style={styles.heroStatHeader}>
              <View style={[styles.heroDot, { backgroundColor: colors.income }]} />
              <Text style={styles.heroStatLabel}>Tổng thu</Text>
            </View>
            <AnimatedCurrency
              value={monthlyIncome}
              format={formatCurrency}
              prefix="+"
              style={[styles.heroStatValue, { color: colors.income }]}
            />
          </View>

          <View style={styles.heroDivider} />

          <View style={styles.heroStatBox}>
            <View style={styles.heroStatHeader}>
              <View style={[styles.heroDot, { backgroundColor: colors.expense }]} />
              <Text style={styles.heroStatLabel}>Tổng chi</Text>
            </View>
            <AnimatedCurrency
              value={monthlyExpense}
              format={formatCurrency}
              prefix="-"
              style={[styles.heroStatValue, { color: colors.expense }]}
            />
          </View>
        </View>
      </GardenBox>

      {/* Quick Actions */}
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

      {/* Pending Section Header */}
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

      <FlatList
        data={pendingTransactions}
        keyExtractor={(item) => item.id}
        renderItem={renderPendingItem}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter ?? undefined}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <GardenBox variant="minimal" style={{ marginTop: 10 }} contentStyle={styles.emptyContainer}>
            <ChibiStrawberry size={94} mood="chill" />
            <Text style={styles.emptyTitle}>Hàng chờ đang trống</Text>
            <Text style={styles.emptySubtitle}>
              Thông báo biến động số dư từ ngân hàng hoặc ví điện tử sẽ tự động xuất hiện
              tại đây để bạn phân loại nhanh chóng.
            </Text>
            <SpringPressable
              style={styles.emptyCtaBtn}
              onPress={() => router.push('/modal/manual-transaction')}
            >
              <Ionicons name="add" size={18} color={colors.primary} />
              <Text style={styles.emptyCtaText}>Ghi chép giao dịch mới</Text>
            </SpringPressable>
          </GardenBox>
        }
      />

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
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 12,
    },
    heroCard: {
      backgroundColor: colors.heroBackground,
      borderRadius: Radius.xl,
      padding: Spacing.lg,
      borderWidth: 1,
      borderColor: colors.heroBorder,
      ...Shadows.hero,
    },
    heroTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    heroLabel: {
      color: colors.heroTextMuted,
      fontSize: 13,
      fontWeight: '600',
    },
    heroMonthBadge: {
      color: colors.heroText,
      fontSize: 12,
      fontWeight: '700',
      marginTop: 2,
      opacity: 0.85,
    },
    heroChartBtn: {
      width: TouchTarget.minSize,
      height: TouchTarget.minSize,
      borderRadius: Radius.md,
      backgroundColor: colors.heroSurface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.heroBorder,
    },
    heroAmount: {
      ...Typography.heroAmount,
      color: colors.heroText,
      marginTop: Spacing.sm,
      marginBottom: Spacing.base,
    },
    heroSplitRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.heroSurface,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      borderWidth: 1,
      borderColor: colors.heroBorder,
    },
    heroStatBox: {
      flex: 1,
      gap: 4,
    },
    heroStatHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    heroDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    heroStatLabel: {
      color: colors.heroTextMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    heroStatValue: {
      ...Typography.amountMd,
    },
    heroDivider: {
      width: 1,
      height: 32,
      backgroundColor: colors.heroBorder,
      marginHorizontal: Spacing.md,
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
      paddingHorizontal: 8,
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
    card: {
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      padding: Spacing.base,
      marginBottom: Spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      ...Shadows.card,
    },
    cardDuplicate: {
      borderColor: colors.warningBorder,
      borderWidth: 1.5,
    },
    cardSelected: {
      borderColor: colors.income,
      borderWidth: 2,
      backgroundColor: colors.incomeSoft,
    },
    duplicateBanner: {
      backgroundColor: colors.warningSoft,
      borderRadius: Radius.md,
      padding: Spacing.sm,
      marginBottom: Spacing.md,
      borderWidth: 1,
      borderColor: colors.warningBorder,
    },
    duplicateBannerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    duplicateBannerText: {
      color: colors.warning,
      fontSize: 12,
      fontWeight: '600',
      flex: 1,
    },
    duplicateDiscardBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-end',
      backgroundColor: colors.expenseSoft,
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xs + 2,
      borderRadius: Radius.sm,
      marginTop: Spacing.sm,
      gap: 4,
    },
    duplicateDiscardBtnText: {
      color: colors.expense,
      fontSize: 11,
      fontWeight: '700',
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.sm,
      gap: Spacing.sm,
    },
    checkbox: {
      paddingRight: 2,
    },
    sourceTag: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.infoSoft,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
      borderRadius: Radius.sm,
      gap: 4,
    },
    sourceText: {
      color: colors.info,
      fontSize: 12,
      fontWeight: '700',
    },
    timeText: {
      color: colors.textMuted,
      fontSize: 12,
      marginLeft: 'auto',
    },
    amountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.sm,
    },
    amountText: {
      ...Typography.amountLg,
    },
    typeBadge: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
      borderRadius: Radius.pill,
      borderWidth: 1,
    },
    typeBadgeText: {
      fontSize: 11,
      fontWeight: '700',
    },
    suggestionBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.incomeSoft,
      padding: Spacing.sm,
      borderRadius: Radius.md,
      marginBottom: Spacing.sm,
      gap: Spacing.xs + 2,
    },
    suggestionText: {
      color: colors.textSecondary,
      fontSize: 12,
      flex: 1,
    },
    suggestionHighlight: {
      color: colors.income,
      fontWeight: '700',
    },
    rawContentBox: {
      backgroundColor: colors.surfaceSecondary,
      padding: Spacing.sm + 2,
      borderRadius: Radius.md,
      marginBottom: Spacing.md,
    },
    rawContentText: {
      color: colors.textSecondary,
      fontSize: 12,
      lineHeight: 17,
    },
    expandHint: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '600',
      marginTop: 4,
      textAlign: 'right',
    },
    cardActions: {
      flexDirection: 'row',
      gap: Spacing.sm,
      marginTop: 2,
    },
    deleteBtn: {
      flex: 1,
      minHeight: TouchTarget.minSize,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceSecondary,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 4,
    },
    deleteBtnText: {
      color: colors.textSecondary,
      fontWeight: '600',
      fontSize: 13,
    },
    classifyBtn: {
      flex: 2,
      minHeight: TouchTarget.minSize,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.income,
      borderRadius: Radius.md,
      gap: 6,
    },
    classifyBtnText: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 14,
    },
    emptyContainer: {
      backgroundColor: colors.surface,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      padding: Spacing.xl,
      alignItems: 'center',
      marginBottom: Spacing.lg,
    },
    emptyIconBox: {
      width: 68,
      height: 68,
      borderRadius: 34,
      backgroundColor: colors.incomeSoft,
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
    recentIconBox: {
      width: 40,
      height: 40,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
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
