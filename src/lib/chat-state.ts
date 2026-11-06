import type { ChatErrorKind, ChatTurn } from "@/lib/chat";

export type ChatMessage =
    | { id: string; role: "user"; text: string }
    | { id: string; role: "assistant"; text: string }
    | { id: string; role: "error"; kind: ChatErrorKind; question: string };

export type ChatState = { messages: ChatMessage[]; pending: boolean };

export type ChatAction =
    | { type: "send"; id: string; text: string }
    | { type: "retry"; errorId: string }
    | { type: "reply"; id: string; text: string }
    | { type: "fail"; id: string; kind: ChatErrorKind; question: string }
    | { type: "reset" };

export const initialChatState: ChatState = { messages: [], pending: false };

export const INTRO_TEXT = "Hỏi về thu chi của bạn hoặc cách dùng Tiền Đâu.";

export const SUGGESTIONS: string[] = [
    "Tháng này tôi chi bao nhiêu?",
    "Mục nào tốn nhiều nhất tháng này?",
    "So với tháng trước thì sao?",
    "Hôm qua tôi tiêu những gì?",
];

export const ERROR_TEXT: Record<ChatErrorKind, string> = {
    network: "Không kết nối được. Kiểm tra mạng rồi thử lại.",
    quota: "Hôm nay bạn đã hỏi đủ 50 câu. Mai hỏi tiếp nhé.",
    server: "Có lỗi xảy ra, bạn thử lại sau.",
};

const HISTORY_LIMIT = 10;

function splitFailedQuestion(messages: ChatMessage[], errorId: string) {
    const errorIndex = messages.findIndex((message) => message.id === errorId);
    const failed = messages[errorIndex];
    if (failed?.role !== "error") return null;
    const before = messages[errorIndex - 1];
    const hasQuestion =
        before?.role === "user" && before.text === failed.question;
    const questionIndex = hasQuestion ? errorIndex - 1 : -1;
    const remaining = messages.filter(
        (_message, index) => index !== errorIndex && index !== questionIndex,
    );
    const question: ChatMessage = hasQuestion
        ? before
        : { id: failed.id, role: "user", text: failed.question };
    return { remaining, question };
}

export function historyForRetry(
    messages: ChatMessage[],
    errorId: string,
): ChatTurn[] {
    const split = splitFailedQuestion(messages, errorId);
    return split ? historyFor(split.remaining) : [];
}

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
    switch (action.type) {
        case "send":
            if (state.pending) return state;
            return {
                messages: [
                    ...state.messages,
                    { id: action.id, role: "user", text: action.text },
                ],
                pending: true,
            };
        case "retry": {
            const split = splitFailedQuestion(state.messages, action.errorId);
            if (!split) return state;
            return {
                messages: [...split.remaining, split.question],
                pending: true,
            };
        }
        case "reply":
            return {
                messages: [
                    ...state.messages,
                    { id: action.id, role: "assistant", text: action.text },
                ],
                pending: false,
            };
        case "fail":
            return {
                messages: [
                    ...state.messages,
                    {
                        id: action.id,
                        role: "error",
                        kind: action.kind,
                        question: action.question,
                    },
                ],
                pending: false,
            };
        case "reset":
            return initialChatState;
    }
}

export function historyFor(messages: ChatMessage[]): ChatTurn[] {
    const turns: ChatTurn[] = [];
    messages.forEach((message, index) => {
        const next = messages[index + 1];
        if (message.role === "user" && next?.role === "assistant") {
            turns.push({ role: "user", content: message.text });
            turns.push({ role: "assistant", content: next.text });
        }
    });
    return turns.slice(-HISTORY_LIMIT);
}
