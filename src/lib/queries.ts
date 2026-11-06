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
import type { Period, PeriodMode } from "@/lib/periods";
import {
    getTransaction,
    listCategoryHistory,
    listTransactionsBetween,
    listTransactionsForDay,
    listTransactionsForMonth,
    type Transaction,
} from "@/lib/transactions";

export function dayQuery(date: string) {
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

function periodKey(mode: PeriodMode, period: Period): QueryKey {
    switch (mode) {
        case "day":
            return dayQuery(period.start).queryKey;
        case "month": {
            const [year, month] = period.start.split("-").map(Number);
            return monthQuery(year, month).queryKey;
        }
        case "week":
            return ["transactions", "week", period.start];
    }
}

export function periodQuery(mode: PeriodMode, period: Period) {
    return queryOptions({
        queryKey: periodKey(mode, period),
        queryFn: () => listTransactionsBetween(period.start, period.end),
    });
}

export function categoryHistoryQuery(categoryId: string | null, type: TxType) {
    return queryOptions({
        queryKey: ["transactions", "category-history", type, categoryId],
        queryFn: () => listCategoryHistory(categoryId, type),
    });
}

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
            void client.refetchQueries(
                {
                    predicate: (q) => q.queryHash === hash.current,
                    stale: true,
                },
                { cancelRefetch: false },
            );
        }, [client]),
    );
}

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
