import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EntryForm } from "@/components/entry/entry-form";
import { deleteWithUndo } from "@/lib/delete-with-undo";
import { useToast } from "@/components/ui/toast";
import { Colors } from "@/constants/theme";
import {
    getTransaction,
    updateTransaction,
    type Transaction,
} from "@/lib/transactions";

export default function TransactionScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const toast = useToast();
    const insets = useSafeAreaInsets();
    const [tx, setTx] = useState<Transaction | null>(null);

    useEffect(() => {
        let stale = false;
        getTransaction(id)
            .then((found) => {
                if (stale) return;
                if (found) setTx(found);
                else router.back();
            })
            .catch(() => {
                if (stale) return;
                toast.show({ message: "Không tải được khoản này" });
                router.back();
            });
        return () => {
            stale = true;
        };
    }, [id, router, toast]);

    if (!tx) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator color={Colors.icon} />
            </View>
        );
    }

    const remove = () => {
        // onChanged also runs after an undo; only the delete should leave this screen.
        let left = false;
        deleteWithUndo(tx, toast, () => {
            if (left) return;
            left = true;
            router.back();
        });
    };

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom }]}>
            <EntryForm
                initial={tx}
                resetAfterSubmit={false}
                onSubmit={(d) =>
                    updateTransaction(tx.id, d).then(() => router.back())
                }
                onDelete={remove}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    loading: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: Colors.background,
    },
});
