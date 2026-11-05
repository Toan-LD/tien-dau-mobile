import { SegmentedControl } from "@/components/ui/segmented-control";
import type { TxType } from "@/lib/categories";

const OPTIONS = [
    { value: "expense", label: "Chi" },
    { value: "income", label: "Thu" },
] as const;

export function TypeToggle({
    type,
    onChange,
}: {
    type: TxType;
    onChange(t: TxType): void;
}) {
    return (
        <SegmentedControl options={OPTIONS} value={type} onChange={onChange} />
    );
}
