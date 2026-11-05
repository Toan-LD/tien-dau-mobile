import { useFocusEffect } from "expo-router";
import { useCallback, useRef } from "react";
import { BackHandler } from "react-native";

import { useToast } from "@/components/ui/toast";

const WINDOW_MS = 2000;

// Android: on the screen that would close the app, the first back press (or
// edge swipe) only shows a hint; a second one within 2 seconds leaves the app.
// An open sheet closes first: BottomSheet adds its own back handler while
// open, and the handler added last runs first.
// Does nothing on iOS, which has no system back.
export function useBackTwiceToExit() {
    const toast = useToast();
    const lastPress = useRef(0);

    useFocusEffect(
        useCallback(() => {
            const sub = BackHandler.addEventListener(
                "hardwareBackPress",
                () => {
                    const now = Date.now();
                    if (now - lastPress.current < WINDOW_MS) {
                        // Let Android do its usual thing and leave the app.
                        return false;
                    }
                    lastPress.current = now;
                    toast.show({
                        message: "Vuốt hoặc bấm quay lại lần nữa để thoát",
                        durationMs: WINDOW_MS,
                    });
                    return true;
                },
            );
            return () => sub.remove();
        }, [toast]),
    );
}
