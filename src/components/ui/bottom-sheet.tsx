import { useEffect, useState, type ReactNode } from "react";
import {
    BackHandler,
    KeyboardAvoidingView,
    Pressable,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
    type StyleProp,
    type ViewStyle,
} from "react-native";
import Animated, {
    Easing,
    FadeIn,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

import { Portal } from "@/components/ui/portal";
import { Colors, Spacing } from "@/constants/theme";

const OPEN = { duration: 240, easing: Easing.out(Easing.cubic) };
const CLOSE = { duration: 180, easing: Easing.in(Easing.cubic) };
const CONTENT_IN = FadeIn.duration(160);

type Props = {
    visible: boolean;
    onClose(): void;
    title: string;
    children: React.ReactNode;
    deferContent?: boolean;
    bodyStyle?: StyleProp<ViewStyle>;
};

export function BottomSheet({
    visible,
    onClose,
    title,
    children,
    deferContent,
    bodyStyle,
}: Readonly<Props>) {
    const insets = useSafeAreaInsets();
    const { height: windowHeight } = useWindowDimensions();
    const progress = useSharedValue(0);
    const sheetHeight = useSharedValue(windowHeight);

    const [mounted, setMounted] = useState(visible);
    if (visible && !mounted) setMounted(true);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const hide = () => {
            setMounted(false);
            setReady(false);
        };
        if (visible) {
            progress.set(
                withTiming(1, OPEN, (finished) => {
                    if (finished) scheduleOnRN(setReady, true);
                }),
            );
        } else {
            progress.set(
                withTiming(0, CLOSE, (finished) => {
                    if (finished) scheduleOnRN(hide);
                }),
            );
        }
    }, [visible, progress]);

    useEffect(() => {
        if (!visible) return;
        const sub = BackHandler.addEventListener("hardwareBackPress", () => {
            onClose();
            return true;
        });
        return () => sub.remove();
    }, [visible, onClose]);

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: progress.get(),
    }));
    const sheetStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: (1 - progress.get()) * sheetHeight.get() }],
    }));

    if (!mounted) return null;

    let body: ReactNode = children;
    if (deferContent) {
        body = ready ? (
            <Animated.View entering={CONTENT_IN} style={bodyStyle}>
                {children}
            </Animated.View>
        ) : (
            <View style={bodyStyle} />
        );
    }

    return (
        <Portal>
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
                    {body}
                </Animated.View>
            </KeyboardAvoidingView>
        </Portal>
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
