import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EntryForm } from "@/components/entry/entry-form";
import { Colors } from "@/constants/theme";
import { transactionQuery } from "@/lib/queries";
import { updateTransaction } from "@/lib/transactions";
import { useTransaction } from "@/lib/use-transaction";

export default function EditTransactionScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const queryClient = useQueryClient();
    const tx = useTransaction(id);

    if (!tx) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator color={Colors.icon} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom }]}>
            <EntryForm
                initial={tx}
                resetAfterSubmit={false}
                onSubmit={async (d) => {
                    const updated = await updateTransaction(tx.id, d);
                    // The detail screen underneath shows the new values at once.
                    queryClient.setQueryData(
                        transactionQuery(tx.id).queryKey,
                        updated,
                    );
                    router.back();
                }}
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
