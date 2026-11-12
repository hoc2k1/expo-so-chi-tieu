import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../contexts/AppContext';
import { SUPPORTED_APPS } from '../../constants/defaultData';

export default function AppsManagerModal() {
  const { settings, updateSettings } = useApp();

  const [customPackage, setCustomPackage] = useState('');

  const isEnabled = (pkg: string) => {
    return settings.enabledPackages.some((p) => p.toLowerCase() === pkg.toLowerCase());
  };

  const toggleApp = (pkg: string) => {
    let updated: string[];
    if (isEnabled(pkg)) {
      updated = settings.enabledPackages.filter((p) => p.toLowerCase() !== pkg.toLowerCase());
    } else {
      updated = [...settings.enabledPackages, pkg];
    }
    updateSettings({ enabledPackages: updated });
  };

  const enableAll = () => {
    const all = Array.from(
      new Set([...settings.enabledPackages, ...SUPPORTED_APPS.map((a) => a.packageName)])
    );
    updateSettings({ enabledPackages: all });
  };

  const disableAll = () => {
    updateSettings({ enabledPackages: [] });
  };

  const handleAddCustom = () => {
    if (!customPackage.trim()) {
      Alert.alert('Chưa nhập package name', 'Vui lòng nhập package name (VD: com.mybank.app)');
      return;
    }
    const clean = customPackage.trim();
    if (!isEnabled(clean)) {
      updateSettings({ enabledPackages: [...settings.enabledPackages, clean] });
    }
    setCustomPackage('');
    Alert.alert('Thành công', `Đã thêm package ${clean} vào danh sách lắng nghe.`);
  };

  const banks = SUPPORTED_APPS.filter((a) => a.category === 'bank');
  const wallets = SUPPORTED_APPS.filter((a) => a.category === 'wallet');
  const others = SUPPORTED_APPS.filter((a) => a.category === 'email_sms');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header controls */}
      <View style={styles.topBar}>
        <Text style={styles.countText}>
          Đang bật: {settings.enabledPackages.length} ứng dụng
        </Text>
        <View style={styles.topBtns}>
          <TouchableOpacity style={styles.quickBtn} onPress={enableAll}>
            <Text style={styles.quickBtnText}>Bật tất cả</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={disableAll}>
            <Text style={styles.quickBtnText}>Tắt tất cả</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Banks */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ngân hàng phổ biến ({banks.length})</Text>
        {banks.map((app) => (
          <View key={app.packageName} style={styles.appRow}>
            <View style={[styles.appIconBox, { backgroundColor: `${app.color}25` }]}>
              <Ionicons name="business" size={18} color={app.color} />
            </View>
            <View style={styles.appTexts}>
              <Text style={styles.appName}>{app.name}</Text>
              <Text style={styles.appPackage}>{app.packageName}</Text>
            </View>
            <Switch
              value={isEnabled(app.packageName)}
              onValueChange={() => toggleApp(app.packageName)}
              trackColor={{ false: '#334155', true: '#10B981' }}
              thumbColor="#FFFFFF"
            />
          </View>
        ))}
      </View>

      {/* Wallets */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ví điện tử ({wallets.length})</Text>
        {wallets.map((app) => (
          <View key={app.packageName} style={styles.appRow}>
            <View style={[styles.appIconBox, { backgroundColor: `${app.color}25` }]}>
              <Ionicons name="wallet" size={18} color={app.color} />
            </View>
            <View style={styles.appTexts}>
              <Text style={styles.appName}>{app.name}</Text>
              <Text style={styles.appPackage}>{app.packageName}</Text>
            </View>
            <Switch
              value={isEnabled(app.packageName)}
              onValueChange={() => toggleApp(app.packageName)}
              trackColor={{ false: '#334155', true: '#10B981' }}
              thumbColor="#FFFFFF"
            />
          </View>
        ))}
      </View>

      {/* Email & SMS */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Email & Tin nhắn SMS</Text>
        <Text style={styles.sectionSubtitle}>
          Dành cho trường hợp bạn nhận thông báo biến động số dư qua Gmail hoặc tin nhắn SMS
        </Text>
        {others.map((app) => (
          <View key={app.packageName} style={styles.appRow}>
            <View style={[styles.appIconBox, { backgroundColor: `${app.color}25` }]}>
              <Ionicons name={app.icon as any} size={18} color={app.color} />
            </View>
            <View style={styles.appTexts}>
              <Text style={styles.appName}>{app.name}</Text>
              <Text style={styles.appPackage}>{app.packageName}</Text>
            </View>
            <Switch
              value={isEnabled(app.packageName)}
              onValueChange={() => toggleApp(app.packageName)}
              trackColor={{ false: '#334155', true: '#10B981' }}
              thumbColor="#FFFFFF"
            />
          </View>
        ))}
      </View>

      {/* Add Custom Package */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Thêm App khác theo Package Name</Text>
        <TextInput
          style={styles.textInput}
          placeholder="VD: com.mybank.app..."
          placeholderTextColor="#64748B"
          value={customPackage}
          onChangeText={setCustomPackage}
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.addBtn} onPress={handleAddCustom}>
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Thêm vào danh sách theo dõi</Text>
        </TouchableOpacity>
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
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  countText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  topBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  quickBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  quickBtnText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  sectionSubtitle: {
    color: '#64748B',
    fontSize: 11,
    marginBottom: 10,
  },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  appIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  appTexts: {
    flex: 1,
    paddingRight: 8,
  },
  appName: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
  },
  appPackage: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 2,
  },
  textInput: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#F8FAFC',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 10,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 10,
    gap: 6,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});

