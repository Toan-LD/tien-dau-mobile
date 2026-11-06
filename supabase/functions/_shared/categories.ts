import type { CategoryRef, TransactionType } from "./types.ts";

export const UNCATEGORIZED = "Không phân loại";

export function normalizeName(text: string): string {
    return text
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
    type?: TransactionType,
): CategoryMatch {
    const wanted = normalizeName(name);
    const scoped = categories.filter(
        (category) => type === undefined || category.type === type,
    );
    if (wanted === normalizeName(UNCATEGORIZED)) {
        return { ok: true, ids: [null] };
    }
    const ids = scoped
        .filter((category) => normalizeName(category.name) === wanted)
        .map((category) => category.id);
    if (ids.length > 0) return { ok: true, ids };
    const names = [
        ...new Set(scoped.map((category) => category.name)),
        UNCATEGORIZED,
    ];
    return {
        ok: false,
        error: `Không có mục "${name}". Các mục: ${names.join(", ")}.`,
    };
}
