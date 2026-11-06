import { assertEquals } from "@std/assert";
import { isLocalSupabaseUrl } from "./local-only.ts";

Deno.test("nhận các URL máy local", () => {
    for (const url of [
        "http://127.0.0.1:54321",
        "http://127.0.0.1",
        "http://localhost:54321",
        "http://localhost",
    ]) {
        assertEquals(isLocalSupabaseUrl(url), true, url);
    }
});

Deno.test("từ chối URL không phải máy local", () => {
    for (const url of [
        "http://localhost.evil.com",
        "http://127.0.0.1@evil.com",
        "http://127.0.0.1.evil.com",
        "http://user:pass@localhost:54321",
        "https://xyz.supabase.co",
        "https://127.0.0.1:54321",
        "",
        "not a url",
    ]) {
        assertEquals(isLocalSupabaseUrl(url), false, url);
    }
});
