import { createClient } from "@supabase/supabase-js";
import type { ChatModel } from "./agent.ts";
import { createHandler } from "./handler.ts";
import type { AuthenticatedUser } from "./handler.ts";
import { openAIModel } from "./llm.ts";

const TIMEOUT_MS = 30_000;
const DEFAULT_DAILY_LIMIT = 50;

const SERVER_CLIENT_OPTIONS = {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
    },
};

function requireEnvironment(name: string): string {
    const value = Deno.env.get(name);
    if (!value) throw new Error(`Missing environment variable ${name}`);
    return value;
}

// Runtime cung cấp key kiểu mới dạng JSON {"default": "..."}; project còn
// dùng key cũ thì chỉ có biến đơn.
function supabaseKey(keysName: string, legacyName: string): string {
    const keys = Deno.env.get(keysName);
    if (keys) {
        const defaultKey = JSON.parse(keys).default;
        if (typeof defaultKey === "string" && defaultKey) return defaultKey;
    }
    return requireEnvironment(legacyName);
}

async function authenticate(
    request: Request,
): Promise<AuthenticatedUser | null> {
    const authorization = request.headers.get("Authorization") ?? "";
    const token = authorization.match(/^Bearer\s+(\S+)$/i)?.[1];
    if (!token) return null;
    const client = createClient(
        requireEnvironment("SUPABASE_URL"),
        supabaseKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY"),
        {
            ...SERVER_CLIENT_OPTIONS,
            global: { headers: { Authorization: `Bearer ${token}` } },
        },
    );
    const { data, error } = await client.auth.getClaims(token);
    const userId = data?.claims.sub;
    if (error || typeof userId !== "string" || !userId) return null;
    return { userId, client };
}

// Chỗ duy nhất dùng secret key: hàm đếm lượt chỉ cấp quyền cho service_role.
async function consumeQuota(userId: string): Promise<number> {
    const serviceClient = createClient(
        requireEnvironment("SUPABASE_URL"),
        supabaseKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY"),
        SERVER_CLIENT_OPTIONS,
    );
    const dailyLimit = Number(
        Deno.env.get("CHAT_DAILY_LIMIT") || DEFAULT_DAILY_LIMIT,
    );
    const { data, error } = await serviceClient.rpc("consume_chat_quota", {
        p_user_id: userId,
        p_limit: dailyLimit,
    });
    if (error) throw new Error(error.message);
    return data as number;
}

// Thiếu cấu hình LLM thì từng request trả 500, function vẫn khởi động được.
function modelFromEnvironment(): ChatModel {
    const baseURL = Deno.env.get("LLM_BASE_URL");
    const apiKey = Deno.env.get("LLM_API_KEY");
    const model = Deno.env.get("LLM_MODEL");
    if (baseURL && apiKey && model) {
        return openAIModel({ baseURL, apiKey, model });
    }
    return {
        complete: () =>
            Promise.reject(
                new Error(
                    "LLM_BASE_URL, LLM_API_KEY and LLM_MODEL must be set",
                ),
            ),
    };
}

Deno.serve(
    createHandler({
        authenticate,
        consumeQuota,
        model: modelFromEnvironment(),
        now: () => new Date(),
        timeoutMs: TIMEOUT_MS,
    }),
);
