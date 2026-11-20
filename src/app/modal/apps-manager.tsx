import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
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
import { SpringPressable } from '../../components/Motion';
import {
  useTheme,
  ThemeColors,
  Spacing,
  Radius,
} from '../../constants/theme';

export default function AppsManagerModal() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { settings, updateSettings, showToast } = useApp();
  const scrollViewRef = useRef<KeyboardAwareScrollViewRef>(null);

  const [customPackage, setCustomPackage] = useState('');

  const isEnabled = (pkg: string) =>
    settings.enabledPackages.some((p) => p.toLowerCase() === pkg.toLowerCase());

  const toggleApp = (app: SupportedApp) => {
    const targetPkgs = [app.packageName, ...(app.aliases || [])].map((x) => x.toLowerCase());
    const willEnable = !isEnabled(app.packageName);
    const updated = !willEnable
      ? settings.enabledPackages.filter((p) => !targetPkgs.includes(p.toLowerCase()))
      : Array.from(
          new Set([...settings.enabledPackages, app.packageName, ...(app.aliases || [])])
        );

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

  const appGroups: {
    title: string;
    subtitle?: string;
    defaultIcon: keyof typeof Ionicons.glyphMap;
    apps: SupportedApp[];
  }[] = [
    {
      title: 'Ngân hàng phổ biến',
      defaultIcon: 'business',
      apps: SUPPORTED_APPS.filter((a) => a.category === 'bank'),
    },
    {
      title: 'Ví điện tử & Ngân hàng số',
      defaultIcon: 'wallet',
      apps: SUPPORTED_APPS.filter((a) => a.category === 'wallet'),
    },
    {
      title: 'Email & Tin nhắn SMS',
      subtitle:
        'Dành cho trường hợp bạn nhận thông báo biến động số dư qua Gmail hoặc tin nhắn SMS',
      defaultIcon: 'mail',
      apps: SUPPORTED_APPS.filter((a) => a.category === 'email_sms'),
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <KeyboardAwareScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        <View style={styles.topBar}>
          <Text style={styles.countText}>
            Đang bật: {settings.enabledPackages.length} package
          </Text>
          <View style={styles.topBtns}>
            <Pressable style={styles.quickBtn} onPress={enableAll}>
              <Text style={styles.quickBtnText}>Bật tất cả</Text>
            </Pressable>
            <Pressable style={styles.quickBtn} onPress={disableAll}>
              <Text style={styles.quickBtnText}>Tắt tất cả</Text>
            </Pressable>
          </View>
        </View>

        {appGroups.map((group) => (
          <View key={group.title} style={styles.section}>
            <Text style={styles.sectionTitle}>
              {group.title} ({group.apps.length})
            </Text>
            {group.subtitle && <Text style={styles.sectionSubtitle}>{group.subtitle}</Text>}
            {group.apps.map((app) => (
              <View key={app.packageName} style={styles.appRow}>
                <View style={[styles.appIconBox, { backgroundColor: `${app.color}25` }]}>
                  <Ionicons
                    name={(app.icon as any) || group.defaultIcon}
                    size={18}
                    color={app.color}
                  />
                </View>
                <View style={styles.appTexts}>
                  <Text style={styles.appName}>{app.name}</Text>
                  <Text style={styles.appPackage}>{app.packageName}</Text>
                </View>
                <Switch
                  value={isEnabled(app.packageName)}
                  onValueChange={() => toggleApp(app)}
                  trackColor={{ false: colors.switchTrackOff, true: colors.primary }}
                  thumbColor={colors.onPrimary}
                />
              </View>
            ))}
          </View>
        ))}

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
          <SpringPressable style={styles.addBtn} onPress={handleAddCustom}>
            <Ionicons name="add" size={18} color={colors.onPrimary} />
            <Text style={styles.addBtnText}>Thêm vào danh sách theo dõi</Text>
          </SpringPressable>
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
      padding: Spacing.base,
      paddingBottom: Spacing.xxl,
    },
    topBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.base,
    },
    countText: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '600',
    },
    topBtns: {
      flexDirection: 'row',
      gap: Spacing.sm,
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
      borderRadius: Radius.md,
      padding: Spacing.md,
      marginBottom: Spacing.base,
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
      paddingRight: Spacing.sm,
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
      borderRadius: Radius.sm,
      paddingHorizontal: Spacing.md,
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
      borderRadius: Radius.sm,
      paddingVertical: Spacing.md,
      gap: 6,
    },
    addBtnText: {
      color: colors.onPrimary,
      fontSize: 13,
      fontWeight: '700',
    },
  });
