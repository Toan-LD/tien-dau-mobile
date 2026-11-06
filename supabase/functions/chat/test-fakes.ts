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
    // Khi có, mọi truy vấn trả lỗi này.
    error?: { message: string };
};

export type FakeClientCalls = {
    tables: string[];
    selects: string[];
    // Mỗi phần tử là [tên bộ lọc, ...tham số], ví dụ ["gte", "transaction_date", "2026-11-01"].
    filters: unknown[][];
    orders: string[];
    ranges: [number, number][];
};

// Client Supabase giả: chuỗi truy vấn nào cũng nối tiếp được, `await` ở bất
// kỳ bước nào cũng trả về { data, error }. Nếu có `range` thì cắt theo trang.
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
            // Chỉ đổi kiểu khi biên dịch, không đổi dữ liệu.
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
                const selected = page ? rows.slice(page[0], page[1] + 1) : rows;
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
