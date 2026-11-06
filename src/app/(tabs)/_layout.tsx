import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router/js-tabs";
import type { ComponentProps } from "react";
import { StyleSheet } from "react-native";

import { Colors } from "@/constants/theme";
import { ChatProvider } from "@/lib/use-chat";

type IconName = ComponentProps<typeof Ionicons>["name"];
type TabIconProps = { focused: boolean; size: number };

function TabIcon({
    name,
    focused,
    size,
}: Readonly<TabIconProps & { name: IconName }>) {
    return (
        <Ionicons
            name={name}
            size={size}
            color={focused ? Colors.text : Colors.textMuted}
        />
    );
}

function tabIcon(name: IconName) {
    return function TabBarIcon({ focused, size }: TabIconProps) {
        return <TabIcon name={name} focused={focused} size={size} />;
    };
}

const ICONS = {
    index: tabIcon("add-circle-outline"),
    today: tabIcon("list-outline"),
    report: tabIcon("bar-chart-outline"),
    ask: tabIcon("chatbubble-ellipses-outline"),
    settings: tabIcon("settings-outline"),
};

export default function TabsLayout() {
    return (
        <ChatProvider>
            <Tabs
                screenOptions={{
                    headerShown: false,
                    tabBarActiveTintColor: Colors.text,
                    tabBarInactiveTintColor: Colors.textMuted,
                    tabBarStyle: styles.tabBar,
                }}
            >
                <Tabs.Screen
                    name="index"
                    options={{ title: "Ghi", tabBarIcon: ICONS.index }}
                />
                <Tabs.Screen
                    name="today"
                    options={{ title: "Danh sách", tabBarIcon: ICONS.today }}
                />
                <Tabs.Screen
                    name="report"
                    options={{ title: "Báo cáo", tabBarIcon: ICONS.report }}
                />
                <Tabs.Screen
                    name="ask"
                    options={{
                        title: "Hỏi",
                        tabBarIcon: ICONS.ask,
                        tabBarHideOnKeyboard: true,
                    }}
                />
                <Tabs.Screen
                    name="settings"
                    options={{ title: "Cài đặt", tabBarIcon: ICONS.settings }}
                />
            </Tabs>
        </ChatProvider>
    );
}

const styles = StyleSheet.create({
    tabBar: { backgroundColor: Colors.surface, borderTopColor: Colors.border },
});
