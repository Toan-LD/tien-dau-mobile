import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { CategoryIcon } from "@/components/category-icon";
import { MonthColumns } from "@/components/report/month-columns";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { StatCard, StatRow } from "@/components/ui/stat-card";
import { Colors, Spacing } from "@/constants/theme";
import type { TxType } from "@/lib/categories";
import { formatMonthTitle } from "@/lib/dates";
import { formatCompactVND, formatVND } from "@/lib/money";
import { categoryHistoryQuery } from "@/lib/queries";
import {
    historySummary,
    monthlyTotals,
    type CategoryTotal,
} from "@/lib/report";

type Props = {
    // The category tapped on Báo cáo; null when the sheet is closed.
    category: CategoryTotal | null;
    type: TxType;
    // The current month: the chart runs up to here.
    until: { year: number; month: number };
    onClose(): void;
};

// "From the start until now" for one category: a column per month, the
// selected month's amount on top, and the total, monthly average and
// biggest month underneath.
export function CategoryHistorySheet({
    category,
    type,
    until,
    onClose,
}: Props) {
    const visible = category !== null;
    // Keep the last category while the sheet slides away.
    const [shown, setShown] = useState(category);
    if (category !== null && category !== shown) setShown(category);

    const query = useQuery({
        ...categoryHistoryQuery(shown?.categoryId ?? null, type),
        enabled: shown !== null,
    });
    const months = monthlyTotals(query.data ?? [], until);
    const summary = historySummary(months);

    // null = the latest month; a tapped column overrides it until reopened.
    const [picked, setPicked] = useState<number | null>(null);
    const [wasVisible, setWasVisible] = useState(visible);
    if (visible !== wasVisible) {
        setWasVisible(visible);
        if (visible) setPicked(null);
    }
    const selected = picked ?? months.length - 1;
    const month = months[selected];

    const isExpense = type === "expense";
    const peak = summary.peak;

    return (
        <BottomSheet
            visible={visible}
            onClose={onClose}
            title={`${isExpense ? "Chi" : "Thu"} từ trước tới nay`}
        >
            <View style={styles.categoryRow}>
                <CategoryIcon iconKey={shown?.icon} size={20} />
                <Text style={styles.categoryName} numberOfLines={1}>
                    {shown?.name}
                </Text>
            </View>

            {query.isPending ? (
                <ActivityIndicator style={styles.state} color={Colors.icon} />
            ) : query.isError ? (
                <Text style={[styles.state, styles.stateText]}>
                    Không tải được dữ liệu
                </Text>
            ) : months.length === 0 || !month ? (
                <Text style={[styles.state, styles.stateText]}>
                    Chưa có khoản nào trong mục này
                </Text>
            ) : (
                <>
                    <View style={styles.selected}>
                        <Text style={styles.selectedLabel}>
                            {formatMonthTitle(month.year, month.month)}
                        </Text>
                        <Text style={styles.selectedValue}>
                            {formatVND(month.total)}
                        </Text>
                    </View>
                    <MonthColumns
                        months={months}
                        selected={selected}
                        onSelect={setPicked}
                        drawKey={`${shown?.categoryId}-${type}-${visible}`}
                    />
                    <StatRow style={styles.summary}>
                        <StatCard
                            label="Tổng"
                            value={formatCompactVND(summary.total)}
                        />
                        <StatCard
                            label="TB mỗi tháng"
                            value={formatCompactVND(summary.average)}
                        />
                        <StatCard
                            label={
                                peak
                                    ? `Cao nhất · T${peak.month}/${String(peak.year).slice(2)}`
                                    : "Cao nhất"
                            }
                            value={formatCompactVND(peak?.total ?? 0)}
                        />
                    </StatRow>
                </>
            )}
        </BottomSheet>
    );
}

const styles = StyleSheet.create({
    categoryRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.two,
        marginBottom: Spacing.three,
    },
    categoryName: {
        flex: 1,
        fontSize: 16,
        fontWeight: "600",
        color: Colors.text,
    },
    state: { paddingVertical: Spacing.five },
    stateText: { textAlign: "center", fontSize: 14, color: Colors.textMuted },
    selected: { marginBottom: Spacing.three },
    selectedLabel: { fontSize: 12, color: Colors.textSecondary },
    selectedValue: {
        fontSize: 22,
        fontWeight: "700",
        color: Colors.text,
        marginTop: 2,
    },
    summary: { marginTop: Spacing.three },
});
