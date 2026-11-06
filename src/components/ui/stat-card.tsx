import {
    StyleSheet,
    Text,
    View,
    type StyleProp,
    type ViewStyle,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { PressableScale } from "@/components/ui/pressable-scale";
import { Colors, Spacing } from "@/constants/theme";

type Props = {
    label: string;
    value: string;
    size?: "small" | "large";
    onPress?(): void;
    accessibilityHint?: string;
};

export function StatCard({
    label,
    value,
    size = "small",
    onPress,
    accessibilityHint,
}: Readonly<Props>) {
    const large = size === "large";
    const cardStyle = [
        styles.card,
        large ? styles.cardLarge : styles.cardSmall,
    ];
    const content = (
        <>
            <View style={styles.labelRow}>
                <Text style={styles.label}>{label}</Text>
                {onPress && (
                    <Ionicons
                        name="pie-chart-outline"
                        size={13}
                        color={Colors.textMuted}
                    />
                )}
            </View>
            <Text style={large ? styles.valueLarge : styles.value}>
                {value}
            </Text>
        </>
    );

    if (!onPress) return <View style={cardStyle}>{content}</View>;
    return (
        <PressableScale
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={`${label}: ${value}`}
            accessibilityHint={accessibilityHint}
            style={cardStyle}
            pressedStyle={styles.pressed}
        >
            {content}
        </PressableScale>
    );
}

export function StatRow({
    children,
    style,
}: Readonly<{
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}>) {
    return <View style={[styles.row, style]}>{children}</View>;
}

const styles = StyleSheet.create({
    row: { flexDirection: "row", gap: Spacing.two },
    card: {
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    cardSmall: {
        flex: 1,
        paddingVertical: Spacing.two,
        paddingHorizontal: 10,
        borderRadius: 10,
    },
    cardLarge: { padding: Spacing.three, borderRadius: 12 },
    labelRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    label: { fontSize: 11, color: Colors.textSecondary },
    pressed: { backgroundColor: Colors.surfaceMuted },
    value: {
        fontSize: 15,
        fontWeight: "600",
        color: Colors.text,
        marginTop: 2,
    },
    valueLarge: {
        fontSize: 24,
        fontWeight: "700",
        color: Colors.text,
        marginTop: Spacing.one,
    },
});
