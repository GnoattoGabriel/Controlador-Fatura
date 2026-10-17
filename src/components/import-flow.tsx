import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useEffect, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatCentsBRL } from '@/lib/format';
import { applyImport, type ApplyResult } from '@/lib/import-apply';
import { parseImportCsv, parseImportXml, type ImportParsed } from '@/lib/import';

interface Props {
  visible: boolean;
  onClose: () => void;
  onImported: () => void;
}

type Step = 'idle' | 'preview' | 'done';

export function ImportFlow({ visible, onClose, onImported }: Props) {
  const theme = useTheme();
  const [step, setStep] = useState<Step>('idle');
  const [parsed, setParsed] = useState<ImportParsed | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApplyResult | null>(null);

  useEffect(() => {
    if (visible) {
      setStep('idle');
      setParsed(null);
      setResult(null);
      setError(null);
    }
  }, [visible]);

  const pick = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['text/comma-separated-values', 'text/csv', 'text/xml', 'application/xml'],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const uri = res.assets[0].uri;
      const text = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
      const isXml = uri.toLowerCase().endsWith('.xml') || text.trimStart().startsWith('<');
      setParsed(isXml ? parseImportXml(text) : parseImportCsv(text));
      setStep('preview');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Falha ao ler arquivo.');
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!parsed) return;
    setBusy(true);
    try {
      const r = await applyImport(parsed.rows);
      setResult(r);
      setStep('done');
      onImported();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Falha ao importar.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} presentationStyle="formSheet" animationType="slide" onRequestClose={onClose}>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safe}>
          <ThemedText type="title">Importar</ThemedText>

          {step === 'idle' ? (
            <>
              <ThemedText type="small">CSV: loja;total;parcelas;inicio(AAAA-MM);dono — ou XML do export.</ThemedText>
              <Pressable style={styles.primary} onPress={pick} disabled={busy}>
                <ThemedText type="smallBold">Escolher arquivo</ThemedText>
              </Pressable>
            </>
          ) : null}

          {step === 'preview' && parsed ? (
            <>
              <ThemedText type="default">
                {parsed.rows.length} válidas · {parsed.issues.length} com erro
              </ThemedText>
              <FlatList
                data={parsed.rows}
                keyExtractor={(_, i) => `row-${i}`}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => (
                  <View style={[styles.row, { borderColor: theme.border }]}>
                    <ThemedText type="smallBold">{item.loja}</ThemedText>
                    <ThemedText type="small">
                      {item.dono} · {item.tipo} · {formatCentsBRL(item.totalCentavos)}
                    </ThemedText>
                  </View>
                )}
              />
              {parsed.issues.map((issue, i) => (
                <ThemedText key={`iss-${i}`} type="small">
                  {issue.ref}: {issue.error}
                </ThemedText>
              ))}
              <Pressable style={styles.primary} onPress={confirm} disabled={busy || parsed.rows.length === 0}>
                <ThemedText type="smallBold">Confirmar importação</ThemedText>
              </Pressable>
            </>
          ) : null}

          {step === 'done' && result ? (
            <ThemedText type="default">
              {result.imported} importadas · {result.skippedDup} duplicadas ignoradas · {result.failed.length} falhas
            </ThemedText>
          ) : null}

          {error ? <ThemedText type="default">{error}</ThemedText> : null}

          <Pressable onPress={onClose} disabled={busy}>
            <ThemedText type="small">{step === 'done' ? 'Concluir' : 'Cancelar'}</ThemedText>
          </Pressable>
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: Spacing.three, gap: Spacing.two, paddingTop: Spacing.two },
  primary: { backgroundColor: Brand.violet, borderRadius: 10, padding: Spacing.two, alignItems: 'center' },
  list: { gap: 8 },
  row: { borderWidth: 1, borderRadius: 8, padding: 8, gap: 2 },
});
