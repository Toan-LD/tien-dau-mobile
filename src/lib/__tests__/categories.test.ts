import { fake } from "@/test-utils/supabase-mock";
import {
    createCategory,
    deleteCategory,
    DuplicateCategoryError,
    reorderCategories,
    saveCategoryOrder,
    listCategories,
    normalizeCategoryName,
} from "@/lib/categories";

jest.mock("@/lib/supabase", () => ({
    supabase: jest.requireActual("@/test-utils/supabase-mock").fakeSupabase,
}));

beforeEach(() => fake.reset());

describe("normalizeCategoryName", () => {
    it("trims and collapses whitespace", () => {
        expect(normalizeCategoryName("  Cà   phê ")).toBe("Cà phê");
    });
});

describe("createCategory", () => {
    const input = {
        name: " Cà   phê ",
        iconKey: "cafe",
        type: "expense" as const,
        sortOrder: 99,
    };

    it("inserts a normalized name with the user id and maps the row", () => {
        fake.enqueue("categories", {
            data: {
                id: "c1",
                name: "Cà phê",
                icon: "cafe",
                type: "expense",
                sort_order: 99,
            },
        });
        return createCategory(input).then((c) => {
            expect(fake.lastInsert).toMatchObject({
                name: "Cà phê",
                icon: "cafe",
                type: "expense",
                sort_order: 99,
                user_id: "user-1",
            });
            expect(c).toEqual({
                id: "c1",
                name: "Cà phê",
                icon: "cafe",
                type: "expense",
                sortOrder: 99,
            });
        });
    });

    it("throws DuplicateCategoryError on unique violation", async () => {
        fake.enqueue("categories", { error: { code: "23505" } });
        await expect(
            createCategory({ ...input, name: "Ăn uống" }),
        ).rejects.toBeInstanceOf(DuplicateCategoryError);
    });

    it("throws without a session", async () => {
        fake.userId = null;
        await expect(createCategory(input)).rejects.toThrow();
    });
});

describe("listCategories", () => {
    it("filters by type and maps rows", async () => {
        fake.enqueue("categories", {
            data: [
                {
                    id: "c1",
                    name: "Lương",
                    icon: null,
                    type: "income",
                    sort_order: 1,
                },
            ],
        });
        const list = await listCategories("income");
        expect(fake.callsTo("eq")).toContainEqual(["type", "income"]);
        expect(list).toEqual([
            {
                id: "c1",
                name: "Lương",
                icon: null,
                type: "income",
                sortOrder: 1,
            },
        ]);
    });
});

describe("deleteCategory", () => {
    it("deletes the row by id", async () => {
        fake.enqueue("categories", {});
        await deleteCategory("c1");
        expect(fake.callsTo("delete")).toHaveLength(1);
        expect(fake.callsTo("eq")).toContainEqual(["id", "c1"]);
    });

    it("throws when the delete fails", async () => {
        fake.enqueue("categories", { error: { code: "42501" } });
        await expect(deleteCategory("c1")).rejects.toBeTruthy();
    });
});

const cat = (id: string, sortOrder: number) => ({
    id,
    name: id,
    icon: null,
    type: "expense" as const,
    sortOrder,
});

describe("reorderCategories", () => {
    const list = [cat("a", 1), cat("b", 2), cat("c", 3)];

    it("puts categories in the dragged order and renumbers from 1", () => {
        expect(reorderCategories(list, ["c", "a", "b"])).toEqual([
            cat("c", 1),
            cat("a", 2),
            cat("b", 3),
        ]);
    });

    it("renumbers ties and gaps so the new order sticks", () => {
        const messy = [cat("a", 0), cat("b", 0), cat("c", 7)];
        expect(reorderCategories(messy, ["b", "a", "c"])).toEqual([
            cat("b", 1),
            cat("a", 2),
            cat("c", 3),
        ]);
    });

    it("ignores unknown ids", () => {
        expect(reorderCategories(list, ["b", "x", "a", "c"])).toEqual([
            cat("b", 1),
            cat("a", 2),
            cat("c", 3),
        ]);
    });
});

describe("saveCategoryOrder", () => {
    it("updates only rows whose sort order changed", async () => {
        fake.enqueue("categories", {});
        await saveCategoryOrder(
            [cat("a", 1), cat("b", 2), cat("c", 3)],
            [cat("a", 1), cat("c", 2), cat("b", 3)],
        );
        expect(fake.callsTo("update")).toEqual([
            [{ sort_order: 2 }],
            [{ sort_order: 3 }],
        ]);
        expect(fake.callsTo("eq")).toEqual([
            ["id", "c"],
            ["id", "b"],
        ]);
    });

    it("throws when an update fails", async () => {
        fake.enqueue("categories", { error: { code: "42501" } });
        await expect(
            saveCategoryOrder(
                [cat("a", 1), cat("b", 2)],
                [cat("b", 1), cat("a", 2)],
            ),
        ).rejects.toBeTruthy();
    });
});
