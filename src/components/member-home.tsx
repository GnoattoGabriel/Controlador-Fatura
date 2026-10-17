import { Pressable, StyleSheet, View } from 'react-native';

import { PurchaseList } from '@/components/purchase-list';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/stores/auth';

// Home do member: SOMENTE o próprio (RLS no servidor + filtro no cliente).
// Sem total geral, sem dados de outros.
export function MemberHome() {
  const profile = useAuth((s) => s.profile);
  const signOut = useAuth((s) => s.signOut);
  const lock = useAuth((s) => s.lock);
  if (!profile) return null;

  return (
    <ThemedView style={styles.container}>
      <View style={styles.list}>
        <PurchaseList userId={profile.id} role={profile.role} title={`Olá, ${profile.nome}`} ownName={profile.nome} />
      </View>
      <View style={styles.footer}>
        <Pressable onPress={lock}>
          <ThemedText type="small">Bloquear</ThemedText>
        </Pressable>
        <Pressable onPress={signOut}>
          <ThemedText type="small">Sair</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { flex: 1 },
  footer: { flexDirection: 'row', gap: Spacing.three, padding: Spacing.three },
});
