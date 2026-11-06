import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router/js-tabs";
import type { ComponentProps } from "react";
import { StyleSheet, View } from "react-native";

import { Colors } from "@/constants/theme";
import { ChatProvider } from "@/lib/use-chat";

export const unstable_settings = { anchor: "index" };

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

function NewEntryTabIcon() {
    return (
        <View style={styles.newEntryIcon}>
            <Ionicons name="add" size={22} color={Colors.onPrimary} />
        </View>
    );
}

const ICONS = {
    today: tabIcon("list-outline"),
    ask: tabIcon("chatbubble-ellipses-outline"),
    report: tabIcon("bar-chart-outline"),
    settings: tabIcon("settings-outline"),
};

export default function TabsLayout() {
    return (
        <ChatProvider>
            <Tabs
                backBehavior="initialRoute"
                screenOptions={{
                    headerShown: false,
                    tabBarActiveTintColor: Colors.text,
                    tabBarInactiveTintColor: Colors.textMuted,
                    tabBarStyle: styles.tabBar,
                }}
            >
                <Tabs.Screen
                    name="today"
                    options={{ title: "Danh sách", tabBarIcon: ICONS.today }}
                />
                <Tabs.Screen
                    name="ask"
                    options={{
                        title: "Chatbot",
                        tabBarIcon: ICONS.ask,
                        tabBarHideOnKeyboard: true,
                    }}
                />
                <Tabs.Screen
                    name="index"
                    options={{
                        title: "Ghi mới",
                        tabBarIcon: NewEntryTabIcon,
                        tabBarIconStyle: styles.newEntryIconSlot,
                        tabBarInactiveTintColor: Colors.text,
                        tabBarLabelStyle: styles.newEntryLabel,
                    }}
                />
                <Tabs.Screen
                    name="report"
                    options={{ title: "Báo cáo", tabBarIcon: ICONS.report }}
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
    newEntryIconSlot: { width: 48 },
    newEntryIcon: {
        width: 48,
        height: 28,
        borderRadius: 14,
        backgroundColor: Colors.primary,
        alignItems: "center",
        justifyContent: "center",
    },
    newEntryLabel: { fontWeight: "600" },
});
