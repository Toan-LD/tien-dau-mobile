import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { PressableScale } from "@/components/ui/pressable-scale";
import { Colors } from "@/constants/theme";

type Props = {
    selected?: boolean;
    dashed?: boolean;
    disabled?: boolean;
    onPress(): void;
    accessibilityLabel?: string;
    // Corner rounding, shared by the tile and its selected ring:
    // "small" (8) for the dense category grid, "large" (10) elsewhere.
    radius?: "small" | "large";
    // Size and padding of the tile, from the caller's StyleSheet.
    style?: StyleProp<ViewStyle>;
    children: React.ReactNode;
};

// A bordered tile that gets a dark border when selected: category tiles on Ghi,
// icon choices in the new-category sheet, months in the month picker.
//
// The selected border is a ring drawn on top of the normal 1px border, not a
// wider border: a wider border makes the tile taller and pushes the rows
// below it down a little every time the selection changes.
export function SelectableTile({
    selected,
    dashed,
    disabled,
    onPress,
    accessibilityLabel,
    radius = "large",
    style,
    children,
}: Props) {
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
    // Covers the tile's own 1px border exactly (absolute children start
    // inside the border, hence -1).
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
