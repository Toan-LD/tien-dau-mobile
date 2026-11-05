import type { TxType } from "@/lib/categories";
import { monthRange, type LocalDate } from "@/lib/dates";
import { MAX_AMOUNT } from "@/lib/money";
import { requireUserId } from "@/lib/session";
import { supabase } from "@/lib/supabase";

export type TxCategory = {
    id: string;
    name: string;
    icon: string | null;
} | null;
export type Transaction = {
    id: string;
    type: TxType;
    amount: number;
    categoryId: string | null;
    category: TxCategory;
    note: string | null;
    date: LocalDate;
    createdAt: string;
    walletId: string;
};
export type TransactionDraft = {
    type: TxType;
    amount: number;
    categoryId: string;
    date: LocalDate;
    note: string | null;
};

const SELECT = "*, category:categories(id,name,icon)";
const APP_TYPES: TxType[] = ["expense", "income"];

type TxRow = {
    id: string;
    type: string;
    amount: number;
    category_id: string | null;
    note: string | null;
    transaction_date: string;
    created_at: string;
    wallet_id: string;
    category: TxCategory;
};

function toTransaction(r: TxRow): Transaction {
    return {
        id: r.id,
        type: r.type as TxType,
        amount: r.amount,
        categoryId: r.category_id,
        category: r.category,
        note: r.note,
        date: r.transaction_date,
        createdAt: r.created_at,
        walletId: r.wallet_id,
    };
}

const listeners = new Set<() => void>();

export function subscribeTransactionsChanged(fn: () => void): () => void {
    listeners.add(fn);
    return () => {
        listeners.delete(fn);
    };
}

// Tells every screen that transactions changed (the query cache reloads).
export function notifyTransactionsChanged() {
    listeners.forEach((fn) => fn());
}

let walletCache: { userId: string; walletId: string } | null = null;

export function clearDefaultWalletCache() {
    walletCache = null;
}

export async function defaultWalletId(userId: string): Promise<string> {
    if (walletCache?.userId === userId) return walletCache.walletId;
    const { data, error } = await supabase
        .from("wallets")
        .select("id")
        .eq("is_archived", false)
        .order("created_at")
        .limit(1)
        .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Không tìm thấy ví");
    walletCache = { userId, walletId: data.id };
    return data.id;
}

function draftColumns(d: TransactionDraft) {
    return {
        type: d.type,
        amount: d.amount,
        category_id: d.categoryId,
        transaction_date: d.date,
        note: d.note,
    };
}

export function validateDraft(d: TransactionDraft): string | null {
    if (!Number.isInteger(d.amount) || d.amount < 1 || d.amount > MAX_AMOUNT)
        return "Số tiền không hợp lệ";
    if (!d.categoryId) return "Chưa chọn mục";
    return null;
}

export async function createTransaction(
    d: TransactionDraft,
): Promise<Transaction> {
    const userId = await requireUserId();
    const walletId = await defaultWalletId(userId);
    const { data, error } = await supabase
        .from("transactions")
        .insert({ ...draftColumns(d), user_id: userId, wallet_id: walletId })
        .select(SELECT)
        .single();
    if (error) throw error;
    notifyTransactionsChanged();
    return toTransaction(data);
}

export async function updateTransaction(
    id: string,
    d: TransactionDraft,
): Promise<Transaction> {
    const { data, error } = await supabase
        .from("transactions")
        .update(draftColumns(d))
        .eq("id", id)
        .select(SELECT)
        .single();
    if (error) throw error;
    notifyTransactionsChanged();
    return toTransaction(data);
}

export async function deleteTransaction(id: string): Promise<void> {
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) throw error;
    notifyTransactionsChanged();
}

export async function restoreTransaction(t: Transaction): Promise<void> {
    const userId = await requireUserId();
    const { error } = await supabase.from("transactions").insert({
        id: t.id,
        created_at: t.createdAt,
        user_id: userId,
        wallet_id: t.walletId,
        type: t.type,
        amount: t.amount,
        category_id: t.categoryId,
        transaction_date: t.date,
        note: t.note,
    });
    if (error) throw error;
    notifyTransactionsChanged();
}

export async function getTransaction(id: string): Promise<Transaction | null> {
    const { data, error } = await supabase
        .from("transactions")
        .select(SELECT)
        .eq("id", id)
        .in("type", APP_TYPES)
        .maybeSingle();
    if (error) throw error;
    return data ? toTransaction(data) : null;
}

export async function listTransactionsForDay(
    date: LocalDate,
): Promise<Transaction[]> {
    const { data, error } = await supabase
        .from("transactions")
        .select(SELECT)
        .eq("transaction_date", date)
        .in("type", APP_TYPES)
        .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toTransaction);
}

// Every transaction from start to end (both included), newest day first and,
// within a day, newest entry first.
export async function listTransactionsBetween(
    start: LocalDate,
    end: LocalDate,
): Promise<Transaction[]> {
    const { data, error } = await supabase
        .from("transactions")
        .select(SELECT)
        .gte("transaction_date", start)
        .lte("transaction_date", end)
        .in("type", APP_TYPES)
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toTransaction);
}

// Every amount ever recorded in one category (null = "Không phân loại") for
// one type, oldest first: the data behind the category history chart.
export async function listCategoryHistory(
    categoryId: string | null,
    type: TxType,
): Promise<{ date: LocalDate; amount: number }[]> {
    const base = supabase
        .from("transactions")
        .select("transaction_date, amount")
        .eq("type", type);
    const filtered =
        categoryId === null
            ? base.is("category_id", null)
            : base.eq("category_id", categoryId);
    const { data, error } = await filtered.order("transaction_date");
    if (error) throw error;
    return (data ?? []).map((r) => ({
        date: r.transaction_date,
        amount: r.amount,
    }));
}

export async function listTransactionsForMonth(
    year: number,
    month: number,
): Promise<Transaction[]> {
    const { start, end } = monthRange(year, month);
    return listTransactionsBetween(start, end);
}
