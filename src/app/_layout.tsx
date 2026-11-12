import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from '../contexts/AppContext';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  useEffect(() => {
    const timer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: '#0F172A',
            },
            headerTintColor: '#F8FAFC',
            headerTitleStyle: {
              fontWeight: '700',
            },
            contentStyle: {
              backgroundColor: '#0F172A',
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
      </AppProvider>
    </SafeAreaProvider>
  );
}
