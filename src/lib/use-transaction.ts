import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useIsFocused, useRouter } from "expo-router";
import { useEffect } from "react";
import { LayoutAnimation } from "react-native";

import { useToast } from "@/components/ui/toast";
import { deleteWithUndo } from "@/lib/delete-with-undo";
import {
    findCachedTransaction,
    removeCachedTransaction,
    transactionQuery,
} from "@/lib/queries";
import type { Transaction } from "@/lib/transactions";

// One transaction for the detail and edit screens. Shows the copy already in a
// cached day/month list at once, then the fresh one. Leaves the screen if the
// row can't be loaded or no longer exists.
export function useTransaction(id: string): Transaction | null {
    const router = useRouter();
    const toast = useToast();
    const queryClient = useQueryClient();
    // Detail and edit can both be mounted; only the one on show navigates.
    const focused = useIsFocused();
    const query = useQuery({
        ...transactionQuery(id),
        placeholderData: () => findCachedTransaction(queryClient, id),
    });
    const tx = query.data ?? null;
    const failed = query.isError;
    const missing = query.isSuccess && !query.isPlaceholderData && !tx;

    useEffect(() => {
        if (!focused) return;
        if (failed) {
            toast.show({ message: "Không tải được khoản này" });
            router.back();
        } else if (missing) {
            // Deleted somewhere else.
            router.back();
        }
    }, [focused, failed, missing, router, toast]);

    return tx;
}

// Deletes a transaction with an undo toast. The row leaves every cached list at
// once; if the delete fails the lists are reloaded and it comes back.
const REFLOW = LayoutAnimation.create(
    180,
    LayoutAnimation.Types.easeInEaseOut,
    LayoutAnimation.Properties.opacity,
);

export function useDeleteTransaction() {
    const toast = useToast();
    const queryClient = useQueryClient();

    return (tx: Transaction) => {
        // The rows below glide up into the gap, once, instead of jumping.
        LayoutAnimation.configureNext(REFLOW);
        removeCachedTransaction(queryClient, tx.id);
        deleteWithUndo(tx, toast, () => {}).then((ok) => {
            if (!ok)
                queryClient.invalidateQueries({ queryKey: ["transactions"] });
        });
    };
}
