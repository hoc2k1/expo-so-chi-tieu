import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../contexts/AppContext';
import { SUPPORTED_APPS } from '../../constants/defaultData';
import { SupportedApp } from '../../models/types';
import {
  KeyboardAwareScrollView,
  KeyboardAwareScrollViewRef,
} from '../../components/KeyboardAwareScrollView';
import { useTheme, ThemeColors } from '../../constants/theme';

export default function AppsManagerModal() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { settings, updateSettings, showToast } = useApp();
  const scrollViewRef = useRef<KeyboardAwareScrollViewRef>(null);

  const [customPackage, setCustomPackage] = useState('');

  const isEnabled = (pkg: string) => {
    return settings.enabledPackages.some((p) => p.toLowerCase() === pkg.toLowerCase());
  };

  const toggleApp = (app: SupportedApp) => {
    const targetPkgs = [app.packageName, ...(app.aliases || [])].map((x) => x.toLowerCase());
    let updated: string[];
    const willEnable = !isEnabled(app.packageName);
    if (!willEnable) {
      updated = settings.enabledPackages.filter(
        (p) => !targetPkgs.includes(p.toLowerCase())
      );
    } else {
      updated = Array.from(
        new Set([...settings.enabledPackages, app.packageName, ...(app.aliases || [])])
      );
    }
    updateSettings({ enabledPackages: updated });
    showToast(
      willEnable ? `Đã bật theo dõi ${app.name}` : `Đã tắt theo dõi ${app.name}`,
      'info'
    );
  };

  const enableAll = () => {
    const all = Array.from(
      new Set([
        ...settings.enabledPackages,
        ...SUPPORTED_APPS.flatMap((a) => [a.packageName, ...(a.aliases || [])]),
      ])
    );
    updateSettings({ enabledPackages: all });
    showToast('Đã bật theo dõi tất cả ứng dụng', 'success');
  };

  const disableAll = () => {
    updateSettings({ enabledPackages: [] });
    showToast('Đã tắt theo dõi tất cả ứng dụng', 'info');
  };

  const handleAddCustom = () => {
    if (!customPackage.trim()) {
      showToast('Vui lòng nhập package name (VD: com.mybank.app)', 'error');
      return;
    }
    const clean = customPackage.trim();
    if (!isEnabled(clean)) {
      updateSettings({ enabledPackages: [...settings.enabledPackages, clean] });
    }
    setCustomPackage('');
    showToast(`Đã thêm package ${clean} vào danh sách theo dõi`, 'success');
  };

  const banks = SUPPORTED_APPS.filter((a) => a.category === 'bank');
  const wallets = SUPPORTED_APPS.filter((a) => a.category === 'wallet');
  const others = SUPPORTED_APPS.filter((a) => a.category === 'email_sms');

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <KeyboardAwareScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        {/* Header controls */}
        <View style={styles.topBar}>
          <Text style={styles.countText}>
            Đang bật: {settings.enabledPackages.length} package
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
                onValueChange={() => toggleApp(app)}
                trackColor={{ false: colors.switchTrackOff, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          ))}
        </View>

        {/* Wallets */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ví điện tử & Ngân hàng số ({wallets.length})</Text>
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
                onValueChange={() => toggleApp(app)}
                trackColor={{ false: colors.switchTrackOff, true: colors.primary }}
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
                onValueChange={() => toggleApp(app)}
                trackColor={{ false: colors.switchTrackOff, true: colors.primary }}
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
            placeholderTextColor={colors.textMuted}
            value={customPackage}
            onChangeText={setCustomPackage}
            autoCapitalize="none"
            onFocus={() =>
              setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150)
            }
          />
          <TouchableOpacity style={styles.addBtn} onPress={handleAddCustom}>
            <Ionicons name="add" size={18} color={colors.onPrimary} />
            <Text style={styles.addBtnText}>Thêm vào danh sách theo dõi</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
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
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '600',
    },
    topBtns: {
      flexDirection: 'row',
      gap: 8,
    },
    quickBtn: {
      backgroundColor: colors.surface,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    quickBtnText: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '600',
    },
    section: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 14,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
      marginBottom: 6,
    },
    sectionSubtitle: {
      color: colors.textMuted,
      fontSize: 11,
      marginBottom: 10,
    },
    appRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
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
      color: colors.text,
      fontSize: 13,
      fontWeight: '600',
    },
    appPackage: {
      color: colors.textMuted,
      fontSize: 10,
      marginTop: 2,
    },
    textInput: {
      backgroundColor: colors.surfaceSecondary,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.text,
      fontSize: 13,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 10,
    },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingVertical: 11,
      gap: 6,
    },
    addBtnText: {
      color: colors.onPrimary,
      fontSize: 13,
      fontWeight: '700',
    },
  });
