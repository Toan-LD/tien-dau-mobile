import { useRef, useState } from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { CategoryIcon } from "@/components/category-icon";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Colors, Spacing } from "@/constants/theme";
import { CATEGORY_ICON_KEYS, DEFAULT_ICON_KEY } from "@/lib/category-icons";
import {
    createCategory,
    DuplicateCategoryError,
    normalizeCategoryName,
    type Category,
    type TxType,
} from "@/lib/categories";

// Cells get whole-pixel widths from the measured grid: six "16.6667%" cells add up
// to just over 100%, so Android wrapped some rows after five icons.
const ICON_COLUMNS = 6;

type Props = {
    visible: boolean;
    type: TxType;
    nextSortOrder: number;
    onClose(): void;
    onCreated(category: Category): void;
};

export function NewCategorySheet({
    visible,
    type,
    nextSortOrder,
    onClose,
    onCreated,
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
            setName("");
            setIconKey(DEFAULT_ICON_KEY);
            setError(null);
            setCreating(false);
        }
    }

    const canCreate = normalizeCategoryName(name) !== "" && !creating;

    const create = async () => {
        if (creatingRef.current || normalizeCategoryName(name) === "") return;
        creatingRef.current = true;
        setCreating(true);
        setError(null);
        try {
            const category = await createCategory({
                name,
                iconKey,
                type,
                sortOrder: nextSortOrder,
            });
            onCreated(category);
        } catch (e) {
            setError(
                e instanceof DuplicateCategoryError
                    ? "Mục đã có"
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
            title={type === "expense" ? "Mục chi mới" : "Mục thu mới"}
        >
            <TextInput
                value={name}
                onChangeText={(t) => {
                    setName(t);
                    setError(null);
                }}
                placeholder="Tên mục"
                placeholderTextColor={Colors.textMuted}
                autoFocus
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
                            <Pressable
                                onPress={() => setIconKey(key)}
                                accessibilityRole="button"
                                accessibilityLabel={key}
                                accessibilityState={{ selected }}
                                style={[
                                    styles.iconTile,
                                    selected && styles.iconTileSelected,
                                ]}
                            >
                                <CategoryIcon iconKey={key} size={22} />
                            </Pressable>
                        </View>
                    );
                })}
            </ScrollView>
            <Pressable
                onPress={create}
                disabled={!canCreate}
                accessibilityRole="button"
                style={[styles.button, !canCreate && styles.buttonDisabled]}
            >
                <Text
                    style={[
                        styles.buttonText,
                        !canCreate && styles.buttonTextDisabled,
                    ]}
                >
                    Tạo mục
                </Text>
            </Pressable>
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
    iconTile: {
        alignItems: "center",
        justifyContent: "center",
        height: 44,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 10,
        backgroundColor: Colors.surface,
    },
    iconTileSelected: { borderWidth: 1.5, borderColor: Colors.borderStrong },
    button: {
        marginTop: Spacing.three,
        alignItems: "center",
        paddingVertical: 12,
        backgroundColor: Colors.primary,
        borderRadius: 12,
    },
    buttonDisabled: { backgroundColor: Colors.segment },
    buttonText: { fontSize: 14, fontWeight: "600", color: Colors.onPrimary },
    buttonTextDisabled: { color: Colors.textMuted },
});
