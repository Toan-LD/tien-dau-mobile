import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';

import { Colors } from '@/constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.text,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: { backgroundColor: Colors.surface, borderTopColor: Colors.border },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Ghi',
          tabBarIcon: ({ focused, size }) => <Ionicons name="add-circle-outline" size={size} color={focused ? Colors.text : Colors.textMuted} />,
        }}
      />
      <Tabs.Screen
        name="today"
        options={{
          title: 'Hôm nay',
          tabBarIcon: ({ focused, size }) => <Ionicons name="list-outline" size={size} color={focused ? Colors.text : Colors.textMuted} />,
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: 'Báo cáo',
          tabBarIcon: ({ focused, size }) => <Ionicons name="bar-chart-outline" size={size} color={focused ? Colors.text : Colors.textMuted} />,
        }}
      />
    </Tabs>
  );
}
