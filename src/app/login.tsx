import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';

export default function LoginScreen() {
  const { signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);

  async function onPress() {
    setBusy(true);
    try {
      await signInWithGoogle();
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <Text style={styles.title}>Tiền Đâu</Text>
        <Pressable
          style={[styles.button, busy && styles.buttonBusy]}
          onPress={onPress}
          disabled={busy}
          accessibilityRole="button">
          {busy ? (
            <ActivityIndicator color={Colors.onPrimary} />
          ) : (
            <Text style={styles.buttonText}>Đăng nhập bằng Google</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.four },
  title: { color: Colors.text, fontSize: 32, fontWeight: '600', marginBottom: Spacing.five },
  button: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },
  buttonBusy: { opacity: 0.6 },
  buttonText: { color: Colors.onPrimary, fontSize: 16, fontWeight: '500' },
});
