import { UNCATEGORIZED } from "./categories.ts";
import { formatChange, formatShare, formatVND } from "./money.ts";
import { formatDate } from "./periods.ts";
import type { Transaction, TransactionType } from "./types.ts";

function sum(transactions: Transaction[]): number {
    return transactions.reduce(
        (runningTotal, transaction) => runningTotal + transaction.amount,
        0,
    );
}

function ofType(
    transactions: Transaction[],
    type: TransactionType,
): Transaction[] {
    return transactions.filter((transaction) => transaction.type === type);
}

function categoryTotals(
    transactions: Transaction[],
    type: TransactionType,
): Map<string, { total: number; count: number }> {
    const totals = new Map<string, { total: number; count: number }>();
    for (const transaction of ofType(transactions, type)) {
        const name = transaction.categoryName ?? UNCATEGORIZED;
        const entry = totals.get(name) ?? { total: 0, count: 0 };
        entry.total += transaction.amount;
        entry.count += 1;
        totals.set(name, entry);
    }
    return totals;
}

export function summarize(transactions: Transaction[]): {
    expense: string;
    income: string;
    balance: string;
    count: number;
} {
    const expense = sum(ofType(transactions, "expense"));
    const income = sum(ofType(transactions, "income"));
    return {
        expense: formatVND(expense),
        income: formatVND(income),
        balance: formatVND(income - expense),
        count: transactions.length,
    };
}

export function byCategory(
    transactions: Transaction[],
    type: TransactionType,
): {
    total: string;
    categories: {
        name: string;
        total: string;
        share: string;
        count: number;
    }[];
} {
    const totals = categoryTotals(transactions, type);
    const whole = sum(ofType(transactions, type));
    const categories = [...totals.entries()]
        .sort(([leftName, left], [rightName, right]) =>
            right.total !== left.total
                ? right.total - left.total
                : leftName.localeCompare(rightName, "vi"),
        )
        .map(([name, { total, count }]) => ({
            name,
            total: formatVND(total),
            share: formatShare(total, whole),
            count,
        }));
    return { total: formatVND(whole), categories };
}

type Move = { name: string; difference: number; change: string };

export function compare(
    previous: Transaction[],
    current: Transaction[],
    type: TransactionType,
    breakdown: boolean,
): {
    base_total: string;
    total: string;
    change: string;
    biggest_increases?: { name: string; change: string }[];
    biggest_decreases?: { name: string; change: string }[];
} {
    const previousTotal = sum(ofType(previous, type));
    const total = sum(ofType(current, type));
    const result = {
        base_total: formatVND(previousTotal),
        total: formatVND(total),
        change: formatChange(previousTotal, total),
    };
    if (!breakdown) return result;

    const before = categoryTotals(previous, type);
    const after = categoryTotals(current, type);
    const moves: Move[] = [...new Set([...before.keys(), ...after.keys()])]
        .map((name) => {
            const beforeTotal = before.get(name)?.total ?? 0;
            const afterTotal = after.get(name)?.total ?? 0;
            return {
                name,
                difference: afterTotal - beforeTotal,
                change: formatChange(beforeTotal, afterTotal),
            };
        })
        .filter((move) => move.difference !== 0);
    const top = (list: Move[]) =>
        list.slice(0, 3).map(({ name, change }) => ({ name, change }));
    const byName = (left: Move, right: Move) =>
        left.name.localeCompare(right.name, "vi");
    return {
        ...result,
        biggest_increases: top(
            moves
                .filter((move) => move.difference > 0)
                .sort(
                    (left, right) =>
                        right.difference - left.difference ||
                        byName(left, right),
                ),
        ),
        biggest_decreases: top(
            moves
                .filter((move) => move.difference < 0)
                .sort(
                    (left, right) =>
                        left.difference - right.difference ||
                        byName(left, right),
                ),
        ),
    };
}

export function listTransactions(
    transactions: Transaction[],
    sort: "newest" | "largest",
    limit: number,
): {
    total_count: number;
    shown: number;
    items: {
        date: string;
        kind: "chi" | "thu";
        category: string;
        amount: string;
        note: string | null;
    }[];
} {
    const newestFirst = (left: Transaction, right: Transaction) =>
        right.date.localeCompare(left.date) ||
        right.createdAt.localeCompare(left.createdAt);
    const sorted = [...transactions].sort(
        sort === "largest"
            ? (left, right) =>
                  right.amount - left.amount || newestFirst(left, right)
            : newestFirst,
    );
    const items = sorted.slice(0, limit).map((transaction) => ({
        date: formatDate(transaction.date),
        kind:
            transaction.type === "expense"
                ? ("chi" as const)
                : ("thu" as const),
        category: transaction.categoryName ?? UNCATEGORIZED,
        amount: formatVND(transaction.amount),
        note: transaction.note,
    }));
    return { total_count: transactions.length, shown: items.length, items };
}
