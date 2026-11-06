import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Colors, Spacing } from "@/constants/theme";
import { monthGrid, shiftMonth, yearMonthOf } from "@/lib/calendar";
import { formatMonthTitle, todayLocal, type LocalDate } from "@/lib/dates";

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

type Props = {
    visible: boolean;
    value: LocalDate;
    // Latest day that can be picked (today).
    max: LocalDate;
    onSelect(date: LocalDate): void;
    onClose(): void;
};

// Our own calendar sheet, the same on Android and iOS, so it matches the app
// instead of the phone's system calendar. Tapping a day only marks it; "Xong"
// applies it. ‹ › change month, days after `max` are greyed out.
export function DayPicker({
    visible,
    value,
    max,
    onSelect,
    onClose,
}: Readonly<Props>) {
    const [draft, setDraft] = useState(value);
    const [shown, setShown] = useState(() => yearMonthOf(value));
    // Each time it opens, start from the day being viewed.
    const [wasVisible, setWasVisible] = useState(visible);
    if (visible !== wasVisible) {
        setWasVisible(visible);
        if (visible) {
            setDraft(value);
            setShown(yearMonthOf(value));
        }
    }

    const maxMonth = yearMonthOf(max);
    const atMaxMonth =
        shown.year > maxMonth.year ||
        (shown.year === maxMonth.year && shown.month >= maxMonth.month);
    const today = todayLocal();

    return (
        <BottomSheet visible={visible} onClose={onClose} title="Chọn ngày">
            <View style={styles.monthRow}>
                <IconButton
                    name="chevron-back-outline"
                    onPress={() => setShown((m) => shiftMonth(m, -1))}
                    accessibilityLabel="Tháng trước"
                />
                <Text style={styles.month}>
                    {formatMonthTitle(shown.year, shown.month)}
                </Text>
                <IconButton
                    name="chevron-forward-outline"
                    onPress={() => setShown((m) => shiftMonth(m, 1))}
                    disabled={atMaxMonth}
                    accessibilityLabel="Tháng sau"
                />
            </View>
            <View style={styles.row}>
                {WEEKDAYS.map((w) => (
                    <Text key={w} style={styles.weekday}>
                        {w}
                    </Text>
                ))}
            </View>
            {monthGrid(shown.year, shown.month).map((week) => (
                <View key={week[0].date} style={styles.row}>
                    {week.map(({ date, inMonth }) =>
                        inMonth ? (
                            <DayCell
                                key={date}
                                day={date}
                                selected={date === draft}
                                isToday={date === today}
                                disabled={date > max}
                                onPress={setDraft}
                            />
                        ) : (
                            <View key={date} style={styles.cell} />
                        ),
                    )}
                </View>
            ))}
            <Button
                label="Xong"
                onPress={() => onSelect(draft)}
                style={styles.done}
            />
        </BottomSheet>
    );
}

type CellProps = {
    day: LocalDate;
    selected: boolean;
    isToday: boolean;
    disabled: boolean;
    onPress(day: LocalDate): void;
};

function DayCell({
    day,
    selected,
    isToday,
    disabled,
    onPress,
}: Readonly<CellProps>) {
    const [y, m, d] = day.split("-");
    return (
        <PressableScale
            onPress={() => onPress(day)}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={`Ngày ${d}/${m}/${y}`}
            accessibilityState={{ selected, disabled }}
            scaleTo={0.9}
            style={styles.cell}
        >
            <View style={[styles.circle, selected && styles.circleSelected]}>
                <Text
                    style={[
                        styles.day,
                        isToday && styles.dayToday,
                        disabled && styles.dayDisabled,
                        selected && styles.daySelected,
                    ]}
                >
                    {Number(d)}
                </Text>
                {isToday && (
                    <View
                        style={[
                            styles.todayDot,
                            selected && styles.todayDotSelected,
                        ]}
                    />
                )}
            </View>
        </PressableScale>
    );
}

// A calendar to pick a day, no later than today. Call `open()` from a button
// and render `sheet` anywhere in the screen; picking a day and tapping "Xong"
// calls `onChange`.
export function useDatePicker(
    date: LocalDate,
    onChange: (date: LocalDate) => void,
) {
    const [visible, setVisible] = useState(false);

    const sheet = (
        <DayPicker
            visible={visible}
            value={date}
            max={todayLocal()}
            onSelect={(picked) => {
                setVisible(false);
                if (picked !== date) onChange(picked);
            }}
            onClose={() => setVisible(false)}
        />
    );

    return { open: () => setVisible(true), sheet };
}

const CIRCLE = 38;

const styles = StyleSheet.create({
    monthRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: Spacing.two,
        marginBottom: Spacing.three,
    },
    month: { fontSize: 16, fontWeight: "600", color: Colors.text },
    row: { flexDirection: "row" },
    weekday: {
        flex: 1,
        textAlign: "center",
        fontSize: 12,
        color: Colors.textMuted,
        paddingBottom: Spacing.two,
    },
    cell: {
        flex: 1,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
    },
    circle: {
        width: CIRCLE,
        height: CIRCLE,
        borderRadius: CIRCLE / 2,
        alignItems: "center",
        justifyContent: "center",
    },
    circleSelected: { backgroundColor: Colors.primary },
    day: { fontSize: 15, color: Colors.text },
    dayToday: { fontWeight: "700" },
    dayDisabled: { color: Colors.border },
    daySelected: { color: Colors.onPrimary, fontWeight: "600" },
    todayDot: {
        position: "absolute",
        bottom: 4,
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: Colors.text,
    },
    todayDotSelected: { backgroundColor: Colors.onPrimary },
    done: { marginTop: Spacing.three },
});
