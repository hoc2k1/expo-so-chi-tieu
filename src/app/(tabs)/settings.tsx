import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Updates from 'expo-updates';
import { useApp } from '../../contexts/AppContext';
import { StorageService } from '../../services/storage';
import { exportTransactionsToCsv } from '../../services/csvExporter';
import { formatDateTime } from '../../utils/formatters';
import { ConfirmModal } from '../../components/ConfirmModal';
import { GardenSprouts } from '../../components/GardenDecor';
import { OtaHistoryModal } from '../../components/OtaHistoryModal';
import { SettingRow } from '../../components/ui/SettingRow';
import {
  useTheme,
  ThemeColors,
  Spacing,
  Radius,
  Typography,
  TouchTarget,
  Shadows,
} from '../../constants/theme';

export default function SettingsScreen() {
  const {
    settings,
    updateSettings,
    transactions,
    refreshAllData,
    isPermissionGranted,
    isBatteryOptimizationIgnored,
    isPostNotificationGranted,
    isServiceConnected,
    requestPermission,
    requestIgnoreBatteryOptimization,
    requestPostNotificationPermission,
    showToast,
  } = useApp();

  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [isExporting, setIsExporting] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateStatusText, setUpdateStatusText] = useState<string>('');
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [confirmOtaReload, setConfirmOtaReload] = useState(false);
  const [confirmRestoreContent, setConfirmRestoreContent] = useState<string | null>(null);

  const handleCheckAndApplyUpdate = async () => {
    if (Platform.OS === 'web') {
      showToast('Cập nhật OTA chỉ áp dụng trên ứng dụng Android/iOS', 'info');
      return;
    }

    if (__DEV__ || !Updates.isEnabled) {
      showToast('Đang ở chế độ Development (chưa bật OTA)', 'info');
      return;
    }

    try {
      setIsCheckingUpdate(true);
      setUpdateStatusText('Đang kiểm tra bản cập nhật trên máy chủ Expo...');

      const update = await Updates.checkForUpdateAsync();

      if (!update.isAvailable) {
        setUpdateStatusText('Bạn đang sử dụng phiên bản mới nhất!');
        showToast('Bạn đang sử dụng phiên bản mới nhất!', 'info');
        return;
      }

      setUpdateStatusText('Phát hiện bản cập nhật mới! Đang tải về máy...');
      const fetched = await Updates.fetchUpdateAsync();

      if (fetched.isNew) {
        const newEntry = {
          id: `upd_${Date.now()}`,
          updateId: (fetched.manifest as any)?.id || `ota_${Date.now()}`,
          channel: Updates.channel || 'preview',
          runtimeVersion: Updates.runtimeVersion || '1.0.0',
          appliedAt: new Date().toISOString(),
          note:
            (fetched.manifest as any)?.extra?.expoClient?.name ||
            'Bản cập nhật OTA mới từ EAS Update',
        };
        const currentHistory = settings.updateHistory || [];
        await updateSettings({
          updateHistory: [newEntry, ...currentHistory].slice(0, 20),
        });

        setUpdateStatusText('Đã tải xong bản cập nhật mới!');
        setConfirmOtaReload(true);
      } else {
        setUpdateStatusText('Không có thay đổi mới.');
      }
    } catch (e: any) {
      setUpdateStatusText('');
      showToast(e.message || 'Không thể kết nối tới máy chủ EAS Update.', 'error');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleExportJson = async () => {
    try {
      setIsExporting(true);
      const jsonBackup = await StorageService.exportAllData();

      if (Platform.OS === 'web') {
        const blob = new Blob([jsonBackup], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `so_chi_tieu_backup_${Date.now()}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Đã tải xuống file sao lưu JSON', 'success');
        return;
      }

      const filename = `so_chi_tieu_backup_${Date.now()}.json`;
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, jsonBackup);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Sao lưu dữ liệu Sổ Chi Tiêu (JSON)',
        });
        showToast('Đã xuất file sao lưu JSON thành công!', 'success');
      } else {
        showToast(`Đã lưu file sao lưu tại: ${fileUri}`, 'info');
      }
    } catch (e: any) {
      showToast(e.message || 'Không thể tạo file sao lưu', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportJson = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const fileAsset = result.assets[0];
      const content = await FileSystem.readAsStringAsync(fileAsset.uri);
      setConfirmRestoreContent(content);
    } catch (e: any) {
      showToast(e.message || 'Không thể đọc file sao lưu', 'error');
    }
  };

  const handleExecuteRestore = async () => {
    if (!confirmRestoreContent) return;
    const content = confirmRestoreContent;
    setConfirmRestoreContent(null);
    const success = await StorageService.importAllData(content);
    if (success) {
      await refreshAllData();
      showToast('Đã khôi phục toàn bộ dữ liệu thành công!', 'success');
    } else {
      showToast('File JSON không đúng định dạng sao lưu của ứng dụng', 'error');
    }
  };

  const handleExportCsv = async () => {
    try {
      if (transactions.length === 0) {
        showToast('Chưa có giao dịch nào để xuất file', 'info');
        return;
      }
      await exportTransactionsToCsv(transactions);
      showToast('Đã xuất bảng tính Excel (CSV) thành công!', 'success');
    } catch (e: any) {
      showToast(e.message || 'Không thể xuất file Excel', 'error');
    }
  };

  const updateHistory = settings.updateHistory || [];

  const renderGrantButton = (label: string, onPress: () => void) => (
    <Pressable
      style={({ pressed }) => [styles.grantBtn, pressed && { opacity: 0.85 }]}
      onPress={onPress}
    >
      <Text style={styles.grantBtnText}>{label}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Android Notification & Background Permissions */}
        {Platform.OS === 'android' && (
          <View style={styles.groupWrapper}>
            <Text style={styles.groupOverline}>QUYỀN HỆ THỐNG & CHẠY NGẦM</Text>
            <View style={{ position: 'relative', overflow: 'visible' }}>
              <GardenSprouts variant="minimal" />
              <View style={styles.groupedCard}>
                <SettingRow
                  icon={isPermissionGranted ? 'checkmark-circle' : 'alert-circle'}
                  iconColor={isPermissionGranted ? colors.income : colors.warning}
                  iconBg={isPermissionGranted ? colors.incomeSoft : colors.warningSoft}
                  title="Trạng thái lắng nghe ngầm"
                  subtitle={
                    isPermissionGranted
                      ? 'Đã cấp quyền đọc thông báo (hoạt động cả khi tắt app)'
                      : 'Chưa cấp quyền đọc thông báo'
                  }
                  rightElement={
                    !isPermissionGranted
                      ? renderGrantButton('Cấp quyền', requestPermission)
                      : undefined
                  }
                />

                <SettingRow
                  icon={isBatteryOptimizationIgnored ? 'battery-charging' : 'battery-half'}
                  iconColor={isBatteryOptimizationIgnored ? colors.income : colors.warning}
                  iconBg={
                    isBatteryOptimizationIgnored ? colors.incomeSoft : colors.warningSoft
                  }
                  title="Chạy ngầm không giới hạn pin"
                  subtitle={
                    isBatteryOptimizationIgnored
                      ? 'Đã tắt tiết kiệm pin (không bị đóng băng khi tắt app)'
                      : 'Nên bật để tránh máy tự tắt dịch vụ khi khóa màn hình'
                  }
                  rightElement={
                    !isBatteryOptimizationIgnored
                      ? renderGrantButton('Cho phép', requestIgnoreBatteryOptimization)
                      : undefined
                  }
                />

                <SettingRow
                  icon={
                    isPostNotificationGranted
                      ? 'notifications'
                      : 'notifications-off-outline'
                  }
                  iconColor={isPostNotificationGranted ? colors.income : colors.warning}
                  iconBg={isPostNotificationGranted ? colors.incomeSoft : colors.warningSoft}
                  title="Bubble số chờ ngoài icon app"
                  subtitle={
                    isPostNotificationGranted
                      ? 'Đã cấp quyền thông báo (hiện số giao dịch chờ, tối đa 99+)'
                      : 'Cần cấp quyền để hiện số lượng thông báo chờ ngoài biểu tượng'
                  }
                  rightElement={
                    !isPostNotificationGranted
                      ? renderGrantButton('Bật ngay', requestPostNotificationPermission)
                      : undefined
                  }
                />

                <SettingRow
                  icon="bug-outline"
                  iconColor={colors.info}
                  iconBg={colors.infoSoft}
                  title="Nhật ký kiểm tra thông báo"
                  subtitle={
                    isServiceConnected
                      ? 'Dịch vụ đang kết nối • Xem chi tiết thông báo nhận / bị bỏ qua'
                      : 'Chạm để kiểm tra lý do rớt thông báo & kết nối lại dịch vụ'
                  }
                  onPress={() => router.push('/modal/notification-logs')}
                  showChevron
                  isLast
                />
              </View>
            </View>
          </View>
        )}

        {/* Smart Categorization & Anti-Duplicate */}
        <View style={styles.groupWrapper}>
          <Text style={styles.groupOverline}>CHỐNG TRÙNG & GỢI Ý THÔNG MINH</Text>
          <View style={{ position: 'relative', overflow: 'visible' }}>
            <GardenSprouts variant="minimal" />
            <View style={styles.groupedCard}>
              <SettingRow
                icon="sparkles"
                iconColor={colors.primary}
                iconBg={colors.primarySoft}
                title="Tự động gợi ý theo từ khóa"
                subtitle="Khớp từ khóa trong tin nhắn để tự điền Loại & Ghi chú"
                rightElement={
                  <Switch
                    value={settings.autoCategorizeEnabled}
                    onValueChange={(val) => {
                      updateSettings({ autoCategorizeEnabled: val });
                      showToast(
                        val
                          ? 'Đã bật tự động gợi ý theo từ khóa'
                          : 'Đã tắt tự động gợi ý',
                        'info'
                      );
                    }}
                    trackColor={{ false: colors.switchTrackOff, true: colors.income }}
                    thumbColor={colors.onPrimary}
                  />
                }
              />

              <View style={styles.windowSection}>
                <View style={styles.windowHeader}>
                  <View style={[styles.rowIconBox, { backgroundColor: colors.warningSoft }]}>
                    <Ionicons name="timer-outline" size={18} color={colors.warning} />
                  </View>
                  <View style={styles.rowTexts}>
                    <Text style={styles.rowTitle}>Khoảng thời gian cảnh báo trùng</Text>
                    <Text style={styles.rowSubtitle}>
                      Cảnh báo nếu có giao dịch trùng Ngân hàng + Số tiền
                    </Text>
                  </View>
                </View>
                <View style={styles.windowPills}>
                  {[1, 3, 5, 10].map((mins) => {
                    const active = settings.duplicateWindowMinutes === mins;
                    return (
                      <Pressable
                        key={mins}
                        style={[styles.windowPill, active && styles.windowPillActive]}
                        onPress={() => {
                          updateSettings({ duplicateWindowMinutes: mins });
                          showToast(
                            `Đã đổi thời gian cảnh báo trùng thành ${mins} phút`,
                            'info'
                          );
                        }}
                      >
                        <Text
                          style={[
                            styles.windowPillText,
                            active && styles.windowPillTextActive,
                          ]}
                        >
                          {mins} phút
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Backup, Restore & Export */}
        <View style={styles.groupWrapper}>
          <Text style={styles.groupOverline}>SAO LƯU & XUẤT DỮ LIỆU</Text>
          <View style={{ position: 'relative', overflow: 'visible' }}>
            <GardenSprouts variant="minimal" />
            <View style={styles.groupedCard}>
              <SettingRow
                icon="cloud-upload"
                iconColor={colors.info}
                iconBg={colors.infoSoft}
                title="Sao lưu toàn bộ (JSON)"
                subtitle="Lưu trữ mọi giao dịch, danh mục, quy tắc vào file JSON"
                onPress={handleExportJson}
                disabled={isExporting}
                showChevron
              />

              <SettingRow
                icon="cloud-download"
                iconColor={colors.income}
                iconBg={colors.incomeSoft}
                title="Khôi phục từ file JSON"
                subtitle="Nạp lại dữ liệu từ file sao lưu trên máy"
                onPress={handleImportJson}
                showChevron
              />

              <SettingRow
                icon="document-attach"
                iconColor={colors.warning}
                iconBg={colors.warningSoft}
                title="Xuất bảng tính Excel (CSV)"
                subtitle="Mã hóa UTF-8 BOM hiển thị chuẩn tiếng Việt trên Excel"
                onPress={handleExportCsv}
                showChevron
                isLast
              />
            </View>
          </View>
        </View>

        {/* OTA Update */}
        <View style={styles.groupWrapper}>
          <Text style={styles.groupOverline}>CẬP NHẬT ỨNG DỤNG (EXPO EAS)</Text>
          <View style={styles.groupedCardPad}>
            <GardenSprouts variant="minimal" />
            <View style={styles.updateInfoBox}>
              <View style={styles.updateInfoRow}>
                <Text style={styles.updateInfoLabel}>Phiên bản Runtime</Text>
                <Text style={styles.updateInfoValue}>
                  {Updates.runtimeVersion || '1.0.0'} ({Updates.channel || 'preview'})
                </Text>
              </View>
              <View style={styles.updateInfoRow}>
                <Text style={styles.updateInfoLabel}>Bản chạy hiện tại</Text>
                <Text style={styles.updateInfoValue} numberOfLines={1}>
                  {Updates.updateId
                    ? Updates.updateId.slice(0, 18) + '...'
                    : 'Bản gốc (Embedded)'}
                </Text>
              </View>
              {Updates.createdAt && (
                <View style={[styles.updateInfoRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.updateInfoLabel}>Phát hành lúc</Text>
                  <Text style={styles.updateInfoValue}>
                    {formatDateTime(Updates.createdAt.getTime())}
                  </Text>
                </View>
              )}
            </View>

            {updateStatusText ? (
              <Text style={styles.updateStatusBanner}>{updateStatusText}</Text>
            ) : null}

            <View style={styles.updateButtonsRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.checkUpdateBtn,
                  pressed && { opacity: 0.85 },
                ]}
                onPress={handleCheckAndApplyUpdate}
                disabled={isCheckingUpdate}
              >
                <GardenSprouts variant="chip" align="left" />
                {isCheckingUpdate ? (
                  <ActivityIndicator size="small" color={colors.onPrimary} />
                ) : (
                  <Ionicons
                    name="cloud-download-outline"
                    size={18}
                    color={colors.onPrimary}
                  />
                )}
                <Text style={styles.checkUpdateBtnText}>
                  {isCheckingUpdate ? 'Đang kiểm tra...' : 'Kiểm tra cập nhật'}
                </Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.historyUpdateBtn,
                  pressed && { opacity: 0.78 },
                ]}
                onPress={() => setShowUpdateModal(true)}
              >
                <GardenSprouts variant="chip" align="right" />
                <Ionicons name="list-outline" size={18} color={colors.primary} />
                <Text style={styles.historyUpdateBtnText}>Lịch sử</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* App Info Footer */}
        <View style={styles.appInfoSection}>
          <Text style={styles.appName}>Sổ Chi Tiêu v1.0.0</Text>
          <Text style={styles.appDetails}>
            Lưu trữ cục bộ an toàn • Hỗ trợ OTA qua Expo EAS
          </Text>
        </View>
      </ScrollView>

      <OtaHistoryModal
        visible={showUpdateModal}
        updateHistory={updateHistory}
        onClose={() => setShowUpdateModal(false)}
        onCheckUpdate={handleCheckAndApplyUpdate}
      />

      <ConfirmModal
        visible={confirmOtaReload}
        title="Cập nhật thành công!"
        message="Bản cập nhật mới đã được tải về máy hoàn tất. Khởi động lại ứng dụng ngay để áp dụng thay đổi?"
        confirmText="Khởi động lại ngay"
        cancelText="Để sau"
        type="info"
        onCancel={() => setConfirmOtaReload(false)}
        onConfirm={async () => {
          setConfirmOtaReload(false);
          await Updates.reloadAsync();
        }}
      />

      <ConfirmModal
        visible={!!confirmRestoreContent}
        title="Xác nhận khôi phục dữ liệu"
        message="Khôi phục sẽ ghi đè toàn bộ dữ liệu hiện tại bằng dữ liệu từ file sao lưu. Bạn có chắc muốn tiếp tục không?"
        confirmText="Khôi phục ngay"
        cancelText="Hủy"
        type="danger"
        onCancel={() => setConfirmRestoreContent(null)}
        onConfirm={handleExecuteRestore}
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
    scrollView: {
      flex: 1,
    },
    content: {
      padding: Spacing.base,
      paddingBottom: Spacing.xxxl,
      gap: Spacing.lg,
    },
    groupWrapper: {
      gap: Spacing.sm,
    },
    groupOverline: {
      ...Typography.overline,
      color: colors.textMuted,
      paddingHorizontal: Spacing.xs,
    },
    groupedCard: {
      backgroundColor: colors.surface,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      ...Shadows.card,
    },
    groupedCardPad: {
      backgroundColor: colors.surface,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      padding: Spacing.base,
      gap: Spacing.md,
      ...Shadows.card,
    },
    rowIconBox: {
      width: 38,
      height: 38,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowTexts: {
      flex: 1,
      gap: 2,
    },
    rowTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    rowSubtitle: {
      color: colors.textSecondary,
      fontSize: 12,
      lineHeight: 16,
    },
    grantBtn: {
      backgroundColor: colors.warning,
      paddingHorizontal: Spacing.md,
      minHeight: TouchTarget.minSize - 6,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    grantBtnText: {
      color: colors.onPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    windowSection: {
      padding: Spacing.base,
      gap: Spacing.md,
    },
    windowHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    windowPills: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    windowPill: {
      flex: 1,
      minHeight: TouchTarget.minSize - 4,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceSecondary,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    windowPillActive: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.primary,
    },
    windowPillText: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '600',
    },
    windowPillTextActive: {
      color: colors.primary,
      fontWeight: '700',
    },
    updateInfoBox: {
      backgroundColor: colors.surfaceSecondary,
      borderRadius: Radius.lg,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
    },
    updateInfoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    updateInfoLabel: {
      color: colors.textSecondary,
      fontSize: 12,
    },
    updateInfoValue: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '600',
      maxWidth: '58%',
    },
    updateStatusBanner: {
      color: colors.info,
      fontSize: 12,
      fontWeight: '600',
      textAlign: 'center',
    },
    updateButtonsRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    checkUpdateBtn: {
      flex: 2,
      minHeight: TouchTarget.minSize,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      borderRadius: Radius.md,
      gap: 6,
    },
    checkUpdateBtnText: {
      color: colors.onPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
    historyUpdateBtn: {
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
    historyUpdateBtnText: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '700',
    },
    appInfoSection: {
      alignItems: 'center',
      paddingVertical: Spacing.sm,
      gap: Spacing.xs,
    },
    appName: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '700',
    },
    appDetails: {
      color: colors.textMuted,
      fontSize: 12,
    },
  });
