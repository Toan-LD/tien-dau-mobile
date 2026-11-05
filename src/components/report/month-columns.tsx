import { useEffect, useRef } from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
    type ScrollViewInstance,
} from "react-native";
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
    type SharedValue,
} from "react-native-reanimated";

import { Colors, Spacing } from "@/constants/theme";
import type { MonthTotal } from "@/lib/report";

const PLOT_HEIGHT = 140;
const BAR_WIDTH = 22;
const GROW = { duration: 500, easing: Easing.out(Easing.cubic) };

type Props = {
    months: MonthTotal[];
    // Index of the highlighted month (the one whose value is shown above).
    selected: number;
    onSelect(index: number): void;
    // Changing this grows the columns again from the baseline.
    drawKey: string;
};

// One column per month, oldest on the left, scrolled to the latest month.
// The selected month is dark, the rest light grey: the chart is about one
// month at a time, the others give context.
export function MonthColumns({ months, selected, onSelect, drawKey }: Props) {
    const scrollRef = useRef<ScrollViewInstance>(null);
    const progress = useSharedValue(0);
    const max = months.reduce((m, x) => Math.max(m, x.total), 0);

    useEffect(() => {
        progress.set(0);
        progress.set(withTiming(1, GROW));
    }, [drawKey, progress]);

    return (
        <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.content}
            onContentSizeChange={() =>
                scrollRef.current?.scrollToEnd({ animated: false })
            }
        >
            {months.map((m, i) => {
                const showYear = i === 0 || m.month === 1;
                return (
                    <Pressable
                        key={`${m.year}-${m.month}`}
                        onPress={() => onSelect(i)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: i === selected }}
                        accessibilityLabel={`Tháng ${m.month}/${m.year}`}
                        hitSlop={{ left: 4, right: 4 }}
                        style={styles.column}
                    >
                        <View style={styles.plot}>
                            <Column
                                height={
                                    max > 0 ? (m.total / max) * PLOT_HEIGHT : 0
                                }
                                hasValue={m.total > 0}
                                selected={i === selected}
                                progress={progress}
                            />
                        </View>
                        <Text
                            style={[
                                styles.month,
                                i === selected && styles.monthSelected,
                            ]}
                        >
                            T{m.month}
                        </Text>
                        <Text style={styles.year}>
                            {showYear ? m.year : " "}
                        </Text>
                    </Pressable>
                );
            })}
        </ScrollView>
    );
}

function Column({
    height,
    hasValue,
    selected,
    progress,
}: {
    height: number;
    hasValue: boolean;
    selected: boolean;
    progress: SharedValue<number>;
}) {
    // A month with any amount stays visible as at least a sliver.
    const target = hasValue ? Math.max(height, 3) : 0;
    const grow = useAnimatedStyle(() => ({
        height: target * progress.get(),
    }));
    return (
        <Animated.View
            style={[styles.bar, selected && styles.barSelected, grow]}
        />
    );
}

const styles = StyleSheet.create({
    content: { paddingHorizontal: Spacing.one, gap: Spacing.two + 2 },
    column: { alignItems: "center", width: BAR_WIDTH + 8 },
    // Columns stand on a hairline baseline.
    plot: {
        height: PLOT_HEIGHT,
        width: "100%",
        justifyContent: "flex-end",
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    bar: {
        width: BAR_WIDTH,
        backgroundColor: Colors.textMuted,
        borderTopLeftRadius: 4,
        borderTopRightRadius: 4,
    },
    barSelected: { backgroundColor: Colors.icon },
    month: { marginTop: Spacing.one, fontSize: 11, color: Colors.textMuted },
    monthSelected: { fontWeight: "600", color: Colors.text },
    year: { fontSize: 10, color: Colors.textMuted },
});
