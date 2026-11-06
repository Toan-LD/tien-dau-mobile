import { UNCATEGORIZED } from "./categories.ts";
import { formatChange, formatShare, formatVND } from "./money.ts";
import { formatDate } from "./periods.ts";
import type { Tx, TxType } from "./types.ts";

function sum(txs: Tx[]): number {
    return txs.reduce((acc, t) => acc + t.amount, 0);
}

function ofType(txs: Tx[], type: TxType): Tx[] {
    return txs.filter((t) => t.type === type);
}

function categoryTotals(
    txs: Tx[],
    type: TxType,
): Map<string, { total: number; count: number }> {
    const totals = new Map<string, { total: number; count: number }>();
    for (const t of ofType(txs, type)) {
        const name = t.categoryName ?? UNCATEGORIZED;
        const entry = totals.get(name) ?? { total: 0, count: 0 };
        entry.total += t.amount;
        entry.count += 1;
        totals.set(name, entry);
    }
    return totals;
}

export function summarize(txs: Tx[]): {
    expense: string;
    income: string;
    balance: string;
    count: number;
} {
    const expense = sum(ofType(txs, "expense"));
    const income = sum(ofType(txs, "income"));
    return {
        expense: formatVND(expense),
        income: formatVND(income),
        balance: formatVND(income - expense),
        count: txs.length,
    };
}

export function byCategory(
    txs: Tx[],
    type: TxType,
): {
    total: string;
    categories: {
        name: string;
        total: string;
        share: string;
        count: number;
    }[];
} {
    const totals = categoryTotals(txs, type);
    const whole = sum(ofType(txs, type));
    const categories = [...totals.entries()]
        .sort(([nameA, a], [nameB, b]) =>
            b.total !== a.total
                ? b.total - a.total
                : nameA.localeCompare(nameB, "vi"),
        )
        .map(([name, { total, count }]) => ({
            name,
            total: formatVND(total),
            share: formatShare(total, whole),
            count,
        }));
    return { total: formatVND(whole), categories };
}

type Move = { name: string; diff: number; change: string };

export function compare(
    base: Tx[],
    current: Tx[],
    type: TxType,
    breakdown: boolean,
): {
    base_total: string;
    total: string;
    change: string;
    biggest_increases?: { name: string; change: string }[];
    biggest_decreases?: { name: string; change: string }[];
} {
    const baseTotal = sum(ofType(base, type));
    const total = sum(ofType(current, type));
    const result = {
        base_total: formatVND(baseTotal),
        total: formatVND(total),
        change: formatChange(baseTotal, total),
    };
    if (!breakdown) return result;

    const before = categoryTotals(base, type);
    const after = categoryTotals(current, type);
    const moves: Move[] = [...new Set([...before.keys(), ...after.keys()])]
        .map((name) => {
            const b = before.get(name)?.total ?? 0;
            const a = after.get(name)?.total ?? 0;
            return { name, diff: a - b, change: formatChange(b, a) };
        })
        .filter((m) => m.diff !== 0);
    const top = (list: Move[]) =>
        list.slice(0, 3).map(({ name, change }) => ({ name, change }));
    const byName = (a: Move, b: Move) => a.name.localeCompare(b.name, "vi");
    return {
        ...result,
        biggest_increases: top(
            moves
                .filter((m) => m.diff > 0)
                .sort((a, b) => b.diff - a.diff || byName(a, b)),
        ),
        biggest_decreases: top(
            moves
                .filter((m) => m.diff < 0)
                .sort((a, b) => a.diff - b.diff || byName(a, b)),
        ),
    };
}

export function listTxs(
    txs: Tx[],
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
    const newestFirst = (a: Tx, b: Tx) =>
        b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);
    const sorted = [...txs].sort(
        sort === "largest"
            ? (a, b) => b.amount - a.amount || newestFirst(a, b)
            : newestFirst,
    );
    const items = sorted.slice(0, limit).map((t) => ({
        date: formatDate(t.date),
        kind: t.type === "expense" ? ("chi" as const) : ("thu" as const),
        category: t.categoryName ?? UNCATEGORIZED,
        amount: formatVND(t.amount),
        note: t.note,
    }));
    return { total_count: txs.length, shown: items.length, items };
}
