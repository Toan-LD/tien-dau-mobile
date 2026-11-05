import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Colors, Spacing } from "@/constants/theme";
import { deleteSampleData, insertSampleData } from "@/lib/sample-data";

// Development tools on Cài đặt (rendered only when __DEV__): fill the account
// with made-up transactions from 1 January to now, or remove them again.
// Only rows created here are removed; entries typed in by hand stay.
export function SampleDataPanel() {
    const toast = useToast();
    const [busy, setBusy] = useState<"create" | "delete" | null>(null);

    const create = async () => {
        setBusy("create");
        try {
            const count = await insertSampleData();
            toast.show({ message: `Đã tạo ${count} khoản mẫu` });
        } catch {
            toast.show({ message: "Không tạo được dữ liệu mẫu" });
        } finally {
            setBusy(null);
        }
    };

    const remove = async () => {
        setBusy("delete");
        try {
            await deleteSampleData();
            toast.show({ message: "Đã xoá dữ liệu mẫu" });
        } catch {
            toast.show({ message: "Không xoá được dữ liệu mẫu" });
        } finally {
            setBusy(null);
        }
    };

    const confirmCreate = () =>
        Alert.alert(
            "Tạo dữ liệu mẫu?",
            "Thêm khoảng một nghìn khoản chi/thu ngẫu nhiên từ 01/01 tới hôm nay vào tài khoản này. Có thể xoá lại bằng nút bên dưới.",
            [
                { text: "Huỷ", style: "cancel" },
                { text: "Tạo", onPress: create },
            ],
        );

    const confirmDelete = () =>
        Alert.alert(
            "Xoá dữ liệu mẫu?",
            "Chỉ xoá các khoản do nút Tạo dữ liệu mẫu tạo ra. Khoản bạn tự ghi vẫn giữ nguyên.",
            [
                { text: "Huỷ", style: "cancel" },
                { text: "Xoá", style: "destructive", onPress: remove },
            ],
        );

    return (
        <View style={styles.panel}>
            <Text style={styles.title}>Dữ liệu mẫu (chỉ bản dev)</Text>
            <Button
                variant="dashed"
                icon="flask-outline"
                label="Tạo dữ liệu mẫu từ đầu năm"
                onPress={confirmCreate}
                busy={busy === "create"}
                disabled={busy === "delete"}
            />
            <Button
                variant="danger-outline"
                label="Xoá dữ liệu mẫu"
                onPress={confirmDelete}
                busy={busy === "delete"}
                disabled={busy === "create"}
                style={styles.second}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    panel: { marginTop: Spacing.five },
    title: {
        fontSize: 13,
        fontWeight: "600",
        color: Colors.textSecondary,
        marginBottom: Spacing.two,
    },
    second: { marginTop: Spacing.two },
});
