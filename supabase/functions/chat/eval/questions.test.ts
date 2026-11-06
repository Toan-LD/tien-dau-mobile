import { assert, assertEquals } from "@std/assert";
import { buildQuestions } from "./questions.ts";
import type { EvalContext, EvalQuestion } from "./questions.ts";

const context: EvalContext = { today: "2026-11-06", transactions: [] };
const questions = buildQuestions(context.today);

function find(id: string): EvalQuestion {
    const question = questions.find((candidate) => candidate.id === id);
    if (!question) throw new Error(`Không có câu ${id}`);
    return question;
}

Deno.test("buildQuestions không còn kiểu redirect và có đủ câu draft", () => {
    assert(
        questions.every(
            (question) => (question.check as string) !== "redirect",
        ),
    );
    for (const id of [
        "draft-simple",
        "draft-many",
        "draft-yesterday",
        "draft-weekday",
        "draft-income",
        "draft-ambiguous",
        "draft-missing-amount",
        "draft-followup",
        "draft-correction",
        "draft-correct-saved",
        "draft-injection-note",
        "draft-injection-history",
        "numbers-no-draft",
    ]) {
        assertEquals(find(id).check, "draft", id);
        assert(find(id).expectDrafts, id);
    }
});

Deno.test("draft-simple mong một thẻ Ăn uống 30.000 đ hôm nay", () => {
    assertEquals(find("draft-simple").question, "Hôm nay ăn sáng 30k");
    assertEquals(find("draft-simple").expectDrafts?.(context), [
        {
            type: "expense",
            amount: 30000,
            categoryName: "Ăn uống",
            date: "2026-11-06",
        },
    ]);
});

Deno.test("các câu không được ra thẻ mong mảng rỗng", () => {
    for (const id of [
        "draft-ambiguous",
        "draft-missing-amount",
        "draft-correct-saved",
        "draft-injection-history",
        "numbers-no-draft",
    ]) {
        assertEquals(find(id).expectDrafts?.(context), [], id);
    }
});

Deno.test(
    "draft-yesterday, draft-weekday và draft-income tính ngày theo hôm nay",
    () => {
        assertEquals(
            find("draft-yesterday").expectDrafts?.(context)[0].date,
            "2026-11-05",
        );
        assertEquals(
            find("draft-weekday").expectDrafts?.(context)[0].date,
            "2026-11-02",
        );
        assertEquals(find("draft-income").expectDrafts?.(context), [
            {
                type: "income",
                amount: 15_000_000,
                categoryName: "Lương",
                date: "2026-11-06",
            },
        ]);
    },
);

Deno.test(
    "draft-correction có lịch sử thẻ, cards open và mong replaces 1",
    () => {
        const correction = find("draft-correction");
        assertEquals(correction.cards, [{ number: 1, status: "open" }]);
        assert(
            correction.history?.some((turn) =>
                turn.content.includes("[Thẻ 1:"),
            ),
        );
        assert(
            correction.history?.some((turn) =>
                turn.content.includes("còn chờ"),
            ),
        );
        assertEquals(correction.expectDrafts?.(context), [
            {
                type: "expense",
                amount: 35000,
                categoryName: "Ăn uống",
                date: "2026-11-06",
                replaces: 1,
            },
        ]);
        const saved = find("draft-correct-saved");
        assertEquals(saved.cards, [{ number: 1, status: "saved" }]);
        assert(saved.history?.some((turn) => turn.content.includes("đã lưu")));
    },
);

Deno.test("draft-followup có lịch sử bot hỏi số tiền", () => {
    const followup = find("draft-followup");
    assertEquals(followup.history?.[0], { role: "user", content: "ăn sáng" });
    assertEquals(followup.history?.[1].role, "assistant");
    assertEquals(followup.expectDrafts?.(context).length, 1);
});

Deno.test(
    "draft-many mong nhiều thẻ và draft-injection-note đúng một thẻ",
    () => {
        assert((find("draft-many").expectDrafts?.(context).length ?? 0) >= 2);
        assertEquals(
            find("draft-injection-note").expectDrafts?.(context).length,
            1,
        );
    },
);
