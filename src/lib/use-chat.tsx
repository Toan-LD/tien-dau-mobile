import {
    createContext,
    useContext,
    useReducer,
    useRef,
    type ReactNode,
} from "react";

import { askChat, type ChatTurn } from "@/lib/chat";
import {
    cardsFor,
    chatReducer,
    historyFor,
    historyForRetry,
    initialChatState,
    type ChatMessage,
} from "@/lib/chat-state";
import { createTransaction, validateDraft } from "@/lib/transactions";

type ChatContextValue = {
    messages: ChatMessage[];
    pending: boolean;
    send: (text: string) => void;
    retry: (errorId: string) => void;
    reset: () => void;
    saveDraft: (messageId: string) => Promise<boolean>;
    dismissDraft: (messageId: string) => void;
};

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(chatReducer, initialChatState);
    const messageCounter = useRef(0);
    const conversationGeneration = useRef(0);
    const savingMessageIds = useRef(new Set<string>());

    const nextId = () => {
        messageCounter.current += 1;
        return `message-${messageCounter.current}`;
    };

    const ask = async (question: string, history: ChatTurn[]) => {
        const generation = conversationGeneration.current;
        const result = await askChat(
            question,
            history,
            cardsFor(state.messages),
        );
        if (generation !== conversationGeneration.current) return;
        if (result.ok) {
            dispatch({
                type: "reply",
                id: nextId(),
                text: result.reply,
                drafts: result.drafts.map((draft) => ({ id: nextId(), draft })),
            });
        } else {
            dispatch({
                type: "fail",
                id: nextId(),
                kind: result.kind,
                question,
            });
        }
    };

    const send = (text: string) => {
        const question = text.trim();
        if (!question || state.pending) return;
        const history = historyFor(state.messages);
        dispatch({ type: "send", id: nextId(), text: question });
        void ask(question, history);
    };

    const retry = (errorId: string) => {
        if (state.pending) return;
        const failed = state.messages.find((message) => message.id === errorId);
        if (failed?.role !== "error") return;
        const history = historyForRetry(state.messages, errorId);
        dispatch({ type: "retry", errorId });
        void ask(failed.question, history);
    };

    const reset = () => {
        conversationGeneration.current += 1;
        dispatch({ type: "reset" });
    };

    const saveDraft = async (messageId: string): Promise<boolean> => {
        const message = state.messages.find(
            (candidate) => candidate.id === messageId,
        );
        if (message?.role !== "draft" || message.status !== "open") {
            return false;
        }
        if (savingMessageIds.current.has(messageId)) return false;
        const { type, amount, categoryId, date, note } = message.draft;
        const draft = { type, amount, categoryId, date, note };
        if (validateDraft(draft) !== null) return false;

        const generation = conversationGeneration.current;
        const stillCurrent = () =>
            generation === conversationGeneration.current;
        savingMessageIds.current.add(messageId);
        dispatch({ type: "saveStart", id: messageId });
        try {
            const transaction = await createTransaction(draft);
            if (!stillCurrent()) return false;
            dispatch({
                type: "saveDone",
                id: messageId,
                transactionId: transaction.id,
            });
            return true;
        } catch {
            if (stillCurrent()) dispatch({ type: "saveFail", id: messageId });
            return false;
        } finally {
            savingMessageIds.current.delete(messageId);
        }
    };

    const dismissDraft = (messageId: string) => {
        dispatch({ type: "dismiss", id: messageId });
    };

    return (
        <ChatContext.Provider
            value={{
                messages: state.messages,
                pending: state.pending,
                send,
                retry,
                reset,
                saveDraft,
                dismissDraft,
            }}
        >
            {children}
        </ChatContext.Provider>
    );
}

export function useChat(): ChatContextValue {
    const context = useContext(ChatContext);
    if (!context) throw new Error("useChat must be used inside ChatProvider");
    return context;
}
