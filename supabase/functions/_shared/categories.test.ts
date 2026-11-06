import { assert, assertEquals } from "@std/assert";
import type { CategoryRef } from "./types.ts";
import { matchCategory, normalizeName } from "./categories.ts";

const categories: CategoryRef[] = [
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
    assertEquals(matchCategory("an uong", categories), {
        ok: true,
        ids: ["e1"],
    });
    assertEquals(matchCategory("không phân loại", categories), {
        ok: true,
        ids: [null],
    });
});

Deno.test("matchCategory lấy cả chi và thu khi không truyền loại", () => {
    assertEquals(matchCategory("Khác", categories), {
        ok: true,
        ids: ["e2", "i2"],
    });
});

Deno.test("matchCategory chỉ lấy mục đúng loại khi có truyền loại", () => {
    assertEquals(matchCategory("Khác", categories, "income"), {
        ok: true,
        ids: ["i2"],
    });
});

Deno.test("matchCategory báo lỗi liệt kê mục của loại đó", () => {
    const mismatch = matchCategory("xăng", categories, "expense");
    assertEquals(mismatch.ok, false);
    // lỗi liệt kê đúng tên mục chi + "Không phân loại"
    assert(
        !mismatch.ok &&
            mismatch.error.includes("Ăn uống") &&
            mismatch.error.includes("Không phân loại") &&
            !mismatch.error.includes("Lương"),
    );
});
