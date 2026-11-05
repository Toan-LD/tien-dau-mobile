import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";

import { todayLocal, type LocalDate } from "@/lib/dates";

// Today's local date, refreshed on screen focus and when the app returns to the foreground.
export function useToday(): LocalDate {
    const [today, setToday] = useState(() => todayLocal());

    useFocusEffect(
        useCallback(() => {
            setToday(todayLocal());
        }, []),
    );

    useEffect(() => {
        const sub = AppState.addEventListener("change", (state) => {
            if (state === "active") setToday(todayLocal());
        });
        return () => sub.remove();
    }, []);

    return today;
}
