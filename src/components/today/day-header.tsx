import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Colors, Spacing } from "@/constants/theme";
import { formatAmountDigits } from "@/lib/money";
// Plain values, not the day group object (rebuilt on every render), so memo
// can skip headers whose numbers didn't change.
type Props = { title: string; expense: number; income: number };

// Heading above each day's rows in the week and month lists: the day on the
// left, that day's spending and income on the right.
export const DayHeader = memo(function DayHeader({
    title,
    expense,
    income,
}: Props) {
    return (
        <View style={styles.row}>
            <Text style={styles.title}>{title}</Text>
            <View style={styles.totals}>
                {expense > 0 && (
                    <Text style={styles.amount}>
                        −{formatAmountDigits(expense)}
                    </Text>
                )}
                {income > 0 && (
                    <Text style={styles.amount}>
                        +{formatAmountDigits(income)}
                    </Text>
                )}
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: Spacing.three,
        paddingTop: Spacing.three,
        paddingBottom: Spacing.one + 2,
        backgroundColor: Colors.background,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    title: { fontSize: 13, fontWeight: "600", color: Colors.textSecondary },
    totals: { flexDirection: "row", gap: Spacing.three },
    amount: { fontSize: 12, color: Colors.textSecondary },
});
