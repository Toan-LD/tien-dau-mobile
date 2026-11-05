import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { CategoryIcon } from "@/components/category-icon";
import { Colors, Spacing } from "@/constants/theme";
import type { Category } from "@/lib/categories";

type Props = {
  categories: Category[];
  selectedId: string | null;
  onSelect(id: string): void;
  onAdd(): void;
};

export function CategoryGrid({ categories, selectedId, onSelect, onAdd }: Props) {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {categories.map((c) => {
        const selected = c.id === selectedId;
        return (
          <View key={c.id} style={styles.cell}>
            <Pressable
              onPress={() => onSelect(c.id)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[styles.tile, selected && styles.tileSelected]}
            >
              <CategoryIcon iconKey={c.icon} size={22} />
              <Text style={[styles.name, selected && styles.nameSelected]} numberOfLines={1}>
                {c.name}
              </Text>
            </Pressable>
          </View>
        );
      })}
      <View style={styles.cell}>
        <Pressable onPress={onAdd} accessibilityRole="button" style={[styles.tile, styles.tileAdd]}>
          <Ionicons name="add-outline" size={22} color={Colors.textMuted} />
          <Text style={styles.addName} numberOfLines={1}>
            Mục mới
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: Spacing.two, paddingBottom: Spacing.two },
  cell: { width: "33.3333%", padding: 3 },
  tile: {
    alignItems: "center",
    gap: Spacing.one,
    paddingVertical: 10,
    paddingHorizontal: Spacing.one,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
  },
  tileSelected: { borderWidth: 1.5, borderColor: Colors.borderStrong },
  tileAdd: { borderStyle: "dashed" },
  name: { fontSize: 12, color: Colors.text },
  nameSelected: { fontWeight: "600" },
  addName: { fontSize: 12, color: Colors.textSecondary },
});
