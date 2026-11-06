import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { CategoryIcon } from "@/components/category-icon";
import { SelectableTile } from "@/components/ui/selectable-tile";
import { Colors, Spacing } from "@/constants/theme";
import type { Category } from "@/lib/categories";

type Props = {
    categories: Category[];
    selectedId: string | null;
    onSelect(id: string): void;
    onAdd(): void;
    addDisabled?: boolean;
};

export function CategoryGrid({
    categories,
    selectedId,
    onSelect,
    onAdd,
    addDisabled,
}: Readonly<Props>) {
    return (
        <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
        >
            {categories.map((c) => {
                const selected = c.id === selectedId;
                return (
                    <View key={c.id} style={styles.cell}>
                        <SelectableTile
                            selected={selected}
                            radius="small"
                            onPress={() => onSelect(c.id)}
                            style={styles.tile}
                        >
                            <CategoryIcon iconKey={c.icon} size={18} />
                            <Text
                                style={[
                                    styles.name,
                                    selected && styles.nameSelected,
                                ]}
                                numberOfLines={1}
                            >
                                {c.name}
                            </Text>
                        </SelectableTile>
                    </View>
                );
            })}
            <View style={styles.cell}>
                <SelectableTile
                    dashed
                    radius="small"
                    onPress={onAdd}
                    disabled={addDisabled}
                    style={styles.tile}
                >
                    <Ionicons
                        name="add-outline"
                        size={18}
                        color={Colors.textMuted}
                    />
                    <Text style={styles.addName} numberOfLines={1}>
                        Mục mới
                    </Text>
                </SelectableTile>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scroll: { flex: 1 },
    content: {
        flexDirection: "row",
        flexWrap: "wrap",
        paddingHorizontal: Spacing.two,
        paddingBottom: Spacing.two,
    },
    cell: { width: "25%", padding: 3 },
    tile: {
        gap: 2,
        paddingVertical: 6,
        paddingHorizontal: 2,
    },
    name: { fontSize: 11, color: Colors.text },
    nameSelected: { fontWeight: "600" },
    addName: { fontSize: 11, color: Colors.textSecondary },
});
