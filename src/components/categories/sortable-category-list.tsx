import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
    GestureDetector,
    ScrollView,
    usePanGesture,
} from "react-native-gesture-handler";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
    type SharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { CategoryIcon } from "@/components/category-icon";
import { Colors, Spacing } from "@/constants/theme";
import type { Category } from "@/lib/categories";

// Rows are absolutely positioned at index * ROW_HEIGHT so they can slide
// past each other while one is dragged.
const ROW_HEIGHT = 56;
const ROW_GAP = Spacing.two;
const HOLD_MS = 200;
const SLIDE = { duration: 150 };

type Props = {
    items: Category[];
    onReorder(ids: string[]): void;
    onDelete(category: Category): void;
    footer?: React.ReactNode;
};

export function SortableCategoryList({
    items,
    onReorder,
    onDelete,
    footer,
}: Props) {
    const order = useSharedValue(items.map((c) => c.id));
    const activeId = useSharedValue<string | null>(null);
    const dragY = useSharedValue(0);
    const [dragging, setDragging] = useState(false);

    useEffect(() => {
        order.set(items.map((c) => c.id));
    }, [items, order]);

    const drop = (ids: string[]) => {
        setDragging(false);
        if (ids.some((id, i) => id !== items[i]?.id)) onReorder(ids);
    };

    return (
        <ScrollView
            scrollEnabled={!dragging}
            contentContainerStyle={styles.content}
        >
            <View style={[styles.rows, { height: items.length * ROW_HEIGHT }]}>
                {items.map((c) => (
                    <Row
                        key={c.id}
                        category={c}
                        count={items.length}
                        order={order}
                        activeId={activeId}
                        dragY={dragY}
                        onStart={() => setDragging(true)}
                        onDrop={drop}
                        onDelete={onDelete}
                    />
                ))}
            </View>
            {footer}
        </ScrollView>
    );
}

type RowProps = {
    category: Category;
    count: number;
    order: SharedValue<string[]>;
    activeId: SharedValue<string | null>;
    dragY: SharedValue<number>;
    onStart(): void;
    onDrop(ids: string[]): void;
    onDelete(category: Category): void;
};

function Row({
    category,
    count,
    order,
    activeId,
    dragY,
    onStart,
    onDrop,
    onDelete,
}: RowProps) {
    const id = category.id;
    const startY = useSharedValue(0);

    const pan = usePanGesture({
        activateAfterLongPress: HOLD_MS,
        onActivate: () => {
            const y = order.get().indexOf(id) * ROW_HEIGHT;
            startY.set(y);
            dragY.set(y);
            activeId.set(id);
            scheduleOnRN(onStart);
        },
        onUpdate: (e) => {
            if (activeId.get() !== id) return;
            const y = Math.min(
                Math.max(startY.get() + e.translationY, 0),
                (count - 1) * ROW_HEIGHT,
            );
            dragY.set(y);
            const ids = order.get();
            const from = ids.indexOf(id);
            const to = Math.round(y / ROW_HEIGHT);
            if (to !== from) {
                const next = ids.slice();
                next.splice(from, 1);
                next.splice(to, 0, id);
                order.set(next);
            }
        },
        onFinalize: () => {
            if (activeId.get() !== id) return;
            activeId.set(null);
            scheduleOnRN(onDrop, order.get());
        },
    });

    const position = useAnimatedStyle(() => {
        const active = activeId.get() === id;
        return {
            top: active
                ? dragY.get()
                : withTiming(order.get().indexOf(id) * ROW_HEIGHT, SLIDE),
            zIndex: active ? 1 : 0,
            borderColor: active ? Colors.borderStrong : Colors.border,
        };
    });

    return (
        <Animated.View style={[styles.row, position]}>
            <CategoryIcon iconKey={category.icon} size={20} />
            <Text style={styles.name} numberOfLines={1}>
                {category.name}
            </Text>
            <Pressable
                onPress={() => onDelete(category)}
                accessibilityRole="button"
                accessibilityLabel={`Xoá mục ${category.name}`}
                hitSlop={8}
                style={styles.iconButton}
            >
                <Ionicons
                    name="trash-outline"
                    size={20}
                    color={Colors.danger}
                />
            </Pressable>
            <GestureDetector gesture={pan}>
                <View
                    style={styles.handle}
                    accessibilityLabel={`Giữ rồi kéo để đổi vị trí ${category.name}`}
                >
                    <Ionicons
                        name="reorder-three-outline"
                        size={24}
                        color={Colors.icon}
                    />
                </View>
            </GestureDetector>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    content: { paddingHorizontal: Spacing.three, paddingTop: Spacing.three },
    rows: { position: "relative" },
    row: {
        position: "absolute",
        left: 0,
        right: 0,
        height: ROW_HEIGHT - ROW_GAP,
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.three,
        paddingLeft: Spacing.three,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderRadius: 10,
    },
    name: { flex: 1, fontSize: 15, color: Colors.text },
    iconButton: { padding: Spacing.one },
    handle: {
        alignSelf: "stretch",
        justifyContent: "center",
        paddingHorizontal: Spacing.three,
    },
});
