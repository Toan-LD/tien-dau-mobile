import { useFocusEffect } from "expo-router";
import { useCallback, useRef } from "react";
import { BackHandler } from "react-native";

import { useToast } from "@/components/ui/toast";

const WINDOW_MS = 2000;

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
