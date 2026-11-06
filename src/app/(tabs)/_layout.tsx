import { Ionicons } from "@expo/vector-icons";
import { Tabs, type BottomTabBarButtonProps } from "expo-router/js-tabs";
import type { ComponentProps } from "react";
import { StyleSheet, Text, View } from "react-native";

import { PressableScale } from "@/components/ui/pressable-scale";
import { Colors, Spacing } from "@/constants/theme";
import { ChatProvider } from "@/lib/use-chat";

export const unstable_settings = { anchor: "index" };

const NEW_ENTRY_CIRCLE_SIZE = 60;
const NEW_ENTRY_RAISE = 24;

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

function NewEntryTabButton({
    onPress,
    onLongPress,
    accessibilityState,
    testID,
    style,
}: Readonly<BottomTabBarButtonProps>) {
    return (
        <PressableScale
            onPress={onPress}
            onLongPress={onLongPress}
            accessibilityRole="tab"
            accessibilityLabel="Ghi mới"
            accessibilityState={accessibilityState}
            testID={testID}
            scaleTo={0.94}
            style={[style, styles.newEntryButton]}
        >
            <View style={styles.newEntryCircle}>
                <Ionicons name="add" size={32} color={Colors.onPrimary} />
            </View>
            <Text style={styles.newEntryLabel}>Ghi mới</Text>
        </PressableScale>
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
                        tabBarButton: NewEntryTabButton,
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
    newEntryButton: {
        flex: 1,
        alignItems: "center",
        justifyContent: "flex-end",
        paddingBottom: Spacing.one,
    },
    newEntryCircle: {
        width: NEW_ENTRY_CIRCLE_SIZE,
        height: NEW_ENTRY_CIRCLE_SIZE,
        borderRadius: NEW_ENTRY_CIRCLE_SIZE / 2,
        borderWidth: 4,
        borderColor: Colors.surface,
        backgroundColor: Colors.primary,
        alignItems: "center",
        justifyContent: "center",
        marginTop: -NEW_ENTRY_RAISE,
        marginBottom: Spacing.half,
    },
    newEntryLabel: { fontSize: 10, fontWeight: "600", color: Colors.text },
});
