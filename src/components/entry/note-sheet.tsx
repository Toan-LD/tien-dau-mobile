import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput } from "react-native";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Colors, Spacing } from "@/constants/theme";

type Props = {
    visible: boolean;
    note: string;
    onDone(note: string): void;
};

export function NoteSheet({ visible, note, onDone }: Props) {
    const [draft, setDraft] = useState(note);
    const [wasVisible, setWasVisible] = useState(visible);
    if (visible !== wasVisible) {
        setWasVisible(visible);
        if (visible) setDraft(note);
    }

    const done = () => onDone(draft.trim());

    return (
        <BottomSheet visible={visible} onClose={done} title="Mô tả">
            <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Thêm mô tả"
                placeholderTextColor={Colors.textMuted}
                multiline
                autoFocus
                style={styles.input}
            />
            <Pressable
                onPress={done}
                accessibilityRole="button"
                style={styles.button}
            >
                <Text style={styles.buttonText}>Xong</Text>
            </Pressable>
        </BottomSheet>
    );
}

const styles = StyleSheet.create({
    input: {
        minHeight: 88,
        maxHeight: 160,
        textAlignVertical: "top",
        padding: 12,
        fontSize: 15,
        color: Colors.text,
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 10,
    },
    button: {
        marginTop: Spacing.three,
        alignItems: "center",
        paddingVertical: 12,
        backgroundColor: Colors.primary,
        borderRadius: 12,
    },
    buttonText: { fontSize: 14, fontWeight: "600", color: Colors.onPrimary },
});
