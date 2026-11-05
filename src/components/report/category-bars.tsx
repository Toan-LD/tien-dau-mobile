import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { CategoryIcon } from "@/components/category-icon";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Colors, Spacing } from "@/constants/theme";
import { formatCompactVND } from "@/lib/money";
import { formatShare, type CategoryTotal } from "@/lib/report";

type Props = {
    title: string;
    items: CategoryTotal[];
    emptyText: string;
    // Tapping a row opens that category's history.
    onSelect(item: CategoryTotal): void;
};

// Ranked bars, largest first, each with its share of the section's total and
// its amount. Bars are scaled to the largest category.
export function CategoryBars({ title, items, emptyText, onSelect }: Props) {
    const max = items.length > 0 ? items[0].total : 0;
    const sum = items.reduce((s, c) => s + c.total, 0);

    return (
        <View style={styles.section}>
            <Text style={styles.title}>{title}</Text>
            {items.length === 0 ? (
                <Text style={styles.empty}>{emptyText}</Text>
            ) : (
                items.map((item) => {
                    const width =
                        `${max > 0 ? (item.total / max) * 100 : 0}%` as const;
                    const share = formatShare(sum > 0 ? item.total / sum : 0);
                    return (
                        <PressableScale
                            key={item.categoryId ?? "none"}
                            onPress={() => onSelect(item)}
                            accessibilityRole="button"
                            accessibilityLabel={`${item.name}: ${formatCompactVND(item.total)}, ${share}`}
                            accessibilityHint="Xem biểu đồ từ trước tới nay"
                            scaleTo={0.98}
                            style={styles.row}
                            pressedStyle={styles.rowPressed}
                        >
                            <CategoryIcon iconKey={item.icon} size={20} />
                            <Text style={styles.name} numberOfLines={1}>
                                {item.name}
                            </Text>
                            <View style={styles.track}>
                                <View style={[styles.bar, { width }]} />
                            </View>
                            <Text style={styles.share}>{share}</Text>
                            <Text style={styles.amount} numberOfLines={1}>
                                {formatCompactVND(item.total)}
                            </Text>
                            <Ionicons
                                name="chevron-forward-outline"
                                size={14}
                                color={Colors.textMuted}
                            />
                        </PressableScale>
                    );
                })
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    section: { paddingHorizontal: Spacing.three, paddingTop: Spacing.three },
    title: {
        fontSize: 13,
        fontWeight: "600",
        color: Colors.textSecondary,
        marginBottom: Spacing.two,
    },
    empty: {
        fontSize: 14,
        color: Colors.textMuted,
        paddingVertical: Spacing.two,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.two,
        paddingVertical: Spacing.two,
        marginHorizontal: -Spacing.two,
        paddingHorizontal: Spacing.two,
        borderRadius: 8,
    },
    rowPressed: { backgroundColor: Colors.segment },
    name: { width: 88, fontSize: 14, color: Colors.text },
    track: { flex: 1 },
    bar: {
        height: 14,
        minWidth: 2,
        backgroundColor: Colors.icon,
        borderTopRightRadius: 4,
        borderBottomRightRadius: 4,
    },
    share: {
        width: 34,
        textAlign: "right",
        fontSize: 12,
        color: Colors.textSecondary,
    },
    amount: { width: 52, textAlign: "right", fontSize: 13, color: Colors.text },
});
