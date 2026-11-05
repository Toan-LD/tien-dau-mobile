import { useEffect, useState } from "react";
import {
    KeyboardAvoidingView,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from "react-native";
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

import { Colors, Spacing } from "@/constants/theme";

const OPEN = { duration: 240, easing: Easing.out(Easing.cubic) };
const CLOSE = { duration: 180, easing: Easing.in(Easing.cubic) };

type Props = {
    visible: boolean;
    onClose(): void;
    title: string;
    children: React.ReactNode;
};

// The Modal itself does not animate: on Android a layout animation started as
// the Modal window opens stutters for the first frames. Instead one value
// (0 = hidden, 1 = open) drives both the backdrop fade and the sheet slide on
// the UI thread, so it stays smooth even while the screen behind is busy.
// The Modal stays mounted until the closing slide has finished.
export function BottomSheet({ visible, onClose, title, children }: Props) {
    const insets = useSafeAreaInsets();
    const { height: windowHeight } = useWindowDimensions();
    const progress = useSharedValue(0);
    // Until the sheet is measured, push it a whole screen down so the first
    // frame can never show it in its open position.
    const sheetHeight = useSharedValue(windowHeight);

    const [mounted, setMounted] = useState(visible);
    if (visible && !mounted) setMounted(true);

    useEffect(() => {
        if (visible) {
            progress.set(withTiming(1, OPEN));
        } else {
            progress.set(
                withTiming(0, CLOSE, (finished) => {
                    if (finished) scheduleOnRN(setMounted, false);
                }),
            );
        }
    }, [visible, progress]);

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: progress.get(),
    }));
    const sheetStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: (1 - progress.get()) * sheetHeight.get() }],
    }));

    return (
        <Modal
            visible={mounted}
            transparent
            animationType="none"
            onRequestClose={onClose}
            statusBarTranslucent
            navigationBarTranslucent
        >
            <KeyboardAvoidingView behavior="padding" style={styles.root}>
                <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
                    <Pressable
                        style={[StyleSheet.absoluteFill, styles.backdrop]}
                        onPress={onClose}
                        accessibilityLabel="Đóng"
                    />
                </Animated.View>
                <Animated.View
                    onLayout={(e) =>
                        sheetHeight.set(e.nativeEvent.layout.height)
                    }
                    style={[
                        styles.sheet,
                        { paddingBottom: insets.bottom + Spacing.three },
                        sheetStyle,
                    ]}
                >
                    <View style={styles.handle} />
                    <Text style={styles.title}>{title}</Text>
                    {children}
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, justifyContent: "flex-end" },
    backdrop: { backgroundColor: Colors.backdrop },
    sheet: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        paddingTop: 10,
        paddingHorizontal: Spacing.three,
    },
    handle: {
        alignSelf: "center",
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: Colors.border,
        marginBottom: Spacing.three,
    },
    title: {
        fontSize: 14,
        fontWeight: "600",
        color: Colors.text,
        marginBottom: 10,
    },
});
