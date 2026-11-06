import {
    chatReducer,
    ERROR_TEXT,
    historyFor,
    initialChatState,
    type ChatMessage,
    type ChatState,
} from "@/lib/chat-state";

const question: ChatMessage = { id: "m1", role: "user", text: "Chào" };
const answer: ChatMessage = { id: "m2", role: "assistant", text: "Chào bạn" };

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
            { type: "reply", id: "m2", text: "Chào bạn" },
        );
        expect(state).toEqual({ messages: [question, answer], pending: false });
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

    it("retry removes the error message without adding a user message", () => {
        const state = chatReducer(
            {
                messages: [
                    question,
                    {
                        id: "m2",
                        role: "error",
                        kind: "server",
                        question: "Chào",
                    },
                ],
                pending: false,
            },
            { type: "retry", errorId: "m2" },
        );
        expect(state).toEqual({ messages: [question], pending: true });
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
