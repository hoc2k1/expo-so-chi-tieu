import React, { useEffect, useMemo, useState } from 'react';
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
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useApp } from '../../contexts/AppContext';
import { NotificationDebugLog } from '../../models/types';
import { formatCurrency, formatRelativeTime } from '../../utils/formatters';
import { GardenBox } from '../../components/GardenDecor';
import { SpringPressable } from '../../components/Motion';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  useTheme,
  ThemeColors,
  Spacing,
  Radius,
  Typography,
  Shadows,
} from '../../constants/theme';

type FilterTab = 'all' | 'added' | 'ignored' | 'duplicate';

export default function NotificationLogsModal() {
  const {
    notificationDebugLogs,
    refreshDebugLogs,
    clearDebugLogs,
    isPermissionGranted,
    isServiceConnected,
    isBatteryOptimizationIgnored,
    isPostNotificationGranted,
    forceReconnectService,
    syncCachedNotifications,
    requestPostNotificationPermission,
  } = useApp();

  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [filter, setFilter] = useState<FilterTab>('all');

  useEffect(() => {
    refreshDebugLogs();
  }, [refreshDebugLogs]);

  const filteredLogs = useMemo(() => {
     if (filter === 'all') return notificationDebugLogs;
     if (filter === 'added') {
       return notificationDebugLogs.filter(
         (l) => l.status === 'added' || l.status === 'soft_duplicate_added' || l.status === 'captured'
       );
     }
     if (filter === 'duplicate') {
       return notificationDebugLogs.filter(
         (l) => l.status === 'hard_duplicate' || l.status === 'soft_duplicate_added'
       );
     }
     return notificationDebugLogs.filter(
       (l) =>
         l.status === 'ignored_invalid_or_otp' ||
         l.status === 'ignored_not_enabled' ||
         l.status === 'native_filtered'
     );
  }, [filter, notificationDebugLogs]);

  const getStatusMeta = (status: NotificationDebugLog['status']) => {
    switch (status) {
      case 'added':
        return { label: 'Đã thêm vào chờ', color: colors.income, bg: colors.incomeSoft };
      case 'soft_duplicate_added':
        return { label: 'Thêm (nghi trùng)', color: colors.warning, bg: colors.warningSoft };
      case 'hard_duplicate':
        return { label: 'Bỏ qua (trùng lặp)', color: colors.warning, bg: colors.warningSoft };
      case 'ignored_not_enabled':
        return { label: 'Chưa bật app này', color: colors.expense, bg: colors.expenseSoft };
      case 'native_filtered':
        return { label: 'Lọc ở nền (Native)', color: colors.textSecondary, bg: colors.surfaceSecondary };
      case 'captured':
        return { label: 'Native đã bắt', color: colors.info, bg: colors.infoSoft };
      default:
        return { label: 'Bỏ qua (OTP/Khác)', color: colors.textSecondary, bg: colors.surfaceSecondary };
    }
  };

  const renderLogItem = ({ item, index }: { item: NotificationDebugLog; index: number }) => {
    const meta = getStatusMeta(item.status);
    return (
      <Animated.View
        entering={FadeInDown.delay(Math.min(index, 8) * 35).duration(260)}
        style={styles.logCard}
      >
        <View style={styles.logHeader}>
          <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
            <Text style={[styles.statusBadgeText, { color: meta.color }]}>{meta.label}</Text>
          </View>
          <Text style={styles.timeText}>{formatRelativeTime(item.timestamp)}</Text>
        </View>

        <Text style={styles.pkgText} numberOfLines={1}>
          {item.source ? `${item.source} • ` : ''}
          {item.packageName}
        </Text>

        <Text style={styles.reasonText}>{item.reason}</Text>

        {item.amount ? (
          <Text style={styles.amountText}>Số tiền nhận diện: {formatCurrency(item.amount)}</Text>
        ) : null}

        {item.preview ? (
          <View style={styles.previewBox}>
            <Text style={styles.previewText} numberOfLines={3}>
              {item.preview}
            </Text>
          </View>
        ) : null}
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <FlatList
        data={filteredLogs}
        keyExtractor={(item) => item.id}
        renderItem={renderLogItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <GardenBox variant="card" style={styles.healthWrap} contentStyle={styles.healthCard}>
              <Text style={styles.healthTitle}>Trạng thái bộ lắng nghe</Text>
              <View style={styles.healthGrid}>
                <StatusPill label="Quyền đọc TB" ok={isPermissionGranted} colors={colors} />
                <StatusPill label="Service đang nối" ok={isServiceConnected} colors={colors} />
                <StatusPill label="Bỏ tối ưu pin" ok={isBatteryOptimizationIgnored} colors={colors} />
                <StatusPill label="Quyền Bubble" ok={isPostNotificationGranted} colors={colors} />
              </View>

              {Platform.OS === 'android' && (
                <View style={styles.actionRow}>
                  <SpringPressable
                    style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                    onPress={async () => {
                      await forceReconnectService();
                      await syncCachedNotifications({ forceRescan: true, showFeedbackToast: true });
                      await refreshDebugLogs();
                    }}
                  >
                    <Ionicons name="refresh" size={15} color={colors.onPrimary} />
                    <Text style={[styles.actionBtnText, { color: colors.onPrimary }]}>
                      Kết nối lại & Quét
                    </Text>
                  </SpringPressable>

                  {!isPostNotificationGranted && (
                    <SpringPressable
                      style={[
                        styles.actionBtn,
                        {
                          backgroundColor: colors.warningSoft,
                          borderWidth: 1,
                          borderColor: colors.warningBorder,
                        },
                      ]}
                      onPress={() => requestPostNotificationPermission()}
                    >
                      <Ionicons name="notifications-outline" size={15} color={colors.warning} />
                      <Text style={[styles.actionBtnText, { color: colors.warning }]}>
                        Bật Bubble
                      </Text>
                    </SpringPressable>
                  )}

                  <SpringPressable
                    style={[styles.iconOnlyBtn, { backgroundColor: colors.surfaceSecondary }]}
                    onPress={() => clearDebugLogs()}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.textSecondary} />
                  </SpringPressable>
                </View>
              )}
            </GardenBox>

            <View style={styles.filterRow}>
              {(
                [
                  { id: 'all', label: 'Tất cả' },
                  { id: 'added', label: 'Đã nhận' },
                  { id: 'ignored', label: 'Bị bỏ qua' },
                  { id: 'duplicate', label: 'Trùng lặp' },
                ] as { id: FilterTab; label: string }[]
              ).map((tab) => {
                const active = filter === tab.id;
                return (
                  <Pressable
                    key={tab.id}
                    onPress={() => setFilter(tab.id)}
                    style={[
                      styles.filterChip,
                      active && {
                        backgroundColor: colors.primary,
                        borderColor: colors.primary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        active && { color: colors.onPrimary },
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="Chưa có nhật ký thông báo nào"
            subtitle="Khi có thông báo ngân hàng/ví đến, mọi lý do nhận hoặc bỏ qua sẽ hiển thị tại đây để bạn dễ kiểm tra."
            mood="curious"
            mascotSize={86}
          />
        }
      />
    </SafeAreaView>
  );
}

function StatusPill({
  label,
  ok,
  colors,
}: {
  label: string;
  ok: boolean;
  colors: ThemeColors;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: Radius.pill,
        backgroundColor: ok ? colors.incomeSoft : colors.warningSoft,
      }}
    >
      <Ionicons
        name={ok ? 'checkmark-circle' : 'alert-circle'}
        size={14}
        color={ok ? colors.income : colors.warning}
      />
      <Text
        style={{
          fontSize: 12,
          fontWeight: '600',
          color: ok ? colors.income : colors.warning,
        }}
      >
        {label}
      </Text>
    </View>
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
      paddingBottom: Spacing.xxl,
    },
    headerBlock: {
      marginBottom: Spacing.md,
    },
    healthWrap: {
      marginTop: Spacing.sm,
      marginBottom: Spacing.base,
    },
    healthCard: {
      padding: Spacing.base,
    },
    healthTitle: {
      ...Typography.subtitle,
      color: colors.text,
      marginBottom: Spacing.sm,
    },
    healthGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
      marginBottom: Spacing.md,
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: Spacing.md,
      borderRadius: Radius.pill,
    },
    actionBtnText: {
      ...Typography.caption,
      fontWeight: '700',
    },
    iconOnlyBtn: {
      width: 38,
      height: 38,
      borderRadius: Radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
    },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: Radius.pill,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterChipText: {
      ...Typography.caption,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    logCard: {
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      marginBottom: Spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      ...Shadows.card,
    },
    logHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: Radius.pill,
    },
    statusBadgeText: {
      fontSize: 11,
      fontWeight: '700',
    },
    timeText: {
      ...Typography.caption,
      color: colors.textMuted,
    },
    pkgText: {
      ...Typography.caption,
      fontWeight: '700',
      color: colors.text,
      marginBottom: Spacing.xs,
    },
    reasonText: {
      ...Typography.body,
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 6,
    },
    amountText: {
      ...Typography.caption,
      fontWeight: '700',
      color: colors.primary,
      marginBottom: 6,
    },
    previewBox: {
      backgroundColor: colors.surfaceSecondary,
      borderRadius: Radius.sm,
      padding: Spacing.sm,
    },
    previewText: {
      ...Typography.caption,
      color: colors.textSecondary,
      lineHeight: 17,
    },
  });
