import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";

import { IconButton } from "@/components/ui/icon-button";
import { Colors, NewEntryButton, Spacing } from "@/constants/theme";
import { useKeyboardVisible } from "@/hooks/use-keyboard-visible";

type Props = {
    pending: boolean;
    onSend(text: string): void;
};

export function Composer({ pending, onSend }: Readonly<Props>) {
    const [text, setText] = useState("");
    const keyboardVisible = useKeyboardVisible();
    const canSend = text.trim().length > 0 && !pending;

    function submit() {
        if (!canSend) return;
        onSend(text);
        setText("");
    }

    return (
        <View
            style={[
                styles.container,
                !keyboardVisible && styles.clearOfNewEntryButton,
            ]}
        >
            <TextInput
                value={text}
                onChangeText={setText}
                multiline
                maxLength={500}
                placeholder="Hỏi về thu chi của bạn…"
                placeholderTextColor={Colors.textMuted}
                style={styles.input}
            />
            <IconButton
                name="send-outline"
                accessibilityLabel="Gửi"
                onPress={submit}
                disabled={!canSend}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "flex-end",
        gap: Spacing.two,
        padding: Spacing.two,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        backgroundColor: Colors.surface,
    },
    clearOfNewEntryButton: {
        paddingBottom: Spacing.two + NewEntryButton.raise,
    },
    input: {
        flex: 1,
        maxHeight: 120,
        paddingVertical: Spacing.two,
        paddingHorizontal: Spacing.three,
        fontSize: 15,
        color: Colors.text,
        backgroundColor: Colors.surfaceMuted,
        borderRadius: 18,
    },
});
