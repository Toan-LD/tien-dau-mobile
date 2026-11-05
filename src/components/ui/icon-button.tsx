import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";

import { PressableScale } from "@/components/ui/pressable-scale";
import { Colors, Spacing } from "@/constants/theme";

type Props = {
    name: ComponentProps<typeof Ionicons>["name"];
    onPress(): void;
    // Required: an icon has no text for screen readers to read out.
    accessibilityLabel: string;
    size?: number;
    color?: string;
    disabled?: boolean;
    style?: StyleProp<ViewStyle>;
};

// A tappable line icon (chevrons, settings, close, delete). Fades while pressed
// and when disabled, and has a larger touch area than the icon itself.
export function IconButton({
    name,
    onPress,
    accessibilityLabel,
    size = 22,
    color = Colors.icon,
    disabled,
    style,
}: Props) {
    return (
        <PressableScale
            onPress={onPress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            accessibilityState={{ disabled: !!disabled }}
            hitSlop={Spacing.two}
            scaleTo={0.8}
            style={[disabled && styles.disabled, style]}
            pressedStyle={styles.pressed}
        >
            <Ionicons name={name} size={size} color={color} />
        </PressableScale>
    );
}

const styles = StyleSheet.create({
    pressed: { opacity: 0.6 },
    disabled: { opacity: 0.3 },
});
