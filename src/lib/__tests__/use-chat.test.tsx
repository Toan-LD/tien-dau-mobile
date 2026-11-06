import { act } from "react";
import TestRenderer from "react-test-renderer";

import { askChat, type AskResult, type ChatDraft } from "@/lib/chat";
import { createTransaction, type Transaction } from "@/lib/transactions";
import { ChatProvider, useChat, type SaveResult } from "@/lib/use-chat";

jest.mock("@/lib/chat", () => ({ askChat: jest.fn() }));
jest.mock("@/lib/supabase", () => ({
    supabase: jest.requireActual("@/test-utils/supabase-mock").fakeSupabase,
}));
jest.mock("@/lib/transactions", () => ({
    createTransaction: jest.fn(),
    validateDraft: jest.requireActual("@/lib/transactions").validateDraft,
}));

const mockedAskChat = askChat as jest.MockedFunction<typeof askChat>;
const mockedCreateTransaction = createTransaction as jest.MockedFunction<
    typeof createTransaction
>;

const breakfast: ChatDraft = {
    type: "expense",
    amount: 30000,
    categoryId: "category-food",
    categoryName: "Ăn uống",
    date: "2026-11-06",
    note: "ăn sáng",
    replaces: null,
};

const savedTransaction = {
    id: "transaction-1",
    type: "expense",
    amount: 30000,
    categoryId: "category-food",
    category: { id: "category-food", name: "Ăn uống", icon: null },
    note: "ăn sáng",
    date: "2026-11-06",
    createdAt: "2026-11-06T01:00:00Z",
    walletId: "wallet-1",
} as Transaction;

function deferredTransaction() {
    let resolve!: (transaction: Transaction) => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<Transaction>((resolver, rejecter) => {
        resolve = resolver;
        reject = rejecter;
    });
    return { promise, resolve, reject };
}

async function renderWithDraft() {
    mockedAskChat.mockResolvedValueOnce({
        ok: true,
        reply: "Bấm Lưu nhé.",
        remaining: 1,
        drafts: [breakfast],
    });
    const chat = renderChat();
    await act(async () => chat.api.send("ăn sáng 30k"));
    const draftMessage = chat.api.messages[2];
    if (draftMessage.role !== "draft") throw new Error("no draft card");
    return { chat, draftId: draftMessage.id };
}

function draftStatus(chat: ReturnType<typeof renderChat>, id: string) {
    const message = chat.api.messages.find((candidate) => candidate.id === id);
    return message?.role === "draft" ? message.status : null;
}

(
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type ChatApi = ReturnType<typeof useChat>;

function renderChat() {
    const current: { api: ChatApi | null } = { api: null };
    function Probe() {
        current.api = useChat();
        return null;
    }
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
        renderer = TestRenderer.create(
            <ChatProvider>
                <Probe />
            </ChatProvider>,
        );
    });
    return {
        get api() {
            return current.api as ChatApi;
        },
        unmount: () => act(() => renderer.unmount()),
    };
}

function deferred() {
    let resolve!: (result: AskResult) => void;
    const promise = new Promise<AskResult>((resolver) => {
        resolve = resolver;
    });
    return { promise, resolve };
}

beforeEach(() => {
    mockedAskChat.mockReset();
    mockedCreateTransaction.mockReset();
});

it("drops the answer of a request that was in flight when reset ran", async () => {
    const pendingAnswer = deferred();
    mockedAskChat.mockReturnValueOnce(pendingAnswer.promise);
    const chat = renderChat();

    act(() => chat.api.send("Chào"));
    expect(chat.api.pending).toBe(true);
    act(() => chat.api.reset());
    await act(async () => {
        pendingAnswer.resolve({
            ok: true,
            reply: "Muộn",
            remaining: 1,
            drafts: [],
        });
        await pendingAnswer.promise;
    });

    expect(chat.api.messages).toEqual([]);
    expect(chat.api.pending).toBe(false);
    chat.unmount();
});

it("retries an earlier error by moving it to the end with the right history", async () => {
    mockedAskChat
        .mockResolvedValueOnce({ ok: false, kind: "server" })
        .mockResolvedValueOnce({ ok: false, kind: "server" })
        .mockResolvedValueOnce({
            ok: true,
            reply: "Trả lời một",
            remaining: 1,
            drafts: [],
        });
    const chat = renderChat();

    await act(async () => chat.api.send("một"));
    await act(async () => chat.api.send("hai"));
    const firstErrorId = chat.api.messages[1].id;
    expect(chat.api.messages.map((message) => message.role)).toEqual([
        "user",
        "error",
        "user",
        "error",
    ]);

    await act(async () => chat.api.retry(firstErrorId));

    expect(mockedAskChat).toHaveBeenLastCalledWith("một", [], []);
    expect(
        chat.api.messages.map((message) =>
            message.role === "error"
                ? `error:${message.question}`
                : "text" in message
                  ? message.text
                  : message.role,
        ),
    ).toEqual(["hai", "error:hai", "một", "Trả lời một"]);
    expect(chat.api.pending).toBe(false);
    chat.unmount();
});

it("saveDraft creates the transaction once and marks the card saved", async () => {
    const pendingSave = deferredTransaction();
    mockedCreateTransaction.mockReturnValueOnce(pendingSave.promise);
    const { chat, draftId } = await renderWithDraft();

    let first!: Promise<SaveResult>;
    let second!: Promise<SaveResult>;
    act(() => {
        first = chat.api.saveDraft(draftId);
        second = chat.api.saveDraft(draftId);
    });
    expect(draftStatus(chat, draftId)).toBe("saving");
    await act(async () => {
        pendingSave.resolve(savedTransaction);
        await pendingSave.promise;
    });

    expect(await first).toBe("saved");
    expect(await second).toBe("ignored");
    expect(mockedCreateTransaction).toHaveBeenCalledTimes(1);
    expect(mockedCreateTransaction).toHaveBeenCalledWith({
        type: "expense",
        amount: 30000,
        categoryId: "category-food",
        date: "2026-11-06",
        note: "ăn sáng",
    });
    expect(chat.api.messages[2]).toMatchObject({
        status: "saved",
        transactionId: "transaction-1",
    });
    chat.unmount();
});

it("saveDraft failure reports failed and reopens the card", async () => {
    mockedCreateTransaction.mockRejectedValueOnce(new Error("offline"));
    const { chat, draftId } = await renderWithDraft();

    let result!: Promise<SaveResult>;
    await act(async () => {
        result = chat.api.saveDraft(draftId);
        await result;
    });

    expect(await result).toBe("failed");
    expect(draftStatus(chat, draftId)).toBe("open");
    chat.unmount();
});

it("saveDraft that finishes after reset reports saved and does not touch the new conversation", async () => {
    const pendingSave = deferredTransaction();
    mockedCreateTransaction.mockReturnValueOnce(pendingSave.promise);
    const { chat, draftId } = await renderWithDraft();

    let result!: Promise<SaveResult>;
    act(() => {
        result = chat.api.saveDraft(draftId);
    });
    act(() => chat.api.reset());
    await act(async () => {
        pendingSave.resolve(savedTransaction);
        await pendingSave.promise;
    });

    expect(await result).toBe("saved");
    expect(chat.api.messages).toEqual([]);
    chat.unmount();
});

it("dismissDraft marks an open card dismissed", async () => {
    const { chat, draftId } = await renderWithDraft();

    act(() => chat.api.dismissDraft(draftId));

    expect(draftStatus(chat, draftId)).toBe("dismissed");
    expect(mockedCreateTransaction).not.toHaveBeenCalled();
    chat.unmount();
});

it("send passes the current card states", async () => {
    const { chat, draftId } = await renderWithDraft();
    act(() => chat.api.dismissDraft(draftId));
    mockedAskChat.mockResolvedValueOnce({
        ok: true,
        reply: "Ừ",
        remaining: 0,
        drafts: [],
    });

    await act(async () => chat.api.send("thôi"));

    expect(mockedAskChat).toHaveBeenLastCalledWith(
        "thôi",
        [
            { role: "user", content: "ăn sáng 30k" },
            {
                role: "assistant",
                content:
                    "Bấm Lưu nhé.\n[Thẻ 1: Chi 30.000 đ · Ăn uống · 2026-11-06 · ăn sáng · đã bỏ]",
            },
        ],
        [{ number: 1, status: "dismissed" }],
    );
    chat.unmount();
});
