import { DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { ToastProvider } from "@/components/ui/toast";
import { Colors } from "@/constants/theme";
import { AuthProvider, useAuth } from "@/lib/auth";

SplashScreen.preventAutoHideAsync();

const theme = {
    ...DefaultTheme,
    colors: { ...DefaultTheme.colors, background: Colors.background },
};

function RootStack() {
    const { session, loading } = useAuth();

    useEffect(() => {
        if (!loading) SplashScreen.hideAsync();
    }, [loading]);

    if (loading) return null;

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Protected guard={!!session}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen
                    name="settings"
                    options={{ headerShown: true, title: "Cài đặt" }}
                />
                <Stack.Screen
                    name="transaction/[id]"
                    options={{ headerShown: true, title: "Sửa khoản" }}
                />
            </Stack.Protected>
            <Stack.Protected guard={!session}>
                <Stack.Screen name="login" />
            </Stack.Protected>
        </Stack>
    );
}

export default function RootLayout() {
    return (
        <GestureHandlerRootView style={styles.root}>
            <AuthProvider>
                <ToastProvider>
                    <ThemeProvider value={theme}>
                        <StatusBar style="dark" />
                        <RootStack />
                    </ThemeProvider>
                </ToastProvider>
            </AuthProvider>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
});
