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

export const Motion = {
    fadeIn: FadeIn.duration(150),
    fadeOut: FadeOut.duration(100),
    riseIn: FadeInDown.duration(180),
    sinkOut: FadeOutDown.duration(120),
    pageInLeft: SlideInLeft.duration(PAGE_MS),
    pageOutLeft: SlideOutLeft.duration(PAGE_MS),
    pageInRight: SlideInRight.duration(PAGE_MS),
    pageOutRight: SlideOutRight.duration(PAGE_MS),
} as const;
