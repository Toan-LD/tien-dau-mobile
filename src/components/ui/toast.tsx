import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { Animated, Pressable, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors, Spacing } from "@/constants/theme";

const DEFAULT_DURATION_MS = 1000;
const ACTION_DURATION_MS = 5000;
const FADE_MS = 150;
const TAB_BAR_HEIGHT = 64;

type ToastOptions = {
    message: string;
    actionLabel?: string;
    onAction?(): void;
    durationMs?: number;
};

type ToastContextValue = { show(opts: ToastOptions): void };

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used inside ToastProvider");
    return ctx;
}

export function ToastProvider({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    const insets = useSafeAreaInsets();
    const [toast, setToast] = useState<ToastOptions | null>(null);
    const [opacity] = useState(() => new Animated.Value(0));
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearTimer = useCallback(() => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = null;
    }, []);

    const hide = useCallback(() => {
        clearTimer();
        Animated.timing(opacity, {
            toValue: 0,
            duration: FADE_MS,
            useNativeDriver: true,
        }).start(({ finished }) => {
            if (finished) setToast(null);
        });
    }, [clearTimer, opacity]);

    const show = useCallback(
        (opts: ToastOptions) => {
            clearTimer();
            setToast(opts);
            Animated.timing(opacity, {
                toValue: 1,
                duration: FADE_MS,
                useNativeDriver: true,
            }).start();
            const duration =
                opts.durationMs ??
                (opts.actionLabel ? ACTION_DURATION_MS : DEFAULT_DURATION_MS);
            timer.current = setTimeout(hide, duration);
        },
        [clearTimer, hide, opacity],
    );

    useEffect(
        () => () => {
            clearTimer();
            opacity.stopAnimation();
        },
        [clearTimer, opacity],
    );

    const value = useMemo(() => ({ show }), [show]);

    const handleAction = () => {
        toast?.onAction?.();
        hide();
    };

    return (
        <ToastContext.Provider value={value}>
            {children}
            {toast && (
                <Animated.View
                    pointerEvents="box-none"
                    style={[
                        styles.toast,
                        { bottom: insets.bottom + TAB_BAR_HEIGHT, opacity },
                    ]}
                >
                    <Text style={styles.message}>{toast.message}</Text>
                    {toast.actionLabel && (
                        <Pressable onPress={handleAction} hitSlop={Spacing.two}>
                            <Text style={styles.action}>
                                {toast.actionLabel}
                            </Text>
                        </Pressable>
                    )}
                </Animated.View>
            )}
        </ToastContext.Provider>
    );
}

const styles = StyleSheet.create({
    toast: {
        position: "absolute",
        left: Spacing.three,
        right: Spacing.three,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: Spacing.three,
        backgroundColor: Colors.primary,
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: Spacing.three,
    },
    message: { flex: 1, color: Colors.onPrimary, fontSize: 14 },
    action: { color: Colors.onPrimary, fontSize: 14, fontWeight: "700" },
});
