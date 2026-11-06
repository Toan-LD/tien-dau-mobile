import { StyleSheet, Text, View } from "react-native";

import { PressableScale } from "@/components/ui/pressable-scale";
import { Colors, Spacing } from "@/constants/theme";
import { INTRO_TEXT, SUGGESTIONS } from "@/lib/chat-state";

type Props = { onSelect(question: string): void };

export function SuggestionList({ onSelect }: Readonly<Props>) {
    return (
        <View style={styles.container}>
            <Text style={styles.intro}>{INTRO_TEXT}</Text>
            {SUGGESTIONS.map((suggestion) => (
                <PressableScale
                    key={suggestion}
                    onPress={() => onSelect(suggestion)}
                    accessibilityRole="button"
                    scaleTo={0.98}
                    style={styles.suggestion}
                    pressedStyle={styles.suggestionPressed}
                >
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                </PressableScale>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { gap: Spacing.two },
    intro: {
        fontSize: 15,
        color: Colors.textSecondary,
        marginBottom: Spacing.two,
    },
    suggestion: {
        paddingVertical: 12,
        paddingHorizontal: Spacing.three,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 10,
    },
    suggestionPressed: { backgroundColor: Colors.segment },
    suggestionText: { fontSize: 15, color: Colors.text },
});
