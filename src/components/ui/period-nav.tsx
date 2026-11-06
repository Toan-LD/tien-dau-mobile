import { Ionicons } from "@expo/vector-icons";
import {
    StyleSheet,
    Text,
    View,
    type StyleProp,
    type ViewStyle,
} from "react-native";

import { IconButton } from "@/components/ui/icon-button";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Colors, Spacing } from "@/constants/theme";

type Props = {
    title: string;
    onPrev(): void;
    onNext(): void;
    nextDisabled: boolean;
    prevLabel: string;
    nextLabel: string;
    onTitlePress?(): void;
    titleLabel?: string;
    spread?: boolean;
    style?: StyleProp<ViewStyle>;
};

export function PeriodNav({
    title,
    onPrev,
    onNext,
    nextDisabled,
    prevLabel,
    nextLabel,
    onTitlePress,
    titleLabel,
    spread,
    style,
}: Readonly<Props>) {
    return (
        <View style={[styles.row, spread && styles.spread, style]}>
            <IconButton
                name="chevron-back-outline"
                onPress={onPrev}
                accessibilityLabel={prevLabel}
            />
            {onTitlePress ? (
                <PressableScale
                    onPress={onTitlePress}
                    accessibilityRole="button"
                    accessibilityLabel={titleLabel ?? title}
                    hitSlop={Spacing.two}
                    style={styles.titleButton}
                    pressedStyle={styles.pressed}
                >
                    <Text style={styles.title}>{title}</Text>
                    <Ionicons
                        name="chevron-down-outline"
                        size={14}
                        color={Colors.textSecondary}
                    />
                </PressableScale>
            ) : (
                <Text style={styles.title}>{title}</Text>
            )}
            <IconButton
                name="chevron-forward-outline"
                onPress={onNext}
                disabled={nextDisabled}
                accessibilityLabel={nextLabel}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", gap: Spacing.three },
    spread: { justifyContent: "space-between" },
    title: { fontSize: 15, fontWeight: "600", color: Colors.text },
    titleButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.one,
        paddingVertical: Spacing.one,
        paddingHorizontal: Spacing.two,
        borderRadius: 8,
    },
    pressed: { backgroundColor: Colors.segment },
});
