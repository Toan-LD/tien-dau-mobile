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
