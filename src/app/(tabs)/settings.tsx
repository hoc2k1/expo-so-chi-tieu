import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Updates from 'expo-updates';
import { useApp } from '../../contexts/AppContext';
import { StorageService } from '../../services/storage';
import { exportTransactionsToCsv } from '../../services/csvExporter';
import { formatDateTime } from '../../utils/formatters';
import { ConfirmModal } from '../../components/ConfirmModal';
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
    requestPermission,
    requestIgnoreBatteryOptimization,
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
            <View style={styles.groupedCard}>
              <View style={styles.row}>
                <View
                  style={[
                    styles.rowIconBox,
                    {
                      backgroundColor: isPermissionGranted
                        ? colors.incomeSoft
                        : colors.warningSoft,
                    },
                  ]}
                >
                  <Ionicons
                    name={isPermissionGranted ? 'checkmark-circle' : 'alert-circle'}
                    size={20}
                    color={isPermissionGranted ? colors.income : colors.warning}
                  />
                </View>
                <View style={styles.rowTexts}>
                  <Text style={styles.rowTitle}>Trạng thái lắng nghe ngầm</Text>
                  <Text style={styles.rowSubtitle}>
                    {isPermissionGranted
                      ? 'Đã cấp quyền đọc thông báo (hoạt động cả khi tắt app)'
                      : 'Chưa cấp quyền đọc thông báo'}
                  </Text>
                </View>
                {!isPermissionGranted && (
                  <Pressable
                    style={({ pressed }) => [
                      styles.grantBtn,
                      pressed && { opacity: 0.85 },
                    ]}
                    onPress={() => requestPermission()}
                  >
                    <Text style={styles.grantBtnText}>Cấp quyền</Text>
                  </Pressable>
                )}
              </View>

              <View style={[styles.row, styles.rowLast]}>
                <View
                  style={[
                    styles.rowIconBox,
                    {
                      backgroundColor: isBatteryOptimizationIgnored
                        ? colors.incomeSoft
                        : colors.warningSoft,
                    },
                  ]}
                >
                  <Ionicons
                    name={isBatteryOptimizationIgnored ? 'battery-charging' : 'battery-half'}
                    size={20}
                    color={isBatteryOptimizationIgnored ? colors.income : colors.warning}
                  />
                </View>
                <View style={styles.rowTexts}>
                  <Text style={styles.rowTitle}>Chạy ngầm không giới hạn pin</Text>
                  <Text style={styles.rowSubtitle}>
                    {isBatteryOptimizationIgnored
                      ? 'Đã tắt tiết kiệm pin (không bị đóng băng khi tắt app)'
                      : 'Nên bật để tránh máy tự tắt dịch vụ khi khóa màn hình'}
                  </Text>
                </View>
                {!isBatteryOptimizationIgnored && (
                  <Pressable
                    style={({ pressed }) => [
                      styles.grantBtn,
                      pressed && { opacity: 0.85 },
                    ]}
                    onPress={() => requestIgnoreBatteryOptimization()}
                  >
                    <Text style={styles.grantBtnText}>Cho phép</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Smart Categorization & Anti-Duplicate */}
        <View style={styles.groupWrapper}>
          <Text style={styles.groupOverline}>CHỐNG TRÙNG & GỢI Ý THÔNG MINH</Text>
          <View style={styles.groupedCard}>
            <View style={styles.row}>
              <View style={[styles.rowIconBox, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name="sparkles" size={18} color={colors.primary} />
              </View>
              <View style={styles.rowTexts}>
                <Text style={styles.rowTitle}>Tự động gợi ý theo từ khóa</Text>
                <Text style={styles.rowSubtitle}>
                  Khớp từ khóa trong tin nhắn để tự điền Loại & Ghi chú
                </Text>
              </View>
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
                thumbColor="#FFFFFF"
              />
            </View>

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

        {/* Backup, Restore & Export */}
        <View style={styles.groupWrapper}>
          <Text style={styles.groupOverline}>SAO LƯU & XUẤT DỮ LIỆU</Text>
          <View style={styles.groupedCard}>
            <Pressable
              style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.75 }]}
              onPress={handleExportJson}
              disabled={isExporting}
            >
              <View style={[styles.rowIconBox, { backgroundColor: colors.infoSoft }]}>
                <Ionicons name="cloud-upload" size={18} color={colors.info} />
              </View>
              <View style={styles.rowTexts}>
                <Text style={styles.rowTitle}>Sao lưu toàn bộ (JSON)</Text>
                <Text style={styles.rowSubtitle}>
                  Lưu trữ mọi giao dịch, danh mục, quy tắc vào file JSON
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.75 }]}
              onPress={handleImportJson}
            >
              <View style={[styles.rowIconBox, { backgroundColor: colors.incomeSoft }]}>
                <Ionicons name="cloud-download" size={18} color={colors.income} />
              </View>
              <View style={styles.rowTexts}>
                <Text style={styles.rowTitle}>Khôi phục từ file JSON</Text>
                <Text style={styles.rowSubtitle}>
                  Nạp lại dữ liệu từ file sao lưu trên máy
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.actionRow,
                styles.rowLast,
                pressed && { opacity: 0.75 },
              ]}
              onPress={handleExportCsv}
            >
              <View style={[styles.rowIconBox, { backgroundColor: colors.warningSoft }]}>
                <Ionicons name="document-attach" size={18} color={colors.warning} />
              </View>
              <View style={styles.rowTexts}>
                <Text style={styles.rowTitle}>Xuất bảng tính Excel (CSV)</Text>
                <Text style={styles.rowSubtitle}>
                  Mã hóa UTF-8 BOM hiển thị chuẩn tiếng Việt trên Excel
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          </View>
        </View>

        {/* OTA Update */}
        <View style={styles.groupWrapper}>
          <Text style={styles.groupOverline}>CẬP NHẬT ỨNG DỤNG (EXPO EAS)</Text>
          <View style={styles.groupedCardPad}>
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

      {/* OTA History Modal */}
      <Modal
        visible={showUpdateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUpdateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Lịch sử cập nhật OTA</Text>
              <Pressable
                style={styles.modalCloseBtn}
                onPress={() => setShowUpdateModal(false)}
                hitSlop={TouchTarget.hitSlop}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.currentBuildBox}>
              <Text style={styles.currentBuildTitle}>Phiên bản đang chạy</Text>
              <Text style={styles.currentBuildDetail}>
                • Kênh: {Updates.channel || 'preview'}
              </Text>
              <Text style={styles.currentBuildDetail}>
                • Runtime Version: {Updates.runtimeVersion || '1.0.0'}
              </Text>
              <Text style={styles.currentBuildDetail}>
                • Update ID: {Updates.updateId || 'Embedded (Bản gốc)'}
              </Text>
              <Text style={styles.currentBuildDetail}>
                • Khởi chạy từ APK gốc: {Updates.isEmbeddedLaunch ? 'Có' : 'Không (OTA)'}
              </Text>
            </View>

            <Text style={styles.historySectionTitle}>
              Các bản cập nhật đã tải ({updateHistory.length})
            </Text>

            <ScrollView style={styles.historyList}>
              {updateHistory.length === 0 ? (
                <Text style={styles.emptyHistoryText}>
                  Chưa có lịch sử bản cập nhật OTA nào trên thiết bị này.
                </Text>
              ) : (
                updateHistory.map((item, idx) => (
                  <View key={item.id} style={styles.historyItem}>
                    <View style={styles.historyItemHeader}>
                      <Text style={styles.historyItemBadge}>
                        #{updateHistory.length - idx} • {item.channel}
                      </Text>
                      <Text style={styles.historyItemTime}>
                        {formatDateTime(item.appliedAt)}
                      </Text>
                    </View>
                    <Text style={styles.historyItemId}>ID: {item.updateId}</Text>
                    {item.note && <Text style={styles.historyItemNote}>{item.note}</Text>}
                  </View>
                ))
              )}
            </ScrollView>

            <Pressable
              style={({ pressed }) => [
                styles.modalCheckBtn,
                pressed && { opacity: 0.85 },
              ]}
              onPress={() => {
                setShowUpdateModal(false);
                handleCheckAndApplyUpdate();
              }}
            >
              <Ionicons name="refresh" size={16} color={colors.onPrimary} />
              <Text style={styles.modalCheckBtnText}>Kiểm tra bản cập nhật mới</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

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
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.base,
      paddingVertical: Spacing.md,
      minHeight: 62,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
      gap: Spacing.md,
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.base,
      paddingVertical: Spacing.md,
      minHeight: 64,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
      gap: Spacing.md,
    },
    rowLast: {
      borderBottomWidth: 0,
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
      color: '#FFFFFF',
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
      gap: 4,
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
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.scrim,
      justifyContent: 'center',
      alignItems: 'center',
      padding: Spacing.lg,
    },
    modalCard: {
      width: '100%',
      maxWidth: 420,
      maxHeight: '82%',
      backgroundColor: colors.surfaceElevated,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      padding: Spacing.lg,
      gap: Spacing.md,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    modalTitle: {
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
    currentBuildBox: {
      backgroundColor: colors.surfaceSecondary,
      borderRadius: Radius.md,
      padding: Spacing.md,
      gap: 4,
    },
    currentBuildTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 2,
    },
    currentBuildDetail: {
      color: colors.textSecondary,
      fontSize: 12,
    },
    historySectionTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    historyList: {
      maxHeight: 220,
    },
    emptyHistoryText: {
      color: colors.textSecondary,
      fontSize: 13,
      textAlign: 'center',
      paddingVertical: Spacing.lg,
    },
    historyItem: {
      backgroundColor: colors.surfaceSecondary,
      borderRadius: Radius.md,
      padding: Spacing.md,
      marginBottom: Spacing.sm,
      gap: 4,
    },
    historyItemHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    historyItemBadge: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '700',
    },
    historyItemTime: {
      color: colors.textMuted,
      fontSize: 11,
    },
    historyItemId: {
      color: colors.textSecondary,
      fontSize: 11,
    },
    historyItemNote: {
      color: colors.text,
      fontSize: 12,
    },
    modalCheckBtn: {
      minHeight: TouchTarget.minSize,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      borderRadius: Radius.md,
      gap: 6,
    },
    modalCheckBtnText: {
      color: colors.onPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
  });
