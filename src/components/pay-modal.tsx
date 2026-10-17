import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatCentsBRL } from '@/lib/format';
import { parseBRLToCents } from '@/lib/billing';

interface Props {
  visible: boolean;
  baseCentavos: number;
  title: string;
  onClose: () => void;
}

/** QR ilustrativo (Pix real na v2): valor base + acréscimo editável. */
export function PayModal({ visible, baseCentavos, title, onClose }: Props) {
  const theme = useTheme();
  const [extra, setExtra] = useState('0');

  useEffect(() => {
    if (visible) setExtra('0');
  }, [visible]);

  let extraCentavos = 0;
  try {
    extraCentavos = extra.trim() === '' || extra.trim() === '0' ? 0 : parseBRLToCents(extra);
  } catch {
    extraCentavos = NaN as unknown as number;
  }
  const total = Number.isNaN(extraCentavos) ? baseCentavos : baseCentavos + extraCentavos;

  return (
    <Modal visible={visible} presentationStyle="formSheet" animationType="slide" onRequestClose={onClose}>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safe}>
          <ThemedText type="title">{title}</ThemedText>
          <ThemedText type="default">Devido: {formatCentsBRL(baseCentavos)}</ThemedText>

          <View style={[styles.extraCard, { borderColor: Brand.violet }]}>
            <ThemedText type="smallBold">Acréscimo ao valor</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: theme.border, color: theme.text }]}
              placeholder="Ex: 10,00"
              placeholderTextColor={theme.textSecondary}
              keyboardType="decimal-pad"
              value={extra}
              onChangeText={setExtra}
            />
            <ThemedText type="small">Soma ao devido no total do QR.</ThemedText>
          </View>

          <ThemedText type="display">Total do QR: {Number.isNaN(extraCentavos) ? 'valor inválido' : formatCentsBRL(total)}</ThemedText>

          <View style={styles.qrBox}>
            <MaterialIcons name="qr-code" size={160} color="#0E1015" />
            <ThemedText type="small" style={styles.qrCaption}>
              QR ilustrativo — Pix de verdade na v2
            </ThemedText>
          </View>

          <View style={styles.bottom}>
            <Pressable onPress={onClose} style={[styles.closeBtn, { borderColor: Brand.violet }]}>
              <ThemedText type="smallBold">Fechar</ThemedText>
            </Pressable>
          </View>
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: Spacing.three, gap: Spacing.two, paddingTop: Spacing.two, alignItems: 'center' },
  group: { gap: 6, alignSelf: 'stretch' },
  extraCard: { gap: 8, alignSelf: 'stretch', borderWidth: 1, borderRadius: 12, padding: 14 },
  input: { borderWidth: 1, borderRadius: 10, padding: Spacing.two },
  qrBox: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 20, alignItems: 'center', gap: 8 },
  qrCaption: { color: '#5B6172' },
  bottom: { marginTop: 'auto', alignSelf: 'stretch', paddingBottom: Spacing.two },
  closeBtn: { borderWidth: 1, borderRadius: 10, padding: 14, alignItems: 'center' },
});
