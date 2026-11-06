import { assertEquals, assertRejects } from "@std/assert";
import type {
    ChatCompletionMessage,
    ChatCompletionMessageParam,
    ChatCompletionTool,
} from "openai/resources/chat/completions";
import { GIVE_UP_REPLY, runAgent } from "./agent.ts";
import type { ChatModel } from "./agent.ts";

function textReply(content: string | null): ChatCompletionMessage {
    return { role: "assistant", content, refusal: null };
}

function toolReply(...toolCallIds: string[]): ChatCompletionMessage {
    return {
        role: "assistant",
        content: null,
        refusal: null,
        tool_calls: toolCallIds.map((id) => ({
            id,
            type: "function" as const,
            function: { name: `tool_${id}`, arguments: `{"id":"${id}"}` },
        })),
    };
}

function scriptedModel(replies: ChatCompletionMessage[]) {
    const receivedMessages: ChatCompletionMessageParam[][] = [];
    const receivedTools: ChatCompletionTool[][] = [];
    const model: ChatModel = {
        complete(messages, tools) {
            receivedMessages.push(structuredClone(messages));
            receivedTools.push(tools);
            const reply = replies[receivedMessages.length - 1];
            return Promise.resolve(reply);
        },
    };
    return { model, receivedMessages, receivedTools };
}

function baseOptions(model: ChatModel, toolCalls: string[][] = []) {
    return {
        model,
        system: "SYSTEM",
        history: [
            { role: "user" as const, content: "câu trước" },
            { role: "assistant" as const, content: "trả lời trước" },
        ],
        question: "câu hỏi mới",
        runTool(name: string, argumentsJson: string) {
            toolCalls.push([name, argumentsJson]);
            return Promise.resolve(`kết quả ${name}`);
        },
        signal: new AbortController().signal,
    };
}

Deno.test(
    "không gọi tool: trả content đã trim, gửi [system, ...history, user]",
    async () => {
        const { model, receivedMessages } = scriptedModel([
            textReply("  Xin chào  \n"),
        ]);
        const answer = await runAgent(baseOptions(model));
        assertEquals(answer, "Xin chào");
        assertEquals(receivedMessages, [
            [
                { role: "system", content: "SYSTEM" },
                { role: "user", content: "câu trước" },
                { role: "assistant", content: "trả lời trước" },
                { role: "user", content: "câu hỏi mới" },
            ],
        ]);
    },
);

Deno.test(
    "một vòng tool: chạy tuần tự và gửi lại kết quả với đúng tool_call_id",
    async () => {
        const toolCalls: string[][] = [];
        const firstReply = toolReply("a", "b");
        const { model, receivedMessages } = scriptedModel([
            firstReply,
            textReply("Xong"),
        ]);
        const answer = await runAgent(baseOptions(model, toolCalls));
        assertEquals(answer, "Xong");
        assertEquals(toolCalls, [
            ["tool_a", '{"id":"a"}'],
            ["tool_b", '{"id":"b"}'],
        ]);
        assertEquals(receivedMessages.length, 2);
        assertEquals(receivedMessages[1].slice(4), [
            firstReply,
            { role: "tool", tool_call_id: "a", content: "kết quả tool_a" },
            { role: "tool", tool_call_id: "b", content: "kết quả tool_b" },
        ]);
    },
);

Deno.test(
    "đòi tool cả 6 lần: gọi model 6 lần, chạy 5 vòng, trả GIVE_UP_REPLY",
    async () => {
        const toolCalls: string[][] = [];
        const { model, receivedMessages } = scriptedModel(
            Array.from({ length: 6 }, (_, index) => toolReply(`call${index}`)),
        );
        const answer = await runAgent(baseOptions(model, toolCalls));
        assertEquals(answer, GIVE_UP_REPLY);
        assertEquals(receivedMessages.length, 6);
        assertEquals(toolCalls.length, 5);
    },
);

Deno.test(
    "content rỗng hoặc toàn khoảng trắng: trả GIVE_UP_REPLY",
    async () => {
        for (const content of ["", "   \n ", null]) {
            const { model } = scriptedModel([textReply(content)]);
            assertEquals(await runAgent(baseOptions(model)), GIVE_UP_REPLY);
        }
    },
);

Deno.test("lỗi từ runTool được ném ra, không nuốt", async () => {
    const { model } = scriptedModel([toolReply("a")]);
    const options = {
        ...baseOptions(model),
        runTool: () => Promise.reject(new Error("hỏng")),
    };
    await assertRejects(() => runAgent(options), Error, "hỏng");
});

Deno.test("GIVE_UP_REPLY đúng nguyên văn", () => {
    assertEquals(
        GIVE_UP_REPLY,
        "Mình chưa trả lời được câu này, bạn hỏi cụ thể hơn nhé.",
    );
});
