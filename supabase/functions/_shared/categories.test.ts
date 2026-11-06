import { assert, assertEquals } from "@std/assert";
import type { CategoryRef } from "./types.ts";
import { matchCategory, normalizeName } from "./categories.ts";

const cats: CategoryRef[] = [
    { id: "e1", name: "Ăn uống", type: "expense" },
    { id: "e2", name: "Khác", type: "expense" },
    { id: "i1", name: "Lương", type: "income" },
    { id: "i2", name: "Khác", type: "income" },
];

Deno.test("normalizeName bỏ dấu, đổi đ, gộp khoảng trắng", () => {
    assertEquals(normalizeName("  Ăn  Uống "), "an uong");
    assertEquals(normalizeName("Đi lại"), "di lai");
});

Deno.test("matchCategory khớp không phân biệt dấu và hoa thường", () => {
    assertEquals(matchCategory("an uong", cats), { ok: true, ids: ["e1"] });
    assertEquals(matchCategory("không phân loại", cats), {
        ok: true,
        ids: [null],
    });
});

Deno.test("matchCategory lấy cả chi và thu khi không truyền loại", () => {
    assertEquals(matchCategory("Khác", cats), { ok: true, ids: ["e2", "i2"] });
});

Deno.test("matchCategory chỉ lấy mục đúng loại khi có truyền loại", () => {
    assertEquals(matchCategory("Khác", cats, "income"), {
        ok: true,
        ids: ["i2"],
    });
});

Deno.test("matchCategory báo lỗi liệt kê mục của loại đó", () => {
    const miss = matchCategory("xăng", cats, "expense");
    assertEquals(miss.ok, false);
    // lỗi liệt kê đúng tên mục chi + "Không phân loại"
    assert(
        !miss.ok &&
            miss.error.includes("Ăn uống") &&
            miss.error.includes("Không phân loại") &&
            !miss.error.includes("Lương"),
    );
});
