import type { SupabaseClient } from "@supabase/supabase-js";

export type FakeTransactionRow = {
    type: string;
    amount: string;
    category_id: string | null;
    transaction_date: string;
    note: string | null;
    created_at: string;
    category: { name: string } | null;
};

export type FakeClientData = {
    transactions?: FakeTransactionRow[];
    categories?: { id: string; name: string; type: string }[];
    error?: { message: string };
    maxRowsPerPage?: number;
};

export type FakeClientCalls = {
    tables: string[];
    selects: string[];
    filters: unknown[][];
    orders: string[];
    ranges: [number, number][];
};

export function createFakeClient(data: FakeClientData): {
    client: SupabaseClient;
    calls: FakeClientCalls;
} {
    const calls: FakeClientCalls = {
        tables: [],
        selects: [],
        filters: [],
        orders: [],
        ranges: [],
    };

    function createQuery(rows: unknown[]) {
        let page: [number, number] | null = null;
        const query = {
            select(columns: string) {
                calls.selects.push(columns);
                return query;
            },
            gte: (...parameters: unknown[]) => filter("gte", parameters),
            lte: (...parameters: unknown[]) => filter("lte", parameters),
            in: (...parameters: unknown[]) => filter("in", parameters),
            order(column: string) {
                calls.orders.push(column);
                return query;
            },
            overrideTypes: () => query,
            range(from: number, to: number) {
                calls.ranges.push([from, to]);
                page = [from, to];
                return query;
            },
            then(resolve: (result: { data: unknown; error: unknown }) => void) {
                if (data.error) {
                    resolve({ data: null, error: data.error });
                    return;
                }
                const selected = page
                    ? rows.slice(
                          page[0],
                          Math.min(
                              page[1] + 1,
                              page[0] + (data.maxRowsPerPage ?? Infinity),
                          ),
                      )
                    : rows;
                resolve({ data: selected, error: null });
            },
        };
        function filter(name: string, parameters: unknown[]) {
            calls.filters.push([name, ...parameters]);
            return query;
        }
        return query;
    }

    const client = {
        from(table: string) {
            calls.tables.push(table);
            const rows =
                table === "transactions"
                    ? (data.transactions ?? [])
                    : (data.categories ?? []);
            return createQuery(rows);
        },
    } as unknown as SupabaseClient;
    return { client, calls };
}
