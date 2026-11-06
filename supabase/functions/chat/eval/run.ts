import { createClient } from "@supabase/supabase-js";
import { formatVND } from "../../_shared/money.ts";
import { vietnamToday } from "../../_shared/periods.ts";
import { fetchTransactions } from "../data.ts";
import type { ProposedDraft } from "../tools.ts";
import { buildQuestions } from "./questions.ts";
import type { EvalContext, EvalQuestion, ExpectedDraft } from "./questions.ts";
import { requireLocalSupabaseUrl } from "./local-only.ts";
import { EVAL_EMAIL, EVAL_PASSWORD } from "./seed.ts";

const DEFAULT_RUNS = 2;
const REQUEST_TIMEOUT_MILLISECONDS = 60_000;
const MONEY_PATTERN = /\d{1,3}(\.\d{3})+ đ/;
const REAL_ANSWER_KEYWORDS = ["def ", "Paris", "x = 2"];

type Status = "ĐẠT" | "KHÔNG ĐẠT" | "CẦN XEM" | "LỖI";
type Outcome = { status: Status; answer: string; drafts: ProposedDraft[] };

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

type Expectation =
    | { kind: "strings"; strings: string[]; mode: "all" | "any" }
    | { kind: "review" }
    | { kind: "drafts"; drafts: ExpectedDraft[] };

function draftKey(draft: ExpectedDraft | ProposedDraft): string {
    return [draft.type, draft.amount, draft.categoryName, draft.date].join("|");
}

function draftsMatch(
    actual: ProposedDraft[],
    expected: ExpectedDraft[],
): boolean {
    if (actual.length !== expected.length) return false;
    const byKey = (left: ExpectedDraft | ProposedDraft, right: typeof left) =>
        draftKey(left).localeCompare(draftKey(right));
    const sortedActual = [...actual].sort(byKey);
    const sortedExpected = [...expected].sort(byKey);
    return sortedExpected.every((expectedDraft, index) => {
        const actualDraft = sortedActual[index];
        if (draftKey(actualDraft) !== draftKey(expectedDraft)) return false;
        return (
            expectedDraft.replaces === undefined ||
            actualDraft.replaces === expectedDraft.replaces
        );
    });
}

function describeDraft(draft: ExpectedDraft | ProposedDraft): string {
    const kind = draft.type === "expense" ? "Chi" : "Thu";
    const replaces =
        draft.replaces === undefined || draft.replaces === null
            ? ""
            : ` (thay thẻ ${draft.replaces})`;
    return `${kind} ${formatVND(draft.amount)} · ${draft.categoryName} · ${draft.date}${replaces}`;
}

function describeExpectation(
    question: EvalQuestion,
    context: EvalContext,
): Expectation {
    if (question.check === "draft") {
        return {
            kind: "drafts",
            drafts: question.expectDrafts?.(context) ?? [],
        };
    }
    const strings = question.expect?.(context) ?? [];
    if (strings.length > 0) {
        return {
            kind: "strings",
            strings,
            mode: question.matchAny ? "any" : "all",
        };
    }
    if (question.whenEmpty) {
        return { kind: "strings", strings: question.whenEmpty, mode: "any" };
    }
    return { kind: "review" };
}

function grade(
    question: EvalQuestion,
    outcome: { answer: string; drafts: ProposedDraft[] },
    expectation: Expectation,
): Status {
    const { answer, drafts } = outcome;
    if (question.check === "refuse") {
        const failed =
            MONEY_PATTERN.test(answer) ||
            REAL_ANSWER_KEYWORDS.some((keyword) => answer.includes(keyword));
        return failed ? "KHÔNG ĐẠT" : "CẦN XEM";
    }
    if (expectation.kind === "drafts") {
        return draftsMatch(drafts, expectation.drafts) ? "ĐẠT" : "KHÔNG ĐẠT";
    }
    if (expectation.kind === "review") return "CẦN XEM";
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
            body: JSON.stringify({
                question: question.question,
                history: question.history ?? [],
                cards: question.cards ?? [],
            }),
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MILLISECONDS),
        });
        if (response.status !== 200) {
            await response.body?.cancel();
            return {
                status: "LỖI",
                answer: `LỖI ${response.status}`,
                drafts: [],
            };
        }
        const body = await response.json();
        const answer = typeof body.reply === "string" ? body.reply : "";
        const drafts: ProposedDraft[] = Array.isArray(body.drafts)
            ? body.drafts
            : [];
        return {
            status: grade(question, { answer, drafts }, expectation),
            answer,
            drafts,
        };
    } catch (error) {
        const name = error instanceof Error ? error.name : "Error";
        return { status: "LỖI", answer: `LỖI ${name}`, drafts: [] };
    }
}

function describeExpected(
    question: EvalQuestion,
    expectation: Expectation,
): string {
    if (question.check === "refuse") {
        return `Đáp án  : phải từ chối; không có số tiền dạng 1.234 đ và không có ${REAL_ANSWER_KEYWORDS.map((keyword) => `"${keyword}"`).join(", ")}`;
    }
    if (expectation.kind === "drafts") {
        if (expectation.drafts.length === 0) {
            return "Đáp án  : không có thẻ nháp";
        }
        return `Đáp án  : thẻ nháp ${expectation.drafts.map(describeDraft).join("; ")}`;
    }
    if (expectation.kind === "review") {
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
            if (outcome.drafts.length > 0) {
                console.log(
                    `  Thẻ nháp: ${outcome.drafts.map(describeDraft).join("; ")}`,
                );
            }
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
