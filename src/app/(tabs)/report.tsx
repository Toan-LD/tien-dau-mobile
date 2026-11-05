import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';

export default function ReportScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <Text style={{ color: Colors.text, fontSize: 20 }}>Báo cáo</Text>
    </SafeAreaView>
  );
}
