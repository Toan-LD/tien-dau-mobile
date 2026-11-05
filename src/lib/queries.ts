import {
    hashKey,
    queryOptions,
    useQueryClient,
    type QueryClient,
    type QueryKey,
} from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef } from "react";

import { listCategories, type Category, type TxType } from "@/lib/categories";
import type { LocalDate } from "@/lib/dates";
import type { Period, PeriodMode } from "@/lib/periods";
import {
    getTransaction,
    listCategoryHistory,
    listTransactionsBetween,
    listTransactionsForDay,
    listTransactionsForMonth,
    type Transaction,
} from "@/lib/transactions";

// Every query the screens use, in one place, so a key is never spelled twice.
// Day and month lists sit under ["transactions"]: one invalidate refreshes them all.

export function dayQuery(date: LocalDate) {
    return queryOptions({
        queryKey: ["transactions", "day", date],
        queryFn: () => listTransactionsForDay(date),
    });
}

export function monthQuery(year: number, month: number) {
    return queryOptions({
        queryKey: ["transactions", "month", year, month],
        queryFn: () => listTransactionsForMonth(year, month),
    });
}

// The Danh sách tab's list for a day, week or month. Day and month reuse the
// keys above, so they share the cache with each other and with Báo cáo.
export function periodQuery(mode: PeriodMode, period: Period) {
    const [year, month] = period.start.split("-").map(Number);
    const queryKey: QueryKey =
        mode === "day"
            ? dayQuery(period.start).queryKey
            : mode === "month"
              ? monthQuery(year, month).queryKey
              : ["transactions", "week", period.start];
    return queryOptions({
        queryKey,
        queryFn: () => listTransactionsBetween(period.start, period.end),
    });
}

// Every amount in one category for the history chart on Báo cáo. Under
// ["transactions"] so it refreshes after any add, edit or delete.
export function categoryHistoryQuery(categoryId: string | null, type: TxType) {
    return queryOptions({
        queryKey: ["transactions", "category-history", type, categoryId],
        queryFn: () => listCategoryHistory(categoryId, type),
    });
}

// Kept outside ["transactions"] on purpose: after a delete the edit screen must
// not refetch its own row (it would find nothing and leave a second time).
// Never kept after the screen closes (gcTime 0): the form copies the row once
// when it opens, so an old cached copy would bring back values already edited.
export function transactionQuery(id: string) {
    return queryOptions({
        queryKey: ["transaction", id],
        queryFn: () => getTransaction(id),
        staleTime: 0,
        gcTime: 0,
    });
}

export function categoriesQuery(type: TxType) {
    return queryOptions({
        queryKey: ["categories", type],
        queryFn: () => listCategories(type),
    });
}

// The row the user just tapped is already in a cached day or month list;
// showing it at once avoids a spinner while the edit screen loads it again.
export function findCachedTransaction(
    client: QueryClient,
    id: string,
): Transaction | undefined {
    for (const [, list] of client.getQueriesData<Transaction[]>({
        queryKey: ["transactions"],
    })) {
        const found = list?.find((tx) => tx.id === id);
        if (found) return found;
    }
    return undefined;
}

// Takes a deleted row out of every cached day and month list, so it disappears
// before the lists are reloaded.
export function removeCachedTransaction(client: QueryClient, id: string) {
    client.setQueriesData<Transaction[]>(
        { queryKey: ["transactions"] },
        (list) => list?.filter((tx) => tx.id !== id),
    );
}

export function setCachedCategories(
    client: QueryClient,
    type: TxType,
    update: (list: Category[]) => Category[],
) {
    client.setQueryData(categoriesQuery(type).queryKey, (list) =>
        update(list ?? []),
    );
}

// Reload a screen's data when the user comes back to it, but only if it is
// older than staleTime. The first focus is skipped: useQuery already loads then.
// A key change while the screen is on show is useQuery's job, not this hook's.
export function useRefreshOnFocus(queryKey: QueryKey) {
    const client = useQueryClient();
    const first = useRef(true);
    const hash = useRef(hashKey(queryKey));
    const current = hashKey(queryKey);
    useEffect(() => {
        hash.current = current;
    }, [current]);

    useFocusEffect(
        useCallback(() => {
            if (first.current) {
                first.current = false;
                return;
            }
            client.refetchQueries(
                {
                    predicate: (q) => q.queryHash === hash.current,
                    stale: true,
                },
                { cancelRefetch: false },
            );
        }, [client]),
    );
}

// True while a screen waits for data it hasn't got yet: the first load, or a
// new day/week/month still showing the old one (placeholder). A quiet refresh
// of data already on screen doesn't count, so the spinner doesn't flicker.
export function isWaitingForData(query: {
    isFetching: boolean;
    isPlaceholderData: boolean;
    data: unknown;
}): boolean {
    return (
        query.isFetching &&
        (query.isPlaceholderData || query.data === undefined)
    );
}
