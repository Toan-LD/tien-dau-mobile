import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { CategoryIcon } from "@/components/category-icon";
import { Button } from "@/components/ui/button";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Colors, Spacing } from "@/constants/theme";
import type { DraftMessage } from "@/lib/chat-state";
import { formatDayTitle } from "@/lib/dates";
import { formatVND } from "@/lib/money";
import { categoriesQuery } from "@/lib/queries";
import { useToday } from "@/lib/use-today";

type Props = {
    message: DraftMessage;
    onSave(id: string): void;
    onDismiss(id: string): void;
};

const PREVIOUS_SAVED_WARNING =
    "Thẻ trước đã được ghi; lưu thẻ này sẽ thành khoản thứ hai";

function kindLabel(type: DraftMessage["draft"]["type"]): string {
    return type === "expense" ? "Chi" : "Thu";
}

export const DraftCard = memo(function DraftCard({
    message,
    onSave,
    onDismiss,
}: Readonly<Props>) {
    const { draft, status, transactionId } = message;
    const today = useToday();
    const categories = useQuery(categoriesQuery(draft.type));
    const iconKey = categories.data?.find(
        (category) => category.id === draft.categoryId,
    )?.icon;

    if (status === "dismissed" || status === "replaced") {
        const prefix =
            status === "dismissed" ? "Đã bỏ" : "Đã thay bằng thẻ mới";
        return (
            <View style={styles.closed}>
                <Text style={styles.closedText}>
                    {prefix}: {kindLabel(draft.type)} {formatVND(draft.amount)}{" "}
                    · {draft.categoryName}
                </Text>
            </View>
        );
    }

    const saving = status === "saving";
    return (
        <View style={styles.card}>
            <Text style={styles.kind}>{kindLabel(draft.type)}</Text>
            <Text style={styles.amount}>{formatVND(draft.amount)}</Text>
            <View style={styles.detailRow}>
                <CategoryIcon iconKey={iconKey} size={18} />
                <Text style={styles.detail}>{draft.categoryName}</Text>
            </View>
            <View style={styles.detailRow}>
                <Ionicons
                    name="calendar-outline"
                    size={18}
                    color={Colors.icon}
                />
                <Text style={styles.detail}>
                    {formatDayTitle(draft.date, today)}
                </Text>
            </View>
            {draft.note !== null && (
                <Text style={styles.note}>{draft.note}</Text>
            )}
            {status === "saved" ? (
                <View style={styles.savedRow}>
                    <Ionicons
                        name="checkmark-circle-outline"
                        size={20}
                        color={Colors.icon}
                    />
                    <Text style={styles.savedText}>Đã ghi</Text>
                    {transactionId !== null && (
                        <PressableScale
                            onPress={() =>
                                router.push({
                                    pathname: "/transaction/[id]",
                                    params: { id: transactionId },
                                })
                            }
                            accessibilityRole="button"
                            style={styles.view}
                            pressedStyle={styles.viewPressed}
                        >
                            <Text style={styles.viewText}>Xem</Text>
                        </PressableScale>
                    )}
                </View>
            ) : (
                <>
                    {message.previousAlreadySaved && (
                        <Text style={styles.warning}>
                            {PREVIOUS_SAVED_WARNING}
                        </Text>
                    )}
                    <View style={styles.actions}>
                        <Button
                            label="Bỏ"
                            variant="outline"
                            onPress={() => onDismiss(message.id)}
                            disabled={saving}
                            style={styles.action}
                        />
                        <Button
                            label="Lưu"
                            onPress={() => onSave(message.id)}
                            busy={saving}
                            style={styles.action}
                        />
                    </View>
                </>
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    card: {
        alignSelf: "flex-start",
        width: "85%",
        padding: Spacing.three,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.surface,
        marginBottom: Spacing.two,
        gap: Spacing.one,
    },
    kind: { fontSize: 13, color: Colors.textSecondary },
    amount: {
        fontSize: 26,
        fontWeight: "700",
        color: Colors.text,
        marginBottom: Spacing.one,
    },
    detailRow: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
    detail: { fontSize: 15, color: Colors.text },
    note: { fontSize: 15, color: Colors.textSecondary },
    warning: { fontSize: 13, color: Colors.danger, marginTop: Spacing.one },
    actions: {
        flexDirection: "row",
        gap: Spacing.two,
        marginTop: Spacing.two,
    },
    action: { flex: 1, minHeight: 44 },
    savedRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.two,
        marginTop: Spacing.two,
    },
    savedText: { flex: 1, fontSize: 15, color: Colors.textSecondary },
    view: {
        paddingVertical: Spacing.one,
        paddingHorizontal: Spacing.three,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 8,
    },
    viewPressed: { backgroundColor: Colors.segment },
    viewText: { fontSize: 14, fontWeight: "600", color: Colors.text },
    closed: {
        alignSelf: "flex-start",
        maxWidth: "85%",
        paddingVertical: Spacing.one,
        marginBottom: Spacing.two,
    },
    closedText: { fontSize: 14, color: Colors.textMuted },
});
