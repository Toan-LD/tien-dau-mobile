import { act } from "react";
import TestRenderer from "react-test-renderer";

import { askChat, type AskResult } from "@/lib/chat";
import { ChatProvider, useChat } from "@/lib/use-chat";

jest.mock("@/lib/chat", () => ({ askChat: jest.fn() }));

const mockedAskChat = askChat as jest.MockedFunction<typeof askChat>;

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

beforeEach(() => mockedAskChat.mockReset());

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
