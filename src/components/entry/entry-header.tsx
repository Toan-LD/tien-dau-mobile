import { Pressable, StyleSheet, Text, View } from "react-native";

import { Colors, Spacing } from "@/constants/theme";
import { formatAmountDigits } from "@/lib/money";

export function AmountDisplay({
    value,
    active,
    onPress,
}: {
    value: number;
    active: boolean;
    onPress(): void;
}) {
    const empty = value === 0;
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel="Nhập số tiền"
            style={({ pressed }) => [
                styles.amountField,
                active && styles.amountFieldActive,
                pressed && styles.amountFieldPressed,
            ]}
        >
            <Text style={styles.amountLabel}>Số tiền</Text>
            <View style={styles.amountRow}>
                <Text style={[styles.amount, empty && styles.amountEmpty]}>
                    {empty ? "0" : formatAmountDigits(value)}
                </Text>
                <Text style={styles.suffix}> đ</Text>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    amountField: {
        flexDirection: "row",
        alignItems: "baseline",
        justifyContent: "space-between",
        marginHorizontal: Spacing.three,
        marginTop: Spacing.three,
        paddingBottom: Spacing.one,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    amountFieldActive: { borderBottomColor: Colors.borderStrong },
    amountFieldPressed: { opacity: 0.6 },
    amountLabel: { fontSize: 13, color: Colors.textMuted },
    amountRow: { flexDirection: "row", alignItems: "baseline" },
    amount: { fontSize: 32, fontWeight: "600", color: Colors.text },
    amountEmpty: { color: Colors.textMuted },
    suffix: { fontSize: 16, color: Colors.textSecondary },
});
