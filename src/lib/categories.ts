import { requireUserId } from "@/lib/session";
import { supabase } from "@/lib/supabase";

export type TxType = "expense" | "income";
export type Category = {
    id: string;
    name: string;
    icon: string | null;
    type: TxType;
    sortOrder: number;
};

export class DuplicateCategoryError extends Error {}

export function normalizeCategoryName(name: string): string {
    return name.trim().replace(/\s+/g, " ");
}

type CategoryRow = {
    id: string;
    name: string;
    icon: string | null;
    type: string;
    sort_order: number;
};

function toCategory(r: CategoryRow): Category {
    return {
        id: r.id,
        name: r.name,
        icon: r.icon,
        type: r.type as TxType,
        sortOrder: r.sort_order,
    };
}

export async function listCategories(type: TxType): Promise<Category[]> {
    const { data, error } = await supabase
        .from("categories")
        .select("id,name,icon,type,sort_order")
        .eq("type", type)
        .order("sort_order")
        .order("created_at");
    if (error) throw error;
    return (data ?? []).map(toCategory);
}

export async function createCategory(input: {
    name: string;
    iconKey: string;
    type: TxType;
    sortOrder: number;
}): Promise<Category> {
    const userId = await requireUserId();
    const { data, error } = await supabase
        .from("categories")
        .insert({
            user_id: userId,
            name: normalizeCategoryName(input.name),
            icon: input.iconKey,
            type: input.type,
            sort_order: input.sortOrder,
        })
        .select("id,name,icon,type,sort_order")
        .single();
    if (error) {
        if (error.code === "23505")
            throw new DuplicateCategoryError("Mục đã có");
        throw error;
    }
    return toCategory(data);
}

// Transactions in a deleted category keep their amount and show as
// "Không phân loại": transactions.category_id is ON DELETE SET NULL.
export async function deleteCategory(id: string): Promise<void> {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) throw error;
}

// Moves one category up (-1) or down (+1) and renumbers the list 1..n, so
// ties and gaps in sort_order can't undo the user's order.
export function moveCategory(
    list: Category[],
    id: string,
    step: -1 | 1,
): Category[] {
    const from = list.findIndex((c) => c.id === id);
    const to = from + step;
    if (from < 0 || to < 0 || to >= list.length) return list;
    const next = [...list];
    [next[from], next[to]] = [next[to], next[from]];
    return next.map((c, i) => ({ ...c, sortOrder: i + 1 }));
}

export async function saveCategoryOrder(
    before: Category[],
    after: Category[],
): Promise<void> {
    const old = new Map(before.map((c) => [c.id, c.sortOrder]));
    const changed = after.filter((c) => old.get(c.id) !== c.sortOrder);
    const results = await Promise.all(
        changed.map((c) =>
            supabase
                .from("categories")
                .update({ sort_order: c.sortOrder })
                .eq("id", c.id),
        ),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) throw failed.error;
}
