import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    type StyleProp,
    type ViewStyle,
} from "react-native";

import { PressableScale } from "@/components/ui/pressable-scale";
import { Colors, Spacing } from "@/constants/theme";

type Variant = "primary" | "danger-outline" | "dashed";

type Props = {
    label: string;
    onPress(): void;
    variant?: Variant;
    icon?: ComponentProps<typeof Ionicons>["name"];
    disabled?: boolean;
    busy?: boolean;
    accessibilityLabel?: string;
    style?: StyleProp<ViewStyle>;
};

export function Button({
    label,
    onPress,
    variant = "primary",
    icon,
    disabled,
    busy,
    accessibilityLabel,
    style,
}: Readonly<Props>) {
    const inactive = disabled || busy;
    const v = variants[variant];

    return (
        <PressableScale
            onPress={onPress}
            disabled={inactive}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel ?? label}
            accessibilityState={{ disabled: !!inactive, busy: !!busy }}
            style={[
                styles.base,
                v.box,
                disabled && v.disabled,
                busy && styles.busy,
                style,
            ]}
            pressedStyle={v.pressed}
        >
            {busy && variant !== "primary" ? (
                <ActivityIndicator color={v.color} />
            ) : (
                <>
                    {icon && <Ionicons name={icon} size={20} color={v.icon} />}
                    <Text style={[v.text, disabled && v.disabledText]}>
                        {label}
                    </Text>
                </>
            )}
        </PressableScale>
    );
}

const styles = StyleSheet.create({
    base: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: Spacing.two,
        minHeight: 48,
        borderRadius: 12,
    },
    busy: { opacity: 0.5 },
    primary: { backgroundColor: Colors.primary },
    primaryPressed: { opacity: 0.85 },
    primaryDisabled: { backgroundColor: Colors.segment },
    outline: { borderWidth: 1, borderColor: Colors.danger },
    dashed: {
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: Colors.border,
        backgroundColor: Colors.surface,
    },
    pressedSurface: { backgroundColor: Colors.segment },
    faded: { opacity: 0.4 },
    primaryText: { fontSize: 15, fontWeight: "600", color: Colors.onPrimary },
    outlineText: { fontSize: 16, fontWeight: "500", color: Colors.danger },
    dashedText: { fontSize: 15, color: Colors.text },
    mutedText: { color: Colors.textMuted },
});

const variants = {
    primary: {
        box: styles.primary,
        pressed: styles.primaryPressed,
        disabled: styles.primaryDisabled,
        text: styles.primaryText,
        disabledText: styles.mutedText,
        color: Colors.onPrimary,
        icon: Colors.onPrimary,
    },
    "danger-outline": {
        box: styles.outline,
        pressed: styles.pressedSurface,
        disabled: styles.faded,
        text: styles.outlineText,
        disabledText: null,
        color: Colors.danger,
        icon: Colors.danger,
    },
    dashed: {
        box: styles.dashed,
        pressed: styles.pressedSurface,
        disabled: styles.faded,
        text: styles.dashedText,
        disabledText: null,
        color: Colors.text,
        icon: Colors.icon,
    },
} as const;
