import type { Category, TxType } from "@/lib/categories";
import { addDays, toLocalDateString } from "@/lib/dates";
import { requireUserId } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { defaultWalletId, notifyTransactionsChanged } from "@/lib/transactions";

export const SAMPLE_MARKER = "sample-data";

export type SampleRow = {
    type: TxType;
    amount: number;
    category_id: string;
    transaction_date: string;
    note: string | null;
    created_at: string;
};

function random(seed: number) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

type Rule = {
    type: TxType;
    category: string;
    chance?: number;
    day?: number;
    weekend?: boolean;
    min: number;
    max: number;
    hour: [number, number];
    notes: (string | null)[];
};

const RULES: Rule[] = [
    {
        type: "expense",
        category: "Ăn uống",
        chance: 0.9,
        min: 30,
        max: 75,
        hour: [11, 13],
        notes: ["Cơm trưa", "Bún bò", "Phở", "Cơm tấm", null],
    },
    {
        type: "expense",
        category: "Ăn uống",
        chance: 0.7,
        min: 40,
        max: 160,
        hour: [18, 20],
        notes: ["Cơm tối", "Lẩu", "Bánh mì", "Đi chợ", null],
    },
    {
        type: "expense",
        category: "Cà phê",
        chance: 0.6,
        min: 25,
        max: 60,
        hour: [7, 9],
        notes: ["Cà phê sữa", "Trà sữa", "Bạc xỉu", null],
    },
    {
        type: "expense",
        category: "Đi lại",
        chance: 0.5,
        min: 15,
        max: 70,
        hour: [8, 18],
        notes: ["Grab", "Gửi xe", "Đổ xăng", null],
    },
    {
        type: "expense",
        category: "Mua sắm",
        chance: 0.1,
        min: 120,
        max: 1200,
        hour: [19, 22],
        notes: ["Shopee", "Quần áo", "Đồ dùng", "Giày"],
    },
    {
        type: "expense",
        category: "Giải trí",
        chance: 0.35,
        weekend: true,
        min: 100,
        max: 450,
        hour: [15, 21],
        notes: ["Xem phim", "Đi chơi", "Karaoke", null],
    },
    {
        type: "expense",
        category: "Sức khoẻ",
        chance: 0.03,
        min: 80,
        max: 600,
        hour: [9, 17],
        notes: ["Thuốc", "Khám bệnh"],
    },
    {
        type: "expense",
        category: "Gia đình",
        chance: 0.04,
        min: 200,
        max: 1000,
        hour: [10, 20],
        notes: ["Biếu bố mẹ", "Quà sinh nhật", null],
    },
    {
        type: "expense",
        category: "Học tập",
        chance: 0.02,
        min: 150,
        max: 700,
        hour: [9, 21],
        notes: ["Sách", "Khoá học online"],
    },
    {
        type: "expense",
        category: "Nhà cửa",
        day: 1,
        min: 4500,
        max: 4500,
        hour: [9, 10],
        notes: ["Tiền nhà"],
    },
    {
        type: "expense",
        category: "Hoá đơn",
        day: 5,
        min: 380,
        max: 950,
        hour: [20, 21],
        notes: ["Tiền điện"],
    },
    {
        type: "expense",
        category: "Hoá đơn",
        day: 6,
        min: 80,
        max: 160,
        hour: [20, 21],
        notes: ["Tiền nước"],
    },
    {
        type: "expense",
        category: "Hoá đơn",
        day: 8,
        min: 220,
        max: 220,
        hour: [9, 10],
        notes: ["Internet"],
    },
    {
        type: "income",
        category: "Lương",
        day: 10,
        min: 18500,
        max: 18500,
        hour: [9, 10],
        notes: ["Lương tháng"],
    },
    {
        type: "income",
        category: "Được cho/tặng",
        chance: 0.01,
        min: 200,
        max: 1000,
        hour: [10, 20],
        notes: ["Mừng tuổi", "Quà"],
    },
    {
        type: "income",
        category: "Khác",
        chance: 0.02,
        min: 100,
        max: 600,
        hour: [10, 20],
        notes: ["Bán đồ cũ", "Hoàn tiền"],
    },
];

const BONUS: Rule = {
    type: "income",
    category: "Thưởng",
    min: 0,
    max: 0,
    hour: [9, 11],
    notes: [],
};

const BUSY_MONTH = 2;
const BUSY_RULES = new Set(["Mua sắm", "Gia đình"]);

function resolveCategory(
    categories: Category[],
    type: TxType,
    name: string,
): Category | undefined {
    const ofType = categories.filter((c) => c.type === type);
    return (
        ofType.find((c) => c.name === name) ??
        ofType.find((c) => c.name === "Khác")
    );
}

export function generateSampleTransactions({
    from,
    now,
    categories,
    seed = 2026,
}: {
    from: string;
    now: Date;
    categories: Category[];
    seed?: number;
}): SampleRow[] {
    const rand = random(seed);
    const between = (lo: number, hi: number) => lo + rand() * (hi - lo);
    const pick = <T>(list: T[]) => list[Math.floor(rand() * list.length)];
    const today = toLocalDateString(now);
    const rows: SampleRow[] = [];

    const add = (
        rule: Rule,
        date: string,
        amountK: number,
        note: string | null,
    ) => {
        const category = resolveCategory(categories, rule.type, rule.category);
        if (!category) return;
        const [y, m, d] = date.split("-").map(Number);
        const at = new Date(
            y,
            m - 1,
            d,
            Math.floor(between(rule.hour[0], rule.hour[1] + 1)),
            Math.floor(rand() * 60),
        );
        if (at.getTime() > now.getTime()) return;
        rows.push({
            type: rule.type,
            amount: Math.max(1, Math.round(amountK)) * 1000,
            category_id: category.id,
            transaction_date: date,
            note,
            created_at: at.toISOString(),
        });
    };

    for (let date = from; date <= today; date = addDays(date, 1)) {
        const [, month, day] = date.split("-").map(Number);
        const weekday = new Date(`${date}T12:00:00`).getDay();
        const weekend = weekday === 0 || weekday === 6;

        for (const rule of RULES) {
            if (rule.day !== undefined) {
                if (day !== rule.day) continue;
            } else {
                if (rule.weekend && !weekend) continue;
                let chance = rule.chance ?? 0;
                if (month === BUSY_MONTH && BUSY_RULES.has(rule.category)) {
                    chance *= 4;
                }
                if (rand() >= chance) continue;
            }
            const note =
                rule.category === "Lương"
                    ? `Lương tháng ${month}`
                    : pick(rule.notes);
            add(rule, date, between(rule.min, rule.max), note);
        }

        if (day === 15 && month === 1) {
            add(BONUS, date, 15000, "Thưởng Tết");
        } else if (day === 15 && [4, 7, 10].includes(month)) {
            add(BONUS, date, between(2000, 4000), "Thưởng quý");
        }
    }

    return rows.sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function insertSampleData(now = new Date()): Promise<number> {
    const userId = await requireUserId();
    const walletId = await defaultWalletId(userId);
    const { data, error } = await supabase
        .from("categories")
        .select("id,name,icon,type,sort_order");
    if (error) throw error;
    const categories: Category[] = (data ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        type: c.type as TxType,
        sortOrder: c.sort_order,
    }));
    const rows = generateSampleTransactions({
        from: `${now.getFullYear()}-01-01`,
        now,
        categories,
        seed: Date.now(),
    });
    const BATCH = 200;
    const batches: (typeof rows)[] = [];
    for (let i = 0; i < rows.length; i += BATCH) {
        batches.push(rows.slice(i, i + BATCH));
    }
    // All batches go out together; a failed one still leaves the others in,
    // and "Xoá dữ liệu mẫu" removes them by the marker.
    const results = await Promise.all(
        batches.map((batch) =>
            supabase.from("transactions").insert(
                batch.map((r) => ({
                    ...r,
                    user_id: userId,
                    wallet_id: walletId,
                    receipt_url: SAMPLE_MARKER,
                })),
            ),
        ),
    );
    const failed = results.find((r) => r.error);
    notifyTransactionsChanged();
    if (failed?.error) throw failed.error;
    return rows.length;
}

export async function deleteSampleData(): Promise<void> {
    const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("receipt_url", SAMPLE_MARKER);
    if (error) throw error;
    notifyTransactionsChanged();
}
