import { useMemo } from "react";
import {
    FlatList,
    KeyboardAvoidingView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Composer } from "@/components/chat/composer";
import { DraftCard } from "@/components/chat/draft-card";
import { MessageBubble } from "@/components/chat/message-bubble";
import { SuggestionList } from "@/components/chat/suggestion-list";
import { IconButton } from "@/components/ui/icon-button";
import { useToast } from "@/components/ui/toast";
import { Colors, Spacing } from "@/constants/theme";
import { type ChatMessage } from "@/lib/chat-state";
import { useChat } from "@/lib/use-chat";

const PENDING_ITEM_ID = "pending";
type ListItem = ChatMessage | { id: typeof PENDING_ITEM_ID; role: "pending" };

export default function AskScreen() {
    const { messages, pending, send, retry, reset, saveDraft, dismissDraft } =
        useChat();
    const toast = useToast();

    const handleSave = async (messageId: string) => {
        const result = await saveDraft(messageId);
        if (result === "failed") {
            toast.show({ message: "Không lưu được, bạn thử lại" });
        }
    };

    const items = useMemo<ListItem[]>(() => {
        const newestFirst: ListItem[] = [...messages].reverse();
        return pending
            ? [{ id: PENDING_ITEM_ID, role: "pending" }, ...newestFirst]
            : newestFirst;
    }, [messages, pending]);

    return (
        <SafeAreaView edges={["top"]} style={styles.container}>
            <KeyboardAvoidingView behavior="padding" style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.pageTitle}>Chatbot</Text>
                    {messages.length > 0 && (
                        <IconButton
                            name="create-outline"
                            accessibilityLabel="Cuộc trò chuyện mới"
                            onPress={reset}
                        />
                    )}
                </View>
                {messages.length === 0 ? (
                    <View style={styles.intro}>
                        <SuggestionList onSelect={send} />
                    </View>
                ) : (
                    <FlatList
                        inverted
                        data={items}
                        keyExtractor={(item) => item.id}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={styles.list}
                        renderItem={({ item }) =>
                            item.role === "pending" ? (
                                <Text style={styles.pending}>
                                    Đang trả lời…
                                </Text>
                            ) : item.role === "draft" ? (
                                <DraftCard
                                    message={item}
                                    onSave={handleSave}
                                    onDismiss={dismissDraft}
                                />
                            ) : (
                                <MessageBubble message={item} onRetry={retry} />
                            )
                        }
                    />
                )}
                <Composer pending={pending} onSend={send} />
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: Spacing.three,
        paddingTop: Spacing.three,
        paddingBottom: Spacing.two,
    },
    pageTitle: { fontSize: 22, fontWeight: "700", color: Colors.text },
    intro: { flex: 1, padding: Spacing.three },
    list: { padding: Spacing.three },
    pending: {
        alignSelf: "flex-start",
        fontSize: 14,
        color: Colors.textSecondary,
        marginBottom: Spacing.two,
    },
});
