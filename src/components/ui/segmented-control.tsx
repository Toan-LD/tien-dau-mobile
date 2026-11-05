import { StyleSheet, Text, View } from "react-native";

import { PressableScale } from "@/components/ui/pressable-scale";

import { Colors, Spacing } from "@/constants/theme";

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
    options: readonly Option<T>[];
    value: T;
    onChange(value: T): void;
};

// Two or more options side by side, one selected (Chi | Thu).
export function SegmentedControl<T extends string>({
    options,
    value,
    onChange,
}: Props<T>) {
    return (
        <View style={styles.segment}>
            {options.map((o) => {
                const on = o.value === value;
                return (
                    <PressableScale
                        key={o.value}
                        onPress={() => onChange(o.value)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: on }}
                        style={[styles.option, on && styles.optionOn]}
                        pressedStyle={!on && styles.optionPressed}
                    >
                        <Text
                            style={[
                                styles.optionText,
                                on && styles.optionTextOn,
                            ]}
                        >
                            {o.label}
                        </Text>
                    </PressableScale>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    segment: {
        flexDirection: "row",
        marginHorizontal: Spacing.three,
        marginTop: Spacing.two,
        padding: 2,
        backgroundColor: Colors.segment,
        borderRadius: 8,
    },
    option: {
        flex: 1,
        alignItems: "center",
        paddingVertical: 8,
        borderRadius: 6,
    },
    optionOn: { backgroundColor: Colors.surface },
    optionPressed: { opacity: 0.6 },
    optionText: { fontSize: 14, color: Colors.textSecondary },
    optionTextOn: { fontWeight: "600", color: Colors.text },
});
