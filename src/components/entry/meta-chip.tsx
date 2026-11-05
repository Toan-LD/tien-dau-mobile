import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { Colors, Spacing } from "@/constants/theme";

type Props = {
    icon: ComponentProps<typeof Ionicons>["name"];
    label: string;
    onPress(): void;
    placeholder?: boolean;
    grow?: boolean;
    accessibilityLabel?: string;
};

// Bordered button used for the date and note fields under the amount.
export function MetaChip({
    icon,
    label,
    onPress,
    placeholder,
    grow,
    accessibilityLabel,
}: Props) {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel ?? label}
            style={({ pressed }) => [
                styles.chip,
                grow && styles.grow,
                pressed && styles.pressed,
            ]}
        >
            <Ionicons name={icon} size={16} color={Colors.icon} />
            <Text
                style={[styles.label, placeholder && styles.placeholder]}
                numberOfLines={1}
            >
                {label}
            </Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    chip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingVertical: Spacing.two,
        paddingHorizontal: Spacing.two + Spacing.one,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 10,
    },
    grow: { flex: 1 },
    pressed: { backgroundColor: Colors.segment },
    label: { flexShrink: 1, fontSize: 14, color: Colors.text },
    placeholder: { color: Colors.textSecondary },
});
