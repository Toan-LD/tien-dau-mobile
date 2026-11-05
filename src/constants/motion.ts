import {
    FadeIn,
    FadeInDown,
    FadeOut,
    FadeOutDown,
    SlideInLeft,
    SlideInRight,
    SlideOutLeft,
    SlideOutRight,
} from "react-native-reanimated";

const PAGE_MS = 200;

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
    // A whole page swaps sideways (category grid when Chi/Thu changes).
    // Each page has a fixed side: the left page comes and goes on the left.
    pageInLeft: SlideInLeft.duration(PAGE_MS),
    pageOutLeft: SlideOutLeft.duration(PAGE_MS),
    pageInRight: SlideInRight.duration(PAGE_MS),
    pageOutRight: SlideOutRight.duration(PAGE_MS),
} as const;
