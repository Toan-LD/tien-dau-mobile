import { Pressable, StyleSheet, Text, View } from "react-native";

import { Colors, Spacing } from "@/constants/theme";
import type { TxType } from "@/lib/categories";
import { formatAmountDigits } from "@/lib/money";

const OPTIONS: { type: TxType; label: string }[] = [
    { type: "expense", label: "Chi" },
    { type: "income", label: "Thu" },
];

export function TypeToggle({
    type,
    onChange,
}: {
    type: TxType;
    onChange(t: TxType): void;
}) {
    return (
        <View style={styles.segment}>
            {OPTIONS.map((o) => {
                const on = o.type === type;
                return (
                    <Pressable
                        key={o.type}
                        onPress={() => onChange(o.type)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: on }}
                        style={[styles.option, on && styles.optionOn]}
                    >
                        <Text
                            style={[
                                styles.optionText,
                                on && styles.optionTextOn,
                            ]}
                        >
                            {o.label}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

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
            style={[styles.amountField, active && styles.amountFieldActive]}
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
    segment: {
        flexDirection: "row",
        marginHorizontal: Spacing.three,
        marginTop: Spacing.two,
        padding: 2,
        backgroundColor: Colors.segment,
        borderRadius: 8,
    },
    option: {
        flex: 1,
        alignItems: "center",
        paddingVertical: 8,
        borderRadius: 6,
    },
    optionOn: { backgroundColor: Colors.surface },
    optionText: { fontSize: 14, color: Colors.textSecondary },
    optionTextOn: { fontWeight: "600", color: Colors.text },
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
    amountLabel: { fontSize: 13, color: Colors.textMuted },
    amountRow: { flexDirection: "row", alignItems: "baseline" },
    amount: { fontSize: 32, fontWeight: "600", color: Colors.text },
    amountEmpty: { color: Colors.textMuted },
    suffix: { fontSize: 16, color: Colors.textSecondary },
});
