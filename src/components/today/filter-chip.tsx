import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { IconButton } from "@/components/ui/icon-button";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Colors, Spacing } from "@/constants/theme";

type Props = {
    // What the filter shows, e.g. "Ăn uống, Cà phê"; null = no filter.
    label: string | null;
    onPress(): void;
    onClear(): void;
};

// The category filter button on Danh sách: "Tất cả danh mục" when off, the
// chosen names (with an ✕ to clear) when on.
export function FilterChip({ label, onPress, onClear }: Props) {
    const active = label !== null;
    return (
        <View style={styles.row}>
            <PressableScale
                onPress={onPress}
                accessibilityRole="button"
                accessibilityLabel={
                    active ? `Đang lọc: ${label}. Chạm để đổi` : "Lọc theo mục"
                }
                scaleTo={0.96}
                style={[styles.chip, active && styles.chipActive]}
                pressedStyle={styles.pressed}
            >
                <Ionicons
                    name="funnel-outline"
                    size={14}
                    color={active ? Colors.onPrimary : Colors.icon}
                />
                <Text
                    style={[styles.label, active && styles.labelActive]}
                    numberOfLines={1}
                >
                    {label ?? "Tất cả danh mục"}
                </Text>
                {!active && (
                    <Ionicons
                        name="chevron-down-outline"
                        size={14}
                        color={Colors.textSecondary}
                    />
                )}
            </PressableScale>
            {active && (
                <IconButton
                    name="close-circle"
                    size={20}
                    color={Colors.textMuted}
                    onPress={onClear}
                    accessibilityLabel="Bỏ lọc"
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: Spacing.two,
        paddingHorizontal: Spacing.three,
        paddingBottom: Spacing.two,
    },
    chip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        flexShrink: 1,
        paddingVertical: 6,
        paddingHorizontal: Spacing.two + 2,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 16,
    },
    chipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    pressed: { opacity: 0.8 },
    label: { flexShrink: 1, fontSize: 13, color: Colors.text },
    labelActive: { color: Colors.onPrimary, fontWeight: "600" },
});
