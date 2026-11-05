import ReanimatedSwipeable, {
    type SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import { memo, useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { SharedValue } from "react-native-reanimated";

import { CategoryIcon } from "@/components/category-icon";
import { Colors, Spacing } from "@/constants/theme";
import { formatTime } from "@/lib/dates";
import { formatAmountDigits } from "@/lib/money";
import type { Transaction } from "@/lib/transactions";

const PEEK_MS = 1000;
// How far the finger must move sideways before the row starts to slide. The
// default 10 caught slightly diagonal scrolls and stopped the list.
const SWIPE_START = 24;

type Props = {
    tx: Transaction;
    // Each handler gets the row's transaction, so a long list can pass the
    // same functions to every row and memo can skip rows that didn't change.
    onPress(tx: Transaction): void;
    onEdit(tx: Transaction): void;
    onDelete(tx: Transaction): void;
    peekHint?: boolean;
    onPeekDone?(): void;
    // False while the list scrolls, so a scroll can't turn into a swipe.
    swipeEnabled?: SharedValue<boolean>;
};

export const TransactionRow = memo(function TransactionRow({
    tx,
    onPress,
    onEdit,
    onDelete,
    peekHint,
    onPeekDone,
    swipeEnabled,
}: Props) {
    const swipeRef = useRef<SwipeableMethods>(null);

    useEffect(() => {
        if (!peekHint) return;
        swipeRef.current?.openRight();
        const timer = setTimeout(() => {
            swipeRef.current?.close();
            onPeekDone?.();
        }, PEEK_MS);
        return () => {
            clearTimeout(timer);
            onPeekDone?.();
        };
    }, [peekHint, onPeekDone]);

    const act = (fn: (t: Transaction) => void) => () => {
        swipeRef.current?.close();
        fn(tx);
    };

    const sign = tx.type === "expense" ? "−" : "+";

    return (
        <ReanimatedSwipeable
            ref={swipeRef}
            enabled={swipeEnabled}
            dragOffsetFromRight={-SWIPE_START}
            dragOffsetFromLeft={SWIPE_START}
            friction={2}
            overshootRight={false}
            renderRightActions={() => (
                <View style={styles.actions}>
                    <Pressable
                        onPress={act(onEdit)}
                        accessibilityRole="button"
                        style={({ pressed }) => [
                            styles.action,
                            styles.edit,
                            pressed && styles.actionPressed,
                        ]}
                    >
                        <Text style={styles.actionText}>Sửa</Text>
                    </Pressable>
                    <Pressable
                        onPress={act(onDelete)}
                        accessibilityRole="button"
                        style={({ pressed }) => [
                            styles.action,
                            styles.remove,
                            pressed && styles.actionPressed,
                        ]}
                    >
                        <Text style={styles.actionText}>Xoá</Text>
                    </Pressable>
                </View>
            )}
        >
            <Pressable
                onPress={() => onPress(tx)}
                accessibilityRole="button"
                style={({ pressed }) => [
                    styles.row,
                    pressed && styles.rowPressed,
                ]}
            >
                <CategoryIcon iconKey={tx.category?.icon} />
                <View style={styles.texts}>
                    <Text style={styles.category}>
                        {tx.category?.name ?? "Không phân loại"}
                    </Text>
                    {tx.note ? (
                        <Text style={styles.note} numberOfLines={1}>
                            {tx.note}
                        </Text>
                    ) : null}
                </View>
                <View style={styles.right}>
                    <Text style={styles.amount}>
                        {sign}
                        {formatAmountDigits(tx.amount)}
                    </Text>
                    <Text style={styles.time}>{formatTime(tx.createdAt)}</Text>
                </View>
            </Pressable>
        </ReanimatedSwipeable>
    );
});

const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.three,
        paddingVertical: 10,
        paddingHorizontal: Spacing.three,
        backgroundColor: Colors.background,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    rowPressed: { backgroundColor: Colors.surfaceMuted },
    texts: { flex: 1, minWidth: 0 },
    category: { fontSize: 14, color: Colors.text },
    note: { fontSize: 12, color: Colors.textSecondary },
    right: { alignItems: "flex-end" },
    amount: { fontSize: 14, color: Colors.text },
    time: { fontSize: 11, color: Colors.textMuted },
    actions: { flexDirection: "row" },
    action: { width: 60, alignItems: "center", justifyContent: "center" },
    edit: { backgroundColor: Colors.icon },
    remove: { backgroundColor: Colors.danger },
    actionPressed: { opacity: 0.8 },
    actionText: { fontSize: 13, color: Colors.onPrimary },
});
