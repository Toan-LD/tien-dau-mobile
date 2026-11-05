import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';

export default function SettingsScreen() {
  const { session, signOut } = useAuth();
  const metadata = session?.user.user_metadata;
  const name: string | undefined = metadata?.full_name ?? metadata?.name;
  const email = session?.user.email;

  return (
    <View style={styles.container}>
      {name ? <Text style={styles.name}>{name}</Text> : null}
      {email ? <Text style={styles.email}>{email}</Text> : null}
      <Pressable style={styles.signOut} onPress={signOut} accessibilityRole="button">
        <Text style={styles.signOutText}>Đăng xuất</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.three },
  name: { color: Colors.text, fontSize: 18, fontWeight: '600' },
  email: { color: Colors.textSecondary, fontSize: 14, marginTop: Spacing.one },
  signOut: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginTop: Spacing.four,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  signOutText: { color: Colors.danger, fontSize: 16, fontWeight: '500' },
});
