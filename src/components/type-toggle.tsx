import type { StyleProp, ViewStyle } from "react-native";

import { SegmentedControl } from "@/components/ui/segmented-control";
import type { TxType } from "@/lib/categories";

const OPTIONS = [
    { value: "expense", label: "Chi" },
    { value: "income", label: "Thu" },
] as const;

export function TypeToggle({
    type,
    onChange,
    style,
}: {
    type: TxType;
    onChange(t: TxType): void;
    style?: StyleProp<ViewStyle>;
}) {
    return (
        <SegmentedControl
            options={OPTIONS}
            value={type}
            onChange={onChange}
            style={style}
        />
    );
}
