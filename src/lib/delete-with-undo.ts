import type { useToast } from "@/components/ui/toast";
import {
    deleteTransaction,
    restoreTransaction,
    type Transaction,
} from "@/lib/transactions";

// Resolves to false when the delete failed, so a screen that hid the row
// early can put it back.
export async function deleteWithUndo(
    tx: Transaction,
    toast: ReturnType<typeof useToast>,
    onChanged: () => void,
): Promise<boolean> {
    try {
        await deleteTransaction(tx.id);
    } catch {
        toast.show({ message: "Không xoá được" });
        return false;
    }
    onChanged();

    let undone = false;
    toast.show({
        message: `Đã xoá "${tx.note ?? tx.category?.name ?? "Không phân loại"}"`,
        actionLabel: "Hoàn tác",
        durationMs: 5000,
        onAction: () => {
            if (undone) return;
            undone = true;
            restoreTransaction(tx).then(onChanged, () =>
                toast.show({ message: "Không hoàn tác được" }),
            );
        },
    });
    return true;
}
