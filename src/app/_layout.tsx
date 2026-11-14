import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppProvider } from '../contexts/AppContext';
import { useTheme } from '../constants/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigator() {
  const { colors, isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 17,
          },
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal/classify"
          options={{
            presentation: 'modal',
            title: 'Phân loại giao dịch',
          }}
        />
        <Stack.Screen
          name="modal/manual-transaction"
          options={{
            presentation: 'modal',
            title: 'Thêm giao dịch',
          }}
        />
        <Stack.Screen
          name="modal/category-edit"
          options={{
            presentation: 'modal',
            title: 'Chỉnh sửa Phân loại',
          }}
        />
        <Stack.Screen
          name="modal/note-edit"
          options={{
            presentation: 'modal',
            title: 'Chỉnh sửa Ghi chú mẫu',
          }}
        />
        <Stack.Screen
          name="modal/rule-edit"
          options={{
            presentation: 'modal',
            title: 'Quy tắc từ khóa',
          }}
        />
        <Stack.Screen
          name="modal/apps-manager"
          options={{
            presentation: 'modal',
            title: 'Ứng dụng Ngân hàng & Ví',
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    const timer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <RootNavigator />
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
