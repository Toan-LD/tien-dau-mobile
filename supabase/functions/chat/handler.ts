import type { SupabaseClient } from "@supabase/supabase-js";
import { vietnamToday } from "../_shared/periods.ts";
import { GIVE_UP_REPLY, runAgent } from "./agent.ts";
import type { ChatModel, ChatTurn } from "./agent.ts";
import { fetchCategories, fetchTransactions } from "./data.ts";
import { buildSystemPrompt } from "./system-prompt.ts";
import { runTool } from "./tools.ts";
import type { CardState, CardStatus, ProposedDraft } from "./tools.ts";

export const MAX_QUESTION_LENGTH = 500;
export const MAX_HISTORY_TURNS = 10;
export const MAX_HISTORY_CONTENT_LENGTH = 2000;
export const MAX_CARDS = 20;

const CARD_STATUSES: CardStatus[] = ["open", "saved", "dismissed", "replaced"];

export type AuthenticatedUser = { userId: string; client: SupabaseClient };

export type HandlerDependencies = {
    authenticate(request: Request): Promise<AuthenticatedUser | null>;
    consumeQuota(userId: string): Promise<number>;
    model: ChatModel;
    now(): Date;
    timeoutMilliseconds: number;
};

type ChatInput = { question: string; history: ChatTurn[]; cards: CardState[] };
type ChatAnswer = { reply: string; drafts: ProposedDraft[] };

function jsonResponse(status: number, body: unknown): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseTurn(value: unknown): ChatTurn | null {
    if (!isRecord(value)) return null;
    const { role, content } = value;
    if (role !== "user" && role !== "assistant") return null;
    if (typeof content !== "string") return null;
    return { role, content: content.slice(0, MAX_HISTORY_CONTENT_LENGTH) };
}

function parseCard(value: unknown): CardState | null {
    if (!isRecord(value)) return null;
    const { number, status } = value;
    if (typeof number !== "number" || !Number.isInteger(number) || number < 1) {
        return null;
    }
    if (!CARD_STATUSES.some((candidate) => candidate === status)) return null;
    return { number, status: status as CardStatus };
}

function parseCards(value: unknown): CardState[] | null {
    if (value === undefined) return [];
    if (!Array.isArray(value)) return null;
    const cards: CardState[] = [];
    for (const entry of value) {
        const card = parseCard(entry);
        if (!card) return null;
        cards.push(card);
    }
    return cards.slice(-MAX_CARDS);
}

async function readInput(request: Request): Promise<ChatInput | null> {
    if (request.method !== "POST") return null;
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return null;
    }
    if (!isRecord(body)) return null;
    if (typeof body.question !== "string") return null;
    const question = body.question.trim();
    if (question.length === 0 || question.length > MAX_QUESTION_LENGTH) {
        return null;
    }
    if (!Array.isArray(body.history)) return null;
    const history: ChatTurn[] = [];
    for (const value of body.history) {
        const turn = parseTurn(value);
        if (!turn) return null;
        history.push(turn);
    }
    const cards = parseCards(body.cards);
    if (!cards) return null;
    return { question, history: history.slice(-MAX_HISTORY_TURNS), cards };
}

function describeError(error: unknown): string {
    if (error instanceof Error) return `${error.name}: ${error.message}`;
    return String(error);
}

export function createHandler(
    dependencies: HandlerDependencies,
): (request: Request) => Promise<Response> {
    async function answer(
        user: AuthenticatedUser,
        input: ChatInput,
        signal: AbortSignal,
    ): Promise<ChatAnswer> {
        const today = vietnamToday(dependencies.now());
        const categories = await fetchCategories(user.client);
        const drafts: ProposedDraft[] = [];
        const toolContext = {
            today,
            categories,
            cards: input.cards,
            drafts,
            loadTransactions: (start: string, end: string) =>
                fetchTransactions(user.client, start, end),
        };
        const reply = await runAgent({
            model: dependencies.model,
            system: buildSystemPrompt({ today, categories }),
            history: input.history,
            question: input.question,
            runTool: (name, argumentsJson) =>
                runTool(name, argumentsJson, toolContext),
            signal,
        });
        return { reply, drafts: reply === GIVE_UP_REPLY ? [] : drafts };
    }

    return async (request) => {
        const controller = new AbortController();
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
            const user = await dependencies.authenticate(request);
            if (!user) return jsonResponse(401, { error: "unauthorized" });

            const input = await readInput(request);
            if (!input) return jsonResponse(400, { error: "bad_request" });

            const remaining = await dependencies.consumeQuota(user.userId);
            if (remaining < 0) {
                return jsonResponse(429, { error: "quota_exceeded" });
            }

            const timeout = new Promise<never>((_resolve, reject) => {
                timer = setTimeout(() => {
                    controller.abort();
                    reject(controller.signal.reason);
                }, dependencies.timeoutMilliseconds);
            });
            const answered = await Promise.race([
                answer(user, input, controller.signal),
                timeout,
            ]);
            return jsonResponse(200, { ...answered, remaining });
        } catch (error) {
            if (controller.signal.aborted) {
                return jsonResponse(504, { error: "timeout" });
            }
            console.error("chat failed:", describeError(error));
            return jsonResponse(500, { error: "server_error" });
        } finally {
            clearTimeout(timer);
        }
    };
}
