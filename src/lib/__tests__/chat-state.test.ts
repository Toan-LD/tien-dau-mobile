import type { ChatDraft } from "@/lib/chat";
import {
    cardsFor,
    chatReducer,
    describeDraft,
    ERROR_TEXT,
    historyFor,
    historyForRetry,
    initialChatState,
    INTRO_TEXT,
    SUGGESTIONS,
    type ChatMessage,
    type ChatState,
    type DraftMessage,
} from "@/lib/chat-state";

const question: ChatMessage = { id: "m1", role: "user", text: "Chào" };
const answer: ChatMessage = { id: "m2", role: "assistant", text: "Chào bạn" };

const breakfast: ChatDraft = {
    type: "expense",
    amount: 30000,
    categoryId: "category-food",
    categoryName: "Ăn uống",
    date: "2026-11-06",
    note: "ăn sáng",
    replaces: null,
};

function draftMessage(
    id: string,
    number: number,
    status: DraftMessage["status"] = "open",
    draft: ChatDraft = breakfast,
): DraftMessage {
    return {
        id,
        role: "draft",
        number,
        draft,
        status,
        transactionId: status === "saved" ? `transaction-${number}` : null,
        previousAlreadySaved: false,
    };
}

function reply(
    state: ChatState,
    id: string,
    drafts: { id: string; draft: ChatDraft }[],
): ChatState {
    return chatReducer(state, {
        type: "reply",
        id,
        text: "Bấm Lưu nhé.",
        drafts,
    });
}

describe("chatReducer", () => {
    it("send appends the user message and sets pending", () => {
        const state = chatReducer(initialChatState, {
            type: "send",
            id: "m1",
            text: "Chào",
        });
        expect(state).toEqual({ messages: [question], pending: true });
    });

    it("send while pending keeps the state", () => {
        const pendingState: ChatState = { messages: [question], pending: true };
        const state = chatReducer(pendingState, {
            type: "send",
            id: "m3",
            text: "Thêm",
        });
        expect(state).toBe(pendingState);
    });

    it("reply appends the assistant message and clears pending", () => {
        const state = chatReducer(
            { messages: [question], pending: true },
            { type: "reply", id: "m2", text: "Chào bạn", drafts: [] },
        );
        expect(state).toEqual({ messages: [question, answer], pending: false });
    });

    it("reply with drafts appends numbered draft messages after the answer", () => {
        const first = reply({ messages: [question], pending: true }, "a1", [
            { id: "d1", draft: breakfast },
            { id: "d2", draft: { ...breakfast, note: "cafe" } },
        ]);
        const second = reply(
            chatReducer(first, { type: "send", id: "u2", text: "thêm" }),
            "a2",
            [{ id: "d3", draft: breakfast }],
        );
        expect(second.messages.map((message) => message.role)).toEqual([
            "user",
            "assistant",
            "draft",
            "draft",
            "user",
            "assistant",
            "draft",
        ]);
        expect(second.messages[2]).toEqual(draftMessage("d1", 1));
        expect(second.messages[3]).toEqual(
            draftMessage("d2", 2, "open", { ...breakfast, note: "cafe" }),
        );
        expect(second.messages[6]).toEqual(draftMessage("d3", 3));
        expect(second.pending).toBe(false);
    });

    it("save flow: open → saving → saved, and saveFail returns to open", () => {
        const open: ChatState = {
            messages: [draftMessage("d1", 1)],
            pending: false,
        };
        const saving = chatReducer(open, { type: "saveStart", id: "d1" });
        expect(saving.messages[0]).toMatchObject({ status: "saving" });

        const saved = chatReducer(saving, {
            type: "saveDone",
            id: "d1",
            transactionId: "transaction-1",
        });
        expect(saved.messages[0]).toMatchObject({
            status: "saved",
            transactionId: "transaction-1",
        });

        const failed = chatReducer(saving, { type: "saveFail", id: "d1" });
        expect(failed.messages[0]).toMatchObject({
            status: "open",
            transactionId: null,
        });
    });

    it("saveStart is ignored unless the card is open", () => {
        for (const status of [
            "saving",
            "saved",
            "dismissed",
            "replaced",
        ] as const) {
            const state: ChatState = {
                messages: [draftMessage("d1", 1, status)],
                pending: false,
            };
            expect(chatReducer(state, { type: "saveStart", id: "d1" })).toBe(
                state,
            );
        }
    });

    it("dismiss marks an open card dismissed and leaves other states alone", () => {
        const open: ChatState = {
            messages: [draftMessage("d1", 1)],
            pending: false,
        };
        expect(
            chatReducer(open, { type: "dismiss", id: "d1" }).messages[0],
        ).toMatchObject({ status: "dismissed" });
        const saved: ChatState = {
            messages: [draftMessage("d1", 1, "saved")],
            pending: false,
        };
        expect(chatReducer(saved, { type: "dismiss", id: "d1" })).toBe(saved);
    });

    it("a draft with replaces closes the open card it replaces", () => {
        const state = reply(
            { messages: [answer, draftMessage("d1", 1)], pending: true },
            "a2",
            [{ id: "d2", draft: { ...breakfast, amount: 35000, replaces: 1 } }],
        );
        expect(state.messages[1]).toMatchObject({ status: "replaced" });
        expect(state.messages[3]).toMatchObject({
            number: 2,
            status: "open",
            previousAlreadySaved: false,
        });
    });

    it("a draft replacing a card that is saving or saved leaves it alone and warns", () => {
        for (const status of ["saving", "saved"] as const) {
            const state = reply(
                { messages: [draftMessage("d1", 1, status)], pending: true },
                "a2",
                [{ id: "d2", draft: { ...breakfast, replaces: 1 } }],
            );
            expect(state.messages[0]).toMatchObject({ status });
            expect(state.messages[2]).toMatchObject({
                status: "open",
                previousAlreadySaved: true,
            });
        }
    });

    it("a draft replacing a dismissed or unknown card changes nothing else", () => {
        const state = reply(
            { messages: [draftMessage("d1", 1, "dismissed")], pending: true },
            "a2",
            [
                { id: "d2", draft: { ...breakfast, replaces: 1 } },
                { id: "d3", draft: { ...breakfast, replaces: 9 } },
            ],
        );
        expect(state.messages[0]).toMatchObject({ status: "dismissed" });
        expect(state.messages[2]).toMatchObject({
            previousAlreadySaved: false,
        });
        expect(state.messages[3]).toMatchObject({
            previousAlreadySaved: false,
        });
    });

    it("actions for unknown ids after reset are ignored", () => {
        const state = chatReducer(
            { messages: [draftMessage("d1", 1, "saving")], pending: false },
            { type: "reset" },
        );
        expect(
            chatReducer(state, {
                type: "saveDone",
                id: "d1",
                transactionId: "transaction-1",
            }),
        ).toEqual(initialChatState);
        expect(chatReducer(state, { type: "saveFail", id: "d1" })).toEqual(
            initialChatState,
        );
    });

    it("fail appends an error message carrying the question", () => {
        const state = chatReducer(
            { messages: [question], pending: true },
            { type: "fail", id: "m2", kind: "network", question: "Chào" },
        );
        expect(state).toEqual({
            messages: [
                question,
                { id: "m2", role: "error", kind: "network", question: "Chào" },
            ],
            pending: false,
        });
    });

    it("retry moves the failed question to the end and sets pending", () => {
        const failedQuestion: ChatMessage = {
            id: "m3",
            role: "user",
            text: "Hỏi lại",
        };
        const state = chatReducer(
            {
                messages: [
                    question,
                    answer,
                    failedQuestion,
                    {
                        id: "m4",
                        role: "error",
                        kind: "server",
                        question: "Hỏi lại",
                    },
                ],
                pending: false,
            },
            { type: "retry", errorId: "m4" },
        );
        expect(state).toEqual({
            messages: [question, answer, failedQuestion],
            pending: true,
        });
    });

    it("retrying an earlier error keeps later turns before it", () => {
        const firstQuestion: ChatMessage = {
            id: "u1",
            role: "user",
            text: "một",
        };
        const secondQuestion: ChatMessage = {
            id: "u2",
            role: "user",
            text: "hai",
        };
        const messages: ChatMessage[] = [
            firstQuestion,
            { id: "e1", role: "error", kind: "network", question: "một" },
            secondQuestion,
            { id: "e2", role: "error", kind: "network", question: "hai" },
        ];
        const state = chatReducer(
            { messages, pending: false },
            { type: "retry", errorId: "e1" },
        );
        expect(state.messages).toEqual([
            secondQuestion,
            messages[3],
            firstQuestion,
        ]);
        expect(state.pending).toBe(true);
    });

    it("retry with an unknown id keeps the state", () => {
        const state: ChatState = { messages: [question], pending: false };
        expect(chatReducer(state, { type: "retry", errorId: "nope" })).toBe(
            state,
        );
    });

    it("reset returns the initial state", () => {
        expect(
            chatReducer(
                { messages: [question, answer], pending: true },
                { type: "reset" },
            ),
        ).toEqual(initialChatState);
    });
});

describe("historyFor", () => {
    it("drops error messages and unanswered user messages", () => {
        const messages: ChatMessage[] = [
            question,
            { id: "m2", role: "error", kind: "server", question: "Chào" },
            { id: "m3", role: "user", text: "Hỏi lại" },
            { id: "m4", role: "assistant", text: "Trả lời" },
            { id: "m5", role: "user", text: "Chưa có trả lời" },
        ];
        expect(historyFor(messages)).toEqual([
            { role: "user", content: "Hỏi lại" },
            { role: "assistant", content: "Trả lời" },
        ]);
    });

    it("appends one [Thẻ N: ...] line per card with its status", () => {
        const messages: ChatMessage[] = [
            question,
            answer,
            draftMessage("d1", 1, "saved"),
            draftMessage("d2", 2, "open"),
            draftMessage("d3", 3, "saving"),
            draftMessage("d4", 4, "dismissed"),
            draftMessage("d5", 5, "replaced"),
            { id: "u2", role: "user", text: "thêm cafe" },
            { id: "a2", role: "assistant", text: "Bấm Lưu nhé." },
            draftMessage("d6", 6, "open", { ...breakfast, note: null }),
        ];
        expect(historyFor(messages)).toEqual([
            { role: "user", content: "Chào" },
            {
                role: "assistant",
                content:
                    "Chào bạn" +
                    "\n[Thẻ 1: Chi 30.000 đ · Ăn uống · 2026-11-06 · ăn sáng · đã lưu]" +
                    "\n[Thẻ 2: Chi 30.000 đ · Ăn uống · 2026-11-06 · ăn sáng · còn chờ]" +
                    "\n[Thẻ 3: Chi 30.000 đ · Ăn uống · 2026-11-06 · ăn sáng · còn chờ]" +
                    "\n[Thẻ 4: Chi 30.000 đ · Ăn uống · 2026-11-06 · ăn sáng · đã bỏ]" +
                    "\n[Thẻ 5: Chi 30.000 đ · Ăn uống · 2026-11-06 · ăn sáng · đã thay]",
            },
            { role: "user", content: "thêm cafe" },
            {
                role: "assistant",
                content:
                    "Bấm Lưu nhé.\n[Thẻ 6: Chi 30.000 đ · Ăn uống · 2026-11-06 · còn chờ]",
            },
        ]);
    });

    it("keeps only the last 10 turns in order", () => {
        const messages: ChatMessage[] = [];
        for (let index = 1; index <= 7; index += 1) {
            messages.push({ id: `u${index}`, role: "user", text: `q${index}` });
            messages.push({
                id: `a${index}`,
                role: "assistant",
                text: `a${index}`,
            });
        }
        const history = historyFor(messages);
        expect(history).toHaveLength(10);
        expect(history[0]).toEqual({ role: "user", content: "q3" });
        expect(history[9]).toEqual({ role: "assistant", content: "a7" });
    });
});

describe("describeDraft", () => {
    it("joins kind, amount, category, date and note", () => {
        expect(describeDraft(breakfast)).toBe(
            "Chi 30.000 đ · Ăn uống · 2026-11-06 · ăn sáng",
        );
        expect(
            describeDraft({
                ...breakfast,
                type: "income",
                amount: 15_000_000,
                categoryName: "Lương",
                note: null,
            }),
        ).toBe("Thu 15.000.000 đ · Lương · 2026-11-06");
    });
});

describe("cardsFor", () => {
    it("maps saving to open and keeps the last 20", () => {
        const messages: ChatMessage[] = [question, answer];
        for (let number = 1; number <= 22; number += 1) {
            messages.push(
                draftMessage(
                    `d${number}`,
                    number,
                    number === 22 ? "saving" : number === 21 ? "saved" : "open",
                ),
            );
        }
        const cards = cardsFor(messages);
        expect(cards).toHaveLength(20);
        expect(cards[0]).toEqual({ number: 3, status: "open" });
        expect(cards[18]).toEqual({ number: 21, status: "saved" });
        expect(cards[19]).toEqual({ number: 22, status: "open" });
    });
});

describe("screen copy", () => {
    it("mentions recording and suggests a recording sentence", () => {
        expect(INTRO_TEXT).toBe(
            "Hỏi về thu chi, ghi nhanh một khoản, hoặc hỏi cách dùng Tiền Đâu.",
        );
        expect(SUGGESTIONS).toHaveLength(4);
        expect(SUGGESTIONS).toContain("Hôm nay ăn sáng 30k");
        expect(SUGGESTIONS).not.toContain("Hôm qua tôi tiêu những gì?");
    });
});

describe("ERROR_TEXT", () => {
    it("uses the fixed Vietnamese sentences", () => {
        expect(ERROR_TEXT.quota).toBe(
            "Hôm nay bạn đã hỏi đủ 50 câu. Mai hỏi tiếp nhé.",
        );
        expect(ERROR_TEXT.network).toBe(
            "Không kết nối được. Kiểm tra mạng rồi thử lại.",
        );
        expect(ERROR_TEXT.server).toBe("Có lỗi xảy ra, bạn thử lại sau.");
    });
});

describe("historyForRetry", () => {
    it("keeps answered turns that come after the failed question", () => {
        const messages: ChatMessage[] = [
            { id: "u1", role: "user", text: "một" },
            { id: "e1", role: "error", kind: "server", question: "một" },
            { id: "u2", role: "user", text: "hai" },
            { id: "a2", role: "assistant", text: "trả lời hai" },
        ];
        expect(historyForRetry(messages, "e1")).toEqual([
            { role: "user", content: "hai" },
            { role: "assistant", content: "trả lời hai" },
        ]);
    });
});
