import { useState } from "react";
import { StyleSheet, TextInput } from "react-native";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Colors, Spacing } from "@/constants/theme";
import { MAX_NOTE_LENGTH } from "@/lib/transactions";

type Props = {
    visible: boolean;
    note: string;
    onDone(note: string): void;
};

export function NoteSheet({ visible, note, onDone }: Readonly<Props>) {
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
                maxLength={MAX_NOTE_LENGTH}
                style={styles.input}
            />
            <Button label="Xong" onPress={done} style={styles.button} />
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
    button: { marginTop: Spacing.three },
});
