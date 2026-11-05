import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/theme";
import type { AmountAction } from "@/lib/amount-input";

const CLEAR_HOLD_MS = 1000;

type Digit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

const ROWS: Digit[][] = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
];

type KeyProps = {
    onPress(): void;
    onLongPress?(): void;
    label: string;
    children?: React.ReactNode;
    accessibilityLabel?: string;
};

function Key({
    onPress,
    onLongPress,
    label,
    children,
    accessibilityLabel,
}: KeyProps) {
    return (
        <Pressable
            onPress={onPress}
            onLongPress={onLongPress}
            delayLongPress={CLEAR_HOLD_MS}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel ?? label}
            style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
        >
            {children ?? (
                <Text
                    style={
                        label === "000" ? styles.keyTextSmall : styles.keyText
                    }
                >
                    {label}
                </Text>
            )}
        </Pressable>
    );
}

export function Keypad({ onKey }: { onKey(a: AmountAction): void }) {
    return (
        <View style={styles.pad}>
            {ROWS.map((row) => (
                <View key={row[0]} style={styles.row}>
                    {row.map((digit) => (
                        <Key
                            key={digit}
                            label={String(digit)}
                            onPress={() => onKey({ type: "digit", digit })}
                        />
                    ))}
                </View>
            ))}
            <View style={styles.row}>
                <Key
                    label="000"
                    onPress={() => onKey({ type: "tripleZero" })}
                />
                <Key
                    label="0"
                    onPress={() => onKey({ type: "digit", digit: 0 })}
                />
                <Key
                    label="⌫"
                    accessibilityLabel="Xoá một số, giữ 1 giây để xoá hết"
                    onPress={() => onKey({ type: "backspace" })}
                    onLongPress={() => onKey({ type: "clear" })}
                >
                    <Ionicons
                        name="backspace-outline"
                        size={24}
                        color={Colors.icon}
                    />
                </Key>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    pad: { backgroundColor: Colors.border, gap: 1 },
    row: { flexDirection: "row", gap: 1 },
    key: {
        flex: 1,
        height: 52,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: Colors.background,
    },
    keyPressed: { backgroundColor: Colors.segment },
    keyText: { fontSize: 22, color: Colors.text },
    keyTextSmall: { fontSize: 16, color: Colors.icon },
});
