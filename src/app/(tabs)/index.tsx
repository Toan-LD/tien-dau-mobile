import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EntryForm } from "@/components/entry/entry-form";
import { Colors } from "@/constants/theme";
import { useBackTwiceToExit } from "@/hooks/use-back-twice-to-exit";
import { createTransaction } from "@/lib/transactions";

export default function RecordScreen() {
    useBackTwiceToExit();

    return (
        <SafeAreaView edges={["top"]} style={styles.container}>
            <EntryForm
                resetAfterSubmit
                onSubmit={(d) => createTransaction(d).then(() => {})}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
});
