import {
    keepPreviousData,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CategoryBars } from "@/components/report/category-bars";
import { CategoryHistorySheet } from "@/components/report/category-history-sheet";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { MonthPicker, type YearMonth } from "@/components/ui/month-picker";
import { PeriodNav } from "@/components/ui/period-nav";
import { StatCard, StatRow } from "@/components/ui/stat-card";
import { Colors, Spacing } from "@/constants/theme";
import { formatMonthTitle } from "@/lib/dates";
import { formatVND } from "@/lib/money";
import { isWaitingForData, monthQuery, useRefreshOnFocus } from "@/lib/queries";
import { buildMonthReport, type CategoryTotal } from "@/lib/report";
import type { TxType } from "@/lib/categories";
import { useToday } from "@/lib/use-today";

function formatBalance(balance: number): string {
    if (balance > 0) return `+${formatVND(balance)}`;
    if (balance < 0) return `−${formatVND(Math.abs(balance))}`;
    return formatVND(0);
}

export default function ReportScreen() {
    const today = useToday();
    const currentYear = Number(today.slice(0, 4));
    const currentMonth = Number(today.slice(5, 7));
    // null = following the current month, so it moves on by itself when the month changes.
    const [picked, setPicked] = useState<YearMonth | null>(null);
    const [pickerOpen, setPickerOpen] = useState(false);
    // The category whose history sheet is open, and whether it's Chi or Thu.
    const [history, setHistory] = useState<{
        item: CategoryTotal;
        type: TxType;
    } | null>(null);
    const view = picked ?? { year: currentYear, month: currentMonth };
    const queryClient = useQueryClient();
    const query = useQuery({
        ...monthQuery(view.year, view.month),
        select: buildMonthReport,
        // While another month loads, keep the last report on screen (dimmed).
        placeholderData: keepPreviousData,
    });
    const report = query.data ?? null;
    const failed = query.isError;

    useRefreshOnFocus(monthQuery(view.year, view.month).queryKey);

    // Load the months on both sides in the background, so "‹" and "›" are
    // instant. There is no month after the current one.
    const isCurrent = view.year === currentYear && view.month === currentMonth;
    useEffect(() => {
        const prev = new Date(view.year, view.month - 2, 1);
        queryClient.prefetchQuery(
            monthQuery(prev.getFullYear(), prev.getMonth() + 1),
        );
        if (!isCurrent) {
            const next = new Date(view.year, view.month, 1);
            queryClient.prefetchQuery(
                monthQuery(next.getFullYear(), next.getMonth() + 1),
            );
        }
    }, [view.year, view.month, isCurrent, queryClient]);

    const goTo = ({ year, month }: YearMonth) =>
        setPicked(
            year === currentYear && month === currentMonth
                ? null
                : { year, month },
        );

    const changeMonth = (delta: number) => {
        const d = new Date(view.year, view.month - 1 + delta, 1);
        goTo({ year: d.getFullYear(), month: d.getMonth() + 1 });
    };

    const balance = report?.balance ?? 0;

    return (
        <SafeAreaView edges={["top"]} style={styles.container}>
            <ScrollView>
                <PeriodNav
                    spread
                    style={styles.header}
                    title={formatMonthTitle(view.year, view.month)}
                    onTitlePress={() => setPickerOpen(true)}
                    titleLabel={`${formatMonthTitle(view.year, view.month)}. Chạm để chọn tháng`}
                    onPrev={() => changeMonth(-1)}
                    onNext={() => changeMonth(1)}
                    nextDisabled={isCurrent}
                    prevLabel="Tháng trước"
                    nextLabel="Tháng sau"
                />

                {failed && (
                    <Text style={styles.error}>Không tải được báo cáo</Text>
                )}

                <View style={query.isPlaceholderData && styles.stale}>
                    <View style={styles.balance}>
                        <StatCard
                            size="large"
                            label="Còn lại (thu − chi)"
                            value={formatBalance(balance)}
                        />
                    </View>
                    <StatRow style={styles.totals}>
                        <StatCard
                            label="Thu"
                            value={formatVND(report?.income ?? 0)}
                        />
                        <StatCard
                            label="Chi"
                            value={formatVND(report?.expense ?? 0)}
                        />
                    </StatRow>

                    {report && (
                        <>
                            <CategoryBars
                                title="Chi theo mục"
                                items={report.expenseByCategory}
                                emptyText="Chưa có khoản chi nào"
                                onSelect={(item) =>
                                    setHistory({ item, type: "expense" })
                                }
                            />
                            <CategoryBars
                                title="Thu theo mục"
                                items={report.incomeByCategory}
                                emptyText="Chưa có khoản thu nào"
                                onSelect={(item) =>
                                    setHistory({ item, type: "income" })
                                }
                            />
                        </>
                    )}
                </View>
                <View style={styles.bottomSpace} />
            </ScrollView>
            <LoadingSpinner visible={isWaitingForData(query)} />
            <MonthPicker
                visible={pickerOpen}
                value={view}
                max={{ year: currentYear, month: currentMonth }}
                onSelect={(next) => {
                    goTo(next);
                    setPickerOpen(false);
                }}
                onClose={() => setPickerOpen(false)}
            />
            <CategoryHistorySheet
                category={history?.item ?? null}
                type={history?.type ?? "expense"}
                until={{ year: currentYear, month: currentMonth }}
                onClose={() => setHistory(null)}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: {
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.two,
    },
    stale: { opacity: 0.5 },
    error: {
        textAlign: "center",
        paddingVertical: Spacing.two,
        fontSize: 14,
        color: Colors.danger,
    },
    balance: { marginHorizontal: Spacing.three },
    totals: {
        paddingHorizontal: Spacing.three,
        paddingTop: Spacing.two,
    },
    bottomSpace: { height: Spacing.five },
});
