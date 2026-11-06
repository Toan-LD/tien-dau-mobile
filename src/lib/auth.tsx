import type { Session } from "@supabase/supabase-js";
import { isRunningInExpoGo } from "expo";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";

import { queryClient } from "@/lib/query-client";
import { supabase } from "@/lib/supabase";
import { clearDefaultWalletCache } from "@/lib/transactions";

WebBrowser.maybeCompleteAuthSession();

type AuthValue = {
    session: Session | null;
    loading: boolean;
    signInWithGoogle(): Promise<void>;
    signOut(): Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

function showError(message: string) {
    Alert.alert("Không đăng nhập được", message);
}

function authRedirectUrl() {
    const host = Constants.expoConfig?.hostUri;
    if (!isRunningInExpoGo() || !host) {
        return Linking.createURL("auth/callback");
    }
    const hostname = host.replace(/:\d+$/, "");
    if (/^[\d.]+$/.test(hostname) || hostname.includes(":")) {
        throw new Error(
            `Dev server đang chạy bằng địa chỉ IP (${hostname}), Supabase không cho đăng nhập về địa chỉ này. Tắt server rồi chạy lại bằng lệnh: npm run start:phone`,
        );
    }
    return `exp://${host}/--/auth/callback`;
}

async function signInWithGoogle() {
    try {
        const redirectTo = authRedirectUrl();
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo, skipBrowserRedirect: true },
        });
        if (error) throw error;

        const result = await WebBrowser.openAuthSessionAsync(
            data.url,
            redirectTo,
        );
        if (result.type !== "success") return;

        const { searchParams } = new URL(result.url);
        const failure =
            searchParams.get("error_description") ?? searchParams.get("error");
        if (failure) throw new Error(failure);
        const code = searchParams.get("code");
        if (!code) throw new Error("Không nhận được mã đăng nhập.");

        const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) throw exchangeError;
    } catch (e) {
        const detail = e instanceof Error ? e.message : String(e);
        showError(`Kiểm tra kết nối mạng rồi thử lại.\n\nChi tiết: ${detail}`);
    }
}

async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    clearDefaultWalletCache();
}

export function AuthProvider({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth
            .getSession()
            .then(({ data }) => setSession(data.session))
            .catch(() => setSession(null))
            .finally(() => setLoading(false));

        const { data } = supabase.auth.onAuthStateChange((_event, next) => {
            if (!next) queryClient.clear();
            setSession(next);
        });
        return () => data.subscription.unsubscribe();
    }, []);

    const value = useMemo(
        () => ({ session, loading, signInWithGoogle, signOut }),
        [session, loading],
    );

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
}

export function useAuth(): AuthValue {
    const value = useContext(AuthContext);
    if (!value) throw new Error("useAuth phải nằm trong AuthProvider");
    return value;
}
