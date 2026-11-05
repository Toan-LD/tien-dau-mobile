import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { CategoryIcon } from "@/components/category-icon";
import { DonutChart } from "@/components/report/donut-chart";
import { TypeToggle } from "@/components/type-toggle";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { PressableScale } from "@/components/ui/pressable-scale";
import { ChartColors, Colors, Spacing } from "@/constants/theme";
import type { TxType } from "@/lib/categories";
import { formatVND } from "@/lib/money";
import {
    buildMonthReport,
    formatShare,
    toDonutSlices,
    type DonutSlice,
} from "@/lib/report";
import type { Transaction } from "@/lib/transactions";

type Props = {
    visible: boolean;
    onClose(): void;
    // The period on show in Danh sách, e.g. "Tuần này, 02/11 – 08/11".
    periodTitle: string;
    // Which card was tapped: Đã chi opens on Chi, Đã thu on Thu.
    initialType: TxType;
    transactions: Transaction[];
};

// Report for the day, week or month on show in Danh sách: a donut of the
// categories and a list with each one's amount and share.
export function PeriodReportSheet({
    visible,
    onClose,
    periodTitle,
    initialType,
    transactions,
}: Props) {
    const [type, setType] = useState<TxType>(initialType);
    const [selectedKey, setSelectedKey] = useState<string | null>(null);
    // Each time it opens, start on the card that was tapped.
    const [wasVisible, setWasVisible] = useState(visible);
    if (visible !== wasVisible) {
        setWasVisible(visible);
        if (visible) {
            setType(initialType);
            setSelectedKey(null);
        }
    }

    const report = buildMonthReport(transactions);
    const isExpense = type === "expense";
    const slices = toDonutSlices(
        isExpense ? report.expenseByCategory : report.incomeByCategory,
    );
    const total = isExpense ? report.expense : report.income;
    const selected = slices.find((s) => s.key === selectedKey) ?? null;

    const changeType = (next: TxType) => {
        setType(next);
        setSelectedKey(null);
    };
    const toggleSlice = (key: string) =>
        setSelectedKey((current) => (current === key ? null : key));

    return (
        <BottomSheet
            visible={visible}
            onClose={onClose}
            title={`Báo cáo · ${periodTitle}`}
            deferContent
            bodyStyle={styles.body}
        >
            <TypeToggle
                type={type}
                onChange={changeType}
                style={styles.toggle}
            />
            {slices.length === 0 ? (
                <Text style={styles.empty}>
                    {isExpense
                        ? "Chưa có khoản chi nào"
                        : "Chưa có khoản thu nào"}
                </Text>
            ) : (
                <>
                    <DonutChart
                        slices={slices}
                        selectedKey={selectedKey}
                        onSelect={toggleSlice}
                        label={
                            selected
                                ? selected.name
                                : isExpense
                                  ? "Tổng chi"
                                  : "Tổng thu"
                        }
                        value={formatVND(selected ? selected.total : total)}
                        note={
                            selected ? formatShare(selected.share) : undefined
                        }
                        drawKey={`${periodTitle}-${type}`}
                    />
                    <ScrollView style={styles.list}>
                        {slices.map((slice) => (
                            <LegendRow
                                key={slice.key}
                                slice={slice}
                                selected={slice.key === selectedKey}
                                dimmed={
                                    selectedKey !== null &&
                                    slice.key !== selectedKey
                                }
                                onPress={() => toggleSlice(slice.key)}
                            />
                        ))}
                    </ScrollView>
                </>
            )}
        </BottomSheet>
    );
}

function LegendRow({
    slice,
    selected,
    dimmed,
    onPress,
}: {
    slice: DonutSlice;
    selected: boolean;
    dimmed: boolean;
    onPress(): void;
}) {
    return (
        <PressableScale
            onPress={onPress}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${slice.name}: ${formatVND(slice.total)}, ${formatShare(slice.share)}`}
            scaleTo={0.98}
            style={[
                styles.row,
                selected && styles.rowSelected,
                dimmed && styles.rowDimmed,
            ]}
            pressedStyle={styles.rowPressed}
        >
            <View
                style={[
                    styles.swatch,
                    slice.slot === "other"
                        ? swatchOther.swatch
                        : swatchSeries[slice.slot],
                ]}
            />
            {slice.key === "other" ? null : (
                <CategoryIcon iconKey={slice.icon} size={18} />
            )}
            <Text style={styles.name} numberOfLines={1}>
                {slice.name}
            </Text>
            <Text style={styles.share}>{formatShare(slice.share)}</Text>
            <Text style={styles.amount}>{formatVND(slice.total)}</Text>
        </PressableScale>
    );
}

// One swatch style per chart colour, made once from the theme.
const swatchSeries = ChartColors.series.map(
    (color) => StyleSheet.create({ swatch: { backgroundColor: color } }).swatch,
);
const swatchOther = StyleSheet.create({
    swatch: { backgroundColor: ChartColors.other },
});

const styles = StyleSheet.create({
    // Fixed, so the empty body shown while sliding up and the report that
    // replaces it are the same size; the list takes what's left and scrolls.
    body: { height: 470 },
    toggle: { marginHorizontal: 0, marginTop: 0 },
    empty: {
        textAlign: "center",
        paddingVertical: Spacing.five,
        fontSize: 14,
        color: Colors.textMuted,
    },
    list: { flex: 1 },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.two + 2,
        paddingVertical: 10,
        paddingHorizontal: Spacing.two,
        borderRadius: 8,
    },
    rowSelected: { backgroundColor: Colors.surfaceMuted },
    rowDimmed: { opacity: 0.45 },
    rowPressed: { backgroundColor: Colors.segment },
    swatch: { width: 10, height: 10, borderRadius: 3 },
    name: { flex: 1, fontSize: 14, color: Colors.text },
    share: {
        width: 40,
        textAlign: "right",
        fontSize: 13,
        color: Colors.textSecondary,
    },
    amount: {
        minWidth: 92,
        textAlign: "right",
        fontSize: 14,
        color: Colors.text,
    },
});
