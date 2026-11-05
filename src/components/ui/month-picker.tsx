import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { IconButton } from "@/components/ui/icon-button";
import { SelectableTile } from "@/components/ui/selectable-tile";
import { Colors, Spacing } from "@/constants/theme";

export type YearMonth = { year: number; month: number };

// Three per row. Rows are built by hand rather than with "33.33%" widths,
// which Android rounds so that a row can wrap early.
const ROWS = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
    [10, 11, 12],
];

type Props = {
    visible: boolean;
    // The month on show; its year is where the sheet opens.
    value: YearMonth;
    // Latest month that can be picked (the current month).
    max: YearMonth;
    onSelect(value: YearMonth): void;
    onClose(): void;
};

// Bottom sheet to jump straight to a month: ‹ year › on top, 12 months below.
// Months after `max` are greyed out.
export function MonthPicker({ visible, value, max, onSelect, onClose }: Props) {
    const [year, setYear] = useState(value.year);
    // Each time it opens, start from the year being viewed.
    const [wasVisible, setWasVisible] = useState(visible);
    if (visible !== wasVisible) {
        setWasVisible(visible);
        if (visible) setYear(value.year);
    }

    const isFuture = (month: number) =>
        year > max.year || (year === max.year && month > max.month);

    return (
        <BottomSheet visible={visible} onClose={onClose} title="Chọn tháng">
            <View style={styles.yearRow}>
                <IconButton
                    name="chevron-back-outline"
                    onPress={() => setYear((y) => y - 1)}
                    accessibilityLabel="Năm trước"
                />
                <Text style={styles.year}>{year}</Text>
                <IconButton
                    name="chevron-forward-outline"
                    onPress={() => setYear((y) => y + 1)}
                    disabled={year >= max.year}
                    accessibilityLabel="Năm sau"
                />
            </View>
            <View style={styles.grid}>
                {ROWS.map((row) => (
                    <View key={row[0]} style={styles.row}>
                        {row.map((month) => {
                            const selected =
                                year === value.year && month === value.month;
                            return (
                                <SelectableTile
                                    key={month}
                                    selected={selected}
                                    disabled={isFuture(month)}
                                    onPress={() => onSelect({ year, month })}
                                    accessibilityLabel={`Tháng ${month}/${year}`}
                                    style={styles.cell}
                                >
                                    <Text
                                        style={[
                                            styles.month,
                                            selected && styles.monthSelected,
                                        ]}
                                    >
                                        Tháng {month}
                                    </Text>
                                </SelectableTile>
                            );
                        })}
                    </View>
                ))}
            </View>
        </BottomSheet>
    );
}

const styles = StyleSheet.create({
    yearRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: Spacing.two,
        marginBottom: Spacing.three,
    },
    year: { fontSize: 16, fontWeight: "600", color: Colors.text },
    grid: { gap: Spacing.two },
    row: { flexDirection: "row", gap: Spacing.two },
    cell: { flex: 1, height: 48, borderRadius: 10 },
    month: { fontSize: 14, color: Colors.text },
    monthSelected: { fontWeight: "600" },
});
