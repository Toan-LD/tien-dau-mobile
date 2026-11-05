import {
    StyleSheet,
    Text,
    View,
    type StyleProp,
    type ViewStyle,
} from "react-native";

import { Colors, Spacing } from "@/constants/theme";

type Props = {
    label: string;
    value: string;
    // "large" is the Còn lại box on Báo cáo; "small" sits two to a row.
    size?: "small" | "large";
};

// A bordered box with a small label over a money value.
export function StatCard({ label, value, size = "small" }: Props) {
    const large = size === "large";
    return (
        <View
            style={[styles.card, large ? styles.cardLarge : styles.cardSmall]}
        >
            <Text style={styles.label}>{label}</Text>
            <Text style={large ? styles.valueLarge : styles.value}>
                {value}
            </Text>
        </View>
    );
}

// Two small cards side by side. style is for outer padding from the caller.
export function StatRow({
    children,
    style,
}: {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}) {
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
    label: { fontSize: 11, color: Colors.textSecondary },
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
