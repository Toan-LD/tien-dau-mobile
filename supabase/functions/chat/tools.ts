import type { ChatCompletionTool } from "openai/resources/chat/completions";
import { matchCategory } from "../_shared/categories.ts";
import { resolvePeriod } from "../_shared/periods.ts";
import type { Period } from "../_shared/periods.ts";
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

export type ToolContext = {
    today: string;
    categories: CategoryRef[];
    loadTransactions(start: string, end: string): Promise<Transaction[]>;
};

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 20;

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

// Lỗi tham số trả { error } cho model sửa; lỗi tải dữ liệu thì ném lên cho
// nơi gọi xử lý.
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
