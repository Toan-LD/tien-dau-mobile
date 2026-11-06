import {
    FunctionsFetchError,
    FunctionsHttpError,
    FunctionsRelayError,
} from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";

export const CHAT_REQUEST_TIMEOUT_MILLISECONDS = 40_000;

export type ChatTurn = { role: "user" | "assistant"; content: string };

export type ChatErrorKind = "network" | "quota" | "server";

export type AskResult =
    | { ok: true; reply: string; remaining: number }
    | { ok: false; kind: ChatErrorKind };

export function cleanReply(text: string): string {
    return text
        .replace(/\*\*|__/g, "")
        .replace(/^#+\s*/gm, "")
        .replace(/^\* /gm, "- ")
        .trim();
}

function errorKind(error: unknown): ChatErrorKind {
    if (error instanceof FunctionsHttpError) {
        const response = error.context as { status?: number } | undefined;
        return response?.status === 429 ? "quota" : "server";
    }
    if (error instanceof FunctionsFetchError) return "network";
    if (error instanceof FunctionsRelayError) return "server";
    return "network";
}

export async function askChat(
    question: string,
    history: ChatTurn[],
): Promise<AskResult> {
    try {
        const { data, error } = await supabase.functions.invoke("chat", {
            body: { question, history },
            timeout: CHAT_REQUEST_TIMEOUT_MILLISECONDS,
        });
        if (error) return { ok: false, kind: errorKind(error) };
        const body = data as { reply: string; remaining: number };
        return {
            ok: true,
            reply: cleanReply(body.reply),
            remaining: body.remaining,
        };
    } catch {
        return { ok: false, kind: "network" };
    }
}
