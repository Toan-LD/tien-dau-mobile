import { StyleSheet, Text, View } from 'react-native';

import { CategoryIcon } from '@/components/category-icon';
import { Colors, Spacing } from '@/constants/theme';
import { formatCompactVND } from '@/lib/money';
import type { CategoryTotal } from '@/lib/report';

type Props = { title: string; items: CategoryTotal[]; emptyText: string };

export function CategoryBars({ title, items, emptyText }: Props) {
  const max = items.length > 0 ? items[0].total : 0;

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      {items.length === 0 ? (
        <Text style={styles.empty}>{emptyText}</Text>
      ) : (
        items.map((item) => {
          const width = `${max > 0 ? (item.total / max) * 100 : 0}%` as const;
          return (
            <View key={item.categoryId ?? 'none'} style={styles.row}>
              <CategoryIcon iconKey={item.icon} size={20} />
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={styles.track}>
                <View style={[styles.bar, { width }]} />
              </View>
              <Text style={styles.amount} numberOfLines={1}>
                {formatCompactVND(item.total)}
              </Text>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: Spacing.three, paddingTop: Spacing.three },
  title: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.two },
  empty: { fontSize: 14, color: Colors.textMuted, paddingVertical: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: 6 },
  name: { width: 96, fontSize: 14, color: Colors.text },
  track: { flex: 1 },
  bar: {
    height: 14,
    minWidth: 2,
    backgroundColor: Colors.icon,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  amount: { width: 56, textAlign: 'right', fontSize: 13, color: Colors.text },
});
