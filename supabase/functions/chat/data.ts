import type { SupabaseClient } from "@supabase/supabase-js";
import { toVND } from "../_shared/money.ts";
import type {
    CategoryRef,
    Transaction,
    TransactionType,
} from "../_shared/types.ts";

export const PAGE_SIZE = 1000;

type TransactionRow = {
    type: TransactionType;
    amount: string | number;
    category_id: string | null;
    transaction_date: string;
    note: string | null;
    created_at: string;
    category: { name: string } | null;
};

export async function fetchTransactions(
    client: SupabaseClient,
    start: string,
    end: string,
): Promise<Transaction[]> {
    const transactions: Transaction[] = [];
    for (let from = 0; ; from = transactions.length) {
        const { data, error } = await client
            .from("transactions")
            .select(
                "type, amount, category_id, transaction_date, note, created_at, category:categories(name)",
            )
            .gte("transaction_date", start)
            .lte("transaction_date", end)
            .in("type", ["expense", "income"])
            .order("transaction_date")
            .order("created_at")
            .order("id")
            .range(from, from + PAGE_SIZE - 1)
            .overrideTypes<TransactionRow[], { merge: false }>();
        if (error) throw new Error(error.message);
        for (const row of data) {
            transactions.push({
                type: row.type,
                amount: toVND(row.amount),
                categoryId: row.category_id,
                categoryName: row.category?.name ?? null,
                date: row.transaction_date,
                note: row.note,
                createdAt: row.created_at,
            });
        }
        if (data.length === 0) return transactions;
    }
}

export async function fetchCategories(
    client: SupabaseClient,
): Promise<CategoryRef[]> {
    const { data, error } = await client
        .from("categories")
        .select("id, name, type")
        .order("type")
        .order("sort_order")
        .overrideTypes<CategoryRef[], { merge: false }>();
    if (error) throw new Error(error.message);
    return data;
}
