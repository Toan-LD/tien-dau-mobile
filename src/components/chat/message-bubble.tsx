import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { PressableScale } from "@/components/ui/pressable-scale";
import { Colors, Spacing } from "@/constants/theme";
import {
    ERROR_TEXT,
    type ChatMessage,
    type DraftMessage,
} from "@/lib/chat-state";

type Props = {
    message: Exclude<ChatMessage, DraftMessage>;
    onRetry(errorId: string): void;
};

export const MessageBubble = memo(function MessageBubble({
    message,
    onRetry,
}: Readonly<Props>) {
    if (message.role === "error") {
        return (
            <View style={[styles.bubble, styles.assistant]}>
                <Text selectable style={styles.errorText}>
                    {ERROR_TEXT[message.kind]}
                </Text>
                {message.kind === "quota" ? null : (
                    <PressableScale
                        onPress={() => onRetry(message.id)}
                        accessibilityRole="button"
                        style={styles.retry}
                        pressedStyle={styles.retryPressed}
                    >
                        <Text style={styles.retryText}>Thử lại</Text>
                    </PressableScale>
                )}
            </View>
        );
    }
    const isUser = message.role === "user";
    return (
        <View style={[styles.bubble, isUser ? styles.user : styles.assistant]}>
            <Text selectable style={styles.text}>
                {message.text}
            </Text>
        </View>
    );
});

const styles = StyleSheet.create({
    bubble: {
        maxWidth: "85%",
        paddingVertical: Spacing.two,
        paddingHorizontal: Spacing.three,
        borderRadius: 14,
        marginBottom: Spacing.two,
    },
    user: { alignSelf: "flex-end", backgroundColor: Colors.surfaceMuted },
    assistant: {
        alignSelf: "flex-start",
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    text: { fontSize: 15, lineHeight: 21, color: Colors.text },
    errorText: {
        fontSize: 15,
        lineHeight: 21,
        color: Colors.textSecondary,
    },
    retry: {
        alignSelf: "flex-start",
        marginTop: Spacing.two,
        paddingVertical: Spacing.one,
        paddingHorizontal: Spacing.three,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 8,
    },
    retryPressed: { backgroundColor: Colors.segment },
    retryText: { fontSize: 14, fontWeight: "600", color: Colors.text },
});
