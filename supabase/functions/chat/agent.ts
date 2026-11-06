import type {
    ChatCompletionMessage,
    ChatCompletionMessageParam,
    ChatCompletionTool,
} from "openai/resources/chat/completions";
import type { ToolResult } from "./tools.ts";
import { TOOL_DEFINITIONS } from "./tools.ts";

export type ChatTurn = { role: "user" | "assistant"; content: string };

export interface ChatModel {
    complete(
        messages: ChatCompletionMessageParam[],
        tools: ChatCompletionTool[],
        signal: AbortSignal,
    ): Promise<ChatCompletionMessage>;
}

export const MAX_TOOL_ROUNDS = 5;

export const GIVE_UP_REPLY =
    "Mình chưa trả lời được câu này, bạn hỏi cụ thể hơn nhé.";

export type RunAgentOptions = {
    model: ChatModel;
    system: string;
    history: ChatTurn[];
    question: string;
    runTool(name: string, argumentsJson: string): Promise<string>;
    replyAfterTools?(results: ToolResult[]): string | null;
    signal: AbortSignal;
};

export async function runAgent(options: RunAgentOptions): Promise<string> {
    const messages: ChatCompletionMessageParam[] = [
        { role: "system", content: options.system },
        ...options.history.map(({ role, content }) => ({ role, content })),
        { role: "user", content: options.question },
    ];

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
        const reply = await options.model.complete(
            messages,
            TOOL_DEFINITIONS,
            options.signal,
        );
        const toolCalls = reply.tool_calls ?? [];
        if (toolCalls.length === 0) {
            const answer = reply.content?.trim();
            return answer ? answer : GIVE_UP_REPLY;
        }
        if (round === MAX_TOOL_ROUNDS) break;

        messages.push(reply);
        const results: ToolResult[] = [];
        for (const toolCall of toolCalls) {
            if (toolCall.type !== "function") continue;
            const content = await options.runTool(
                toolCall.function.name,
                toolCall.function.arguments,
            );
            messages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content,
            });
            results.push({ name: toolCall.function.name, content });
        }
        const serverReply = options.replyAfterTools?.(results);
        if (serverReply) return serverReply;
    }
    return GIVE_UP_REPLY;
}
