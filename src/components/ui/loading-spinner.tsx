import { ActivityIndicator, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { Colors } from "@/constants/theme";

// Waits a moment before showing, so a fast load never flashes a spinner.
const APPEAR = FadeIn.delay(150).duration(150);
const DISAPPEAR = FadeOut.duration(120);

type Props = {
    visible: boolean;
    position?: "top" | "center";
};

export function LoadingSpinner({
    visible,
    position = "center",
}: Readonly<Props>) {
    // The cover stays mounted so the disc can fade out when loading ends.
    return (
        <View
            pointerEvents="none"
            style={[styles.cover, position === "top" && styles.top]}
        >
            {visible && (
                <Animated.View
                    entering={APPEAR}
                    exiting={DISAPPEAR}
                    style={styles.disc}
                    accessibilityLabel="Đang tải"
                    accessibilityLiveRegion="polite"
                >
                    <ActivityIndicator color={Colors.icon} />
                </Animated.View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    cover: {
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        alignItems: "center",
        justifyContent: "center",
    },
    top: { justifyContent: "flex-start", paddingTop: 120 },
    disc: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        elevation: 2,
        shadowColor: Colors.text,
        shadowOpacity: 0.08,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
    },
});
