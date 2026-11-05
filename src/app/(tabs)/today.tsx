import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    keepPreviousData,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import { useNavigation, useRouter } from "expo-router";
import type { BottomTabNavigationProp } from "expo-router/js-tabs";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, type FlatList } from "react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { TransactionRow } from "@/components/today/transaction-row";
import { useDatePicker } from "@/components/ui/date-picker";
import { PeriodNav } from "@/components/ui/period-nav";
import { StatCard, StatRow } from "@/components/ui/stat-card";
import { useToast } from "@/components/ui/toast";
import { Motion } from "@/constants/motion";
import { Colors, Spacing } from "@/constants/theme";
import {
    addDays,
    formatDayTitle,
    resolveDate,
    type LocalDate,
} from "@/lib/dates";
import { formatVND } from "@/lib/money";
import { dayQuery, useRefreshOnFocus } from "@/lib/queries";
import { sumByType } from "@/lib/report";
import { useToday } from "@/lib/use-today";
import { useDeleteTransaction } from "@/lib/use-transaction";
import type { Transaction } from "@/lib/transactions";

const HINT_KEY = "hint.swipe.v1";

export default function TodayScreen() {
    const router = useRouter();
    const toast = useToast();
    const today = useToday();
    // null = following today, so the screen moves on by itself after midnight.
    const [picked, setPicked] = useState<LocalDate | null>(null);
    const date = resolveDate(picked, today);
    const queryClient = useQueryClient();
    const query = useQuery({
        ...dayQuery(date),
        // While another day loads, keep showing the last list (dimmed)
        // instead of flashing an empty screen.
        placeholderData: keepPreviousData,
    });
    const items = query.data ?? null;
    const showingOldDay = query.isPlaceholderData;
    const remove = useDeleteTransaction();
    const [hintId, setHintId] = useState<string | null>(null);
    const hintStarted = useRef(false);

    useRefreshOnFocus(dayQuery(date).queryKey);

    useEffect(() => {
        if (query.error) toast.show({ message: "Không tải được danh sách" });
    }, [query.error, toast]);

    // Load the day before in the background, so tapping "‹" is instant.
    useEffect(() => {
        queryClient.prefetchQuery(dayQuery(addDays(date, -1)));
    }, [date, queryClient]);

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

    const changeDay = (next: LocalDate) => {
        setPicked(next === today ? null : next);
    };
    const picker = useDatePicker(date, changeDay);

    // Tapping the Danh sách tab while already on it goes back to today and
    // scrolls to the top, like most apps do with their home tab.
    const navigation =
        useNavigation<BottomTabNavigationProp<Record<string, undefined>>>();
    const listRef = useRef<FlatList<Transaction>>(null);
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
    const isToday = date === today;

    const header = (
        <StatRow style={styles.totals}>
            <StatCard label="Đã chi" value={formatVND(totals.expense)} />
            <StatCard label="Đã thu" value={formatVND(totals.income)} />
        </StatRow>
    );

    return (
        <SafeAreaView edges={["top"]} style={styles.container}>
            <PeriodNav
                spread
                style={styles.dayRow}
                title={formatDayTitle(date, today)}
                onTitlePress={picker.open}
                titleLabel={`${formatDayTitle(date, today)}. Chạm để chọn ngày`}
                onPrev={() => changeDay(addDays(date, -1))}
                onNext={() => changeDay(addDays(date, 1))}
                nextDisabled={isToday}
                prevLabel="Ngày trước"
                nextLabel="Ngày sau"
            />
            <Animated.FlatList
                ref={listRef}
                // When a row is deleted the rows below glide up instead of jumping.
                itemLayoutAnimation={Motion.reflow}
                style={showingOldDay && styles.stale}
                data={items ?? []}
                keyExtractor={(tx) => tx.id}
                ListHeaderComponent={header}
                ListEmptyComponent={
                    items && !showingOldDay ? (
                        <Text style={styles.empty}>Chưa có khoản nào</Text>
                    ) : undefined
                }
                renderItem={({ item }) => (
                    <TransactionRow
                        tx={item}
                        peekHint={item.id === hintId}
                        onPeekDone={clearHint}
                        onPress={() =>
                            router.push({
                                pathname: "/transaction/[id]",
                                params: { id: item.id },
                            })
                        }
                        onEdit={() =>
                            router.push({
                                pathname: "/transaction/[id]/edit",
                                params: { id: item.id },
                            })
                        }
                        onDelete={() => remove(item)}
                    />
                )}
            />
            {picker.sheet}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    dayRow: {
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
