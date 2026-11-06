// Hỏi từng câu trong bộ câu hỏi mẫu qua hàm chat chạy local rồi chấm.
//
//   eval "$(npx supabase status -o env | sed 's/^API_URL=/SUPABASE_URL=/')"
//   npm run eval:chat -- --runs 2
//
// Cần SUPABASE_URL (hoặc API_URL) và key publishable/anon (SUPABASE_ANON_KEY,
// ANON_KEY hoặc PUBLISHABLE_KEY). Đã chạy `npm run eval:seed` trước đó.
import { createClient } from "@supabase/supabase-js";
import { vietnamToday } from "../../_shared/periods.ts";
import { fetchTransactions } from "../data.ts";
import { buildQuestions } from "./questions.ts";
import type { EvalContext, EvalQuestion } from "./questions.ts";
import { EVAL_EMAIL, EVAL_PASSWORD, requireLocalSupabaseUrl } from "./seed.ts";

const DEFAULT_RUNS = 2;
const REQUEST_TIMEOUT_MILLISECONDS = 60_000;
const MONEY_PATTERN = /\d{1,3}(\.\d{3})+ đ/;
// Từ khoá cho thấy model đã trả lời thật một câu lạc đề.
const REAL_ANSWER_KEYWORDS = ["def ", "Paris", "x = 2"];

type Status = "ĐẠT" | "KHÔNG ĐẠT" | "CẦN XEM" | "LỖI";
type Outcome = { status: Status; answer: string };

function parseRuns(argumentsList: string[]): number {
    const index = argumentsList.indexOf("--runs");
    if (index === -1) return DEFAULT_RUNS;
    const runs = Number(argumentsList[index + 1]);
    if (!Number.isInteger(runs) || runs < 1) {
        throw new Error("--runs cần một số nguyên dương");
    }
    return runs;
}

function includesAll(answer: string, expected: string[]): boolean {
    const lowerAnswer = answer.toLowerCase();
    return expected.every((text) => lowerAnswer.includes(text.toLowerCase()));
}

function includesAny(answer: string, expected: string[]): boolean {
    const lowerAnswer = answer.toLowerCase();
    return expected.some((text) => lowerAnswer.includes(text.toLowerCase()));
}

function grade(
    question: EvalQuestion,
    answer: string,
    context: EvalContext,
): Status {
    if (question.check === "refuse") {
        const failed =
            MONEY_PATTERN.test(answer) ||
            REAL_ANSWER_KEYWORDS.some((keyword) => answer.includes(keyword));
        // Máy chỉ loại được các dấu hiệu rõ ràng; người đọc xác nhận phần còn lại.
        return failed ? "KHÔNG ĐẠT" : "CẦN XEM";
    }
    const expected = question.expect?.(context) ?? [];
    if (expected.length === 0) return "ĐẠT";
    const passed = question.matchAny
        ? includesAny(answer, expected)
        : includesAll(answer, expected);
    return passed ? "ĐẠT" : "KHÔNG ĐẠT";
}

async function ask(
    question: EvalQuestion,
    context: EvalContext,
    url: string,
    publishableKey: string,
    token: string,
): Promise<Outcome> {
    try {
        const response = await fetch(`${url}/functions/v1/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                apikey: publishableKey,
            },
            body: JSON.stringify({ question: question.question, history: [] }),
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MILLISECONDS),
        });
        if (response.status !== 200) {
            await response.body?.cancel();
            return { status: "LỖI", answer: `LỖI ${response.status}` };
        }
        const body = await response.json();
        const answer = typeof body.answer === "string" ? body.answer : "";
        return { status: grade(question, answer, context), answer };
    } catch (error) {
        const name = error instanceof Error ? error.name : "Error";
        return { status: "LỖI", answer: `LỖI ${name}` };
    }
}

function singleLine(text: string, limit: number): string {
    const flat = text.replace(/\s+/g, " ").trim();
    return flat.length > limit ? `${flat.slice(0, limit - 1)}…` : flat;
}

async function main(): Promise<void> {
    const url = requireLocalSupabaseUrl();
    const publishableKey =
        Deno.env.get("SUPABASE_ANON_KEY") ??
        Deno.env.get("ANON_KEY") ??
        Deno.env.get("PUBLISHABLE_KEY");
    if (!publishableKey) {
        throw new Error(
            "Thiếu SUPABASE_ANON_KEY (hoặc ANON_KEY / PUBLISHABLE_KEY)",
        );
    }
    const runs = parseRuns(Deno.args);

    const client = createClient(url, publishableKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.auth.signInWithPassword({
        email: EVAL_EMAIL,
        password: EVAL_PASSWORD,
    });
    if (error || !data.session) {
        throw new Error(
            `Không đăng nhập được ${EVAL_EMAIL}: ${error?.message ?? "không có session"}. Đã chạy npm run eval:seed chưa?`,
        );
    }
    const token = data.session.access_token;

    const today = vietnamToday(new Date());
    const transactions = await fetchTransactions(client, "2000-01-01", today);
    const context: EvalContext = { today, transactions };
    const questions = buildQuestions(today);
    console.log(
        `Hôm nay ${today}; ${transactions.length} giao dịch; ${questions.length} câu; ${runs} lần chạy.`,
    );

    for (let run = 1; run <= runs; run++) {
        console.log(`\n=== Lần chạy ${run}/${runs} ===`);
        const totals: Record<Status, number> = {
            ĐẠT: 0,
            "KHÔNG ĐẠT": 0,
            "CẦN XEM": 0,
            LỖI: 0,
        };
        for (const question of questions) {
            const outcome = await ask(
                question,
                context,
                url,
                publishableKey,
                token,
            );
            totals[outcome.status] += 1;
            console.log(
                [
                    outcome.status.padEnd(9),
                    question.id.padEnd(24),
                    singleLine(question.question, 40).padEnd(40),
                    singleLine(outcome.answer, 120),
                ].join(" | "),
            );
        }
        console.log(
            `Tổng lần ${run}: đạt ${totals["ĐẠT"]}, không đạt ${totals["KHÔNG ĐẠT"]}, cần xem ${totals["CẦN XEM"]}, lỗi ${totals["LỖI"]} / ${questions.length}`,
        );
    }
}

try {
    await main();
} catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    Deno.exit(1);
}
