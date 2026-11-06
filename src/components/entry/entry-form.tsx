import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useReducer, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Animated, { LayoutAnimationConfig } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { CategorySheet } from "@/components/categories/category-sheet";
import { CategoryGrid } from "@/components/entry/category-grid";
import { DateField } from "@/components/entry/date-field";
import { AmountDisplay } from "@/components/entry/entry-header";
import { Keypad } from "@/components/entry/keypad";
import { MetaChip } from "@/components/entry/meta-chip";
import { NoteSheet } from "@/components/entry/note-sheet";
import { TypeToggle } from "@/components/type-toggle";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { PressableScale } from "@/components/ui/pressable-scale";
import { useToast } from "@/components/ui/toast";
import { Motion } from "@/constants/motion";
import { Colors, Spacing } from "@/constants/theme";
import {
    amountReducer,
    amountSuggestions,
    initialAmount,
} from "@/lib/amount-input";
import { nextCategorySortOrder, type TxType } from "@/lib/categories";
import { resolveDate, todayLocal, type LocalDate } from "@/lib/dates";
import { formatAmountDigits } from "@/lib/money";
import {
    categoriesQuery,
    isWaitingForData,
    setCachedCategories,
    useRefreshOnFocus,
} from "@/lib/queries";
import { useToday } from "@/lib/use-today";
import {
    validateDraft,
    type Transaction,
    type TransactionDraft,
} from "@/lib/transactions";

// Horizontal swipe on the category grid: how far the finger must move
// sideways before it counts as a swipe, and how far or fast to switch type.
const SWIPE_START = 15;
const SWIPE_DISTANCE = 60;
const SWIPE_VELOCITY = 500;

type Props = {
    initial?: Transaction;
    onSubmit(d: TransactionDraft): Promise<void>;
    resetAfterSubmit: boolean;
};

export function EntryForm({ initial, onSubmit, resetAfterSubmit }: Props) {
    const toast = useToast();
    const [type, setType] = useState<TxType>(initial?.type ?? "expense");
    const [amount, dispatch] = useReducer(amountReducer, initial, (i) =>
        i
            ? amountReducer(initialAmount, { type: "set", value: i.amount })
            : initialAmount,
    );
    const [pickedCategoryId, setCategoryId] = useState<string | null>(
        initial?.categoryId ?? null,
    );
    // null = "today", resolved at render and at save so the form rolls over at midnight.
    const [pickedDate, setPickedDate] = useState<LocalDate | null>(
        initial?.date ?? null,
    );
    const [note, setNote] = useState(initial?.note ?? "");
    const [noteOpen, setNoteOpen] = useState(false);
    const [newCategoryOpen, setNewCategoryOpen] = useState(false);
    const [keypadOpen, setKeypadOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const savingRef = useRef(false);
    const today = useToday();
    const date = resolveDate(pickedDate, today);

    const queryClient = useQueryClient();
    const categoriesResult = useQuery(categoriesQuery(type));
    const categories = categoriesResult.data ?? null;
    useRefreshOnFocus(categoriesQuery(type).queryKey);

    useEffect(() => {
        if (categoriesResult.error)
            toast.show({ message: "Không tải được danh sách mục" });
    }, [categoriesResult.error, toast]);

    // Load the other type's categories too, so switching Chi/Thu is instant.
    useEffect(() => {
        queryClient.prefetchQuery(
            categoriesQuery(type === "expense" ? "income" : "expense"),
        );
    }, [type, queryClient]);

    // The picked category may have been deleted on the Danh mục screen.
    const categoryId =
        categories && !categories.some((c) => c.id === pickedCategoryId)
            ? null
            : pickedCategoryId;

    const changeType = (next: TxType) => {
        if (next === type) return;
        setType(next);
        setCategoryId(null);
    };

    // Swiping sideways over the categories switches Chi/Thu, like flipping
    // pages: swipe left to go to Thu (the right page), right for Chi.
    // Only a clearly horizontal move counts; vertical drags still scroll.
    const swipe = usePanGesture({
        activeOffsetX: [-SWIPE_START, SWIPE_START],
        failOffsetY: [-SWIPE_START, SWIPE_START],
        onDeactivate: (e) => {
            if (e.canceled) return;
            const left =
                e.translationX < -SWIPE_DISTANCE ||
                e.velocityX < -SWIPE_VELOCITY;
            const right =
                e.translationX > SWIPE_DISTANCE || e.velocityX > SWIPE_VELOCITY;
            if (left) scheduleOnRN(changeType, "income");
            else if (right) scheduleOnRN(changeType, "expense");
        },
    });

    // Tapping the selected category again clears the selection.
    const selectCategory = (id: string) => {
        setCategoryId((current) => (current === id ? null : id));
        setKeypadOpen(false);
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
    const nextSortOrder = nextCategorySortOrder(categories ?? []);

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
            <AmountDisplay
                value={amount.value}
                active={keypadOpen}
                onPress={() => setKeypadOpen(true)}
            />
            <View style={styles.metaRow}>
                <DateField date={date} onChange={changeDate} />
                <MetaChip
                    icon="create-outline"
                    label={note === "" ? "Thêm mô tả" : note}
                    placeholder={note === ""}
                    accessibilityLabel={
                        note === "" ? "Thêm mô tả" : `Mô tả: ${note}`
                    }
                    grow
                    onPress={() => setNoteOpen(true)}
                />
            </View>

            {/* Chi and Thu are two pages: switching slides one out and the
                other in from its side (Chi left, Thu right), like the toggle.
                skipEntering: no slide when the screen first opens. */}
            <GestureDetector gesture={swipe}>
                <View style={styles.gridArea}>
                    <LayoutAnimationConfig skipEntering>
                        <Animated.View
                            key={type}
                            entering={
                                type === "expense"
                                    ? Motion.pageInLeft
                                    : Motion.pageInRight
                            }
                            exiting={
                                type === "expense"
                                    ? Motion.pageOutLeft
                                    : Motion.pageOutRight
                            }
                            style={styles.gridPage}
                        >
                            <CategoryGrid
                                categories={categories ?? []}
                                selectedId={categoryId}
                                onSelect={selectCategory}
                                addDisabled={categories === null}
                                onAdd={() => setNewCategoryOpen(true)}
                            />
                        </Animated.View>
                    </LayoutAnimationConfig>
                    <LoadingSpinner
                        visible={isWaitingForData(categoriesResult)}
                    />
                </View>
            </GestureDetector>

            {/* While the keypad is open the slot keeps its height so the keypad doesn't jump. */}
            {(canSave || keypadOpen) && (
                <View style={styles.saveSlot}>
                    {canSave && (
                        <Animated.View
                            entering={Motion.fadeIn}
                            exiting={Motion.fadeOut}
                        >
                            <Button label="Lưu" onPress={save} busy={saving} />
                        </Animated.View>
                    )}
                </View>
            )}
            {keypadOpen && (
                <Animated.View
                    entering={Motion.riseIn}
                    exiting={Motion.sinkOut}
                >
                    <View style={styles.suggestions}>
                        {suggestions.map((value) => (
                            <PressableScale
                                key={value}
                                onPress={() =>
                                    dispatch({ type: "pick", value })
                                }
                                accessibilityRole="button"
                                scaleTo={0.94}
                                style={styles.suggestion}
                                pressedStyle={styles.suggestionPressed}
                            >
                                <Text style={styles.suggestionText}>
                                    {formatAmountDigits(value)}
                                </Text>
                            </PressableScale>
                        ))}
                        <IconButton
                            name="chevron-down-outline"
                            onPress={() => setKeypadOpen(false)}
                            accessibilityLabel="Ẩn bàn phím"
                            style={styles.closeKeypad}
                        />
                    </View>
                    <Keypad onKey={dispatch} />
                </Animated.View>
            )}

            <NoteSheet
                visible={noteOpen}
                note={note}
                onDone={(n) => {
                    setNote(n);
                    setNoteOpen(false);
                }}
            />
            <CategorySheet
                visible={newCategoryOpen}
                type={type}
                nextSortOrder={nextSortOrder}
                onClose={() => setNewCategoryOpen(false)}
                onSaved={(c) => {
                    setCachedCategories(queryClient, c.type, (list) => [
                        ...list,
                        c,
                    ]);
                    setCategoryId(c.id);
                    setNewCategoryOpen(false);
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.background },
    // Clips the pages while they slide past the screen edges.
    gridArea: { flex: 1, overflow: "hidden" },
    gridPage: { flex: 1 },
    metaRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.two,
        paddingHorizontal: Spacing.three,
        paddingTop: Spacing.three,
        paddingBottom: Spacing.three,
    },
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
    suggestionPressed: { backgroundColor: Colors.segment },
    suggestionText: { fontSize: 14, color: Colors.text },
    closeKeypad: {
        marginLeft: "auto",
        paddingHorizontal: Spacing.two,
        paddingVertical: Spacing.one,
    },
    saveSlot: {
        height: 64,
        justifyContent: "center",
        paddingHorizontal: Spacing.three,
    },
});
