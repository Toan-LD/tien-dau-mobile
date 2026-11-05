import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { CategoryIcon } from "@/components/category-icon";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { SelectableTile } from "@/components/ui/selectable-tile";
import { Colors, Spacing } from "@/constants/theme";
import type { Category } from "@/lib/categories";
import { NO_CATEGORY } from "@/lib/periods";
import { categoriesQuery } from "@/lib/queries";

type Props = {
    visible: boolean;
    // Category ids currently filtered on (NO_CATEGORY = "Không phân loại").
    selected: string[];
    onApply(ids: string[]): void;
    onClose(): void;
};

// Pick one or more categories to show in Danh sách. Chi and Thu are listed
// separately; nothing picked means "all".
export function CategoryFilterSheet({
    visible,
    selected,
    onApply,
    onClose,
}: Props) {
    const expense = useQuery(categoriesQuery("expense")).data ?? [];
    const income = useQuery(categoriesQuery("income")).data ?? [];

    // Edits stay a draft until "Áp dụng"; each opening starts from the
    // filter in use.
    const [draft, setDraft] = useState<string[]>(selected);
    const [wasVisible, setWasVisible] = useState(visible);
    if (visible !== wasVisible) {
        setWasVisible(visible);
        if (visible) setDraft(selected);
    }

    const toggle = (id: string) =>
        setDraft((list) =>
            list.includes(id) ? list.filter((x) => x !== id) : [...list, id],
        );

    return (
        <BottomSheet visible={visible} onClose={onClose} title="Lọc theo mục">
            <ScrollView style={styles.scroll}>
                <Section
                    title="Chi"
                    categories={expense}
                    draft={draft}
                    onToggle={toggle}
                />
                <Section
                    title="Thu"
                    categories={income}
                    draft={draft}
                    onToggle={toggle}
                />
                <Text style={styles.sectionTitle}>Chưa có mục</Text>
                <View style={styles.grid}>
                    <View style={styles.cell}>
                        <SelectableTile
                            selected={draft.includes(NO_CATEGORY)}
                            onPress={() => toggle(NO_CATEGORY)}
                            accessibilityLabel="Không phân loại"
                            radius="small"
                            style={styles.tile}
                        >
                            <Ionicons
                                name="help-circle-outline"
                                size={18}
                                color={Colors.icon}
                            />
                            <Text style={styles.name} numberOfLines={1}>
                                Không phân loại
                            </Text>
                        </SelectableTile>
                    </View>
                </View>
            </ScrollView>
            <View style={styles.actions}>
                <Button
                    variant="dashed"
                    label="Bỏ lọc"
                    onPress={() => onApply([])}
                    style={styles.action}
                />
                <Button
                    label={
                        draft.length > 0
                            ? `Áp dụng (${draft.length})`
                            : "Áp dụng"
                    }
                    onPress={() => onApply(draft)}
                    style={styles.action}
                />
            </View>
        </BottomSheet>
    );
}

function Section({
    title,
    categories,
    draft,
    onToggle,
}: {
    title: string;
    categories: Category[];
    draft: string[];
    onToggle(id: string): void;
}) {
    if (categories.length === 0) return null;
    return (
        <>
            <Text style={styles.sectionTitle}>{title}</Text>
            <View style={styles.grid}>
                {categories.map((c) => (
                    <View key={c.id} style={styles.cell}>
                        <SelectableTile
                            selected={draft.includes(c.id)}
                            onPress={() => onToggle(c.id)}
                            accessibilityLabel={c.name}
                            radius="small"
                            style={styles.tile}
                        >
                            <CategoryIcon iconKey={c.icon} size={18} />
                            <Text style={styles.name} numberOfLines={1}>
                                {c.name}
                            </Text>
                        </SelectableTile>
                    </View>
                ))}
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    scroll: { maxHeight: 420 },
    sectionTitle: {
        fontSize: 12,
        fontWeight: "600",
        color: Colors.textSecondary,
        marginTop: Spacing.two,
        marginBottom: Spacing.one,
    },
    grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -3 },
    cell: { width: "25%", padding: 3 },
    tile: { gap: 2, paddingVertical: 6, paddingHorizontal: 2 },
    name: { fontSize: 11, color: Colors.text },
    actions: {
        flexDirection: "row",
        gap: Spacing.two,
        marginTop: Spacing.three,
    },
    action: { flex: 1 },
});
