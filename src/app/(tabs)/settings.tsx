import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
  Modal,
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

  const [isExporting, setIsExporting] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateStatusText, setUpdateStatusText] = useState<string>('');
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  // Check & Apply OTA Update from Expo EAS Update
  const handleCheckAndApplyUpdate = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Thông báo', 'Cập nhật OTA (EAS Update) chỉ áp dụng trên ứng dụng Android/iOS.');
      return;
    }

    if (__DEV__ || !Updates.isEnabled) {
      Alert.alert(
        'Chế độ Development',
        'Bạn đang chạy ở chế độ phát triển (__DEV__) hoặc bản build chưa bật expo-updates. Trên bản APK chính thức (build qua EAS), nút này sẽ tải bản cập nhật OTA mới nhất từ EAS Update mà không cần cài lại APK.'
      );
      return;
    }

    try {
      setIsCheckingUpdate(true);
      setUpdateStatusText('Đang kiểm tra bản cập nhật trên máy chủ Expo...');

      const update = await Updates.checkForUpdateAsync();

      if (!update.isAvailable) {
        setUpdateStatusText('Bạn đang sử dụng phiên bản mới nhất!');
        Alert.alert(
          'Đã là bản mới nhất',
          `Không có bản cập nhật mới nào trên kênh "${Updates.channel || 'preview'}".`
        );
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
        Alert.alert(
          'Cập nhật thành công!',
          'Bản cập nhật mới đã được tải về hoàn tất. Khởi động lại ứng dụng ngay để áp dụng thay đổi?',
          [
            { text: 'Để sau', style: 'cancel' },
            {
              text: 'Khởi động lại ngay',
              onPress: async () => {
                await Updates.reloadAsync();
              },
            },
          ]
        );
      } else {
        setUpdateStatusText('Không có thay đổi mới.');
      }
    } catch (e: any) {
      setUpdateStatusText('');
      Alert.alert(
        'Lỗi kiểm tra cập nhật',
        e.message || 'Không thể kết nối tới máy chủ EAS Update.'
      );
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  // Export JSON Backup
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
      showToast('Không thể tạo file sao lưu', 'error');
      Alert.alert('Lỗi sao lưu', e.message || 'Không thể tạo file sao lưu.');
    } finally {
      setIsExporting(false);
    }
  };

  // Import JSON Backup
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

      Alert.alert(
        'Xác nhận khôi phục',
        'Khôi phục sẽ ghi đè dữ liệu hiện tại bằng dữ liệu từ file sao lưu. Bạn có muốn tiếp tục?',
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Khôi phục ngay',
            style: 'destructive',
            onPress: async () => {
              const success = await StorageService.importAllData(content);
              if (success) {
                await refreshAllData();
                showToast('Đã khôi phục toàn bộ dữ liệu thành công!', 'success');
              } else {
                showToast('File JSON không đúng định dạng sao lưu', 'error');
                Alert.alert('Thất bại', 'File JSON không đúng định dạng sao lưu của ứng dụng.');
              }
            },
          },
        ]
      );
    } catch (e: any) {
      showToast('Không thể đọc file sao lưu', 'error');
      Alert.alert('Lỗi khôi phục', e.message || 'Không thể đọc file sao lưu.');
    }
  };

  // Export CSV for Excel
  const handleExportCsv = async () => {
    try {
      if (transactions.length === 0) {
        showToast('Chưa có giao dịch nào để xuất file', 'info');
        return;
      }
      await exportTransactionsToCsv(transactions);
      showToast('Đã xuất bảng tính Excel (CSV) thành công!', 'success');
    } catch (e: any) {
      showToast('Không thể xuất file Excel', 'error');
      Alert.alert('Lỗi xuất Excel', e.message || 'Không thể xuất file.');
    }
  };

  const updateHistory = settings.updateHistory || [];

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Notification Access Android Check */}
        {Platform.OS === 'android' && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Quyền truy cập thông báo & Chạy ngầm</Text>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Ionicons
                  name={isPermissionGranted ? 'checkmark-circle' : 'alert-circle'}
                  size={22}
                  color={isPermissionGranted ? '#10B981' : '#F59E0B'}
                />
                <View style={styles.rowTexts}>
                  <Text style={styles.rowTitle}>Trạng thái lắng nghe ngầm</Text>
                  <Text style={styles.rowSubtitle}>
                    {isPermissionGranted
                      ? 'Đã cấp quyền đọc thông báo (hoạt động cả khi tắt app)'
                      : 'Chưa cấp quyền đọc thông báo'}
                  </Text>
                </View>
              </View>
              {!isPermissionGranted && (
                <TouchableOpacity style={styles.grantBtn} onPress={() => requestPermission()}>
                  <Text style={styles.grantBtnText}>Cấp quyền</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={[styles.row, { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#334155' }]}>
              <View style={styles.rowLeft}>
                <Ionicons
                  name={isBatteryOptimizationIgnored ? 'battery-charging' : 'battery-half'}
                  size={22}
                  color={isBatteryOptimizationIgnored ? '#10B981' : '#F59E0B'}
                />
                <View style={styles.rowTexts}>
                  <Text style={styles.rowTitle}>Chạy ngầm không giới hạn pin</Text>
                  <Text style={styles.rowSubtitle}>
                    {isBatteryOptimizationIgnored
                      ? 'Đã tắt tiết kiệm pin (không bị hệ điều hành đóng băng khi tắt app)'
                      : 'Nên bật để tránh máy tự tắt dịch vụ khi khóa màn hình hoặc vuốt app'}
                  </Text>
                </View>
              </View>
              {!isBatteryOptimizationIgnored && (
                <TouchableOpacity
                  style={styles.grantBtn}
                  onPress={() => requestIgnoreBatteryOptimization()}
                >
                  <Text style={styles.grantBtnText}>Cho phép</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Cập nhật ứng dụng OTA (EAS Update) */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Cập nhật ứng dụng (Expo EAS Update)</Text>

          <View style={styles.updateInfoBox}>
            <View style={styles.updateInfoRow}>
              <Text style={styles.updateInfoLabel}>Phiên bản Runtime:</Text>
              <Text style={styles.updateInfoValue}>
                {Updates.runtimeVersion || '1.0.0'} (Kênh: {Updates.channel || 'preview'})
              </Text>
            </View>
            <View style={styles.updateInfoRow}>
              <Text style={styles.updateInfoLabel}>Mã bản chạy hiện tại:</Text>
              <Text style={styles.updateInfoValue} numberOfLines={1}>
                {Updates.updateId
                  ? Updates.updateId.slice(0, 18) + '...'
                  : 'Bản gốc tích hợp (Embedded APK)'}
              </Text>
            </View>
            {Updates.createdAt && (
              <View style={styles.updateInfoRow}>
                <Text style={styles.updateInfoLabel}>Thời điểm phát hành:</Text>
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
            <TouchableOpacity
              style={styles.checkUpdateBtn}
              onPress={handleCheckAndApplyUpdate}
              disabled={isCheckingUpdate}
            >
              {isCheckingUpdate ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="cloud-download-outline" size={18} color="#FFFFFF" />
              )}
              <Text style={styles.checkUpdateBtnText}>
                {isCheckingUpdate ? 'Đang kiểm tra...' : 'Kiểm tra & Cập nhật ngay'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.historyUpdateBtn}
              onPress={() => setShowUpdateModal(true)}
            >
              <Ionicons name="list-outline" size={18} color="#38BDF8" />
              <Text style={styles.historyUpdateBtnText}>Xem các bản cập nhật</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quản lý danh mục & quy tắc */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Quản lý dữ liệu phân loại</Text>

          <TouchableOpacity
            style={styles.navRow}
            onPress={() => router.push('/modal/category-edit')}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="pricetags" size={20} color="#3B82F6" />
              <Text style={styles.rowTitle}>Danh mục Phân loại (Thu / Chi)</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#64748B" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navRow}
            onPress={() => router.push('/modal/note-edit')}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="document-text" size={20} color="#10B981" />
              <Text style={styles.rowTitle}>Danh sách Ghi chú mẫu</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#64748B" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navRow}
            onPress={() => router.push('/modal/rule-edit')}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="flash" size={20} color="#F59E0B" />
              <Text style={styles.rowTitle}>Quy tắc từ khóa gợi ý tự động</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#64748B" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navRow}
            onPress={() => router.push('/modal/apps-manager')}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="apps" size={20} color="#8B5CF6" />
              <Text style={styles.rowTitle}>Danh sách App Ngân hàng & Ví</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Cấu hình chống trùng & thông minh */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Cơ chế Chống trùng & Gợi ý</Text>

          <View style={styles.toggleRow}>
            <View style={styles.toggleTexts}>
              <Text style={styles.rowTitle}>Tự động gợi ý theo từ khóa</Text>
              <Text style={styles.rowSubtitle}>
                Khớp từ khóa trong tin nhắn để tự điền Loại & Ghi chú
              </Text>
            </View>
            <Switch
              value={settings.autoCategorizeEnabled}
              onValueChange={(val) => {
                updateSettings({ autoCategorizeEnabled: val });
                showToast(val ? 'Đã bật tự động gợi ý theo từ khóa' : 'Đã tắt tự động gợi ý', 'info');
              }}
              trackColor={{ false: '#334155', true: '#10B981' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.windowRow}>
            <View style={styles.toggleTexts}>
              <Text style={styles.rowTitle}>Khoảng thời gian cảnh báo trùng</Text>
              <Text style={styles.rowSubtitle}>
                Cảnh báo nếu có giao dịch trùng Ngân hàng + Số tiền trong khoảng này
              </Text>
            </View>
            <View style={styles.windowPills}>
              {[1, 3, 5, 10].map((mins) => {
                const active = settings.duplicateWindowMinutes === mins;
                return (
                  <TouchableOpacity
                    key={mins}
                    style={[styles.windowPill, active && styles.windowPillActive]}
                    onPress={() => {
                      updateSettings({ duplicateWindowMinutes: mins });
                      showToast(`Đã đổi thời gian cảnh báo trùng thành ${mins} phút`, 'info');
                    }}
                  >
                    <Text style={[styles.windowPillText, active && styles.windowPillTextActive]}>
                      {mins}p
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Sao lưu, Khôi phục & Xuất Excel */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Sao lưu & Xuất dữ liệu</Text>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleExportJson}
            disabled={isExporting}
          >
            <Ionicons name="cloud-upload" size={20} color="#38BDF8" />
            <View style={styles.actionBtnTexts}>
              <Text style={styles.actionBtnTitle}>Sao lưu toàn bộ (JSON)</Text>
              <Text style={styles.actionBtnSubtitle}>
                Lưu trữ mọi giao dịch, danh mục, quy tắc vào file JSON
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={handleImportJson}>
            <Ionicons name="cloud-download" size={20} color="#10B981" />
            <View style={styles.actionBtnTexts}>
              <Text style={styles.actionBtnTitle}>Khôi phục từ file JSON</Text>
              <Text style={styles.actionBtnSubtitle}>
                Nạp lại dữ liệu từ file sao lưu trên máy
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={handleExportCsv}>
            <Ionicons name="document-attach" size={20} color="#F59E0B" />
            <View style={styles.actionBtnTexts}>
              <Text style={styles.actionBtnTitle}>Xuất bảng tính Excel (CSV)</Text>
              <Text style={styles.actionBtnSubtitle}>
                Mã hóa UTF-8 BOM hiển thị chuẩn tiếng Việt trên Excel
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.appInfoSection}>
          <Text style={styles.appName}>Sổ Chi Tiêu v1.0.0</Text>
          <Text style={styles.appDetails}>Tài khoản EAS: hockt</Text>
          <Text style={styles.appDetails}>Hỗ trợ cập nhật OTA qua EAS Update</Text>
          <Text style={styles.appDetails}>Lưu trữ Cục bộ: File JSON (No DB)</Text>
        </View>
      </ScrollView>

      {/* Modal Xem Các Bản Cập Nhật */}
      <Modal
        visible={showUpdateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUpdateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Danh sách các bản cập nhật OTA</Text>
              <TouchableOpacity onPress={() => setShowUpdateModal(false)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <View style={styles.currentBuildBox}>
              <Text style={styles.currentBuildTitle}>Phiên bản đang chạy hiện tại</Text>
              <Text style={styles.currentBuildDetail}>
                • Kênh (Channel): {Updates.channel || 'preview'}
              </Text>
              <Text style={styles.currentBuildDetail}>
                • Runtime Version: {Updates.runtimeVersion || '1.0.0'}
              </Text>
              <Text style={styles.currentBuildDetail}>
                • Update ID: {Updates.updateId || 'Embedded (Bản APK gốc)'}
              </Text>
              <Text style={styles.currentBuildDetail}>
                • Khởi chạy từ APK gốc: {Updates.isEmbeddedLaunch ? 'Có' : 'Không (Đang chạy OTA)'}
              </Text>
            </View>

            <Text style={styles.historySectionTitle}>
              Lịch sử các bản cập nhật đã tải ({updateHistory.length})
            </Text>

            <ScrollView style={styles.historyList}>
              {updateHistory.length === 0 ? (
                <Text style={styles.emptyHistoryText}>
                  Chưa có lịch sử bản cập nhật OTA nào được ghi nhận trên thiết bị này.
                </Text>
              ) : (
                updateHistory.map((item, idx) => (
                  <View key={item.id} style={styles.historyItem}>
                    <View style={styles.historyItemHeader}>
                      <Text style={styles.historyItemBadge}>
                        #{updateHistory.length - idx} • Kênh {item.channel}
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

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCheckBtn}
                onPress={() => {
                  setShowUpdateModal(false);
                  handleCheckAndApplyUpdate();
                }}
              >
                <Ionicons name="refresh" size={16} color="#FFFFFF" />
                <Text style={styles.modalCheckBtnText}>Kiểm tra bản cập nhật mới</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 50,
  },
  section: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionHeader: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  rowTexts: {
    flex: 1,
  },
  rowTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
  },
  rowSubtitle: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  grantBtn: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  grantBtnText: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 12,
  },
  updateInfoBox: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 10,
    gap: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  updateInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  updateInfoLabel: {
    color: '#64748B',
    fontSize: 11,
  },
  updateInfoValue: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '600',
    maxWidth: '62%',
  },
  updateStatusBanner: {
    color: '#38BDF8',
    fontSize: 11,
    marginBottom: 10,
    fontWeight: '600',
  },
  updateButtonsRow: {
    flexDirection: 'column',
    gap: 8,
  },
  checkUpdateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  checkUpdateBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  historyUpdateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#38BDF860',
    gap: 8,
  },
  historyUpdateBtnText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  toggleTexts: {
    flex: 1,
    paddingRight: 12,
  },
  windowRow: {
    flexDirection: 'column',
    paddingVertical: 10,
    gap: 8,
  },
  windowPills: {
    flexDirection: 'row',
    gap: 8,
  },
  windowPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  windowPillActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  windowPillText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  windowPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    gap: 12,
  },
  actionBtnTexts: {
    flex: 1,
  },
  actionBtnTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
  },
  actionBtnSubtitle: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  appInfoSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  appName: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '700',
  },
  appDetails: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 18,
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  currentBuildBox: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#10B98150',
    gap: 4,
  },
  currentBuildTitle: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  currentBuildDetail: {
    color: '#CBD5E1',
    fontSize: 11,
  },
  historySectionTitle: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  historyList: {
    maxHeight: 220,
  },
  emptyHistoryText: {
    color: '#64748B',
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  historyItem: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  historyItemBadge: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  historyItemTime: {
    color: '#64748B',
    fontSize: 10,
  },
  historyItemId: {
    color: '#E2E8F0',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  historyItemNote: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  modalActions: {
    marginTop: 14,
  },
  modalCheckBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 11,
    borderRadius: 10,
    gap: 6,
  },
  modalCheckBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
