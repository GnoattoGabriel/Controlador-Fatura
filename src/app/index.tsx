import { StyleSheet, View } from 'react-native';

import { PurchaseList } from '@/components/purchase-list';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/stores/auth';

// Aba Home do admin: vê tudo — total, por pessoa, dono em cada card.
export default function HomeScreen() {
  const profile = useAuth((s) => s.profile);
  if (!profile) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText type="default">Carregando…</ThemedText>
      </ThemedView>
    );
  }

  return (
    <View style={styles.container}>
      <PurchaseList userId={profile.id} role={profile.role} title="Fatura da família" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
