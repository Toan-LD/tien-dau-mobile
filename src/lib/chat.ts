import {
    FunctionsFetchError,
    FunctionsHttpError,
    FunctionsRelayError,
} from "@supabase/supabase-js";

import { MAX_AMOUNT } from "@/lib/money";
import { supabase } from "@/lib/supabase";

export const CHAT_REQUEST_TIMEOUT_MILLISECONDS = 40_000;

export type ChatTurn = { role: "user" | "assistant"; content: string };

export type ChatDraft = {
    type: "expense" | "income";
    amount: number;
    categoryId: string;
    categoryName: string;
    date: string;
    note: string | null;
    replaces: number | null;
};

export type CardState = {
    number: number;
    status: "open" | "saved" | "dismissed" | "replaced";
};

export type ChatErrorKind = "network" | "quota" | "server";

export type AskResult =
    | { ok: true; reply: string; remaining: number; drafts: ChatDraft[] }
    | { ok: false; kind: ChatErrorKind };

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isPositiveInteger(value: unknown): value is number {
    return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function parseDraft(value: unknown): ChatDraft | null {
    if (typeof value !== "object" || value === null) return null;
    const record = value as Record<string, unknown>;
    const { type, amount, categoryId, categoryName, date, note, replaces } =
        record;
    if (type !== "expense" && type !== "income") return null;
    if (!isPositiveInteger(amount) || amount > MAX_AMOUNT) return null;
    if (typeof categoryId !== "string" || categoryId === "") return null;
    if (typeof categoryName !== "string") return null;
    if (typeof date !== "string" || !DATE_PATTERN.test(date)) return null;
    if (note !== null && typeof note !== "string") return null;
    if (replaces !== null && !isPositiveInteger(replaces)) return null;
    return { type, amount, categoryId, categoryName, date, note, replaces };
}

export function parseDrafts(value: unknown): ChatDraft[] {
    if (!Array.isArray(value)) return [];
    return value
        .map(parseDraft)
        .filter((draft): draft is ChatDraft => draft !== null);
}

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
    cards: CardState[],
): Promise<AskResult> {
    try {
        const { data, error } = await supabase.functions.invoke("chat", {
            body: { question, history, cards },
            timeout: CHAT_REQUEST_TIMEOUT_MILLISECONDS,
        });
        if (error) return { ok: false, kind: errorKind(error) };
        const body = data as {
            reply: string;
            remaining: number;
            drafts?: unknown;
        };
        return {
            ok: true,
            reply: cleanReply(body.reply),
            remaining: body.remaining,
            drafts: parseDrafts(body.drafts),
        };
    } catch {
        return { ok: false, kind: "network" };
    }
}
