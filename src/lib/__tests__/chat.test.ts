import {
    FunctionsFetchError,
    FunctionsHttpError,
    FunctionsRelayError,
} from "@supabase/supabase-js";

import { askChat, cleanReply } from "@/lib/chat";
import { fake } from "@/test-utils/supabase-mock";

jest.mock("@/lib/supabase", () => ({
    supabase: jest.requireActual("@/test-utils/supabase-mock").fakeSupabase,
}));

beforeEach(() => fake.reset());

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

        const result = await askChat("Tháng này tôi chi bao nhiêu?", history);

        expect(result).toEqual({
            ok: true,
            reply: "Tổng chi là 30.000 đ",
            remaining: 49,
        });
        expect(fake.callsTo("invoke")).toEqual([
            [
                "chat",
                {
                    body: {
                        question: "Tháng này tôi chi bao nhiêu?",
                        history,
                    },
                },
            ],
        ]);
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
        expect(await askChat("câu hỏi", [])).toEqual({ ok: false, kind });
    });

    it("maps a relay error to server", async () => {
        fake.invokeResult = {
            data: null,
            error: new FunctionsRelayError({}),
        };
        expect(await askChat("câu hỏi", [])).toEqual({
            ok: false,
            kind: "server",
        });
    });

    it("maps a fetch error to network", async () => {
        fake.invokeResult = {
            data: null,
            error: new FunctionsFetchError({}),
        };
        expect(await askChat("câu hỏi", [])).toEqual({
            ok: false,
            kind: "network",
        });
    });

    it("maps any thrown error to network", async () => {
        fake.invokeThrows = new Error("boom");
        expect(await askChat("câu hỏi", [])).toEqual({
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
