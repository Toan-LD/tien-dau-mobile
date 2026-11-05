import { QueryClient } from "@tanstack/react-query";

import {
    dayQuery,
    findCachedTransaction,
    monthQuery,
    transactionQuery,
} from "@/lib/queries";
import type { Transaction } from "@/lib/transactions";

jest.mock("@/lib/supabase", () => ({
    supabase: jest.requireActual("@/test-utils/supabase-mock").fakeSupabase,
}));

// gcTime Infinity: no 5-minute cleanup timer, so Jest can exit.
function newClient() {
    return new QueryClient({
        defaultOptions: { queries: { gcTime: Infinity } },
    });
}

function tx(id: string, date: string): Transaction {
    return {
        id,
        type: "expense",
        amount: 1000,
        categoryId: null,
        category: null,
        note: null,
        date,
        createdAt: `${date}T03:00:00.000Z`,
        walletId: "w1",
    };
}

describe("findCachedTransaction", () => {
    it("finds a row in a cached day list", () => {
        const client = newClient();
        client.setQueryData(dayQuery("2026-11-05").queryKey, [
            tx("a", "2026-11-05"),
            tx("b", "2026-11-05"),
        ]);
        expect(findCachedTransaction(client, "b")?.id).toBe("b");
    });

    it("also looks in cached month lists", () => {
        const client = newClient();
        client.setQueryData(monthQuery(2026, 10).queryKey, [
            tx("m", "2026-10-02"),
        ]);
        expect(findCachedTransaction(client, "m")?.date).toBe("2026-10-02");
    });

    it("returns undefined when nothing is cached", () => {
        expect(findCachedTransaction(newClient(), "x")).toBeUndefined();
    });
});

it("keeps the edit-screen query out of the transactions group", () => {
    // Invalidating ["transactions"] after a delete must not refetch it.
    expect(transactionQuery("a").queryKey[0]).not.toBe("transactions");
    expect(dayQuery("2026-11-05").queryKey[0]).toBe("transactions");
});
