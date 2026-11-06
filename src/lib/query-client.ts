import { focusManager, QueryClient } from "@tanstack/react-query";
import { AppState } from "react-native";

import { subscribeTransactionsChanged } from "@/lib/transactions";

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30_000,
            retry: 1,
        },
    },
});

focusManager.setEventListener((setFocused) => {
    const sub = AppState.addEventListener("change", (state) =>
        setFocused(state === "active"),
    );
    return () => sub.remove();
});

subscribeTransactionsChanged(() => {
    void queryClient.invalidateQueries({ queryKey: ["transactions"] });
});
