import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryBars } from '@/components/report/category-bars';
import { Colors, Spacing } from '@/constants/theme';
import { formatMonthTitle, todayLocal } from '@/lib/dates';
import { formatVND } from '@/lib/money';
import { buildMonthReport, type MonthReport } from '@/lib/report';
import { listTransactionsForMonth } from '@/lib/transactions';

function formatBalance(balance: number): string {
  if (balance > 0) return `+${formatVND(balance)}`;
  if (balance < 0) return `−${formatVND(Math.abs(balance))}`;
  return formatVND(0);
}

export default function ReportScreen() {
  const router = useRouter();
  const today = todayLocal();
  const currentYear = Number(today.slice(0, 4));
  const currentMonth = Number(today.slice(5, 7));
  const [view, setView] = useState({ year: currentYear, month: currentMonth });
  const [report, setReport] = useState<MonthReport | null>(null);
  const [failed, setFailed] = useState(false);
  const requestId = useRef(0);

  const load = useCallback((year: number, month: number) => {
    const id = ++requestId.current;
    listTransactionsForMonth(year, month)
      .then((txs) => {
        if (id !== requestId.current) return;
        setReport(buildMonthReport(txs));
        setFailed(false);
      })
      .catch(() => {
        if (id === requestId.current) setFailed(true);
      });
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(view.year, view.month);
    }, [view, load]),
  );

  const changeMonth = (delta: number) => {
    const d = new Date(view.year, view.month - 1 + delta, 1);
    setView({ year: d.getFullYear(), month: d.getMonth() + 1 });
    setReport(null);
    setFailed(false);
  };

  const isCurrent = view.year === currentYear && view.month === currentMonth;
  const balance = report?.balance ?? 0;

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <View style={styles.monthRow}>
            <Pressable
              onPress={() => changeMonth(-1)}
              accessibilityRole="button"
              accessibilityLabel="Tháng trước"
              hitSlop={Spacing.two}
            >
              <Ionicons name="chevron-back-outline" size={22} color={Colors.icon} />
            </Pressable>
            <Text style={styles.monthTitle}>{formatMonthTitle(view.year, view.month)}</Text>
            <Pressable
              onPress={() => changeMonth(1)}
              disabled={isCurrent}
              accessibilityRole="button"
              accessibilityLabel="Tháng sau"
              hitSlop={Spacing.two}
              style={isCurrent && styles.dimmed}
            >
              <Ionicons name="chevron-forward-outline" size={22} color={Colors.icon} />
            </Pressable>
          </View>
          <Pressable
            onPress={() => router.push('/settings')}
            hitSlop={Spacing.two}
            accessibilityRole="button"
            accessibilityLabel="Cài đặt"
          >
            <Ionicons name="settings-outline" size={24} color={Colors.icon} />
          </Pressable>
        </View>

        {failed && <Text style={styles.error}>Không tải được báo cáo</Text>}

        <View style={styles.balanceBox}>
          <Text style={styles.totalLabel}>Còn lại (thu − chi)</Text>
          <Text style={styles.balanceValue}>{formatBalance(balance)}</Text>
        </View>
        <View style={styles.totals}>
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Thu</Text>
            <Text style={styles.totalValue}>{formatVND(report?.income ?? 0)}</Text>
          </View>
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Chi</Text>
            <Text style={styles.totalValue}>{formatVND(report?.expense ?? 0)}</Text>
          </View>
        </View>

        {report && (
          <>
            <CategoryBars title="Chi theo mục" items={report.expenseByCategory} emptyText="Chưa có khoản chi nào" />
            <CategoryBars title="Thu theo mục" items={report.incomeByCategory} emptyText="Chưa có khoản thu nào" />
          </>
        )}
        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  monthRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  monthTitle: { fontSize: 15, fontWeight: '600', color: Colors.text },
  dimmed: { opacity: 0.3 },
  error: { textAlign: 'center', paddingVertical: Spacing.two, fontSize: 14, color: Colors.danger },
  balanceBox: {
    marginHorizontal: Spacing.three,
    padding: Spacing.three,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
  },
  balanceValue: { fontSize: 24, fontWeight: '700', color: Colors.text, marginTop: Spacing.one },
  totals: { flexDirection: 'row', gap: Spacing.two, paddingHorizontal: Spacing.three, paddingTop: Spacing.two },
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
  bottomSpace: { height: Spacing.five },
});
