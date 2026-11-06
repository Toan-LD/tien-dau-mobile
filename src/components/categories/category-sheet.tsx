import { useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { CategoryIcon } from "@/components/category-icon";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { SelectableTile } from "@/components/ui/selectable-tile";
import { Colors, Spacing } from "@/constants/theme";
import { CATEGORY_ICON_KEYS, DEFAULT_ICON_KEY } from "@/lib/category-icons";
import {
    createCategory,
    DuplicateCategoryError,
    normalizeCategoryName,
    updateCategory,
    type Category,
    type TxType,
} from "@/lib/categories";

// Cells get whole-pixel widths from the measured grid: six "16.6667%" cells add up
// to just over 100%, so Android wrapped some rows after five icons.
const ICON_COLUMNS = 6;

type Props = {
    visible: boolean;
    type: TxType;
    // Where a new category goes in the list (ignored when editing).
    nextSortOrder: number;
    // The category to edit; null/undefined creates a new one.
    editing?: Category | null;
    onClose(): void;
    // The created or updated category.
    onSaved(category: Category): void;
};

// Name + icon for a category: "Mục chi mới" / "Mục thu mới" when creating,
// "Sửa mục" when `editing` is set.
export function CategorySheet({
    visible,
    type,
    nextSortOrder,
    editing,
    onClose,
    onSaved,
}: Props) {
    const [name, setName] = useState("");
    const [iconKey, setIconKey] = useState<string>(DEFAULT_ICON_KEY);
    const [error, setError] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const creatingRef = useRef(false);
    const [wasVisible, setWasVisible] = useState(visible);
    const [gridWidth, setGridWidth] = useState(0);
    const cellWidth = Math.floor(gridWidth / ICON_COLUMNS);
    if (visible !== wasVisible) {
        setWasVisible(visible);
        if (visible) {
            setName(editing?.name ?? "");
            setIconKey(editing?.icon ?? DEFAULT_ICON_KEY);
            setError(null);
            setCreating(false);
        }
    }

    const unchanged =
        !!editing &&
        normalizeCategoryName(name) === editing.name &&
        iconKey === (editing.icon ?? DEFAULT_ICON_KEY);
    const canCreate =
        normalizeCategoryName(name) !== "" && !creating && !unchanged;

    const create = async () => {
        if (creatingRef.current || normalizeCategoryName(name) === "") return;
        creatingRef.current = true;
        setCreating(true);
        setError(null);
        try {
            const category = editing
                ? await updateCategory(editing.id, { name, iconKey })
                : await createCategory({
                      name,
                      iconKey,
                      type,
                      sortOrder: nextSortOrder,
                  });
            onSaved(category);
        } catch (e) {
            setError(
                e instanceof DuplicateCategoryError
                    ? "Mục đã có"
                    : editing
                      ? "Không lưu được, thử lại nhé"
                      : "Không tạo được, thử lại nhé",
            );
        } finally {
            creatingRef.current = false;
            setCreating(false);
        }
    };

    return (
        <BottomSheet
            visible={visible}
            onClose={onClose}
            title={
                editing
                    ? "Sửa mục"
                    : type === "expense"
                      ? "Mục chi mới"
                      : "Mục thu mới"
            }
        >
            <TextInput
                value={name}
                onChangeText={(t) => {
                    setName(t);
                    setError(null);
                }}
                placeholder="Tên mục"
                placeholderTextColor={Colors.textMuted}
                // Editing usually means picking a new icon, so don't pop the
                // keyboard over the icon grid.
                autoFocus={!editing}
                maxLength={40}
                style={[styles.input, error !== null && styles.inputError]}
            />
            {error !== null && <Text style={styles.error}>{error}</Text>}
            <ScrollView
                style={styles.icons}
                contentContainerStyle={[
                    styles.iconsContent,
                    { paddingLeft: (gridWidth - cellWidth * ICON_COLUMNS) / 2 },
                ]}
                keyboardShouldPersistTaps="handled"
                onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}
            >
                {CATEGORY_ICON_KEYS.map((key) => {
                    const selected = key === iconKey;
                    return (
                        <View
                            key={key}
                            style={[
                                styles.iconCell,
                                cellWidth > 0 && { width: cellWidth },
                            ]}
                        >
                            <SelectableTile
                                selected={selected}
                                onPress={() => setIconKey(key)}
                                accessibilityLabel={key}
                                style={styles.iconTile}
                            >
                                <CategoryIcon iconKey={key} size={22} />
                            </SelectableTile>
                        </View>
                    );
                })}
            </ScrollView>
            <Button
                label={editing ? "Lưu" : "Tạo mục"}
                onPress={create}
                disabled={!canCreate}
                style={styles.button}
            />
        </BottomSheet>
    );
}

const styles = StyleSheet.create({
    input: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
        color: Colors.text,
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 10,
    },
    inputError: { borderColor: Colors.danger },
    error: { marginTop: Spacing.one, fontSize: 12, color: Colors.danger },
    icons: { maxHeight: 200, marginTop: Spacing.three },
    iconsContent: { flexDirection: "row", flexWrap: "wrap" },
    iconCell: { width: "16.66%", padding: 3 },
    iconTile: { height: 44 },
    button: { marginTop: Spacing.three },
});
