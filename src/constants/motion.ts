import {
    FadeIn,
    FadeInDown,
    FadeOut,
    FadeOutDown,
    LinearTransition,
} from "react-native-reanimated";

// Shared animations, short and plain: they show where things come from without
// slowing the user down. Use as `entering` / `exiting` / `layout` props on
// Animated views (react-native-reanimated, works in Expo Go).
export const Motion = {
    // Something small appears or goes away in place (the Lưu button).
    fadeIn: FadeIn.duration(150),
    fadeOut: FadeOut.duration(100),
    // A panel rises from the bottom edge (the number keypad).
    riseIn: FadeInDown.duration(180),
    sinkOut: FadeOutDown.duration(120),
    // Neighbours glide into place when a list item is added or removed.
    reflow: LinearTransition.duration(180),
} as const;
