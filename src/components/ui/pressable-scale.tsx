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

const PRESS_IN = { duration: 90 };
const RELEASE = { damping: 18, stiffness: 320, mass: 0.6 };

type Props = Omit<PressableProps, "style" | "children"> & {
    style?: StyleProp<ViewStyle>;
    pressedStyle?: StyleProp<ViewStyle>;
    scaleTo?: number;
    children?: React.ReactNode;
};

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
