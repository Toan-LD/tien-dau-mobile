import { QueryClientProvider } from "@tanstack/react-query";
import { DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { PortalHost } from "@/components/ui/portal";
import { ToastProvider } from "@/components/ui/toast";
import { Colors } from "@/constants/theme";
import { AuthProvider, useAuth } from "@/lib/auth";
import { queryClient } from "@/lib/query-client";

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
                    name="categories"
                    options={{ headerShown: true, title: "Danh mục" }}
                />
                <Stack.Screen
                    name="transaction/[id]/index"
                    options={{ headerShown: true, title: "Chi tiết" }}
                />
                <Stack.Screen
                    name="transaction/[id]/edit"
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
            <QueryClientProvider client={queryClient}>
                <AuthProvider>
                    <ToastProvider>
                        {/* Sheets draw here, above every screen; toasts
                            (rendered by ToastProvider after this) stay on top. */}
                        <PortalHost>
                            <ThemeProvider value={theme}>
                                <StatusBar style="dark" />
                                <RootStack />
                            </ThemeProvider>
                        </PortalHost>
                    </ToastProvider>
                </AuthProvider>
            </QueryClientProvider>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
});
