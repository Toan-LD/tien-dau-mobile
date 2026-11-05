import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/theme';
import { ioniconFor } from '@/lib/category-icons';

type Props = {
  iconKey: string | null | undefined;
  size?: number;
  color?: string;
};

export function CategoryIcon({ iconKey, size = 22, color = Colors.icon }: Props) {
  return <Ionicons name={ioniconFor(iconKey)} size={size} color={color} />;
}
