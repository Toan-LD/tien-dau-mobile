import type { CardState, ChatDraft, ChatErrorKind, ChatTurn } from "@/lib/chat";
import { formatVND } from "@/lib/money";

export type DraftStatus =
    "open" | "saving" | "saved" | "dismissed" | "replaced";

export type DraftMessage = {
    id: string;
    role: "draft";
    number: number;
    draft: ChatDraft;
    status: DraftStatus;
    transactionId: string | null;
    previousAlreadySaved: boolean;
};

export type ChatMessage =
    | { id: string; role: "user"; text: string }
    | { id: string; role: "assistant"; text: string }
    | { id: string; role: "error"; kind: ChatErrorKind; question: string }
    | DraftMessage;

export type ChatState = { messages: ChatMessage[]; pending: boolean };

export type ChatAction =
    | { type: "send"; id: string; text: string }
    | { type: "retry"; errorId: string }
    | {
          type: "reply";
          id: string;
          text: string;
          drafts: { id: string; draft: ChatDraft }[];
      }
    | { type: "fail"; id: string; kind: ChatErrorKind; question: string }
    | { type: "saveStart"; id: string }
    | { type: "saveDone"; id: string; transactionId: string }
    | { type: "saveFail"; id: string }
    | { type: "dismiss"; id: string }
    | { type: "reset" };

export const initialChatState: ChatState = { messages: [], pending: false };

export const INTRO_TEXT =
    "Hỏi về thu chi, ghi nhanh một khoản, hoặc hỏi cách dùng Tiền Đâu.";

export const SUGGESTIONS: string[] = [
    "Hôm nay ăn sáng 30k",
    "Tháng này tôi chi bao nhiêu?",
    "Mục nào tốn nhiều nhất tháng này?",
    "So với tháng trước thì sao?",
];

export const ERROR_TEXT: Record<ChatErrorKind, string> = {
    network: "Không kết nối được. Kiểm tra mạng rồi thử lại.",
    quota: "Hôm nay bạn đã hỏi đủ 50 câu. Mai hỏi tiếp nhé.",
    server: "Có lỗi xảy ra, bạn thử lại sau.",
};

const HISTORY_LIMIT = 10;
const CARD_LIMIT = 20;

const STATUS_WORDS: Record<DraftStatus, string> = {
    open: "còn chờ",
    saving: "còn chờ",
    saved: "đã lưu",
    dismissed: "đã bỏ",
    replaced: "đã thay",
};

export function describeDraft(draft: ChatDraft): string {
    return [
        `${draft.type === "expense" ? "Chi" : "Thu"} ${formatVND(draft.amount)}`,
        draft.categoryName,
        draft.date,
        draft.note,
    ]
        .filter(Boolean)
        .join(" · ");
}

export function cardsFor(messages: ChatMessage[]): CardState[] {
    return messages
        .filter((message): message is DraftMessage => message.role === "draft")
        .map((message) => ({
            number: message.number,
            status: message.status === "saving" ? "open" : message.status,
        }))
        .slice(-CARD_LIMIT);
}

function cardLine(message: DraftMessage): string {
    return `[Thẻ ${message.number}: ${describeDraft(message.draft)} · ${STATUS_WORDS[message.status]}]`;
}

function updateDraft(
    state: ChatState,
    id: string,
    from: DraftStatus,
    changes: Partial<DraftMessage>,
): ChatState {
    const index = state.messages.findIndex((message) => message.id === id);
    const message = state.messages[index];
    if (message?.role !== "draft" || message.status !== from) return state;
    const messages = [...state.messages];
    messages[index] = { ...message, ...changes };
    return { ...state, messages };
}

function appendDrafts(
    messages: ChatMessage[],
    drafts: { id: string; draft: ChatDraft }[],
): ChatMessage[] {
    const result = [...messages];
    let highestNumber = 0;
    for (const message of result) {
        if (message.role === "draft") {
            highestNumber = Math.max(highestNumber, message.number);
        }
    }
    for (const { id, draft } of drafts) {
        let previousAlreadySaved = false;
        if (draft.replaces !== null) {
            const previousIndex = result.findIndex(
                (message) =>
                    message.role === "draft" &&
                    message.number === draft.replaces,
            );
            const previous = result[previousIndex];
            if (previous?.role === "draft") {
                if (previous.status === "open") {
                    result[previousIndex] = { ...previous, status: "replaced" };
                } else if (
                    previous.status === "saving" ||
                    previous.status === "saved"
                ) {
                    previousAlreadySaved = true;
                }
            }
        }
        highestNumber += 1;
        result.push({
            id,
            role: "draft",
            number: highestNumber,
            draft,
            status: "open",
            transactionId: null,
            previousAlreadySaved,
        });
    }
    return result;
}

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
                messages: appendDrafts(
                    [
                        ...state.messages,
                        { id: action.id, role: "assistant", text: action.text },
                    ],
                    action.drafts,
                ),
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
        case "saveStart":
            return updateDraft(state, action.id, "open", { status: "saving" });
        case "saveDone":
            return updateDraft(state, action.id, "saving", {
                status: "saved",
                transactionId: action.transactionId,
            });
        case "saveFail":
            return updateDraft(state, action.id, "saving", { status: "open" });
        case "dismiss":
            return updateDraft(state, action.id, "open", {
                status: "dismissed",
            });
        case "reset":
            return initialChatState;
    }
}

export function historyFor(messages: ChatMessage[]): ChatTurn[] {
    const turns: ChatTurn[] = [];
    messages.forEach((message, index) => {
        const next = messages[index + 1];
        if (message.role === "user" && next?.role === "assistant") {
            const lines = [next.text];
            for (
                let draftIndex = index + 2;
                messages[draftIndex]?.role === "draft";
                draftIndex += 1
            ) {
                lines.push(cardLine(messages[draftIndex] as DraftMessage));
            }
            turns.push({ role: "user", content: message.text });
            turns.push({ role: "assistant", content: lines.join("\n") });
        }
    });
    return turns.slice(-HISTORY_LIMIT);
}
