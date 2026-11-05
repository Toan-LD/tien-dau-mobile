import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
    Alert,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CategoryIcon } from "@/components/category-icon";
import { TypeToggle } from "@/components/entry/entry-header";
import { NewCategorySheet } from "@/components/entry/new-category-sheet";
import { useToast } from "@/components/ui/toast";
import { Colors, Spacing } from "@/constants/theme";
import {
    deleteCategory,
    listCategories,
    moveCategory,
    saveCategoryOrder,
    type Category,
    type TxType,
} from "@/lib/categories";

export default function CategoriesScreen() {
    const toast = useToast();
    const [type, setType] = useState<TxType>("expense");
    const [categories, setCategories] = useState<Category[] | null>(null);
    const [adding, setAdding] = useState(false);
    const requestId = useRef(0);

    const load = useCallback(
        (t: TxType) => {
            const id = ++requestId.current;
            listCategories(t)
                .then((list) => {
                    if (id === requestId.current) setCategories(list);
                })
                .catch(() => {
                    if (id === requestId.current)
                        toast.show({ message: "Không tải được danh sách mục" });
                });
        },
        [toast],
    );

    useFocusEffect(
        useCallback(() => {
            load(type);
        }, [load, type]),
    );

    const changeType = (next: TxType) => {
        if (next === type) return;
        setType(next);
        setCategories(null);
    };

    const remove = async (c: Category) => {
        try {
            await deleteCategory(c.id);
            setCategories((list) =>
                list ? list.filter((x) => x.id !== c.id) : list,
            );
            toast.show({ message: `Đã xoá mục "${c.name}"` });
        } catch {
            toast.show({ message: "Không xoá được, thử lại nhé" });
        }
    };

    // The list updates at once; saves run one after another so quick taps
    // reach the database in order. A failed save reloads the real order.
    const saving = useRef(Promise.resolve());
    const move = (id: string, step: -1 | 1) => {
        if (!categories) return;
        const next = moveCategory(categories, id, step);
        if (next === categories) return;
        const before = categories;
        setCategories(next);
        saving.current = saving.current
            .then(() => saveCategoryOrder(before, next))
            .catch(() => {
                toast.show({ message: "Không lưu được thứ tự, thử lại nhé" });
                load(type);
            });
    };

    const confirmDelete = (c: Category) => {
        Alert.alert(
            `Xoá mục "${c.name}"?`,
            'Các khoản đã ghi trong mục này vẫn còn, và sẽ hiện là "Không phân loại".',
            [
                { text: "Huỷ", style: "cancel" },
                {
                    text: "Xoá",
                    style: "destructive",
                    onPress: () => remove(c),
                },
            ],
        );
    };

    const nextSortOrder =
        (categories ?? []).reduce((max, c) => Math.max(max, c.sortOrder), 0) +
        1;

    return (
        <SafeAreaView edges={["bottom"]} style={styles.container}>
            <TypeToggle type={type} onChange={changeType} />
            <FlatList
                data={categories ?? []}
                keyExtractor={(c) => c.id}
                contentContainerStyle={styles.list}
                renderItem={({ item, index }) => (
                    <View style={styles.row}>
                        <CategoryIcon iconKey={item.icon} size={20} />
                        <Text style={styles.name} numberOfLines={1}>
                            {item.name}
                        </Text>
                        <Pressable
                            onPress={() => move(item.id, -1)}
                            disabled={index === 0}
                            accessibilityRole="button"
                            accessibilityLabel={`Đưa ${item.name} lên trên`}
                            hitSlop={4}
                            style={[
                                styles.iconButton,
                                index === 0 && styles.iconButtonDisabled,
                            ]}
                        >
                            <Ionicons
                                name="chevron-up-outline"
                                size={20}
                                color={Colors.icon}
                            />
                        </Pressable>
                        <Pressable
                            onPress={() => move(item.id, 1)}
                            disabled={index === (categories?.length ?? 0) - 1}
                            accessibilityRole="button"
                            accessibilityLabel={`Đưa ${item.name} xuống dưới`}
                            hitSlop={4}
                            style={[
                                styles.iconButton,
                                index === (categories?.length ?? 0) - 1 &&
                                    styles.iconButtonDisabled,
                            ]}
                        >
                            <Ionicons
                                name="chevron-down-outline"
                                size={20}
                                color={Colors.icon}
                            />
                        </Pressable>
                        <View style={styles.divider} />
                        <Pressable
                            onPress={() => confirmDelete(item)}
                            accessibilityRole="button"
                            accessibilityLabel={`Xoá mục ${item.name}`}
                            hitSlop={8}
                            style={styles.deleteButton}
                        >
                            <Ionicons
                                name="trash-outline"
                                size={20}
                                color={Colors.danger}
                            />
                        </Pressable>
                    </View>
                )}
                ListEmptyComponent={
                    categories === null ? undefined : (
                        <Text style={styles.empty}>Chưa có mục nào</Text>
                    )
                }
                ListFooterComponent={
                    <Text style={styles.hint}>
                        Bấm mũi tên lên, xuống để đổi thứ tự. Mục ở trên cùng
                        hiện đầu tiên ở màn Ghi. Xoá một mục không xoá các khoản
                        đã ghi: chúng sẽ hiện là &quot;Không phân loại&quot;.
                    </Text>
                }
            />
            <Pressable
                onPress={() => setAdding(true)}
                disabled={categories === null}
                accessibilityRole="button"
                style={[
                    styles.addButton,
                    categories === null && styles.addButtonDisabled,
                ]}
            >
                <Ionicons name="add-outline" size={20} color={Colors.icon} />
                <Text style={styles.addText}>
                    {type === "expense" ? "Thêm mục chi" : "Thêm mục thu"}
                </Text>
            </Pressable>

            <NewCategorySheet
                visible={adding}
                type={type}
                nextSortOrder={nextSortOrder}
                onClose={() => setAdding(false)}
                onCreated={(c) => {
                    setCategories((list) => [...(list ?? []), c]);
                    setAdding(false);
                }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    list: { paddingHorizontal: Spacing.three, paddingTop: Spacing.three },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.two,
        paddingVertical: 12,
        paddingHorizontal: Spacing.three,
        marginBottom: Spacing.two,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 10,
    },
    name: { flex: 1, fontSize: 15, color: Colors.text },
    iconButton: { padding: Spacing.one },
    iconButtonDisabled: { opacity: 0.25 },
    divider: {
        width: 1,
        alignSelf: "stretch",
        marginHorizontal: Spacing.one,
        backgroundColor: Colors.border,
    },
    deleteButton: { padding: Spacing.one },
    empty: {
        textAlign: "center",
        marginTop: Spacing.four,
        fontSize: 14,
        color: Colors.textMuted,
    },
    hint: {
        marginTop: Spacing.two,
        marginBottom: Spacing.three,
        fontSize: 12,
        color: Colors.textMuted,
    },
    addButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: Spacing.two,
        margin: Spacing.three,
        paddingVertical: 12,
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: Colors.border,
        borderRadius: 12,
        backgroundColor: Colors.surface,
    },
    addButtonDisabled: { opacity: 0.4 },
    addText: { fontSize: 15, color: Colors.text },
});
