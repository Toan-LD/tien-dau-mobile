import { fake } from "@/test-utils/supabase-mock";
import {
    clearDefaultWalletCache,
    createTransaction,
    deleteTransaction,
    listTransactionsForDay,
    restoreTransaction,
    subscribeTransactionsChanged,
    validateDraft,
    type Transaction,
    type TransactionDraft,
} from "@/lib/transactions";

jest.mock("@/lib/supabase", () => ({
    supabase: jest.requireActual("@/test-utils/supabase-mock").fakeSupabase,
}));

const draft: TransactionDraft = {
    type: "expense",
    amount: 35000,
    categoryId: "c1",
    date: "2026-11-05",
    note: null,
};

const existing: Transaction = {
    id: "tx-1",
    type: "expense",
    amount: 35000,
    categoryId: "c1",
    category: { id: "c1", name: "Ăn uống", icon: "restaurant" },
    note: "phở",
    date: "2026-11-04",
    createdAt: "2026-11-04T03:00:00.000Z",
    walletId: "w1",
};

const row = {
    id: "tx-1",
    type: "expense",
    amount: 35000,
    category_id: "c1",
    note: "phở",
    transaction_date: "2026-11-04",
    created_at: "2026-11-04T03:00:00.000Z",
    wallet_id: "w1",
    category: { id: "c1", name: "Ăn uống", icon: "restaurant" },
};

beforeEach(() => {
    fake.reset();
    clearDefaultWalletCache();
});

describe("validateDraft", () => {
    it("rejects bad amounts and empty category", () => {
        expect(validateDraft({ ...draft, amount: 0 })).not.toBeNull();
        expect(validateDraft({ ...draft, amount: 1.5 })).not.toBeNull();
        expect(
            validateDraft({ ...draft, amount: 1_000_000_000_000 }),
        ).not.toBeNull();
        expect(validateDraft({ ...draft, categoryId: "" })).not.toBeNull();
    });
    it("accepts a valid draft", () => {
        expect(validateDraft(draft)).toBeNull();
        expect(validateDraft({ ...draft, amount: 999_999_999_999 })).toBeNull();
    });
});

describe("restoreTransaction", () => {
    it("re-inserts every original column plus user_id", async () => {
        await restoreTransaction(existing);
        expect(fake.lastInsert).toMatchObject({
            id: existing.id,
            created_at: existing.createdAt,
            wallet_id: existing.walletId,
            category_id: existing.categoryId,
            note: existing.note,
            transaction_date: existing.date,
            amount: existing.amount,
            type: existing.type,
            user_id: "user-1",
        });
    });

    it("notifies listeners until unsubscribed", async () => {
        const fn = jest.fn();
        const off = subscribeTransactionsChanged(fn);
        await restoreTransaction(existing);
        expect(fn).toHaveBeenCalledTimes(1);
        off();
        await restoreTransaction(existing);
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it("does not notify on error", async () => {
        const fn = jest.fn();
        const off = subscribeTransactionsChanged(fn);
        fake.enqueue("transactions", { error: { message: "boom" } });
        await expect(restoreTransaction(existing)).rejects.toMatchObject({
            message: "boom",
        });
        expect(fn).not.toHaveBeenCalled();
        off();
    });
});

describe("createTransaction", () => {
    it("uses the earliest active wallet and sets user_id", async () => {
        fake.enqueue("wallets", { data: { id: "w1" } });
        fake.enqueue("transactions", { data: row });
        const t = await createTransaction(draft);
        expect(fake.lastInsert).toMatchObject({
            user_id: "user-1",
            wallet_id: "w1",
            category_id: "c1",
            amount: 35000,
            transaction_date: "2026-11-05",
            type: "expense",
            note: null,
        });
        expect(t).toEqual(existing);
    });

    it("caches the wallet per user only", async () => {
        fake.enqueue("wallets", { data: { id: "w1" } });
        fake.enqueue("transactions", { data: row });
        fake.enqueue("transactions", { data: row });
        await createTransaction(draft);
        await createTransaction(draft);
        expect(
            fake.callsTo("from").filter(([t]) => t === "wallets"),
        ).toHaveLength(1);

        fake.userId = "user-2";
        fake.enqueue("wallets", { data: { id: "w2" } });
        fake.enqueue("transactions", { data: row });
        await createTransaction(draft);
        expect(fake.lastInsert).toMatchObject({
            user_id: "user-2",
            wallet_id: "w2",
        });
    });

    it("throws when there is no wallet", async () => {
        fake.enqueue("wallets", { data: null });
        await expect(createTransaction(draft)).rejects.toThrow(
            "Không tìm thấy ví",
        );
    });
});

describe("deleteTransaction and queries", () => {
    it("notifies after delete", async () => {
        const fn = jest.fn();
        const off = subscribeTransactionsChanged(fn);
        await deleteTransaction("tx-1");
        expect(fn).toHaveBeenCalledTimes(1);
        off();
    });

    it("lists a day and maps rows", async () => {
        fake.enqueue("transactions", { data: [row] });
        expect(await listTransactionsForDay("2026-11-04")).toEqual([existing]);
        expect(fake.callsTo("eq")).toContainEqual([
            "transaction_date",
            "2026-11-04",
        ]);
    });
});
