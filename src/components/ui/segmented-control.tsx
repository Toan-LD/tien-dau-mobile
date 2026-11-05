import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
    type SharedValue,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSequence,
    withSpring,
    withTiming,
} from "react-native-reanimated";

import { Colors, Spacing } from "@/constants/theme";

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
    options: readonly Option<T>[];
    value: T;
    onChange(value: T): void;
};

const PADDING = 2;
// Slide: quick and settles without wobbling.
const SLIDE = { damping: 22, stiffness: 380, mass: 0.7 };
// Lift: up fast, held while sliding, then pressed down with a small bounce.
const LIFT_SCALE = 1.06;
const LIFT = { duration: 80 };
const PRESS_SCALE = 0.96;
const PRESS = { duration: 70 };
const SETTLE = { damping: 12, stiffness: 420, mass: 0.5 };
const HOLD_MS = 90;

// Two or more options side by side, one selected (Chi | Thu). The white thumb
// lifts, slides to the tapped option and presses down into place.
export function SegmentedControl<T extends string>({
    options,
    value,
    onChange,
}: Props<T>) {
    const index = Math.max(
        0,
        options.findIndex((o) => o.value === value),
    );
    // Width of one option, measured; 0 until the first layout.
    const optionWidth = useSharedValue(0);
    const x = useSharedValue(0);
    const scale = useSharedValue(1);

    useEffect(() => {
        const width = optionWidth.get();
        if (width === 0) return;
        x.set(withSpring(index * width, SLIDE));
        scale.set(
            withSequence(
                withTiming(LIFT_SCALE, LIFT),
                withDelay(HOLD_MS, withTiming(PRESS_SCALE, PRESS)),
                withSpring(1, SETTLE),
            ),
        );
        // Only a change of option animates; layout is handled in onLayout.
    }, [index, optionWidth, scale, x]);

    const thumbStyle = useAnimatedStyle(() => {
        // 0 at rest, 1 at the top of the lift: drives the shadow.
        const lift = Math.max(0, (scale.get() - 1) / (LIFT_SCALE - 1));
        return {
            width: optionWidth.get(),
            opacity: optionWidth.get() > 0 ? 1 : 0,
            transform: [{ translateX: x.get() }, { scale: scale.get() }],
            elevation: 1 + lift * 5,
            shadowOpacity: 0.08 + lift * 0.12,
            shadowRadius: 1 + lift * 5,
        };
    });

    return (
        <View
            style={styles.segment}
            onLayout={(e) => {
                const width =
                    (e.nativeEvent.layout.width - PADDING * 2) / options.length;
                optionWidth.set(width);
                // Jump, don't slide, when the size is first known or changes.
                x.set(index * width);
            }}
        >
            <Animated.View
                pointerEvents="none"
                style={[styles.thumb, thumbStyle]}
            />
            {options.map((o, i) => {
                const on = o.value === value;
                return (
                    <Pressable
                        key={o.value}
                        onPress={() => onChange(o.value)}
                        accessibilityRole="button"
                        accessibilityLabel={o.label}
                        accessibilityState={{ selected: on }}
                        style={({ pressed }) => [
                            styles.option,
                            pressed && !on && styles.optionPressed,
                        ]}
                    >
                        <OptionLabel
                            label={o.label}
                            index={i}
                            selected={on}
                            x={x}
                            optionWidth={optionWidth}
                        />
                    </Pressable>
                );
            })}
        </View>
    );
}

// 1 when the thumb sits on option `index`, 0 when it is a whole option away.
// Before the first layout there is no thumb position, so use the selection.
function nearness(
    x: number,
    width: number,
    index: number,
    selected: boolean,
): number {
    "worklet";
    if (width === 0) return selected ? 1 : 0;
    return Math.min(1, Math.max(0, 1 - Math.abs(x / width - index)));
}

// The label follows the thumb instead of switching on tap: the closer the
// thumb is to this option, the more the bold dark text shows over the plain
// grey one. Bold can't be animated, so the two are stacked and cross-faded.
function OptionLabel({
    label,
    index,
    selected,
    x,
    optionWidth,
}: {
    label: string;
    index: number;
    selected: boolean;
    x: SharedValue<number>;
    optionWidth: SharedValue<number>;
}) {
    const boldStyle = useAnimatedStyle(() => ({
        opacity: nearness(x.get(), optionWidth.get(), index, selected),
    }));
    const plainStyle = useAnimatedStyle(() => ({
        opacity: 1 - nearness(x.get(), optionWidth.get(), index, selected),
    }));

    return (
        <View>
            {/* The bold copy sets the size: it is the wider of the two. */}
            <Animated.Text
                style={[styles.optionText, styles.optionTextOn, boldStyle]}
            >
                {label}
            </Animated.Text>
            <Animated.Text
                style={[styles.optionText, styles.plainLayer, plainStyle]}
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
        shadowColor: Colors.text,
        shadowOffset: { width: 0, height: 1 },
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
