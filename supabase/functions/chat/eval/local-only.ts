const LOCAL_HOSTNAMES = ["127.0.0.1", "localhost"];

// Chỉ nhận URL máy local, phân tích bằng URL để các dạng như
// http://localhost.evil.com hay http://127.0.0.1@evil.com không lọt qua.
export function isLocalSupabaseUrl(url: string): boolean {
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        return false;
    }
    return (
        parsed.protocol === "http:" &&
        LOCAL_HOSTNAMES.includes(parsed.hostname) &&
        parsed.username === "" &&
        parsed.password === ""
    );
}

// Từ chối mọi URL không phải máy local để không bao giờ chạm project thật.
export function requireLocalSupabaseUrl(): string {
    const url = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("API_URL") ?? "";
    if (!isLocalSupabaseUrl(url)) {
        throw new Error(
            "SUPABASE_URL phải là http://127.0.0.1 hoặc http://localhost (chỉ chạy với Supabase local).",
        );
    }
    return url;
}
