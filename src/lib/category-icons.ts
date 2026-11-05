import type { Ionicons } from "@expo/vector-icons";

export type IoniconName = keyof typeof Ionicons.glyphMap;

export const DEFAULT_ICON_KEY = "ellipsis";

export const CATEGORY_ICON_KEYS = [
    "restaurant",
    "cafe",
    "pizza",
    "beer",
    "cart",
    "basket",
    "bag-handle",
    "shirt",
    "car",
    "bus",
    "bicycle",
    "airplane",
    "receipt",
    "flash",
    "water",
    "wifi",
    "phone-portrait",
    "home",
    "construct",
    "film",
    "game-controller",
    "musical-notes",
    "tv",
    "medkit",
    "fitness",
    "heart",
    "people",
    "paw",
    "school",
    "book",
    "briefcase",
    "wallet",
    "cash",
    "card",
    "gift",
    "trophy",
    "trending-up",
    "ellipsis",
] as const;

const ICONS = new Map<string, IoniconName>(
    CATEGORY_ICON_KEYS.map((key) => [
        key,
        (key === "ellipsis"
            ? "ellipsis-horizontal-outline"
            : `${key}-outline`) as IoniconName,
    ]),
);

export function ioniconFor(key: string | null | undefined): IoniconName {
    return ICONS.get(key ?? "") ?? ICONS.get(DEFAULT_ICON_KEY)!;
}
