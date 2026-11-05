import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
    Easing,
    useAnimatedProps,
    useSharedValue,
    withTiming,
    type SharedValue,
} from "react-native-reanimated";
import Svg, { Circle, G } from "react-native-svg";

import { ChartColors, Colors, Spacing } from "@/constants/theme";
import type { DonutSlice } from "@/lib/report";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 176;
const STROKE = 26;
const RADIUS = (SIZE - STROKE) / 2;
const CENTER = SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
// Surface-coloured gap between slices (the sheet shows through), so
// neighbouring colours read apart without drawing borders.
const GAP = 2;
const DRAW = { duration: 550, easing: Easing.out(Easing.cubic) };

export function sliceColor(slot: DonutSlice["slot"]): string {
    return slot === "other" ? ChartColors.other : ChartColors.series[slot];
}

// Where each slice starts on the ring and how long it is, in the same units
// as the circle's dash pattern.
function layoutSegments(slices: DonutSlice[]) {
    const segments: { slice: DonutSlice; start: number; length: number }[] = [];
    let start = 0;
    for (const slice of slices) {
        const length = slice.share * CIRCUMFERENCE;
        segments.push({ slice, start, length });
        start += length;
    }
    return segments;
}

type Props = {
    slices: DonutSlice[];
    selectedKey: string | null;
    onSelect(key: string): void;
    // Text in the hole: a small label over a value, and an optional note.
    label: string;
    value: string;
    note?: string;
    // Changing this redraws the ring from empty (new period or Chi/Thu).
    drawKey: string;
};

// Donut of category shares. Draws itself clockwise from the top; tapping a
// slice dims the others (the screen shows its figures in the hole).
export function DonutChart({
    slices,
    selectedKey,
    onSelect,
    label,
    value,
    note,
    drawKey,
}: Props) {
    const progress = useSharedValue(0);

    useEffect(() => {
        progress.set(0);
        progress.set(withTiming(1, DRAW));
    }, [drawKey, progress]);

    const segments = layoutSegments(slices);
    const single = slices.length === 1;

    return (
        <View style={styles.wrap}>
            <Svg width={SIZE} height={SIZE}>
                <G rotation={-90} origin={`${CENTER}, ${CENTER}`}>
                    {segments.map(({ slice, start: from, length }) => (
                        <Segment
                            key={slice.key}
                            from={from}
                            length={length}
                            gap={single ? 0 : GAP}
                            color={sliceColor(slice.slot)}
                            dimmed={
                                selectedKey !== null &&
                                selectedKey !== slice.key
                            }
                            progress={progress}
                            onPress={() => onSelect(slice.key)}
                        />
                    ))}
                </G>
            </Svg>
            <View style={styles.hole} pointerEvents="none">
                <Text style={styles.label} numberOfLines={1}>
                    {label}
                </Text>
                <Text style={styles.value} numberOfLines={1}>
                    {value}
                </Text>
                {note ? <Text style={styles.note}>{note}</Text> : null}
            </View>
        </View>
    );
}

function Segment({
    from,
    length,
    gap,
    color,
    dimmed,
    progress,
    onPress,
}: {
    from: number;
    length: number;
    gap: number;
    color: string;
    dimmed: boolean;
    progress: SharedValue<number>;
    onPress(): void;
}) {
    // The ring fills from the top as progress goes 0 → 1; each slice shows
    // the part of itself the sweep has reached.
    const animatedProps = useAnimatedProps(() => {
        const reached = progress.get() * CIRCUMFERENCE - from;
        const visible = Math.min(
            Math.max(reached, 0),
            Math.max(length - gap, 0),
        );
        return { strokeDasharray: [visible, CIRCUMFERENCE] };
    });

    return (
        <AnimatedCircle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth={STROKE}
            strokeDashoffset={-from}
            opacity={dimmed ? 0.25 : 1}
            animatedProps={animatedProps}
            onPress={onPress}
        />
    );
}

const styles = StyleSheet.create({
    wrap: {
        alignSelf: "center",
        width: SIZE,
        height: SIZE,
        marginVertical: Spacing.three,
    },
    hole: {
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: STROKE + Spacing.two,
    },
    label: { fontSize: 12, color: Colors.textSecondary },
    value: {
        fontSize: 17,
        fontWeight: "700",
        color: Colors.text,
        marginTop: 2,
    },
    note: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
});
