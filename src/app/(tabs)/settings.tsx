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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useApp } from '../../contexts/AppContext';
import { StorageService } from '../../services/storage';
import { exportTransactionsToCsv } from '../../services/csvExporter';

export default function SettingsScreen() {
  const {
    settings,
    updateSettings,
    transactions,
    refreshAllData,
    isPermissionGranted,
    requestPermission,
  } = useApp();

  const [isExporting, setIsExporting] = useState(false);

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
        Alert.alert('Thành công', 'Đã tải xuống file sao lưu JSON');
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
      } else {
        Alert.alert('Thông báo', `Đã lưu file sao lưu tại: ${fileUri}`);
      }
    } catch (e: any) {
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
                Alert.alert('Thành công', 'Đã khôi phục toàn bộ dữ liệu từ file sao lưu!');
              } else {
                Alert.alert('Thất bại', 'File JSON không đúng định dạng sao lưu của ứng dụng.');
              }
            },
          },
        ]
      );
    } catch (e: any) {
      Alert.alert('Lỗi khôi phục', e.message || 'Không thể đọc file sao lưu.');
    }
  };

  // Export CSV for Excel
  const handleExportCsv = async () => {
    try {
      if (transactions.length === 0) {
        Alert.alert('Thông báo', 'Chưa có giao dịch nào để xuất file Excel.');
        return;
      }
      await exportTransactionsToCsv(transactions);
    } catch (e: any) {
      Alert.alert('Lỗi xuất Excel', e.message || 'Không thể xuất file.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Notification Access Android Check */}
      {Platform.OS === 'android' && (
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Quyền truy cập thông báo</Text>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons
                name={isPermissionGranted ? 'checkmark-circle' : 'alert-circle'}
                size={22}
                color={isPermissionGranted ? '#10B981' : '#F59E0B'}
              />
              <View style={styles.rowTexts}>
                <Text style={styles.rowTitle}>Trạng thái lắng nghe</Text>
                <Text style={styles.rowSubtitle}>
                  {isPermissionGranted ? 'Đã cấp quyền đọc thông báo' : 'Chưa cấp quyền'}
                </Text>
              </View>
            </View>
            {!isPermissionGranted && (
              <TouchableOpacity style={styles.grantBtn} onPress={() => requestPermission()}>
                <Text style={styles.grantBtnText}>Cấp quyền</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

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
            onValueChange={(val) => updateSettings({ autoCategorizeEnabled: val })}
            trackColor={{ false: '#334155', true: '#10B981' }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.windowRow}>
          <View style={styles.toggleTexts}>
            <Text style={styles.rowTitle}>Khoảng thời gian cảnh báo trùng</Text>
            <Text style={styles.rowSubtitle}>
              Cảnh báo nếu có giao dịch cùng số tiền trong khoảng này
            </Text>
          </View>
          <View style={styles.windowPills}>
            {[1, 3, 5, 10].map((mins) => {
              const active = settings.duplicateWindowMinutes === mins;
              return (
                <TouchableOpacity
                  key={mins}
                  style={[styles.windowPill, active && styles.windowPillActive]}
                  onPress={() => updateSettings({ duplicateWindowMinutes: mins })}
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

      {/* App Info & Deployment Details */}
      <View style={styles.appInfoSection}>
        <Text style={styles.appName}>Sổ Chi Tiêu v1.0.0</Text>
        <Text style={styles.appDetails}>Tài khoản EAS: hockt</Text>
        <Text style={styles.appDetails}>Hỗ trợ cập nhật OTA qua EAS Update</Text>
        <Text style={styles.appDetails}>Lưu trữ Cục bộ: File JSON (No DB)</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
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
});
