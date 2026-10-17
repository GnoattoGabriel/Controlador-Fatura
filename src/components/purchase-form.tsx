import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createPurchase, listMembers, updatePurchase } from '@/lib/mutations';
import type { InvoiceItem } from '@/hooks/use-invoice';
import type { TipoCompra } from '@/lib/billing';
import { invoiceMonthForDate, parseBRLToCents } from '@/lib/billing';
import { formatInvoiceMonth } from '@/lib/format';

const TIPOS: Array<{ value: TipoCompra; label: string }> = [
  { value: 'vista', label: 'À vista' },
  { value: 'parcelada', label: 'Parcelada' },
  { value: 'fixa', label: 'Fixa mensal' },
];

function formatDay(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

interface Props {
  visible: boolean;
  editing: InvoiceItem | null;
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}

export function PurchaseForm({ visible, editing, userId, onClose, onSaved }: Props) {
  const [members, setMembers] = useState<Array<{ id: string; nome: string }>>([]);
  const [memberId, setMemberId] = useState(userId);
  const [loja, setLoja] = useState('');
  const [tipo, setTipo] = useState<TipoCompra>('vista');
  const [total, setTotal] = useState('');
  const [qtd, setQtd] = useState('1');
  const [purchaseDate, setPurchaseDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [ativa, setAtiva] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();

  const shiftDay = (delta: number) => {
    setPurchaseDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + delta);
      return next;
    });
  };

  useEffect(() => {
    if (!visible) return;
    setError(null);
    if (editing) {
      setLoja(editing.loja);
      setAtiva(true);
    } else {
      setMemberId(userId);
      setLoja('');
      setTipo('vista');
      setTotal('');
      setQtd('1');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setPurchaseDate(today);
      setAtiva(true);
    }
    listMembers().then(setMembers).catch(() => setMembers([]));
  }, [visible, editing, userId]);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      if (editing) {
        await updatePurchase('admin', editing.id, { loja, ativa });
      } else {
        const totalCentavos = parseBRLToCents(total);
        const qtdParcelas = tipo === 'parcelada' ? Number(qtd) : 1;
        await createPurchase('admin', {
          memberId,
          loja,
          tipo,
          totalCentavos,
          qtdParcelas,
          mesInicio: invoiceMonthForDate(purchaseDate),
        });
      }
      onSaved();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Falha ao salvar.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} presentationStyle="formSheet" animationType="slide" onRequestClose={onClose}>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safe}>
          <ThemedText type="title">{editing ? 'Editar compra' : 'Nova compra'}</ThemedText>

          {!editing ? (
            <View style={styles.group}>
              <ThemedText type="smallBold">Quem gastou</ThemedText>
              <View style={styles.options}>
                {members.map((m) => (
                  <Pressable
                    key={m.id}
                    onPress={() => setMemberId(m.id)}
                    style={[
                      styles.opt,
                      { borderColor: theme.border },
                      memberId === m.id ? { borderColor: Brand.violet, backgroundColor: theme.backgroundSelected } : null,
                    ]}>
                    <ThemedText type="small">{m.nome}</ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          <TextInput
            style={[styles.input, { borderColor: theme.border, color: theme.text }]}
            placeholder="Loja"
            placeholderTextColor={theme.textSecondary}
            value={loja}
            onChangeText={setLoja}
          />

          {!editing ? (
            <>
              <View style={styles.group}>
                <ThemedText type="smallBold">Tipo</ThemedText>
                <View style={styles.options}>
                  {TIPOS.map((t) => (
                    <Pressable
                      key={t.value}
                      onPress={() => setTipo(t.value)}
                      style={[
                        styles.opt,
                        { borderColor: theme.border },
                        tipo === t.value ? { borderColor: Brand.violet, backgroundColor: theme.backgroundSelected } : null,
                      ]}>
                      <ThemedText type="small">{t.label}</ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
              <TextInput
                style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                placeholder="Total (ex: 123,45)"
                placeholderTextColor={theme.textSecondary}
                keyboardType="decimal-pad"
                value={total}
                onChangeText={setTotal}
              />
              {tipo === 'parcelada' ? (
                <TextInput
                  style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                  placeholder="Parcelas (1–48)"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="number-pad"
                  value={qtd}
                  onChangeText={setQtd}
                />
              ) : null}
              <View style={styles.group}>
                <ThemedText type="smallBold">Data da compra</ThemedText>
                <View style={styles.dateRow}>
                  <Pressable onPress={() => shiftDay(-1)} style={[styles.opt, { borderColor: theme.border }]}>
                    <ThemedText type="smallBold">‹</ThemedText>
                  </Pressable>
                  <ThemedText type="default">{formatDay(purchaseDate)}</ThemedText>
                  <Pressable onPress={() => shiftDay(1)} style={[styles.opt, { borderColor: theme.border }]}>
                    <ThemedText type="smallBold">›</ThemedText>
                  </Pressable>
                </View>
                <ThemedText type="small">Cai na fatura {formatInvoiceMonth(invoiceMonthForDate(purchaseDate))}</ThemedText>
              </View>
            </>
          ) : (
            <Pressable onPress={() => setAtiva((a) => !a)} style={[styles.opt, { borderColor: theme.border }]}>
              <ThemedText type="small">{ativa ? 'Ativa (tocar p/ pausar)' : 'Pausada (tocar p/ retomar)'}</ThemedText>
            </Pressable>
          )}

          {error ? <ThemedText type="default">{error}</ThemedText> : null}

          <Pressable style={styles.primary} onPress={save} disabled={busy}>
            <ThemedText type="smallBold">Salvar</ThemedText>
          </Pressable>
          <Pressable onPress={onClose} disabled={busy}>
            <ThemedText type="small">Cancelar</ThemedText>
          </Pressable>
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: Spacing.three, gap: Spacing.two, paddingTop: Spacing.two },
  group: { gap: 6 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  opt: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  input: { borderWidth: 1, borderRadius: 10, padding: Spacing.two },
  primary: { backgroundColor: Brand.violet, borderRadius: 10, padding: Spacing.two, alignItems: 'center' },
});
