import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CategoryIcon } from '@/components/category-icon';
import { Colors, Spacing } from '@/constants/theme';
import { formatTime } from '@/lib/dates';
import { formatAmountDigits } from '@/lib/money';
import type { Transaction } from '@/lib/transactions';

export { deleteWithUndo } from '@/lib/delete-with-undo';

const PEEK_MS = 1000;

type Props = {
  tx: Transaction;
  onPress(): void;
  onEdit(): void;
  onDelete(): void;
  peekHint?: boolean;
  onPeekDone?(): void;
};

export function TransactionRow({ tx, onPress, onEdit, onDelete, peekHint, onPeekDone }: Props) {
  const swipeRef = useRef<SwipeableMethods>(null);

  useEffect(() => {
    if (!peekHint) return;
    swipeRef.current?.openRight();
    const timer = setTimeout(() => {
      swipeRef.current?.close();
      onPeekDone?.();
    }, PEEK_MS);
    return () => {
      clearTimeout(timer);
      onPeekDone?.();
    };
  }, [peekHint, onPeekDone]);

  const act = (fn: () => void) => () => {
    swipeRef.current?.close();
    fn();
  };

  const sign = tx.type === 'expense' ? '−' : '+';

  return (
    <ReanimatedSwipeable
      ref={swipeRef}
      friction={2}
      overshootRight={false}
      renderRightActions={() => (
        <View style={styles.actions}>
          <Pressable onPress={act(onEdit)} accessibilityRole="button" style={[styles.action, styles.edit]}>
            <Text style={styles.actionText}>Sửa</Text>
          </Pressable>
          <Pressable onPress={act(onDelete)} accessibilityRole="button" style={[styles.action, styles.remove]}>
            <Text style={styles.actionText}>Xoá</Text>
          </Pressable>
        </View>
      )}
    >
      <Pressable onPress={onPress} accessibilityRole="button" style={styles.row}>
        <CategoryIcon iconKey={tx.category?.icon} />
        <View style={styles.texts}>
          <Text style={styles.category}>{tx.category?.name ?? 'Không phân loại'}</Text>
          {tx.note ? (
            <Text style={styles.note} numberOfLines={1}>
              {tx.note}
            </Text>
          ) : null}
        </View>
        <View style={styles.right}>
          <Text style={styles.amount}>
            {sign}
            {formatAmountDigits(tx.amount)}
          </Text>
          <Text style={styles.time}>{formatTime(tx.createdAt)}</Text>
        </View>
      </Pressable>
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: 10,
    paddingHorizontal: Spacing.three,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  texts: { flex: 1, minWidth: 0 },
  category: { fontSize: 14, color: Colors.text },
  note: { fontSize: 12, color: Colors.textSecondary },
  right: { alignItems: 'flex-end' },
  amount: { fontSize: 14, color: Colors.text },
  time: { fontSize: 11, color: Colors.textMuted },
  actions: { flexDirection: 'row' },
  action: { width: 60, alignItems: 'center', justifyContent: 'center' },
  edit: { backgroundColor: Colors.icon },
  remove: { backgroundColor: Colors.danger },
  actionText: { fontSize: 13, color: Colors.onPrimary },
});
