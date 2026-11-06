import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    keepPreviousData,
    noop,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import { useNavigation, useRouter } from "expo-router";
import type { BottomTabNavigationProp } from "expo-router/js-tabs";
import { useEffect, useRef, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { PeriodReportSheet } from "@/components/report/period-report-sheet";
import { CategoryFilterSheet } from "@/components/today/category-filter-sheet";
import { DayHeader } from "@/components/today/day-header";
import { FilterChip } from "@/components/today/filter-chip";
import { TransactionRow } from "@/components/today/transaction-row";
import { useDatePicker } from "@/components/ui/date-picker";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { MonthPicker } from "@/components/ui/month-picker";
import { PeriodNav } from "@/components/ui/period-nav";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { StatCard, StatRow } from "@/components/ui/stat-card";
import { useToast } from "@/components/ui/toast";
import { Colors, Spacing } from "@/constants/theme";
import type { TxType } from "@/lib/categories";
import { resolveDate, toLocalDateString } from "@/lib/dates";
import { formatVND } from "@/lib/money";
import {
    containsDate,
    filterByCategories,
    formatPeriodTitle,
    formatWeekday,
    groupByDay,
    NO_CATEGORY,
    periodOf,
    shiftAnchor,
    type DayGroup,
    type PeriodMode,
} from "@/lib/periods";
import {
    categoriesQuery,
    isWaitingForData,
    periodQuery,
    useRefreshOnFocus,
} from "@/lib/queries";
import { sumByType } from "@/lib/report";
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

type Row = { kind: "day"; group: DayGroup } | { kind: "tx"; tx: Transaction };

function toRows(mode: PeriodMode, list: Transaction[]): Row[] {
    if (mode === "day") return list.map((tx) => ({ kind: "tx", tx }));
    return groupByDay(list).flatMap((group): Row[] => [
        { kind: "day", group },
        ...group.items.map((tx): Row => ({ kind: "tx", tx })),
    ]);
}

function useFilterLabel(ids: string[]): string | null {
    const expense = useQuery(categoriesQuery("expense")).data ?? [];
    const income = useQuery(categoriesQuery("income")).data ?? [];
    if (ids.length === 0) return null;
    const byId = new Map([...expense, ...income].map((c) => [c.id, c.name]));
    const names = ids.map((id) =>
        id === NO_CATEGORY ? "Không phân loại" : (byId.get(id) ?? "Mục đã xoá"),
    );
    const shown = names.slice(0, 2).join(", ");
    return names.length > 2 ? `${shown} +${names.length - 2}` : shown;
}

export default function ListScreen() {
    const router = useRouter();
    const toast = useToast();
    const today = useToday();
    const [mode, setMode] = useState<PeriodMode>("day");
    const [picked, setPicked] = useState<string | null>(null);
    const anchor = resolveDate(picked, today);
    const period = periodOf(mode, anchor);
    const isCurrent = containsDate(period, today);
    const [monthPickerOpen, setMonthPickerOpen] = useState(false);
    const [reportType, setReportType] = useState<TxType | null>(null);

    const queryClient = useQueryClient();
    const query = useQuery({
        ...periodQuery(mode, period),
        placeholderData: keepPreviousData,
    });
    const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
    const [filterOpen, setFilterOpen] = useState(false);
    const items = query.data
        ? filterByCategories(query.data, categoryFilter)
        : null;
    const filterLabel = useFilterLabel(categoryFilter);
    const showingOld = query.isPlaceholderData;
    const rows = toRows(mode, items ?? []);
    const remove = useDeleteTransaction();
    const swipeEnabled = useSharedValue(true);
    const stopSwipes = () => swipeEnabled.set(false);
    const allowSwipes = () => swipeEnabled.set(true);
    const [hintId, setHintId] = useState<string | null>(null);
    const hintStarted = useRef(false);

    useRefreshOnFocus(periodQuery(mode, period).queryKey);

    useEffect(() => {
        if (query.error) toast.show({ message: "Không tải được danh sách" });
    }, [query.error, toast]);

    const prevStart = periodOf(mode, shiftAnchor(mode, anchor, -1)).start;
    useEffect(() => {
        queryClient
            .query(periodQuery(mode, periodOf(mode, prevStart)))
            .catch(noop);
    }, [mode, prevStart, queryClient]);

    const firstId = items && items.length > 0 ? items[0].id : null;
    useEffect(() => {
        if (!firstId || hintStarted.current) return;
        let cancelled = false;
        const showHintOnce = async () => {
            const seen = await AsyncStorage.getItem(HINT_KEY);
            if (cancelled || hintStarted.current) return;
            hintStarted.current = true;
            if (seen) return;
            setHintId(firstId);
            await AsyncStorage.setItem(HINT_KEY, "1");
        };
        showHintOnce().catch(noop);
        return () => {
            cancelled = true;
        };
    }, [firstId]);

    const clearHint = () => setHintId(null);

    const goTo = (next: string) => {
        setPicked(containsDate(periodOf(mode, next), today) ? null : next);
    };
    const datePicker = useDatePicker(anchor, goTo);
    const openPicker = () =>
        mode === "month" ? setMonthPickerOpen(true) : datePicker.open();

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
            <FilterChip
                label={filterLabel}
                onPress={() => setFilterOpen(true)}
                onClear={() => setCategoryFilter([])}
            />
            <View style={styles.listArea}>
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
                            <Text style={styles.empty}>
                                {categoryFilter.length > 0
                                    ? "Không có khoản nào khớp bộ lọc"
                                    : "Chưa có khoản nào"}
                            </Text>
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
                <LoadingSpinner
                    visible={isWaitingForData(query)}
                    position="top"
                />
            </View>
            {datePicker.sheet}
            <CategoryFilterSheet
                visible={filterOpen}
                selected={categoryFilter}
                onApply={(ids) => {
                    setCategoryFilter(ids);
                    setFilterOpen(false);
                }}
                onClose={() => setFilterOpen(false)}
            />
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
    listArea: { flex: 1 },
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
