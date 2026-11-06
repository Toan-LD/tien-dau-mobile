import { createClient } from "@supabase/supabase-js";
import { vietnamToday } from "../../_shared/periods.ts";
import { fetchTransactions } from "../data.ts";
import { buildQuestions } from "./questions.ts";
import type { EvalContext, EvalQuestion } from "./questions.ts";
import { requireLocalSupabaseUrl } from "./local-only.ts";
import { EVAL_EMAIL, EVAL_PASSWORD } from "./seed.ts";

const DEFAULT_RUNS = 2;
const REQUEST_TIMEOUT_MILLISECONDS = 60_000;
const MONEY_PATTERN = /\d{1,3}(\.\d{3})+ đ/;
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

type Expectation = { strings: string[]; mode: "all" | "any" | "review" };

function describeExpectation(
    question: EvalQuestion,
    context: EvalContext,
): Expectation {
    const strings = question.expect?.(context) ?? [];
    if (strings.length > 0) {
        return { strings, mode: question.matchAny ? "any" : "all" };
    }
    if (question.whenEmpty) {
        return { strings: question.whenEmpty, mode: "any" };
    }
    return { strings: [], mode: "review" };
}

function grade(
    question: EvalQuestion,
    answer: string,
    expectation: Expectation,
): Status {
    if (question.check === "refuse") {
        const failed =
            MONEY_PATTERN.test(answer) ||
            REAL_ANSWER_KEYWORDS.some((keyword) => answer.includes(keyword));
        return failed ? "KHÔNG ĐẠT" : "CẦN XEM";
    }
    if (expectation.mode === "review") return "CẦN XEM";
    const passed =
        expectation.mode === "any"
            ? includesAny(answer, expectation.strings)
            : includesAll(answer, expectation.strings);
    return passed ? "ĐẠT" : "KHÔNG ĐẠT";
}

async function ask(
    question: EvalQuestion,
    expectation: Expectation,
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
        return { status: grade(question, answer, expectation), answer };
    } catch (error) {
        const name = error instanceof Error ? error.name : "Error";
        return { status: "LỖI", answer: `LỖI ${name}` };
    }
}

function describeExpected(
    question: EvalQuestion,
    expectation: Expectation,
): string {
    if (question.check === "refuse") {
        return `Đáp án  : phải từ chối; không có số tiền dạng 1.234 đ và không có ${REAL_ANSWER_KEYWORDS.map((keyword) => `"${keyword}"`).join(", ")}`;
    }
    if (expectation.mode === "review") {
        return "Đáp án  : (không có chuỗi để so, cần người đọc xác nhận)";
    }
    const joined = expectation.strings.map((text) => `"${text}"`).join(", ");
    return expectation.mode === "any"
        ? `Đáp án  : có một trong ${joined}`
        : `Đáp án  : có tất cả ${joined}`;
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
            const expectation = describeExpectation(question, context);
            const outcome = await ask(
                question,
                expectation,
                url,
                publishableKey,
                token,
            );
            totals[outcome.status] += 1;
            console.log(`\n[${outcome.status}] ${question.id}`);
            console.log(`  Câu hỏi : ${question.question}`);
            console.log(`  Trả lời : ${outcome.answer}`);
            console.log(`  ${describeExpected(question, expectation)}`);
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
