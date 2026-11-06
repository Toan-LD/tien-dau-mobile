import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
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
    movingAverage,
    type CategoryTotal,
} from "@/lib/report";

type Props = {
    category: CategoryTotal | null;
    type: TxType;
    until: { year: number; month: number };
    onClose(): void;
};

export function CategoryHistorySheet({
    category,
    type,
    until,
    onClose,
}: Readonly<Props>) {
    const visible = category !== null;
    const [shown, setShown] = useState(category);
    if (category !== null && category !== shown) setShown(category);

    const query = useQuery({
        ...categoryHistoryQuery(shown?.categoryId ?? null, type),
        enabled: shown !== null,
    });
    const months = monthlyTotals(query.data ?? [], until);
    const summary = historySummary(months);
    const trend = movingAverage(months.map((m) => m.total));

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
    const peakLabel = peak
        ? `Cao nhất · T${peak.month}/${String(peak.year).slice(2)}`
        : "Cao nhất";

    let content: ReactNode;
    if (query.isPending) {
        content = (
            <ActivityIndicator style={styles.state} color={Colors.icon} />
        );
    } else if (query.isError) {
        content = (
            <Text style={[styles.state, styles.stateText]}>
                Không tải được dữ liệu
            </Text>
        );
    } else if (months.length === 0 || !month) {
        content = (
            <Text style={[styles.state, styles.stateText]}>
                Chưa có khoản nào trong mục này
            </Text>
        );
    } else {
        content = (
            <>
                <View style={styles.selected}>
                    <Text style={styles.selectedLabel}>
                        {formatMonthTitle(month.year, month.month)}
                    </Text>
                    <Text style={styles.selectedValue}>
                        {formatVND(month.total)}
                    </Text>
                    <Text style={styles.selectedTrend}>
                        TB 3 tháng: {formatVND(trend[selected] ?? 0)}
                    </Text>
                </View>
                <MonthColumns
                    months={months}
                    trend={trend}
                    selected={selected}
                    onSelect={setPicked}
                    drawKey={`${shown?.categoryId}-${type}`}
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
                        label={peakLabel}
                        value={formatCompactVND(peak?.total ?? 0)}
                    />
                </StatRow>
            </>
        );
    }

    return (
        <BottomSheet
            visible={visible}
            onClose={onClose}
            title={`${isExpense ? "Chi" : "Thu"} từ trước tới nay`}
            deferContent
            bodyStyle={styles.body}
        >
            <View style={styles.categoryRow}>
                <CategoryIcon iconKey={shown?.icon} size={20} />
                <Text style={styles.categoryName} numberOfLines={1}>
                    {shown?.name}
                </Text>
            </View>

            {content}
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
    body: { height: 410 },
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
    selectedTrend: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    summary: { marginTop: Spacing.three },
});
