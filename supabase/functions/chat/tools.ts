import type { ChatCompletionTool } from "openai/resources/chat/completions";
import {
    matchCategory,
    normalizeName,
    UNCATEGORIZED,
} from "../_shared/categories.ts";
import { formatVND, parseAmount } from "../_shared/money.ts";
import type { Period } from "../_shared/periods.ts";
import {
    resolveEntryDate,
    resolvePeriod,
    weekdayTitle,
} from "../_shared/periods.ts";
import {
    byCategory,
    compare,
    listTransactions,
    summarize,
} from "../_shared/report.ts";
import type {
    CategoryRef,
    Transaction,
    TransactionType,
} from "../_shared/types.ts";

export type CardStatus = "open" | "saved" | "dismissed" | "replaced";
export type CardState = { number: number; status: CardStatus };
export type ProposedDraft = {
    type: TransactionType;
    amount: number;
    categoryId: string;
    categoryName: string;
    date: string;
    note: string | null;
    replaces: number | null;
};

export type ToolContext = {
    today: string;
    categories: CategoryRef[];
    cards: CardState[];
    drafts: ProposedDraft[];
    loadTransactions(start: string, end: string): Promise<Transaction[]>;
};

export const MAX_DRAFTS_PER_REPLY = 5;
export const MAX_NOTE_LENGTH = 200;

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 20;

const ENTRY_DATE_FORMS =
    'today (mặc định), yesterday, day_before_yesterday, monday…sunday (lần gần nhất không sau hôm nay), DD/MM (người dùng nói ngày và tháng), day:DD (người dùng chỉ nói "ngày 3"), YYYY-MM-DD (người dùng nói đủ năm)';

const DRAFT_NOTE_FOR_REPLY =
    "Thẻ nháp đã hiện cho người dùng; họ cần bấm Lưu để ghi. Đừng nói là đã ghi.";

const PERIOD_FORMS =
    "today, yesterday, this_week, last_week, this_month, last_month, this_year, YYYY-MM (một tháng), YYYY-MM-DD (một ngày), YYYY-MM-DD..YYYY-MM-DD (một khoảng)";

const PERIOD_DESCRIPTION = `Khoảng thời gian, một trong: ${PERIOD_FORMS}. Tuần bắt đầu từ thứ Hai. Không tự tính ngày: dùng dạng có sẵn khi được.`;

const TYPE_ENUM = ["expense", "income"];

const CATEGORY_DESCRIPTION =
    'Tên mục như người dùng thấy (ví dụ "Ăn uống"); không phân biệt hoa thường và dấu. "Không phân loại" là các khoản chưa có mục.';

export const TOOL_DEFINITIONS: ChatCompletionTool[] = [
    {
        type: "function",
        function: {
            name: "get_summary",
            description:
                "Tổng chi, tổng thu, số còn lại (thu trừ chi) và số khoản trong một khoảng thời gian. Dùng cho câu hỏi tổng quát như 'tháng này tiêu bao nhiêu', 'còn lại bao nhiêu'.",
            parameters: {
                type: "object",
                properties: {
                    period: { type: "string", description: PERIOD_DESCRIPTION },
                },
                required: ["period"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "get_by_category",
            description:
                "Tổng tiền, phần trăm và số khoản của từng mục chi hoặc thu trong một khoảng thời gian, sắp từ lớn tới nhỏ. Dùng cho câu hỏi như 'tiêu nhiều nhất vào đâu', 'mục nào chiếm bao nhiêu'.",
            parameters: {
                type: "object",
                properties: {
                    period: { type: "string", description: PERIOD_DESCRIPTION },
                    type: {
                        type: "string",
                        enum: TYPE_ENUM,
                        description: "expense là chi, income là thu.",
                    },
                },
                required: ["period", "type"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "compare_periods",
            description:
                "So sánh tổng chi hoặc thu của hai khoảng thời gian; `base_period` là kỳ để so (thường là kỳ trước), `period` là kỳ đang hỏi. Trả về tổng của hai kỳ, chênh lệch và phần trăm. Không truyền `category` thì kèm các mục tăng, giảm nhiều nhất; truyền `category` thì chỉ so riêng mục đó.",
            parameters: {
                type: "object",
                properties: {
                    base_period: {
                        type: "string",
                        description: `Kỳ để so (thường là kỳ trước). ${PERIOD_DESCRIPTION}`,
                    },
                    period: {
                        type: "string",
                        description: `Kỳ đang hỏi. ${PERIOD_DESCRIPTION}`,
                    },
                    type: {
                        type: "string",
                        enum: TYPE_ENUM,
                        description: "expense là chi, income là thu.",
                    },
                    category: {
                        type: "string",
                        description: `Không bắt buộc: chỉ so riêng một mục. ${CATEGORY_DESCRIPTION}`,
                    },
                },
                required: ["base_period", "period", "type"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "list_transactions",
            description:
                "Liệt kê từng khoản chi/thu cụ thể (ngày, mục, số tiền, mô tả) trong một khoảng thời gian, kèm tổng số khoản khớp. Dùng khi người dùng hỏi khoản cụ thể như 'khoản lớn nhất', 'các lần mua cà phê', 'mấy khoản gần đây'.",
            parameters: {
                type: "object",
                properties: {
                    period: { type: "string", description: PERIOD_DESCRIPTION },
                    type: {
                        type: "string",
                        enum: TYPE_ENUM,
                        description:
                            "Không bắt buộc: expense là chi, income là thu. Bỏ trống thì lấy cả hai.",
                    },
                    category: {
                        type: "string",
                        description: `Không bắt buộc: chỉ lấy một mục. ${CATEGORY_DESCRIPTION}`,
                    },
                    sort: {
                        type: "string",
                        enum: ["newest", "largest"],
                        description:
                            "newest là mới nhất trước (mặc định), largest là số tiền lớn nhất trước.",
                    },
                    limit: {
                        type: "integer",
                        description: `Số khoản tối đa trả về, mặc định ${DEFAULT_LIMIT}, tối đa ${MAX_LIMIT}.`,
                    },
                },
                required: ["period"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "list_categories",
            description:
                "Danh sách tên các mục chi và thu của người dùng. Dùng khi người dùng hỏi có những mục nào, hoặc khi cần biết tên mục đúng.",
            parameters: {
                type: "object",
                properties: {
                    type: {
                        type: "string",
                        enum: TYPE_ENUM,
                        description:
                            "Không bắt buộc: expense là mục chi, income là mục thu. Bỏ trống thì trả cả hai.",
                    },
                },
                required: [],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "propose_transaction",
            description:
                "Soạn một thẻ nháp ghi khoản chi/thu để người dùng xem lại và bấm Lưu. Không ghi gì cả. Gọi một lần cho mỗi khoản; tối đa 5 thẻ mỗi câu trả lời. Chỉ gọi khi người dùng nhờ ghi, hoặc đang trả lời/sửa khoản vừa bàn.",
            parameters: {
                type: "object",
                properties: {
                    type: {
                        type: "string",
                        enum: TYPE_ENUM,
                        description: "expense là chi, income là thu.",
                    },
                    amount: {
                        type: "string",
                        description:
                            'Số tiền đúng như người dùng gõ, ví dụ "30k", "1tr2", "30.000"; không tự đổi.',
                    },
                    category: {
                        type: "string",
                        description:
                            'Tên một mục có sẵn cùng loại, khớp nhất với khoản (ví dụ "Ăn uống"); không phân biệt hoa thường và dấu. Không dùng "Không phân loại".',
                    },
                    date: {
                        type: "string",
                        description: `Ngày của khoản, một trong: ${ENTRY_DATE_FORMS}. Người dùng không nói ngày thì bỏ trống. Không tự tính ngày, năm hay tháng.`,
                    },
                    note: {
                        type: "string",
                        description:
                            'Mô tả ngắn, là phần người dùng nói về khoản đó ("ăn sáng"), không phải cả câu. Không có thì bỏ trống.',
                    },
                    replaces: {
                        type: "integer",
                        description:
                            "Số của thẻ đang sửa, lấy từ dòng [Thẻ N: ...] trong lịch sử. Chỉ truyền khi người dùng sửa một thẻ đã soạn.",
                    },
                },
                required: ["type", "amount", "category"],
            },
        },
    },
];

type Parsed<Value> = { ok: true; value: Value } | { ok: false; error: string };
type Arguments = Record<string, unknown>;

function fail(error: string): { ok: false; error: string } {
    return { ok: false, error };
}

function parseArguments(rawArguments: string): Parsed<Arguments> {
    let parsed: unknown;
    try {
        parsed = JSON.parse(rawArguments || "{}");
    } catch {
        return fail("Tham số không phải JSON hợp lệ.");
    }
    if (
        typeof parsed !== "object" ||
        parsed === null ||
        Array.isArray(parsed)
    ) {
        return fail("Tham số phải là một đối tượng JSON.");
    }
    return { ok: true, value: parsed as Arguments };
}

function readText(
    argumentsObject: Arguments,
    name: string,
    required: boolean,
): Parsed<string | undefined> {
    const value = argumentsObject[name];
    if (value === undefined || value === null) {
        return required
            ? fail(`Thiếu tham số bắt buộc "${name}".`)
            : { ok: true, value: undefined };
    }
    if (typeof value !== "string" || value.trim() === "") {
        return fail(`Tham số "${name}" phải là chuỗi không rỗng.`);
    }
    return { ok: true, value };
}

function readType(
    argumentsObject: Arguments,
    required: boolean,
): Parsed<TransactionType | undefined> {
    const value = argumentsObject.type;
    if (value === undefined || value === null) {
        return required
            ? fail('Thiếu tham số bắt buộc "type" (expense hoặc income).')
            : { ok: true, value: undefined };
    }
    if (value !== "expense" && value !== "income") {
        return fail('Tham số "type" phải là "expense" hoặc "income".');
    }
    return { ok: true, value };
}

function readPeriod(
    argumentsObject: Arguments,
    name: string,
    today: string,
): Parsed<Period> {
    const text = readText(argumentsObject, name, true);
    if (!text.ok) return text;
    const result = resolvePeriod(text.value as string, today);
    return result.ok ? { ok: true, value: result.period } : fail(result.error);
}

function readSort(argumentsObject: Arguments): Parsed<"newest" | "largest"> {
    const value = argumentsObject.sort ?? "newest";
    if (value !== "newest" && value !== "largest") {
        return fail('Tham số "sort" phải là "newest" hoặc "largest".');
    }
    return { ok: true, value };
}

function readLimit(argumentsObject: Arguments): Parsed<number> {
    const value = argumentsObject.limit ?? DEFAULT_LIMIT;
    if (typeof value !== "number" || !Number.isInteger(value)) {
        return fail('Tham số "limit" phải là số nguyên.');
    }
    return { ok: true, value: Math.min(Math.max(value, 1), MAX_LIMIT) };
}

function filterByCategory(
    transactions: Transaction[],
    ids: (string | null)[],
): Transaction[] {
    return transactions.filter((transaction) =>
        ids.includes(transaction.categoryId),
    );
}

async function getSummary(
    argumentsObject: Arguments,
    context: ToolContext,
): Promise<unknown> {
    const period = readPeriod(argumentsObject, "period", context.today);
    if (!period.ok) return period;
    const transactions = await context.loadTransactions(
        period.value.start,
        period.value.end,
    );
    return { period: period.value.label, ...summarize(transactions) };
}

async function getByCategory(
    argumentsObject: Arguments,
    context: ToolContext,
): Promise<unknown> {
    const period = readPeriod(argumentsObject, "period", context.today);
    if (!period.ok) return period;
    const type = readType(argumentsObject, true);
    if (!type.ok) return type;
    const transactions = await context.loadTransactions(
        period.value.start,
        period.value.end,
    );
    return {
        period: period.value.label,
        type: type.value,
        ...byCategory(transactions, type.value as TransactionType),
    };
}

async function comparePeriods(
    argumentsObject: Arguments,
    context: ToolContext,
): Promise<unknown> {
    const basePeriod = readPeriod(
        argumentsObject,
        "base_period",
        context.today,
    );
    if (!basePeriod.ok) return basePeriod;
    const period = readPeriod(argumentsObject, "period", context.today);
    if (!period.ok) return period;
    const typeResult = readType(argumentsObject, true);
    if (!typeResult.ok) return typeResult;
    const type = typeResult.value as TransactionType;
    const categoryName = readText(argumentsObject, "category", false);
    if (!categoryName.ok) return categoryName;

    let ids: (string | null)[] | undefined;
    if (categoryName.value !== undefined) {
        const match = matchCategory(
            categoryName.value,
            context.categories,
            type,
        );
        if (!match.ok) return match;
        ids = match.ids;
    }

    let [previous, current] = await Promise.all([
        context.loadTransactions(basePeriod.value.start, basePeriod.value.end),
        context.loadTransactions(period.value.start, period.value.end),
    ]);
    if (ids) {
        previous = filterByCategory(previous, ids);
        current = filterByCategory(current, ids);
    }
    return {
        base_period: basePeriod.value.label,
        period: period.value.label,
        ...(categoryName.value !== undefined && {
            category: categoryName.value,
        }),
        ...compare(previous, current, type, ids === undefined),
    };
}

async function listMatchingTransactions(
    argumentsObject: Arguments,
    context: ToolContext,
): Promise<unknown> {
    const period = readPeriod(argumentsObject, "period", context.today);
    if (!period.ok) return period;
    const type = readType(argumentsObject, false);
    if (!type.ok) return type;
    const categoryName = readText(argumentsObject, "category", false);
    if (!categoryName.ok) return categoryName;
    const sort = readSort(argumentsObject);
    if (!sort.ok) return sort;
    const limit = readLimit(argumentsObject);
    if (!limit.ok) return limit;

    let ids: (string | null)[] | undefined;
    if (categoryName.value !== undefined) {
        const match = matchCategory(
            categoryName.value,
            context.categories,
            type.value,
        );
        if (!match.ok) return match;
        ids = match.ids;
    }

    let transactions = await context.loadTransactions(
        period.value.start,
        period.value.end,
    );
    if (type.value) {
        transactions = transactions.filter(
            (transaction) => transaction.type === type.value,
        );
    }
    if (ids) transactions = filterByCategory(transactions, ids);
    return {
        period: period.value.label,
        ...listTransactions(transactions, sort.value, limit.value),
    };
}

function listCategories(
    argumentsObject: Arguments,
    context: ToolContext,
): unknown {
    const type = readType(argumentsObject, false);
    if (!type.ok) return type;
    const namesOf = (wanted: TransactionType) =>
        context.categories
            .filter((category) => category.type === wanted)
            .map((category) => category.name);
    return {
        ...(type.value !== "income" && { expense: namesOf("expense") }),
        ...(type.value !== "expense" && { income: namesOf("income") }),
    };
}

function readNote(argumentsObject: Arguments): Parsed<string | null> {
    const value = argumentsObject.note;
    if (value === undefined || value === null) return { ok: true, value: null };
    if (typeof value !== "string") {
        return fail('Tham số "note" phải là chuỗi.');
    }
    const collapsed = value
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, MAX_NOTE_LENGTH);
    return { ok: true, value: collapsed === "" ? null : collapsed };
}

function readReplaces(
    argumentsObject: Arguments,
    cards: CardState[],
): Parsed<number | null> {
    const value = argumentsObject.replaces;
    if (value === undefined || value === null) return { ok: true, value: null };
    if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
        return fail(
            'Tham số "replaces" phải là số thứ tự thẻ (số nguyên dương).',
        );
    }
    const card = cards.find((candidate) => candidate.number === value);
    if (!card) {
        return fail(
            `Không có thẻ ${value} trong cuộc trò chuyện; kiểm tra lại "replaces".`,
        );
    }
    if (card.status === "saved") {
        return fail(
            `Thẻ ${value} đã được lưu; không soạn lại, bảo người dùng sửa khoản đó ở tab Danh sách.`,
        );
    }
    return { ok: true, value: card.status === "open" ? value : null };
}

function proposeTransaction(
    argumentsObject: Arguments,
    context: ToolContext,
): unknown {
    const typeResult = readType(argumentsObject, true);
    if (!typeResult.ok) return typeResult;
    const type = typeResult.value as TransactionType;
    const amountText = readText(argumentsObject, "amount", true);
    if (!amountText.ok) return amountText;
    const amount = parseAmount(amountText.value as string);
    if (!amount.ok) return amount;
    const categoryName = readText(argumentsObject, "category", true);
    if (!categoryName.ok) return categoryName;
    if (
        normalizeName(categoryName.value as string) ===
        normalizeName(UNCATEGORIZED)
    ) {
        return fail(
            `Không soạn được thẻ với mục "${UNCATEGORIZED}": khoản ghi phải có mục. Chọn mục có sẵn khớp nhất hoặc hỏi người dùng.`,
        );
    }
    const match = matchCategory(
        categoryName.value as string,
        context.categories,
        type,
    );
    if (!match.ok) return match;
    const categoryId = match.ids[0];
    const category = context.categories.find(
        (candidate) => candidate.id === categoryId,
    );
    if (categoryId === null || !category) {
        return fail(`Không có mục "${categoryName.value}".`);
    }
    const dateText = readText(argumentsObject, "date", false);
    if (!dateText.ok) return dateText;
    const date = resolveEntryDate(dateText.value ?? "today", context.today);
    if (!date.ok) return date;
    const note = readNote(argumentsObject);
    if (!note.ok) return note;
    const replaces = readReplaces(argumentsObject, context.cards);
    if (!replaces.ok) return replaces;
    if (context.drafts.length >= MAX_DRAFTS_PER_REPLY) {
        return fail(
            `Mỗi lần chỉ soạn tối đa ${MAX_DRAFTS_PER_REPLY} thẻ; bảo người dùng gửi tiếp phần còn lại.`,
        );
    }

    context.drafts.push({
        type,
        amount: amount.amount,
        categoryId,
        categoryName: category.name,
        date: date.date,
        note: note.value,
        replaces: replaces.value,
    });
    const card = [
        `${type === "expense" ? "Chi" : "Thu"} ${formatVND(amount.amount)}`,
        category.name,
        weekdayTitle(date.date),
        note.value,
    ]
        .filter(Boolean)
        .join(" · ");
    return {
        card,
        note_for_reply: DRAFT_NOTE_FOR_REPLY,
        ...(replaces.value !== null && { replaces: replaces.value }),
    };
}

export async function runTool(
    name: string,
    rawArguments: string,
    context: ToolContext,
): Promise<string> {
    const handlers: Record<
        string,
        (
            argumentsObject: Arguments,
            context: ToolContext,
        ) => unknown | Promise<unknown>
    > = {
        get_summary: getSummary,
        get_by_category: getByCategory,
        compare_periods: comparePeriods,
        list_transactions: listMatchingTransactions,
        list_categories: listCategories,
        propose_transaction: proposeTransaction,
    };
    const handler = Object.hasOwn(handlers, name) ? handlers[name] : undefined;
    if (!handler) {
        return JSON.stringify({ error: `Không có công cụ ${name}` });
    }
    const parsed = parseArguments(rawArguments);
    if (!parsed.ok) return JSON.stringify({ error: parsed.error });
    const result = (await handler(parsed.value, context)) as object;
    if ("ok" in result && result.ok === false && "error" in result) {
        return JSON.stringify({ error: result.error });
    }
    return JSON.stringify(result);
}
