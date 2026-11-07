import { useEffect, useRef, useState } from "react";
import {
    Animated,
    Pressable,
    StyleSheet,
    View,
    type LayoutChangeEvent,
    type StyleProp,
    type ViewStyle,
} from "react-native";

import { Colors, Spacing } from "@/constants/theme";

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
    options: readonly Option<T>[];
    value: T;
    onChange(value: T): void;
    style?: StyleProp<ViewStyle>;
};

const PADDING = 2;
const SLIDE = { damping: 22, stiffness: 380, mass: 0.7 };
const LIFT_SCALE = 1.06;
const LIFT_MS = 80;
const PRESS_SCALE = 0.96;
const PRESS_MS = 70;
const SETTLE = { damping: 12, stiffness: 420, mass: 0.5 };
const HOLD_MS = 90;

export function SegmentedControl<T extends string>({
    options,
    value,
    onChange,
    style,
}: Readonly<Props<T>>) {
    const index = Math.max(
        0,
        options.findIndex((option) => option.value === value),
    );
    const [optionWidth, setOptionWidth] = useState(0);
    const [position] = useState(() => new Animated.Value(index));
    const [scale] = useState(() => new Animated.Value(1));
    const slidIndex = useRef(index);

    const slideTo = (nextIndex: number) => {
        slidIndex.current = nextIndex;
        Animated.spring(position, {
            toValue: nextIndex,
            ...SLIDE,
            useNativeDriver: true,
        }).start();
        Animated.sequence([
            Animated.timing(scale, {
                toValue: LIFT_SCALE,
                duration: LIFT_MS,
                useNativeDriver: true,
            }),
            Animated.delay(HOLD_MS),
            Animated.timing(scale, {
                toValue: PRESS_SCALE,
                duration: PRESS_MS,
                useNativeDriver: true,
            }),
            Animated.spring(scale, {
                toValue: 1,
                ...SETTLE,
                useNativeDriver: true,
            }),
        ]).start();
    };

    useEffect(() => {
        if (index !== slidIndex.current) slideTo(index);
    });

    const onLayout = (event: LayoutChangeEvent) =>
        setOptionWidth(
            (event.nativeEvent.layout.width - PADDING * 2) / options.length,
        );

    return (
        <View style={[styles.segment, style]} onLayout={onLayout}>
            {optionWidth > 0 && (
                <Animated.View
                    pointerEvents="none"
                    style={[
                        styles.thumb,
                        {
                            width: optionWidth,
                            transform: [
                                {
                                    translateX: Animated.multiply(
                                        position,
                                        optionWidth,
                                    ),
                                },
                                { scale },
                            ],
                        },
                    ]}
                />
            )}
            {options.map((option, optionIndex) => {
                const selected = option.value === value;
                return (
                    <Pressable
                        key={option.value}
                        onPress={() => {
                            if (optionIndex !== slidIndex.current) {
                                slideTo(optionIndex);
                            }
                            onChange(option.value);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={option.label}
                        accessibilityState={{ selected }}
                        style={({ pressed }) => [
                            styles.option,
                            pressed && !selected && styles.optionPressed,
                        ]}
                    >
                        <OptionLabel
                            label={option.label}
                            index={optionIndex}
                            position={position}
                        />
                    </Pressable>
                );
            })}
        </View>
    );
}

function OptionLabel({
    label,
    index,
    position,
}: Readonly<{
    label: string;
    index: number;
    position: Animated.Value;
}>) {
    const boldOpacity = position.interpolate({
        inputRange: [index - 1, index, index + 1],
        outputRange: [0, 1, 0],
        extrapolate: "clamp",
    });
    const plainOpacity = position.interpolate({
        inputRange: [index - 1, index, index + 1],
        outputRange: [1, 0, 1],
        extrapolate: "clamp",
    });

    return (
        <View>
            <Animated.Text
                style={[
                    styles.optionText,
                    styles.optionTextOn,
                    { opacity: boldOpacity },
                ]}
            >
                {label}
            </Animated.Text>
            <Animated.Text
                style={[
                    styles.optionText,
                    styles.plainLayer,
                    { opacity: plainOpacity },
                ]}
            >
                {label}
            </Animated.Text>
        </View>
    );
}

const styles = StyleSheet.create({
    segment: {
        flexDirection: "row",
        marginHorizontal: Spacing.three,
        marginTop: Spacing.two,
        padding: PADDING,
        backgroundColor: Colors.segment,
        borderRadius: 8,
    },
    thumb: {
        position: "absolute",
        top: PADDING,
        bottom: PADDING,
        left: PADDING,
        backgroundColor: Colors.surface,
        borderRadius: 6,
        elevation: 2,
        shadowColor: Colors.text,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.12,
        shadowRadius: 2,
    },
    option: {
        flex: 1,
        alignItems: "center",
        paddingVertical: 8,
    },
    optionText: { fontSize: 14, color: Colors.textSecondary },
    optionTextOn: { fontWeight: "600", color: Colors.text },
    plainLayer: {
        position: "absolute",
        left: 0,
        right: 0,
        textAlign: "center",
    },
    optionPressed: { opacity: 0.6 },
});
