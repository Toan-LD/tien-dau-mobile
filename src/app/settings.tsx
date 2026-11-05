import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

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
        <View style={styles.container}>
            {name ? <Text style={styles.name}>{name}</Text> : null}
            {email ? <Text style={styles.email}>{email}</Text> : null}
            <Pressable
                style={({ pressed }) => [
                    styles.menuRow,
                    pressed && styles.menuRowPressed,
                ]}
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
            </Pressable>
            <Pressable
                style={[styles.signOut, busy && styles.signOutBusy]}
                onPress={onSignOut}
                disabled={busy}
                accessibilityRole="button"
            >
                {busy ? (
                    <ActivityIndicator color={Colors.danger} />
                ) : (
                    <Text style={styles.signOutText}>Đăng xuất</Text>
                )}
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        padding: Spacing.three,
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
    signOut: {
        alignItems: "center",
        justifyContent: "center",
        minHeight: 48,
        marginTop: Spacing.four,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Colors.danger,
    },
    signOutBusy: { opacity: 0.6 },
    signOutText: { color: Colors.danger, fontSize: 16, fontWeight: "500" },
});
