import { Ionicons } from "@expo/vector-icons";

import { CATEGORY_ICON_KEYS, ioniconFor } from "../category-icons";

describe("category icons", () => {
    it("lists 38 unique keys", () => {
        expect(CATEGORY_ICON_KEYS).toHaveLength(38);
        expect(new Set(CATEGORY_ICON_KEYS).size).toBe(38);
    });

    it("maps keys to outline icons", () => {
        expect(ioniconFor("cafe")).toBe("cafe-outline");
        expect(ioniconFor("ellipsis")).toBe("ellipsis-horizontal-outline");
    });

    it("falls back to the default icon for unknown keys", () => {
        expect(ioniconFor("📁")).toBe("ellipsis-horizontal-outline");
        expect(ioniconFor(null)).toBe("ellipsis-horizontal-outline");
        expect(ioniconFor(undefined)).toBe("ellipsis-horizontal-outline");
    });

    it("only uses icons that exist in Ionicons", () => {
        for (const k of CATEGORY_ICON_KEYS)
            expect(Ionicons.glyphMap).toHaveProperty(ioniconFor(k));
    });
});
