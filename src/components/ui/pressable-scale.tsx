import { useState } from "react";
import {
    Pressable,
    type GestureResponderEvent,
    type PressableProps,
    type StyleProp,
    type ViewStyle,
} from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Press in quickly, spring back a little softer: feels like a real button
// without bouncing around.
const PRESS_IN = { duration: 90 };
const RELEASE = { damping: 18, stiffness: 320, mass: 0.6 };

type Props = Omit<PressableProps, "style" | "children"> & {
    style?: StyleProp<ViewStyle>;
    // Extra style while the finger is down (a darker background, a fade).
    pressedStyle?: StyleProp<ViewStyle>;
    // How small it gets while pressed: 0.97 for wide buttons, smaller for icons.
    scaleTo?: number;
    children?: React.ReactNode;
};

// Pressable that shrinks slightly under the finger and springs back on release.
// The base for every tappable control in the app, so they all feel the same.
export function PressableScale({
    style,
    pressedStyle,
    scaleTo = 0.97,
    disabled,
    onPressIn,
    onPressOut,
    children,
    ...rest
}: Props) {
    const scale = useSharedValue(1);
    const [pressed, setPressed] = useState(false);
    const animated = useAnimatedStyle(() => ({
        transform: [{ scale: scale.get() }],
    }));

    const handlePressIn = (e: GestureResponderEvent) => {
        scale.set(withTiming(scaleTo, PRESS_IN));
        setPressed(true);
        onPressIn?.(e);
    };
    const handlePressOut = (e: GestureResponderEvent) => {
        scale.set(withSpring(1, RELEASE));
        setPressed(false);
        onPressOut?.(e);
    };

    return (
        <AnimatedPressable
            {...rest}
            disabled={disabled}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={[style, pressed && pressedStyle, animated]}
        >
            {children}
        </AnimatedPressable>
    );
}
