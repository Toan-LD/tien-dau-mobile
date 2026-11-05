import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';

export default function RecordScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <Text style={{ color: Colors.text, fontSize: 20 }}>Ghi</Text>
    </SafeAreaView>
  );
}
