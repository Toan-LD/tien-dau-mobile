import DateTimePicker, {
    DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text } from "react-native";

import { MetaChip } from "@/components/entry/meta-chip";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Colors, Spacing } from "@/constants/theme";
import {
    formatDayTitle,
    toLocalDateString,
    todayLocal,
    type LocalDate,
} from "@/lib/dates";

type Props = { date: LocalDate; onChange(date: LocalDate): void };

// Built from local parts: new Date('YYYY-MM-DD') would parse as UTC and shift the day.
function toPickerDate(date: LocalDate): Date {
    const [y, m, d] = date.split("-").map(Number);
    return new Date(y, m - 1, d);
}

export function DateField({ date, onChange }: Props) {
    const [iosOpen, setIosOpen] = useState(false);

    const open = () => {
        if (Platform.OS === "android") {
            DateTimePickerAndroid.open({
                value: toPickerDate(date),
                mode: "date",
                maximumDate: new Date(),
                onValueChange: (_e, picked) =>
                    onChange(toLocalDateString(picked)),
            });
        } else {
            setIosOpen(true);
        }
    };

    return (
        <>
            <MetaChip
                icon="calendar-outline"
                label={formatDayTitle(date, todayLocal())}
                accessibilityLabel={`Ngày: ${formatDayTitle(date, todayLocal())}. Chạm để đổi ngày`}
                onPress={open}
            />
            {Platform.OS !== "android" && (
                <BottomSheet
                    visible={iosOpen}
                    onClose={() => setIosOpen(false)}
                    title="Chọn ngày"
                >
                    <DateTimePicker
                        value={toPickerDate(date)}
                        mode="date"
                        display="spinner"
                        maximumDate={new Date()}
                        onValueChange={(_e, picked) =>
                            onChange(toLocalDateString(picked))
                        }
                    />
                    <Pressable
                        onPress={() => setIosOpen(false)}
                        accessibilityRole="button"
                        style={styles.done}
                    >
                        <Text style={styles.doneText}>Xong</Text>
                    </Pressable>
                </BottomSheet>
            )}
        </>
    );
}

const styles = StyleSheet.create({
    done: {
        marginTop: Spacing.two,
        alignItems: "center",
        paddingVertical: 12,
        backgroundColor: Colors.primary,
        borderRadius: 12,
    },
    doneText: { fontSize: 14, fontWeight: "600", color: Colors.onPrimary },
});
