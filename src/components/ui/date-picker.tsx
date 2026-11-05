import DateTimePicker, {
    DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, StyleSheet } from "react-native";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Spacing } from "@/constants/theme";
import { toLocalDateString, type LocalDate } from "@/lib/dates";

// Built from local parts: new Date('YYYY-MM-DD') would parse as UTC and shift the day.
function toPickerDate(date: LocalDate): Date {
    const [y, m, d] = date.split("-").map(Number);
    return new Date(y, m - 1, d);
}

// A calendar to pick a day, no later than today. Call `open()` from a button
// and render `sheet` anywhere in the screen: Android shows its own calendar
// dialog (sheet is null), iOS shows a spinner in a bottom sheet.
export function useDatePicker(
    date: LocalDate,
    onChange: (date: LocalDate) => void,
) {
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

    const sheet =
        Platform.OS === "android" ? null : (
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
                <Button
                    label="Xong"
                    onPress={() => setIosOpen(false)}
                    style={styles.done}
                />
            </BottomSheet>
        );

    return { open, sheet };
}

const styles = StyleSheet.create({
    done: { marginTop: Spacing.two },
});
