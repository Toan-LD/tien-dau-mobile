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
import {
    getTransaction,
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
