import type {
    CategoryRef,
    Transaction,
    TransactionType,
} from "../../_shared/types.ts";

export const FIXTURE_DAYS = 120;
export const DEFAULT_FIXTURE_SEED = 7;

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const RENT_AMOUNT = 4_500_000;
const SALARY_AMOUNT = 18_500_000;

const DAILY_SPENDING: {
    name: string;
    minimumThousands: number;
    maximumThousands: number;
    notes: string[];
}[] = [
    {
        name: "Ăn uống",
        minimumThousands: 30,
        maximumThousands: 180,
        notes: ["Cơm trưa", "Bún bò", "Phở", "Ăn tối với bạn"],
    },
    {
        name: "Cà phê",
        minimumThousands: 25,
        maximumThousands: 60,
        notes: ["Cà phê sáng", "Trà sữa", "Cà phê làm việc"],
    },
    {
        name: "Đi lại",
        minimumThousands: 20,
        maximumThousands: 120,
        notes: ["Grab", "Xăng xe", "Gửi xe"],
    },
    {
        name: "Mua sắm",
        minimumThousands: 80,
        maximumThousands: 450,
        notes: ["Quần áo", "Đồ dùng", "Mua online"],
    },
    {
        name: "Giải trí",
        minimumThousands: 50,
        maximumThousands: 300,
        notes: ["Xem phim", "Chơi game", "Đi chơi cuối tuần"],
    },
];

function createRandom(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let mixed = state;
        mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
        mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
        return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
    };
}

function toIsoDate(milliseconds: number): string {
    const date = new Date(milliseconds);
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function addDays(date: string, days: number): string {
    const [year, month, day] = date.split("-").map(Number);
    return toIsoDate(
        Date.UTC(year, month - 1, day) + days * MILLISECONDS_PER_DAY,
    );
}

export function buildFixture(
    today: string,
    categories: CategoryRef[],
    seed: number = DEFAULT_FIXTURE_SEED,
): Transaction[] {
    const random = createRandom(seed);
    const randomInteger = (minimum: number, maximum: number) =>
        minimum + Math.floor(random() * (maximum - minimum + 1));
    const transactions: Transaction[] = [];

    function add(
        date: string,
        type: TransactionType,
        categoryName: string | null,
        amount: number,
        note: string | null,
    ) {
        const category =
            categoryName === null
                ? null
                : categories.find(
                      (candidate) =>
                          candidate.name === categoryName &&
                          candidate.type === type,
                  );
        if (categoryName !== null && !category) {
            throw new Error(`Thiếu mục "${categoryName}" (${type})`);
        }
        const minuteOfDay = transactions.length % (24 * 60);
        const hours = String(Math.floor(minuteOfDay / 60)).padStart(2, "0");
        const minutes = String(minuteOfDay % 60).padStart(2, "0");
        transactions.push({
            type,
            amount,
            categoryId: category?.id ?? null,
            categoryName: category?.name ?? null,
            date,
            note,
            createdAt: `${date}T${hours}:${minutes}:00.000Z`,
        });
    }

    for (let age = FIXTURE_DAYS - 1; age >= 0; age--) {
        const date = addDays(today, -age);
        const dayOfMonth = Number(date.slice(8, 10));

        const count = randomInteger(1, 4);
        for (let index = 0; index < count; index++) {
            const spending =
                DAILY_SPENDING[randomInteger(0, DAILY_SPENDING.length - 1)];
            const amount =
                randomInteger(
                    spending.minimumThousands,
                    spending.maximumThousands,
                ) * 1000;
            const note =
                spending.notes[randomInteger(0, spending.notes.length - 1)];
            add(date, "expense", spending.name, amount, note);
        }

        if (dayOfMonth === 1) {
            add(date, "expense", "Nhà cửa", RENT_AMOUNT, "Tiền thuê nhà");
        }
        if (dayOfMonth === 10) {
            add(date, "income", "Lương", SALARY_AMOUNT, "Lương tháng");
        }
        if (dayOfMonth === 3) {
            add(
                date,
                "expense",
                "Khác",
                randomInteger(40, 250) * 1000,
                "Việc vặt",
            );
        }
        if (dayOfMonth === 4) {
            add(
                date,
                "expense",
                null,
                randomInteger(20, 150) * 1000,
                "Chi không rõ mục",
            );
        }
        if (dayOfMonth === 5) {
            add(
                date,
                "income",
                "Khác",
                randomInteger(100, 600) * 1000,
                "Bán đồ cũ",
            );
        }
    }
    return transactions;
}
