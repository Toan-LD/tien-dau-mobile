import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TransactionRow, deleteWithUndo } from '@/components/today/transaction-row';
import { useToast } from '@/components/ui/toast';
import { Colors, Spacing } from '@/constants/theme';
import { addDays, formatDayTitle, todayLocal } from '@/lib/dates';
import { formatVND } from '@/lib/money';
import { sumByType } from '@/lib/report';
import { listTransactionsForDay, subscribeTransactionsChanged, type Transaction } from '@/lib/transactions';

const HINT_KEY = 'hint.swipe.v1';

export default function TodayScreen() {
  const router = useRouter();
  const toast = useToast();
  const today = todayLocal();
  const [date, setDate] = useState(today);
  const [items, setItems] = useState<Transaction[] | null>(null);
  const [hintId, setHintId] = useState<string | null>(null);
  const requestId = useRef(0);
  const hintStarted = useRef(false);

  const load = useCallback(
    (day: string) => {
      const id = ++requestId.current;
      listTransactionsForDay(day)
        .then((list) => {
          if (id === requestId.current) setItems(list);
        })
        .catch(() => {
          if (id === requestId.current) toast.show({ message: 'Không tải được danh sách' });
        });
    },
    [toast],
  );

  useFocusEffect(
    useCallback(() => {
      load(date);
    }, [date, load]),
  );

  useEffect(() => {
    return subscribeTransactionsChanged(() => load(date));
  }, [date, load]);

  const firstId = items && items.length > 0 ? items[0].id : null;
  useEffect(() => {
    if (!firstId || hintStarted.current) return;
    let cancelled = false;
    AsyncStorage.getItem(HINT_KEY)
      .then((seen) => {
        if (cancelled || hintStarted.current) return;
        hintStarted.current = true;
        if (seen) return;
        AsyncStorage.setItem(HINT_KEY, '1').catch(() => {});
        setHintId(firstId);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [firstId]);

  const clearHint = useCallback(() => setHintId(null), []);

  const changeDay = (next: string) => {
    setDate(next);
    setItems(null);
  };

  const totals = sumByType(items ?? []);
  const isToday = date === today;

  const header = (
    <View>
      <View style={styles.dayRow}>
        <Pressable
          onPress={() => changeDay(addDays(date, -1))}
          accessibilityRole="button"
          accessibilityLabel="Ngày trước"
          hitSlop={Spacing.two}
        >
          <Ionicons name="chevron-back-outline" size={22} color={Colors.icon} />
        </Pressable>
        <Text style={styles.dayTitle}>{formatDayTitle(date, today)}</Text>
        <Pressable
          onPress={() => changeDay(addDays(date, 1))}
          disabled={isToday}
          accessibilityRole="button"
          accessibilityLabel="Ngày sau"
          hitSlop={Spacing.two}
          style={isToday && styles.dimmed}
        >
          <Ionicons name="chevron-forward-outline" size={22} color={Colors.icon} />
        </Pressable>
      </View>
      <View style={styles.totals}>
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Đã chi</Text>
          <Text style={styles.totalValue}>{formatVND(totals.expense)}</Text>
        </View>
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Đã thu</Text>
          <Text style={styles.totalValue}>{formatVND(totals.income)}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <FlatList
        data={items ?? []}
        keyExtractor={(tx) => tx.id}
        ListHeaderComponent={header}
        ListEmptyComponent={items ? <Text style={styles.empty}>Chưa có khoản nào</Text> : undefined}
        renderItem={({ item }) => (
          <TransactionRow
            tx={item}
            peekHint={item.id === hintId}
            onPeekDone={clearHint}
            onPress={() => router.push(`/transaction/${item.id}`)}
            onEdit={() => router.push(`/transaction/${item.id}`)}
            onDelete={() => deleteWithUndo(item, toast, () => load(date))}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  dayTitle: { fontSize: 15, fontWeight: '600', color: Colors.text },
  dimmed: { opacity: 0.3 },
  totals: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingBottom: 10,
  },
  totalBox: {
    flex: 1,
    paddingVertical: Spacing.two,
    paddingHorizontal: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
  },
  totalLabel: { fontSize: 11, color: Colors.textSecondary },
  totalValue: { fontSize: 15, fontWeight: '600', color: Colors.text, marginTop: 2 },
  empty: { textAlign: 'center', paddingVertical: Spacing.five, fontSize: 14, color: Colors.textMuted },
});
