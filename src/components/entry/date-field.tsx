import { MetaChip } from "@/components/entry/meta-chip";
import { useDatePicker } from "@/components/ui/date-picker";
import { formatDayTitle, todayLocal, type LocalDate } from "@/lib/dates";

type Props = { date: LocalDate; onChange(date: LocalDate): void };

export function DateField({ date, onChange }: Readonly<Props>) {
    const picker = useDatePicker(date, onChange);
    const title = formatDayTitle(date, todayLocal());

    return (
        <>
            <MetaChip
                icon="calendar-outline"
                grow
                label={title}
                accessibilityLabel={`Ngày: ${title}. Chạm để đổi ngày`}
                onPress={picker.open}
            />
            {picker.sheet}
        </>
    );
}
