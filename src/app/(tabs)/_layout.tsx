import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../contexts/AppContext';
import { useTheme } from '../../constants/theme';
import { AnimatedTabIcon } from '../../components/Motion';

export default function TabLayout() {
  const { pendingTransactions } = useApp();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const pendingCount = pendingTransactions.length;
  const badgeLabel = pendingCount > 99 ? '99+' : pendingCount > 0 ? pendingCount : undefined;

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        headerShadowVisible: false,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
          color: colors.text,
        },
        headerTintColor: colors.text,
        tabBarStyle: {
          backgroundColor: colors.tabBarBg,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 62 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tổng quan',
          tabBarLabel: 'Tổng quan',
          tabBarIcon: ({ color, focused, size }) => (
            <AnimatedTabIcon
              name={focused ? 'wallet' : 'wallet-outline'}
              size={size}
              color={typeof color === 'string' ? color : colors.primary}
              focused={focused}
            />
          ),
          tabBarBadge: badgeLabel,
          tabBarBadgeStyle: {
            backgroundColor: colors.expense,
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: '700',
          },
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Sổ giao dịch',
          tabBarLabel: 'Giao dịch',
          tabBarIcon: ({ color, focused, size }) => (
            <AnimatedTabIcon
              name={focused ? 'receipt' : 'receipt-outline'}
              size={size}
              color={typeof color === 'string' ? color : colors.primary}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="statistics"
        options={{
          title: 'Thống kê',
          tabBarLabel: 'Thống kê',
          tabBarIcon: ({ color, focused, size }) => (
            <AnimatedTabIcon
              name={focused ? 'pie-chart' : 'pie-chart-outline'}
              size={size}
              color={typeof color === 'string' ? color : colors.primary}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: 'Phân loại & Ghi chú',
          tabBarLabel: 'Phân loại',
          tabBarIcon: ({ color, focused, size }) => (
            <AnimatedTabIcon
              name={focused ? 'pricetags' : 'pricetags-outline'}
              size={size}
              color={typeof color === 'string' ? color : colors.primary}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Cài đặt',
          tabBarLabel: 'Cài đặt',
          tabBarIcon: ({ color, focused, size }) => (
            <AnimatedTabIcon
              name={focused ? 'settings' : 'settings-outline'}
              size={size}
              color={typeof color === 'string' ? color : colors.primary}
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}
