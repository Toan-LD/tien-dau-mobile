import OpenAI from "openai";
import type { ChatModel } from "./agent.ts";

export type OpenAIModelConfig = {
    baseURL: string;
    apiKey: string;
    model: string;
};

export function openAIModel(config: OpenAIModelConfig): ChatModel {
    const client = new OpenAI({
        baseURL: config.baseURL,
        apiKey: config.apiKey,
    });
    return {
        async complete(messages, tools, signal) {
            const completion = await client.chat.completions.create(
                {
                    model: config.model,
                    messages,
                    tools,
                    temperature: 0.2,
                    max_tokens: 600,
                },
                { signal },
            );
            return completion.choices[0].message;
        },
    };
}
