import {
    FunctionsFetchError,
    FunctionsHttpError,
    FunctionsRelayError,
} from "@supabase/supabase-js";

import {
    CHAT_REQUEST_TIMEOUT_MILLISECONDS,
    askChat,
    cleanReply,
    parseDrafts,
    type ChatDraft,
} from "@/lib/chat";
import { fake } from "@/test-utils/supabase-mock";

jest.mock("@/lib/supabase", () => ({
    supabase: jest.requireActual("@/test-utils/supabase-mock").fakeSupabase,
}));

beforeEach(() => fake.reset());

const draft: ChatDraft = {
    type: "expense",
    amount: 30000,
    categoryId: "category-food",
    categoryName: "Ăn uống",
    date: "2026-11-06",
    note: "ăn sáng",
    replaces: null,
};

describe("askChat", () => {
    it("calls the chat function and cleans the reply", async () => {
        fake.invokeResult = {
            data: { reply: "**Tổng** chi là 30.000 đ", remaining: 49 },
            error: null,
        };
        const history = [
            { role: "user" as const, content: "Chào" },
            { role: "assistant" as const, content: "Chào bạn" },
        ];

        const result = await askChat(
            "Tháng này tôi chi bao nhiêu?",
            history,
            [],
        );

        expect(result).toEqual({
            ok: true,
            reply: "Tổng chi là 30.000 đ",
            remaining: 49,
            drafts: [],
        });
        expect(fake.callsTo("invoke")).toEqual([
            [
                "chat",
                {
                    body: {
                        question: "Tháng này tôi chi bao nhiêu?",
                        history,
                        cards: [],
                    },
                    timeout: CHAT_REQUEST_TIMEOUT_MILLISECONDS,
                },
            ],
        ]);
    });

    it("sends cards and returns parsed drafts", async () => {
        fake.invokeResult = {
            data: { reply: "Bấm Lưu nhé.", remaining: 48, drafts: [draft] },
            error: null,
        };
        const cards = [{ number: 1, status: "open" as const }];

        const result = await askChat("không, 35k", [], cards);

        expect(result).toEqual({
            ok: true,
            reply: "Bấm Lưu nhé.",
            remaining: 48,
            drafts: [draft],
        });
        const options = fake.callsTo("invoke")[0][1] as { body: unknown };
        expect(options.body).toEqual({
            question: "không, 35k",
            history: [],
            cards,
        });
    });

    it("treats missing or malformed drafts as empty and drops bad cards", async () => {
        fake.invokeResult = {
            data: { reply: "Chào", remaining: 48 },
            error: null,
        };
        expect(await askChat("Chào", [], [])).toMatchObject({ drafts: [] });

        fake.invokeResult = {
            data: { reply: "Chào", remaining: 48, drafts: "x" },
            error: null,
        };
        expect(await askChat("Chào", [], [])).toMatchObject({ drafts: [] });

        expect(
            parseDrafts([
                draft,
                { ...draft, amount: "30k" },
                { ...draft, amount: 0 },
                { ...draft, amount: 1_000_000_000_000 },
                { ...draft, type: "transfer" },
                { ...draft, date: "06/11/2026" },
                { ...draft, replaces: 0 },
                { ...draft, note: 5 },
                null,
            ]),
        ).toEqual([draft]);
        expect(parseDrafts({ ...draft, replaces: 2 })).toEqual([]);
        expect(parseDrafts([{ ...draft, replaces: 2 }])).toEqual([
            { ...draft, replaces: 2 },
        ]);
    });

    it("gives the request a 40 second timeout, above the server's 30 second cap", () => {
        expect(CHAT_REQUEST_TIMEOUT_MILLISECONDS).toBe(40_000);
    });

    it("maps a timed-out request (aborted fetch) to network so Thử lại shows", async () => {
        fake.invokeResult = {
            data: null,
            error: new FunctionsFetchError(
                new Error("The operation was aborted"),
            ),
        };
        expect(await askChat("câu hỏi", [], [])).toEqual({
            ok: false,
            kind: "network",
        });
    });

    it.each([
        [429, "quota"],
        [500, "server"],
        [504, "server"],
        [401, "server"],
    ])("maps HTTP %i to %s", async (status, kind) => {
        fake.invokeResult = {
            data: null,
            error: new FunctionsHttpError({ status }),
        };
        expect(await askChat("câu hỏi", [], [])).toEqual({ ok: false, kind });
    });

    it("maps a relay error to server", async () => {
        fake.invokeResult = {
            data: null,
            error: new FunctionsRelayError({}),
        };
        expect(await askChat("câu hỏi", [], [])).toEqual({
            ok: false,
            kind: "server",
        });
    });

    it("maps a fetch error to network", async () => {
        fake.invokeResult = {
            data: null,
            error: new FunctionsFetchError({}),
        };
        expect(await askChat("câu hỏi", [], [])).toEqual({
            ok: false,
            kind: "network",
        });
    });

    it("maps any thrown error to network", async () => {
        fake.invokeThrows = new Error("boom");
        expect(await askChat("câu hỏi", [], [])).toEqual({
            ok: false,
            kind: "network",
        });
    });
});

describe("cleanReply", () => {
    it("removes bold markers and heading markers", () => {
        expect(cleanReply("## Tiêu đề\n**đậm** và __gạch__")).toBe(
            "Tiêu đề\nđậm và gạch",
        );
    });

    it("turns star bullets into dashes and trims", () => {
        expect(cleanReply("  \n* một\n* hai\n\n")).toBe("- một\n- hai");
    });
});
