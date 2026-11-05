import { useFocusEffect } from "expo-router";
import { useCallback, useReducer, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CategoryGrid } from "@/components/entry/category-grid";
import { DateField } from "@/components/entry/date-field";
import { AmountDisplay, TypeToggle } from "@/components/entry/entry-header";
import { Keypad } from "@/components/entry/keypad";
import { NewCategorySheet } from "@/components/entry/new-category-sheet";
import { NoteSheet } from "@/components/entry/note-sheet";
import { useToast } from "@/components/ui/toast";
import { Colors, Spacing } from "@/constants/theme";
import {
    amountReducer,
    amountSuggestions,
    initialAmount,
} from "@/lib/amount-input";
import { listCategories, type Category, type TxType } from "@/lib/categories";
import { resolveDate, todayLocal, type LocalDate } from "@/lib/dates";
import { formatAmountDigits } from "@/lib/money";
import { useToday } from "@/lib/use-today";
import {
    validateDraft,
    type Transaction,
    type TransactionDraft,
} from "@/lib/transactions";

type Props = {
    initial?: Transaction;
    onSubmit(d: TransactionDraft): Promise<void>;
    onDelete?(): void;
    resetAfterSubmit: boolean;
};

export function EntryForm({
    initial,
    onSubmit,
    onDelete,
    resetAfterSubmit,
}: Props) {
    const toast = useToast();
    const [type, setType] = useState<TxType>(initial?.type ?? "expense");
    const [amount, dispatch] = useReducer(amountReducer, initial, (i) =>
        i
            ? amountReducer(initialAmount, { type: "set", value: i.amount })
            : initialAmount,
    );
    const [categoryId, setCategoryId] = useState<string | null>(
        initial?.categoryId ?? null,
    );
    // null = "today", resolved at render and at save so the form rolls over at midnight.
    const [pickedDate, setPickedDate] = useState<LocalDate | null>(
        initial?.date ?? null,
    );
    const [note, setNote] = useState(initial?.note ?? "");
    const [categories, setCategories] = useState<Category[] | null>(null);
    const [noteOpen, setNoteOpen] = useState(false);
    const [newCategoryOpen, setNewCategoryOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const savingRef = useRef(false);
    const today = useToday();
    const date = resolveDate(pickedDate, today);

    useFocusEffect(
        useCallback(() => {
            let stale = false;
            listCategories(type)
                .then((list) => {
                    if (!stale) setCategories(list);
                })
                .catch(() => {
                    if (!stale)
                        toast.show({ message: "Không tải được danh sách mục" });
                });
            return () => {
                stale = true;
            };
        }, [type, toast]),
    );

    const changeType = (next: TxType) => {
        if (next === type) return;
        setType(next);
        setCategoryId(null);
        setCategories(null);
    };

    const changeDate = (next: LocalDate) =>
        setPickedDate(!initial && next === todayLocal() ? null : next);

    const draft: TransactionDraft = {
        type,
        amount: amount.value,
        categoryId: categoryId ?? "",
        date,
        note: note === "" ? null : note,
    };
    const canSave = validateDraft(draft) === null;
    const suggestions = amountSuggestions(amount);
    const nextSortOrder =
        (categories ?? []).reduce((max, c) => Math.max(max, c.sortOrder), -1) +
        1;

    const save = async () => {
        if (savingRef.current || !canSave) return;
        savingRef.current = true;
        setSaving(true);
        try {
            await onSubmit({
                ...draft,
                date: resolveDate(pickedDate, todayLocal()),
            });
            if (resetAfterSubmit) {
                dispatch({ type: "clear" });
                setCategoryId(null);
                setNote("");
                toast.show({ message: "Đã lưu" });
            }
        } catch {
            toast.show({ message: "Không lưu được, thử lại nhé" });
        } finally {
            savingRef.current = false;
            setSaving(false);
        }
    };

    return (
        <View style={styles.root}>
            <TypeToggle type={type} onChange={changeType} />
            <AmountDisplay value={amount.value} />
            <View style={styles.metaRow}>
                <DateField date={date} onChange={changeDate} />
                <Pressable
                    onPress={() => setNoteOpen(true)}
                    accessibilityRole="button"
                    style={styles.noteButton}
                >
                    <Text
                        style={[
                            styles.metaText,
                            note !== "" && styles.noteText,
                        ]}
                        numberOfLines={1}
                    >
                        {note === "" ? "Thêm mô tả" : note}
                    </Text>
                </Pressable>
            </View>

            <CategoryGrid
                categories={categories ?? []}
                selectedId={categoryId}
                onSelect={setCategoryId}
                addDisabled={categories === null}
                onAdd={() => setNewCategoryOpen(true)}
            />

            <View style={styles.suggestions}>
                {suggestions.map((value) => (
                    <Pressable
                        key={value}
                        onPress={() => dispatch({ type: "pick", value })}
                        accessibilityRole="button"
                        style={styles.suggestion}
                    >
                        <Text style={styles.suggestionText}>
                            {formatAmountDigits(value)}
                        </Text>
                    </Pressable>
                ))}
            </View>
            <View style={styles.saveSlot}>
                {canSave && (
                    <Pressable
                        onPress={save}
                        disabled={saving}
                        accessibilityRole="button"
                        style={[
                            styles.saveButton,
                            saving && styles.saveButtonBusy,
                        ]}
                    >
                        <Text style={styles.saveText}>Lưu</Text>
                    </Pressable>
                )}
            </View>
            <Keypad onKey={dispatch} />
            {onDelete && (
                <Pressable
                    onPress={onDelete}
                    accessibilityRole="button"
                    style={styles.deleteButton}
                >
                    <Text style={styles.deleteText}>Xoá khoản này</Text>
                </Pressable>
            )}

            <NoteSheet
                visible={noteOpen}
                note={note}
                onDone={(n) => {
                    setNote(n);
                    setNoteOpen(false);
                }}
            />
            <NewCategorySheet
                visible={newCategoryOpen}
                type={type}
                nextSortOrder={nextSortOrder}
                onClose={() => setNewCategoryOpen(false)}
                onCreated={(c) => {
                    setCategories((list) => [...(list ?? []), c]);
                    setCategoryId(c.id);
                    setNewCategoryOpen(false);
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.background },
    metaRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: Spacing.three,
        paddingHorizontal: Spacing.three,
        paddingTop: Spacing.one,
        paddingBottom: Spacing.two,
    },
    noteButton: { flex: 1, alignItems: "flex-end" },
    metaText: { fontSize: 13, color: Colors.textMuted },
    noteText: { color: Colors.textSecondary },
    suggestions: {
        flexDirection: "row",
        gap: Spacing.two,
        height: 48,
        alignItems: "center",
        paddingHorizontal: Spacing.two + Spacing.one,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        backgroundColor: Colors.surfaceMuted,
    },
    suggestion: {
        flex: 1,
        alignItems: "center",
        paddingVertical: 8,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 8,
    },
    suggestionText: { fontSize: 14, color: Colors.text },
    saveSlot: {
        height: 64,
        justifyContent: "center",
        paddingHorizontal: Spacing.three,
    },
    saveButton: {
        alignItems: "center",
        paddingVertical: 13,
        backgroundColor: Colors.primary,
        borderRadius: 12,
    },
    saveButtonBusy: { opacity: 0.5 },
    saveText: { fontSize: 15, fontWeight: "600", color: Colors.onPrimary },
    deleteButton: { alignItems: "center", paddingVertical: Spacing.three },
    deleteText: { fontSize: 14, color: Colors.danger },
});
