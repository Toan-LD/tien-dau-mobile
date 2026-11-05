import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Spacing } from '@/constants/theme';

export default function ReportScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Báo cáo</Text>
        <Pressable
          onPress={() => router.push('/settings')}
          hitSlop={Spacing.two}
          accessibilityRole="button"
          accessibilityLabel="Cài đặt">
          <Ionicons name="settings-outline" size={24} color={Colors.icon} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.three },
  title: { color: Colors.text, fontSize: 20 },
});
