import { StyleSheet, Text, View } from "react-native";

import { Colors, Spacing } from "@/constants/theme";
import { formatAmountDigits } from "@/lib/money";
import type { DayGroup } from "@/lib/periods";

type Props = { group: DayGroup; title: string };

// Heading above each day's rows in the week and month lists: the day on the
// left, that day's spending and income on the right.
export function DayHeader({ group, title }: Props) {
    return (
        <View style={styles.row}>
            <Text style={styles.title}>{title}</Text>
            <View style={styles.totals}>
                {group.expense > 0 && (
                    <Text style={styles.amount}>
                        −{formatAmountDigits(group.expense)}
                    </Text>
                )}
                {group.income > 0 && (
                    <Text style={styles.amount}>
                        +{formatAmountDigits(group.income)}
                    </Text>
                )}
            </View>
        </View>
    );
}

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
