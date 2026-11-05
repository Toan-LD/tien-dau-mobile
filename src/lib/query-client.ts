import { focusManager, QueryClient } from "@tanstack/react-query";
import { AppState } from "react-native";

import { subscribeTransactionsChanged } from "@/lib/transactions";

// One cache for the whole app. Screens read from it first, so going back to a
// tab shows the last data at once while a fresh copy loads in the background.
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Data younger than this is shown without asking Supabase again.
            staleTime: 30_000,
            retry: 1,
        },
    },
});

// React Native has no window focus event: treat "app came back to the
// foreground" as focus, so stale screens refresh after the phone was locked.
focusManager.setEventListener((setFocused) => {
    const sub = AppState.addEventListener("change", (state) =>
        setFocused(state === "active"),
    );
    return () => sub.remove();
});

// Any write to transactions (add, edit, delete, undo) marks every cached day
// and month as out of date; the screens on show reload by themselves.
subscribeTransactionsChanged(() => {
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
});
