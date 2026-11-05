import type { Session } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { createContext, useContext, useEffect, useState } from "react";
import { Alert } from "react-native";

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

async function signInWithGoogle() {
    try {
        const redirectTo = Linking.createURL("auth/callback");
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
    } catch {
        showError("Kiểm tra kết nối mạng rồi thử lại.");
    }
}

async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    clearDefaultWalletCache();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth
            .getSession()
            .then(({ data }) => setSession(data.session))
            .catch(() => setSession(null))
            .finally(() => setLoading(false));

        const { data } = supabase.auth.onAuthStateChange((_event, next) =>
            setSession(next),
        );
        return () => data.subscription.unsubscribe();
    }, []);

    return (
        <AuthContext.Provider
            value={{ session, loading, signInWithGoogle, signOut }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthValue {
    const value = useContext(AuthContext);
    if (!value) throw new Error("useAuth phải nằm trong AuthProvider");
    return value;
}
