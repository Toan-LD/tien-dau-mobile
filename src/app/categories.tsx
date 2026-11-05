import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SortableCategoryList } from "@/components/categories/sortable-category-list";
import { NewCategorySheet } from "@/components/entry/new-category-sheet";
import { TypeToggle } from "@/components/type-toggle";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/components/ui/toast";
import { Colors, Spacing } from "@/constants/theme";
import {
    deleteCategory,
    nextCategorySortOrder,
    reorderCategories,
    saveCategoryOrder,
    type Category,
    type TxType,
} from "@/lib/categories";
import {
    categoriesQuery,
    isWaitingForData,
    setCachedCategories,
    useRefreshOnFocus,
} from "@/lib/queries";

export default function CategoriesScreen() {
    const toast = useToast();
    const [type, setType] = useState<TxType>("expense");
    const [adding, setAdding] = useState(false);
    const queryClient = useQueryClient();
    const query = useQuery(categoriesQuery(type));
    const categories = query.data ?? null;
    useRefreshOnFocus(categoriesQuery(type).queryKey);

    useEffect(() => {
        if (query.error)
            toast.show({ message: "Không tải được danh sách mục" });
    }, [query.error, toast]);

    const reload = () =>
        queryClient.invalidateQueries({ queryKey: ["categories", type] });

    const changeType = (next: TxType) => {
        if (next === type) return;
        setType(next);
    };

    const remove = async (c: Category) => {
        try {
            await deleteCategory(c.id);
            setCachedCategories(queryClient, c.type, (list) =>
                list.filter((x) => x.id !== c.id),
            );
            // Rows in that category now show as "Không phân loại".
            queryClient.invalidateQueries({ queryKey: ["transactions"] });
            toast.show({ message: `Đã xoá mục "${c.name}"` });
        } catch {
            toast.show({ message: "Không xoá được, thử lại nhé" });
        }
    };

    // The list updates at once; saves run one after another so quick drags
    // reach the database in order. A failed save reloads the real order.
    const saving = useRef(Promise.resolve());
    const reorder = (ids: string[]) => {
        if (!categories) return;
        const next = reorderCategories(categories, ids);
        const before = categories;
        // A reload still on its way would put the old order back.
        queryClient.cancelQueries({ queryKey: ["categories", type] });
        setCachedCategories(queryClient, type, () => next);
        saving.current = saving.current
            .then(() => saveCategoryOrder(before, next))
            .catch(() => {
                toast.show({ message: "Không lưu được thứ tự, thử lại nhé" });
                reload();
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

    const nextSortOrder = nextCategorySortOrder(categories ?? []);

    return (
        <SafeAreaView edges={["bottom"]} style={styles.container}>
            <TypeToggle type={type} onChange={changeType} />
            <View style={styles.listArea}>
                {categories !== null && categories.length === 0 ? (
                    <Text style={styles.empty}>Chưa có mục nào</Text>
                ) : (
                    <SortableCategoryList
                        items={categories ?? []}
                        onReorder={reorder}
                        onDelete={confirmDelete}
                        footer={
                            <Text style={styles.hint}>
                                Nhấn giữ biểu tượng ≡ rồi kéo để đổi thứ tự. Mục
                                ở trên cùng hiện đầu tiên ở màn Ghi. Xoá một mục
                                không xoá các khoản đã ghi: chúng sẽ hiện là
                                &quot;Không phân loại&quot;.
                            </Text>
                        }
                    />
                )}
                <LoadingSpinner visible={isWaitingForData(query)} />
            </View>
            <Button
                variant="dashed"
                icon="add-outline"
                label={type === "expense" ? "Thêm mục chi" : "Thêm mục thu"}
                onPress={() => setAdding(true)}
                disabled={categories === null}
                style={styles.addButton}
            />

            <NewCategorySheet
                visible={adding}
                type={type}
                nextSortOrder={nextSortOrder}
                onClose={() => setAdding(false)}
                onCreated={(c) => {
                    setCachedCategories(queryClient, c.type, (list) => [
                        ...list,
                        c,
                    ]);
                    setAdding(false);
                }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    listArea: { flex: 1 },
    empty: {
        flex: 1,
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
    addButton: { margin: Spacing.three },
});
