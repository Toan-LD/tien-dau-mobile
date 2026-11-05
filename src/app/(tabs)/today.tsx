import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    keepPreviousData,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import { useNavigation, useRouter } from "expo-router";
import type { BottomTabNavigationProp } from "expo-router/js-tabs";
import { useEffect, useRef, useState } from "react";
import { FlatList, StyleSheet, Text } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { PeriodReportSheet } from "@/components/report/period-report-sheet";
import { DayHeader } from "@/components/today/day-header";
import { TransactionRow } from "@/components/today/transaction-row";
import { useDatePicker } from "@/components/ui/date-picker";
import { MonthPicker } from "@/components/ui/month-picker";
import { PeriodNav } from "@/components/ui/period-nav";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { StatCard, StatRow } from "@/components/ui/stat-card";
import { useToast } from "@/components/ui/toast";
import { Colors, Spacing } from "@/constants/theme";
import { resolveDate, toLocalDateString, type LocalDate } from "@/lib/dates";
import { formatVND } from "@/lib/money";
import {
    containsDate,
    formatPeriodTitle,
    formatWeekday,
    groupByDay,
    periodOf,
    shiftAnchor,
    type DayGroup,
    type PeriodMode,
} from "@/lib/periods";
import { periodQuery, useRefreshOnFocus } from "@/lib/queries";
import { sumByType } from "@/lib/report";
import type { TxType } from "@/lib/categories";
import type { Transaction } from "@/lib/transactions";
import { useToday } from "@/lib/use-today";
import { useDeleteTransaction } from "@/lib/use-transaction";

const HINT_KEY = "hint.swipe.v1";

const MODES: readonly { value: PeriodMode; label: string }[] = [
    { value: "day", label: "Ngày" },
    { value: "week", label: "Tuần" },
    { value: "month", label: "Tháng" },
];

const UNIT: Record<PeriodMode, string> = {
    day: "Ngày",
    week: "Tuần",
    month: "Tháng",
};

// Week and month lists put a heading above each day's rows.
type Row = { kind: "day"; group: DayGroup } | { kind: "tx"; tx: Transaction };

function toRows(mode: PeriodMode, list: Transaction[]): Row[] {
    if (mode === "day") return list.map((tx) => ({ kind: "tx", tx }));
    return groupByDay(list).flatMap((group): Row[] => [
        { kind: "day", group },
        ...group.items.map((tx): Row => ({ kind: "tx", tx })),
    ]);
}

export default function ListScreen() {
    const router = useRouter();
    const toast = useToast();
    const today = useToday();
    const [mode, setMode] = useState<PeriodMode>("day");
    // A day inside the period on show. null = following today, so the
    // current day/week/month moves on by itself after midnight.
    const [picked, setPicked] = useState<LocalDate | null>(null);
    const anchor = resolveDate(picked, today);
    const period = periodOf(mode, anchor);
    const isCurrent = containsDate(period, today);
    const [monthPickerOpen, setMonthPickerOpen] = useState(false);
    // Which summary card opened the report sheet; null = closed.
    const [reportType, setReportType] = useState<TxType | null>(null);

    const queryClient = useQueryClient();
    const query = useQuery({
        ...periodQuery(mode, period),
        // While another period loads, keep showing the last list (dimmed)
        // instead of flashing an empty screen.
        placeholderData: keepPreviousData,
    });
    const items = query.data ?? null;
    const showingOld = query.isPlaceholderData;
    const rows = toRows(mode, items ?? []);
    const remove = useDeleteTransaction();
    // Row swipes are off while the list is being dragged or still gliding,
    // so scrolling past a row never catches it as a swipe.
    const swipeEnabled = useSharedValue(true);
    const stopSwipes = () => swipeEnabled.set(false);
    const allowSwipes = () => swipeEnabled.set(true);
    const [hintId, setHintId] = useState<string | null>(null);
    const hintStarted = useRef(false);

    useRefreshOnFocus(periodQuery(mode, period).queryKey);

    useEffect(() => {
        if (query.error) toast.show({ message: "Không tải được danh sách" });
    }, [query.error, toast]);

    // Load the period before in the background, so tapping "‹" is instant.
    const prevStart = periodOf(mode, shiftAnchor(mode, anchor, -1)).start;
    useEffect(() => {
        queryClient.prefetchQuery(periodQuery(mode, periodOf(mode, prevStart)));
    }, [mode, prevStart, queryClient]);

    const firstId = items && items.length > 0 ? items[0].id : null;
    useEffect(() => {
        if (!firstId || hintStarted.current) return;
        let cancelled = false;
        AsyncStorage.getItem(HINT_KEY)
            .then((seen) => {
                if (cancelled || hintStarted.current) return;
                hintStarted.current = true;
                if (seen) return;
                AsyncStorage.setItem(HINT_KEY, "1").catch(() => {});
                setHintId(firstId);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [firstId]);

    const clearHint = () => setHintId(null);

    // Any day inside the current period means "follow today".
    const goTo = (next: LocalDate) => {
        setPicked(containsDate(periodOf(mode, next), today) ? null : next);
    };
    const datePicker = useDatePicker(anchor, goTo);
    const openPicker = () =>
        mode === "month" ? setMonthPickerOpen(true) : datePicker.open();

    // Tapping the Danh sách tab while already on it goes back to the current
    // day/week/month and scrolls to the top, like most apps' home tab.
    const navigation =
        useNavigation<BottomTabNavigationProp<Record<string, undefined>>>();
    const listRef = useRef<FlatList<Row>>(null);
    useEffect(
        () =>
            navigation.addListener("tabPress", () => {
                if (!navigation.isFocused()) return;
                setPicked(null);
                listRef.current?.scrollToOffset({ offset: 0, animated: true });
            }),
        [navigation],
    );

    const totals = sumByType(items ?? []);
    const title = formatPeriodTitle(mode, period, today);
    const unit = UNIT[mode];

    const header = (
        <StatRow style={styles.totals}>
            <StatCard
                label="Đã chi"
                value={formatVND(totals.expense)}
                onPress={() => setReportType("expense")}
                accessibilityHint="Mở báo cáo chi theo mục"
            />
            <StatCard
                label="Đã thu"
                value={formatVND(totals.income)}
                onPress={() => setReportType("income")}
                accessibilityHint="Mở báo cáo thu theo mục"
            />
        </StatRow>
    );

    const openTransaction = (tx: Transaction) =>
        router.push({ pathname: "/transaction/[id]", params: { id: tx.id } });
    const editTransaction = (tx: Transaction) =>
        router.push({
            pathname: "/transaction/[id]/edit",
            params: { id: tx.id },
        });

    return (
        <SafeAreaView edges={["top"]} style={styles.container}>
            <SegmentedControl<PeriodMode>
                options={MODES}
                value={mode}
                onChange={setMode}
            />
            <PeriodNav
                spread
                style={styles.periodRow}
                title={title}
                onTitlePress={openPicker}
                titleLabel={`${title}. Chạm để chọn ${unit.toLowerCase()}`}
                onPrev={() => goTo(shiftAnchor(mode, anchor, -1))}
                onNext={() => goTo(shiftAnchor(mode, anchor, 1))}
                nextDisabled={isCurrent}
                prevLabel={`${unit} trước`}
                nextLabel={`${unit} sau`}
            />
            {/* A plain FlatList: Animated.FlatList wraps every row in an
                animated view, which made long week/month lists stutter while
                scrolling. Deleting still glides (LayoutAnimation in
                useDeleteTransaction). Smaller batches keep each scroll step
                light, since every row carries a swipe gesture. */}
            <FlatList
                ref={listRef}
                style={showingOld && styles.stale}
                initialNumToRender={12}
                maxToRenderPerBatch={8}
                updateCellsBatchingPeriod={40}
                windowSize={7}
                onScrollBeginDrag={stopSwipes}
                onScrollEndDrag={allowSwipes}
                onMomentumScrollBegin={stopSwipes}
                onMomentumScrollEnd={allowSwipes}
                data={rows}
                keyExtractor={(row) =>
                    row.kind === "day" ? `day-${row.group.date}` : row.tx.id
                }
                ListHeaderComponent={header}
                ListEmptyComponent={
                    items && !showingOld ? (
                        <Text style={styles.empty}>Chưa có khoản nào</Text>
                    ) : undefined
                }
                renderItem={({ item }) =>
                    item.kind === "day" ? (
                        <DayHeader
                            title={formatWeekday(item.group.date, today)}
                            expense={item.group.expense}
                            income={item.group.income}
                        />
                    ) : (
                        <TransactionRow
                            tx={item.tx}
                            peekHint={item.tx.id === hintId}
                            onPeekDone={clearHint}
                            onPress={openTransaction}
                            onEdit={editTransaction}
                            onDelete={remove}
                            swipeEnabled={swipeEnabled}
                        />
                    )
                }
            />
            {datePicker.sheet}
            <PeriodReportSheet
                visible={reportType !== null}
                onClose={() => setReportType(null)}
                periodTitle={title}
                initialType={reportType ?? "expense"}
                transactions={items ?? []}
            />
            <MonthPicker
                visible={monthPickerOpen}
                value={{
                    year: Number(anchor.slice(0, 4)),
                    month: Number(anchor.slice(5, 7)),
                }}
                max={{
                    year: Number(today.slice(0, 4)),
                    month: Number(today.slice(5, 7)),
                }}
                onSelect={({ year, month }) => {
                    goTo(toLocalDateString(new Date(year, month - 1, 1)));
                    setMonthPickerOpen(false);
                }}
                onClose={() => setMonthPickerOpen(false)}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    periodRow: {
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.two,
    },
    stale: { opacity: 0.5 },
    totals: {
        paddingHorizontal: Spacing.three,
        paddingBottom: 10,
    },
    empty: {
        textAlign: "center",
        paddingVertical: Spacing.five,
        fontSize: 14,
        color: Colors.textMuted,
    },
});
