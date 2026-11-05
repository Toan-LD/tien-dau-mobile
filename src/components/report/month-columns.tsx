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
    useAnimatedProps,
    useSharedValue,
    withTiming,
    type SharedValue,
} from "react-native-reanimated";
import Svg, { Circle, Line, Path } from "react-native-svg";

import { ChartColors, Colors, Spacing } from "@/constants/theme";
import { formatCompactVND } from "@/lib/money";
import { niceTicks, type MonthTotal } from "@/lib/report";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const COLUMN = 40;
const BAR = 22;
const PLOT_HEIGHT = 160;
// Room above the top gridline so its label isn't cut off.
const TOP = 8;
const BASELINE = TOP + PLOT_HEIGHT;
const SVG_HEIGHT = BASELINE + 1;
const RADIUS = 4;
const DOT = 4;
const DOT_SELECTED = 5.5;
// One value drives the entrance: columns grow over the first 60%, then the
// trend line fades in.
const ENTER = { duration: 850, easing: Easing.out(Easing.cubic) };

const BAR_COLOR = ChartColors.series[0];
const LINE_COLOR = ChartColors.series[1];

type Props = {
    months: MonthTotal[];
    // Trend line values, one per month (same unit and axis as the columns).
    trend: number[];
    // Index of the highlighted month.
    selected: number;
    onSelect(index: number): void;
    // Changing this plays the entrance again.
    drawKey: string;
};

// Bar path with rounded top corners, standing on the baseline. A worklet so
// the columns can grow on the UI thread.
function barPath(x: number, height: number): string {
    "worklet";
    if (height <= 0) return `M${x} ${BASELINE}Z`;
    const r = Math.min(RADIUS, height, BAR / 2);
    const top = BASELINE - height;
    return (
        `M${x} ${BASELINE}V${top + r}Q${x} ${top} ${x + r} ${top}` +
        `H${x + BAR - r}Q${x + BAR} ${top} ${x + BAR} ${top + r}` +
        `V${BASELINE}Z`
    );
}

// Monthly columns with a trend line, one value axis on the left (kept in
// place while the months scroll), hairline gridlines, and a legend.
export function MonthColumns({
    months,
    trend,
    selected,
    onSelect,
    drawKey,
}: Props) {
    const scrollRef = useRef<ScrollViewInstance>(null);
    const progress = useSharedValue(0);

    useEffect(() => {
        progress.set(0);
        progress.set(withTiming(1, ENTER));
    }, [drawKey, progress]);

    const max = Math.max(
        months.reduce((m, x) => Math.max(m, x.total), 0),
        trend.reduce((m, v) => Math.max(m, v), 0),
    );
    const ticks = niceTicks(max);
    const top = ticks[ticks.length - 1];
    const y = (value: number) => BASELINE - (value / top) * PLOT_HEIGHT;
    const width = months.length * COLUMN;
    const centerX = (i: number) => i * COLUMN + COLUMN / 2;
    const trendPath = trend
        .map((v, i) => `${i === 0 ? "M" : "L"}${centerX(i)} ${y(v)}`)
        .join("");

    return (
        <View>
            <View style={styles.legend}>
                <View style={styles.legendItem}>
                    <View style={styles.legendBar} />
                    <Text style={styles.legendText}>Mỗi tháng</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={styles.legendLine}>
                        <View style={styles.legendDot} />
                    </View>
                    <Text style={styles.legendText}>TB 3 tháng</Text>
                </View>
            </View>

            <View style={styles.chart}>
                <View style={styles.axis}>
                    {ticks.map((t) => (
                        <Text
                            key={t}
                            style={[styles.tick, { top: y(t) - 7 }]}
                            numberOfLines={1}
                        >
                            {t === 0 ? "0" : formatCompactVND(t)}
                        </Text>
                    ))}
                </View>

                <ScrollView
                    ref={scrollRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    onContentSizeChange={() =>
                        scrollRef.current?.scrollToEnd({ animated: false })
                    }
                >
                    <View>
                        <Svg width={width} height={SVG_HEIGHT}>
                            {ticks.map((t) => (
                                <Line
                                    key={t}
                                    x1={0}
                                    x2={width}
                                    y1={y(t)}
                                    y2={y(t)}
                                    stroke={
                                        t === 0
                                            ? Colors.textMuted
                                            : Colors.border
                                    }
                                    strokeWidth={1}
                                />
                            ))}
                            {months.map((m, i) => (
                                <Bar
                                    key={`${m.year}-${m.month}`}
                                    x={centerX(i) - BAR / 2}
                                    height={(m.total / top) * PLOT_HEIGHT}
                                    hasValue={m.total > 0}
                                    dimmed={i !== selected}
                                    progress={progress}
                                />
                            ))}
                            <TrendLine d={trendPath} progress={progress} />
                            {trend.map((v, i) => (
                                <Dot
                                    key={i}
                                    cx={centerX(i)}
                                    cy={y(v)}
                                    selected={i === selected}
                                    progress={progress}
                                />
                            ))}
                        </Svg>

                        <View style={styles.labels}>
                            {months.map((m, i) => (
                                <View
                                    key={`${m.year}-${m.month}`}
                                    style={styles.label}
                                >
                                    <Text
                                        style={[
                                            styles.month,
                                            i === selected &&
                                                styles.monthSelected,
                                        ]}
                                    >
                                        T{m.month}
                                    </Text>
                                    <Text style={styles.year}>
                                        {i === 0 || m.month === 1
                                            ? m.year
                                            : " "}
                                    </Text>
                                </View>
                            ))}
                        </View>

                        {/* Tap targets: the whole column, not just the bar. */}
                        <View style={styles.hits}>
                            {months.map((m, i) => (
                                <Pressable
                                    key={`${m.year}-${m.month}`}
                                    onPress={() => onSelect(i)}
                                    accessibilityRole="button"
                                    accessibilityState={{
                                        selected: i === selected,
                                    }}
                                    accessibilityLabel={`Tháng ${m.month}/${m.year}`}
                                    style={styles.hit}
                                />
                            ))}
                        </View>
                    </View>
                </ScrollView>
            </View>
        </View>
    );
}

function Bar({
    x,
    height,
    hasValue,
    dimmed,
    progress,
}: {
    x: number;
    height: number;
    hasValue: boolean;
    dimmed: boolean;
    progress: SharedValue<number>;
}) {
    // A month with any amount stays visible as at least a sliver.
    const target = hasValue ? Math.max(height, 3) : 0;
    const animatedProps = useAnimatedProps(() => {
        const grow = Math.min(progress.get() / 0.6, 1);
        return { d: barPath(x, target * grow) };
    });
    return (
        <AnimatedPath
            fill={BAR_COLOR}
            fillOpacity={dimmed ? 0.45 : 1}
            animatedProps={animatedProps}
        />
    );
}

function TrendLine({
    d,
    progress,
}: {
    d: string;
    progress: SharedValue<number>;
}) {
    const animatedProps = useAnimatedProps(() => ({
        strokeOpacity: Math.max(0, (progress.get() - 0.5) / 0.5),
    }));
    return (
        <AnimatedPath
            d={d}
            fill="none"
            stroke={LINE_COLOR}
            strokeWidth={2}
            strokeLinejoin="round"
            animatedProps={animatedProps}
        />
    );
}

function Dot({
    cx,
    cy,
    selected,
    progress,
}: {
    cx: number;
    cy: number;
    selected: boolean;
    progress: SharedValue<number>;
}) {
    const animatedProps = useAnimatedProps(() => ({
        opacity: Math.max(0, (progress.get() - 0.5) / 0.5),
    }));
    // The white ring keeps the dot readable where it crosses a column.
    return (
        <AnimatedCircle
            cx={cx}
            cy={cy}
            r={selected ? DOT_SELECTED : DOT}
            fill={LINE_COLOR}
            stroke={Colors.surface}
            strokeWidth={2}
            animatedProps={animatedProps}
        />
    );
}

const styles = StyleSheet.create({
    legend: {
        flexDirection: "row",
        gap: Spacing.three,
        marginBottom: Spacing.two,
    },
    legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
    legendBar: {
        width: 10,
        height: 10,
        borderRadius: 2,
        backgroundColor: BAR_COLOR,
    },
    legendLine: {
        width: 18,
        height: 2,
        backgroundColor: LINE_COLOR,
        alignItems: "center",
        justifyContent: "center",
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: LINE_COLOR,
    },
    legendText: { fontSize: 12, color: Colors.textSecondary },
    chart: { flexDirection: "row" },
    axis: { width: 40, height: SVG_HEIGHT },
    tick: {
        position: "absolute",
        right: Spacing.one + 2,
        fontSize: 10,
        color: Colors.textMuted,
    },
    labels: { flexDirection: "row" },
    label: { width: COLUMN, alignItems: "center" },
    month: { marginTop: Spacing.one, fontSize: 11, color: Colors.textMuted },
    monthSelected: { fontWeight: "600", color: Colors.text },
    year: { fontSize: 10, color: Colors.textMuted },
    hits: {
        position: "absolute",
        top: 0,
        bottom: 0,
        left: 0,
        flexDirection: "row",
    },
    hit: { width: COLUMN, height: "100%" },
});
