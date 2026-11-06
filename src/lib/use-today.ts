import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";

import { todayLocal } from "@/lib/dates";

export function useToday(): string {
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
