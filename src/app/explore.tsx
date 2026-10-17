import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ImportFlow } from '@/components/import-flow';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useInvoiceData } from '@/hooks/use-invoice';
import { summarizeInvoice } from '@/lib/billing';
import { exportExcel, exportPdf } from '@/lib/export';
import { formatInvoiceMonth } from '@/lib/format';
import { currentInvoiceMonth } from '@/lib/queries';
import { useAuth } from '@/stores/auth';

export default function AccountScreen() {
  const profile = useAuth((s) => s.profile);
  const signOut = useAuth((s) => s.signOut);
  const lock = useAuth((s) => s.lock);
  const theme = useTheme();
  const [importOpen, setImportOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const mes = useMemo(() => currentInvoiceMonth(), []);

  const { items, refresh } = useInvoiceData(mes, profile?.id ?? '', (profile?.role ?? 'admin') as 'admin', profile?.nome);
  const summary = useMemo(() => summarizeInvoice(items), [items]);
  const ownerNameOf = useCallback(
    (memberId: string) => summary.byMember.find((m) => m.memberId === memberId)?.nome ?? memberId.slice(0, 8),
    [summary],
  );

  if (!profile) return null;

  const onExportPdf = () => {
    setSharing(true);
    exportPdf(mes, items, summary.byMember, summary.totalCentavos)
      .catch((e: unknown) => Alert.alert('Falha ao exportar PDF.', e instanceof Error ? e.message : 'Tente de novo.'))
      .finally(() => setSharing(false));
  };

  const onExportExcel = () => {
    setSharing(true);
    exportExcel(mes, items, ownerNameOf, summary.totalCentavos)
      .catch((e: unknown) => Alert.alert('Falha ao exportar Excel.', e instanceof Error ? e.message : 'Tente de novo.'))
      .finally(() => setSharing(false));
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <ThemedText type="title">Conta</ThemedText>
        <ThemedText type="default">{profile.nome}</ThemedText>
        <ThemedText type="small">{profile.role === 'admin' ? 'Administrador' : 'Membro'}</ThemedText>

        <View style={styles.group}>
          <ThemedText type="smallBold">Fatura {formatInvoiceMonth(mes)}</ThemedText>
          <View style={styles.ioRow}>
            <Pressable onPress={onExportPdf} disabled={sharing} style={[styles.ioBtn, { borderColor: theme.border }]}>
              <ThemedText type="small">PDF</ThemedText>
            </Pressable>
            <Pressable onPress={onExportExcel} disabled={sharing} style={[styles.ioBtn, { borderColor: theme.border }]}>
              <ThemedText type="small">Excel</ThemedText>
            </Pressable>
            <Pressable onPress={() => setImportOpen(true)} style={[styles.ioBtn, { borderColor: theme.border }]}>
              <ThemedText type="small">Importar</ThemedText>
            </Pressable>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable onPress={lock}>
            <ThemedText type="small">Bloquear</ThemedText>
          </Pressable>
          <Pressable onPress={signOut}>
            <ThemedText type="small">Sair</ThemedText>
          </Pressable>
        </View>

        <ImportFlow visible={importOpen} onClose={() => setImportOpen(false)} onImported={() => refresh()} />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: Spacing.three, gap: Spacing.two, paddingTop: Spacing.two },
  group: { gap: 8, paddingTop: Spacing.two },
  ioRow: { flexDirection: 'row', gap: 8 },
  ioBtn: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 8, alignItems: 'center' },
  actions: { flexDirection: 'row', gap: Spacing.three, paddingTop: Spacing.two },
});
