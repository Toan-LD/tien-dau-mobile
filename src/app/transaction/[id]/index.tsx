import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { ComponentProps } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CategoryIcon } from "@/components/category-icon";
import { Button } from "@/components/ui/button";
import { Colors, Spacing } from "@/constants/theme";
import { formatDayTitle, formatTime } from "@/lib/dates";
import { formatVND } from "@/lib/money";
import { useToday } from "@/lib/use-today";
import { useDeleteTransaction, useTransaction } from "@/lib/use-transaction";

export default function TransactionDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const today = useToday();
    const tx = useTransaction(id);
    const deleteTransaction = useDeleteTransaction();

    if (!tx) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator color={Colors.icon} />
            </View>
        );
    }

    const isExpense = tx.type === "expense";
    const categoryName = tx.category?.name ?? "Không phân loại";

    const confirmDelete = () => {
        Alert.alert(
            "Xoá khoản này?",
            `${categoryName} · ${formatVND(tx.amount)}`,
            [
                { text: "Huỷ", style: "cancel" },
                {
                    text: "Xoá",
                    style: "destructive",
                    onPress: () => {
                        deleteTransaction(tx);
                        router.back();
                    },
                },
            ],
        );
    };

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.typeLabel}>
                    {isExpense ? "Khoản chi" : "Khoản thu"}
                </Text>
                <Text style={styles.amount}>
                    {isExpense ? "−" : "+"}
                    {formatVND(tx.amount)}
                </Text>

                <View style={styles.card}>
                    <DetailRow label="Mục" icon="pricetag-outline">
                        <View style={styles.category}>
                            <CategoryIcon
                                iconKey={tx.category?.icon}
                                size={18}
                            />
                            <Text style={styles.value} numberOfLines={1}>
                                {categoryName}
                            </Text>
                        </View>
                    </DetailRow>
                    <DetailRow label="Ngày" icon="calendar-outline">
                        <Text style={styles.value}>
                            {formatDayTitle(tx.date, today)}
                        </Text>
                    </DetailRow>
                    <DetailRow label="Mô tả" icon="create-outline">
                        <Text style={[styles.value, !tx.note && styles.muted]}>
                            {tx.note || "Không có mô tả"}
                        </Text>
                    </DetailRow>
                    <DetailRow label="Ghi lúc" icon="time-outline" last>
                        <Text style={styles.value}>
                            {formatTime(tx.createdAt)}
                        </Text>
                    </DetailRow>
                </View>
            </ScrollView>

            <View
                style={[
                    styles.actions,
                    { paddingBottom: insets.bottom + Spacing.three },
                ]}
            >
                <Button
                    variant="danger-outline"
                    icon="trash-outline"
                    label="Xoá"
                    onPress={confirmDelete}
                    style={styles.action}
                />
                <Button
                    icon="create-outline"
                    label="Sửa"
                    onPress={() =>
                        router.push({
                            pathname: "/transaction/[id]/edit",
                            params: { id: tx.id },
                        })
                    }
                    style={styles.action}
                />
            </View>
        </View>
    );
}

function DetailRow({
    label,
    icon,
    last,
    children,
}: {
    label: string;
    icon?: ComponentProps<typeof Ionicons>["name"];
    last?: boolean;
    children: React.ReactNode;
}) {
    return (
        <View style={[styles.row, !last && styles.rowDivider]}>
            <View style={styles.rowLabel}>
                {icon && (
                    <Ionicons name={icon} size={16} color={Colors.textMuted} />
                )}
                <Text style={styles.label}>{label}</Text>
            </View>
            <View style={styles.rowValue}>{children}</View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    loading: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: Colors.background,
    },
    content: { padding: Spacing.three },
    typeLabel: { fontSize: 13, color: Colors.textSecondary },
    amount: {
        fontSize: 32,
        fontWeight: "600",
        color: Colors.text,
        marginTop: Spacing.one,
        marginBottom: Spacing.four,
    },
    card: {
        paddingHorizontal: Spacing.three,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
    },
    row: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: Spacing.three,
        paddingVertical: 14,
    },
    rowDivider: { borderBottomWidth: 1, borderBottomColor: Colors.border },
    rowLabel: {
        width: 88,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    label: { fontSize: 13, color: Colors.textSecondary },
    rowValue: { flex: 1, alignItems: "flex-end" },
    category: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        flexShrink: 1,
    },
    value: { fontSize: 15, color: Colors.text, textAlign: "right" },
    muted: { color: Colors.textMuted },
    actions: {
        flexDirection: "row",
        gap: Spacing.two,
        paddingHorizontal: Spacing.three,
        paddingTop: Spacing.two,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        backgroundColor: Colors.surface,
    },
    action: { flex: 1 },
});
