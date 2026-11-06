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

export function useTransaction(id: string): Transaction | null {
    const router = useRouter();
    const toast = useToast();
    const queryClient = useQueryClient();
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

const REFLOW = LayoutAnimation.create(
    180,
    LayoutAnimation.Types.easeInEaseOut,
    LayoutAnimation.Properties.opacity,
);

export function useDeleteTransaction() {
    const toast = useToast();
    const queryClient = useQueryClient();

    return (tx: Transaction) => {
        LayoutAnimation.configureNext(REFLOW);
        removeCachedTransaction(queryClient, tx.id);
        void deleteWithUndo(tx, toast, () => {}).then((ok) => {
            if (!ok)
                void queryClient.invalidateQueries({
                    queryKey: ["transactions"],
                });
        });
    };
}
