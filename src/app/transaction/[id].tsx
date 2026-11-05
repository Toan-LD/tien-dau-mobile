import { StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/theme';

// Placeholder so the protected route exists; Task 9 replaces it.
export default function TransactionScreen() {
  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
});
