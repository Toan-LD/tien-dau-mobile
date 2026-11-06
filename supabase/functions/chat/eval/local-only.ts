const LOCAL_HOSTNAMES = ["127.0.0.1", "localhost"];

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

export function requireLocalSupabaseUrl(): string {
    const url = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("API_URL") ?? "";
    if (!isLocalSupabaseUrl(url)) {
        throw new Error(
            "SUPABASE_URL phải là http://127.0.0.1 hoặc http://localhost (chỉ chạy với Supabase local).",
        );
    }
    return url;
}
