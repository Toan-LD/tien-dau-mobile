import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SampleDataPanel } from "@/components/settings/sample-data-panel";
import { Button } from "@/components/ui/button";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Colors, Spacing } from "@/constants/theme";
import { useAuth } from "@/lib/auth";

export default function SettingsScreen() {
    const { session, signOut } = useAuth();
    const metadata = session?.user.user_metadata;
    const name: string | undefined = metadata?.full_name ?? metadata?.name;
    const email = session?.user.email;
    const [busy, setBusy] = useState(false);

    async function onSignOut() {
        setBusy(true);
        try {
            await signOut();
        } catch {
            Alert.alert(
                "Không đăng xuất được",
                "Kiểm tra kết nối mạng rồi thử lại.",
            );
            setBusy(false);
        }
    }

    return (
        <SafeAreaView edges={["top"]} style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.pageTitle}>Cài đặt</Text>
                {name ? <Text style={styles.name}>{name}</Text> : null}
                {email ? <Text style={styles.email}>{email}</Text> : null}
                <PressableScale
                    style={styles.menuRow}
                    pressedStyle={styles.menuRowPressed}
                    scaleTo={0.98}
                    onPress={() => router.push("/categories")}
                    accessibilityRole="button"
                >
                    <Ionicons
                        name="pricetags-outline"
                        size={20}
                        color={Colors.icon}
                    />
                    <Text style={styles.menuText}>Quản lý danh mục</Text>
                    <Ionicons
                        name="chevron-forward-outline"
                        size={18}
                        color={Colors.textMuted}
                    />
                </PressableScale>
                <Button
                    variant="danger-outline"
                    label="Đăng xuất"
                    onPress={onSignOut}
                    busy={busy}
                    style={styles.signOut}
                />
                {__DEV__ && <SampleDataPanel />}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    content: { padding: Spacing.three },
    pageTitle: {
        fontSize: 22,
        fontWeight: "700",
        color: Colors.text,
        marginBottom: Spacing.four,
    },
    name: { color: Colors.text, fontSize: 18, fontWeight: "600" },
    email: {
        color: Colors.textSecondary,
        fontSize: 14,
        marginTop: Spacing.one,
    },
    menuRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.three,
        marginTop: Spacing.four,
        paddingVertical: 14,
        paddingHorizontal: Spacing.three,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 10,
    },
    menuRowPressed: { backgroundColor: Colors.segment },
    menuText: { flex: 1, fontSize: 15, color: Colors.text },
    signOut: { marginTop: Spacing.four },
});
