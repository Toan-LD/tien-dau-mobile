import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { PressableScale } from "@/components/ui/pressable-scale";
import { Colors } from "@/constants/theme";

type Props = {
    selected?: boolean;
    dashed?: boolean;
    disabled?: boolean;
    onPress(): void;
    accessibilityLabel?: string;
    radius?: "small" | "large";
    style?: StyleProp<ViewStyle>;
    children: React.ReactNode;
};

export function SelectableTile({
    selected,
    dashed,
    disabled,
    onPress,
    accessibilityLabel,
    radius = "large",
    style,
    children,
}: Readonly<Props>) {
    return (
        <PressableScale
            onPress={onPress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            accessibilityState={{ selected: !!selected, disabled: !!disabled }}
            scaleTo={0.94}
            style={[
                styles.tile,
                radiusStyles[radius],
                style,
                dashed && styles.dashed,
                disabled && styles.disabled,
            ]}
            pressedStyle={styles.pressed}
        >
            {children}
            {selected && (
                <View
                    pointerEvents="none"
                    style={[styles.ring, radiusStyles[radius]]}
                />
            )}
        </PressableScale>
    );
}

const styles = StyleSheet.create({
    tile: {
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    ring: {
        position: "absolute",
        top: -1,
        left: -1,
        right: -1,
        bottom: -1,
        borderWidth: 1.5,
        borderColor: Colors.borderStrong,
    },
    dashed: { borderStyle: "dashed" },
    pressed: { backgroundColor: Colors.segment },
    disabled: { opacity: 0.4 },
});

const radiusStyles = StyleSheet.create({
    small: { borderRadius: 8 },
    large: { borderRadius: 10 },
});
