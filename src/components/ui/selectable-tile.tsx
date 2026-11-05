import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";

import { PressableScale } from "@/components/ui/pressable-scale";
import { Colors } from "@/constants/theme";

type Props = {
    selected?: boolean;
    dashed?: boolean;
    disabled?: boolean;
    onPress(): void;
    accessibilityLabel?: string;
    // Size and padding of the tile, from the caller's StyleSheet.
    style?: StyleProp<ViewStyle>;
    children: React.ReactNode;
};

// A bordered tile that gets a dark border when selected: category tiles on Ghi
// and icon choices in the new-category sheet.
export function SelectableTile({
    selected,
    dashed,
    disabled,
    onPress,
    accessibilityLabel,
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
                style,
                selected && styles.selected,
                dashed && styles.dashed,
                disabled && styles.disabled,
            ]}
            pressedStyle={styles.pressed}
        >
            {children}
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
    selected: { borderWidth: 1.5, borderColor: Colors.borderStrong },
    dashed: { borderStyle: "dashed" },
    pressed: { backgroundColor: Colors.segment },
    disabled: { opacity: 0.4 },
});
