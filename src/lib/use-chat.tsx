import {
    createContext,
    useContext,
    useReducer,
    useRef,
    type ReactNode,
} from "react";

import { askChat, type ChatTurn } from "@/lib/chat";
import {
    chatReducer,
    historyFor,
    initialChatState,
    type ChatMessage,
} from "@/lib/chat-state";

type ChatContextValue = {
    messages: ChatMessage[];
    pending: boolean;
    send: (text: string) => void;
    retry: (errorId: string) => void;
    reset: () => void;
};

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(chatReducer, initialChatState);
    const messageCounter = useRef(0);

    const nextId = () => {
        messageCounter.current += 1;
        return `message-${messageCounter.current}`;
    };

    const ask = async (question: string, history: ChatTurn[]) => {
        const result = await askChat(question, history);
        if (result.ok) {
            dispatch({ type: "reply", id: nextId(), text: result.reply });
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
        const errorIndex = state.messages.findIndex(
            (message) => message.id === errorId,
        );
        const failed = state.messages[errorIndex];
        if (failed?.role !== "error") return;
        // The failed question's user message sits right before the error.
        const history = historyFor(state.messages.slice(0, errorIndex - 1));
        dispatch({ type: "retry", errorId });
        void ask(failed.question, history);
    };

    const reset = () => dispatch({ type: "reset" });

    return (
        <ChatContext.Provider
            value={{
                messages: state.messages,
                pending: state.pending,
                send,
                retry,
                reset,
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
