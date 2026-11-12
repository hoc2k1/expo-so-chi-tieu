import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../contexts/AppContext";

export default function TabLayout() {
  const { pendingTransactions } = useApp();
  const insets = useSafeAreaInsets();
  const pendingCount = pendingTransactions.length;

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: "#0F172A",
          borderBottomWidth: 1,
          borderBottomColor: "#1E293B",
        },
        headerTitleStyle: {
          fontWeight: "700",
          fontSize: 18,
          color: "#F8FAFC",
        },
        headerTintColor: "#F8FAFC",
        tabBarStyle: {
          backgroundColor: "#0F172A",
          borderTopWidth: 1,
          borderTopColor: "#1E293B",
          height: 58 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 6,
        },
        tabBarActiveTintColor: "#10B981",
        tabBarInactiveTintColor: "#64748B",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Hàng chờ",
          tabBarLabel: "Hàng chờ",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="time"
              size={size}
              color={typeof color === "string" ? color : undefined}
            />
          ),
          tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: "#EF4444",
            color: "#FFFFFF",
            fontSize: 10,
            fontWeight: "bold",
          },
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: "Sổ giao dịch",
          tabBarLabel: "Giao dịch",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="receipt"
              size={size}
              color={typeof color === "string" ? color : undefined}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="statistics"
        options={{
          title: "Thống kê",
          tabBarLabel: "Thống kê",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="pie-chart"
              size={size}
              color={typeof color === "string" ? color : undefined}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Cài đặt & Danh mục",
          tabBarLabel: "Cài đặt",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="settings-sharp"
              size={size}
              color={typeof color === "string" ? color : undefined}
            />
          ),
        }}
      />
    </Tabs>
  );
}
