import type { CategoryRef, TxType } from "./types.ts";

export const UNCATEGORIZED = "Không phân loại";

export function normalizeName(s: string): string {
    return s
        .toLowerCase()
        .replace(/đ/g, "d")
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .trim()
        .replace(/\s+/g, " ");
}

export type CategoryMatch =
    { ok: true; ids: (string | null)[] } | { ok: false; error: string };

export function matchCategory(
    name: string,
    categories: CategoryRef[],
    type?: TxType,
): CategoryMatch {
    const wanted = normalizeName(name);
    const scoped = categories.filter(
        (c) => type === undefined || c.type === type,
    );
    if (wanted === normalizeName(UNCATEGORIZED)) {
        return { ok: true, ids: [null] };
    }
    const ids = scoped
        .filter((c) => normalizeName(c.name) === wanted)
        .map((c) => c.id);
    if (ids.length > 0) return { ok: true, ids };
    const names = [...new Set(scoped.map((c) => c.name)), UNCATEGORIZED];
    return {
        ok: false,
        error: `Không có mục "${name}". Các mục: ${names.join(", ")}.`,
    };
}
