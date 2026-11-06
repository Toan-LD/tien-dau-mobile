import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { vietnamToday } from "../../_shared/periods.ts";
import type { CategoryRef } from "../../_shared/types.ts";
import { buildFixture } from "./fixture.ts";
import { requireLocalSupabaseUrl } from "./local-only.ts";

export const EVAL_EMAIL = "eval@tiendau.local";
export const EVAL_PASSWORD = "eval-local-only-password";

const INSERT_BATCH_SIZE = 500;

function requireEnvironment(...names: string[]): string {
    for (const name of names) {
        const value = Deno.env.get(name);
        if (value) return value;
    }
    throw new Error(`Thiếu biến môi trường ${names.join(" hoặc ")}`);
}

async function findOrCreateEvalUser(admin: SupabaseClient): Promise<string> {
    for (let page = 1; ; page++) {
        const { data, error } = await admin.auth.admin.listUsers({
            page,
            perPage: 200,
        });
        if (error) throw new Error(error.message);
        const existing = data.users.find((user) => user.email === EVAL_EMAIL);
        if (existing) return existing.id;
        if (data.users.length < 200) break;
    }
    const { data, error } = await admin.auth.admin.createUser({
        email: EVAL_EMAIL,
        password: EVAL_PASSWORD,
        email_confirm: true,
    });
    if (error) throw new Error(error.message);
    return data.user.id;
}

async function seed(): Promise<void> {
    const url = requireLocalSupabaseUrl();
    const serviceKey = requireEnvironment(
        "SUPABASE_SERVICE_ROLE_KEY",
        "SERVICE_ROLE_KEY",
    );
    const admin = createClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    const userId = await findOrCreateEvalUser(admin);

    const { data: wallet, error: walletError } = await admin
        .from("wallets")
        .select("id")
        .eq("user_id", userId)
        .order("created_at")
        .limit(1)
        .single();
    if (walletError) throw new Error(walletError.message);

    const { data: categories, error: categoryError } = await admin
        .from("categories")
        .select("id, name, type")
        .eq("user_id", userId)
        .overrideTypes<CategoryRef[], { merge: false }>();
    if (categoryError) throw new Error(categoryError.message);

    const { error: deleteError } = await admin
        .from("transactions")
        .delete()
        .eq("user_id", userId);
    if (deleteError) throw new Error(deleteError.message);

    const transactions = buildFixture(vietnamToday(new Date()), categories);
    const rows = transactions.map((transaction) => ({
        user_id: userId,
        wallet_id: wallet.id,
        category_id: transaction.categoryId,
        type: transaction.type,
        amount: transaction.amount,
        transaction_date: transaction.date,
        note: transaction.note,
        created_at: transaction.createdAt,
    }));
    for (let from = 0; from < rows.length; from += INSERT_BATCH_SIZE) {
        const { error } = await admin
            .from("transactions")
            .insert(rows.slice(from, from + INSERT_BATCH_SIZE));
        if (error) throw new Error(error.message);
    }

    const { count, error: countError } = await admin
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
    if (countError) throw new Error(countError.message);
    console.log(
        `Đã nạp ${rows.length} giao dịch cho ${EVAL_EMAIL}; hiện có ${count} dòng.`,
    );
}

if (import.meta.main) {
    try {
        await seed();
    } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        Deno.exit(1);
    }
}
