import { assert } from "@std/assert";
import type { CategoryRef } from "../_shared/types.ts";
import { APP_GUIDE } from "./app-guide.ts";
import { buildSystemPrompt } from "./system-prompt.ts";

const categories: CategoryRef[] = [
    { id: "e1", name: "Ăn uống", type: "expense" },
    { id: "e2", name: "Khác", type: "expense" },
    { id: "i1", name: "Lương", type: "income" },
    { id: "i2", name: "Khác", type: "income" },
];

const prompt = buildSystemPrompt({ today: "2026-11-06", categories });

Deno.test("prompt chứa ngày hôm nay kèm thứ", () => {
    assert(prompt.includes("Thứ Sáu, 06/11/2026"));
});

Deno.test("prompt liệt kê mục chi và mục thu ở hai dòng riêng", () => {
    const lines = prompt.split("\n");
    const expenseLine = lines.find((line) => line.startsWith("Mục chi:"));
    const incomeLine = lines.find((line) => line.startsWith("Mục thu:"));
    assert(expenseLine?.includes("Ăn uống"));
    assert(!expenseLine?.includes("Lương"));
    assert(incomeLine?.includes("Lương"));
    assert(!incomeLine?.includes("Ăn uống"));
});

Deno.test("prompt chứa hướng dẫn dùng app và quy tắc số liệu", () => {
    assert(prompt.includes(APP_GUIDE));
    assert(prompt.includes("Mọi con số phải lấy từ công cụ"));
});
