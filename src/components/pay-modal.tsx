import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CurrencyInput } from '@/components/currency-input';
import { QrCode } from '@/components/qr-code';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Spacing, Status } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatCentsBRL } from '@/lib/format';
import { buildPixPayload } from '@/lib/pix';
import { EMPTY_PIX_SETTINGS, fetchPixSettings, isPixConfigured, type PixSettings } from '@/lib/settings';
import type { Role } from '@/stores/auth';

const QUICK_ADD = [
  { label: '+R$10', centavos: 1000 },
  { label: '+R$20', centavos: 2000 },
  { label: '+R$50', centavos: 5000 },
] as const;

type Step = 'amount' | 'qr';

interface Feedback {
  color: string;
  icon: 'alert-circle' | 'alert-triangle' | 'arrow-up-circle' | 'check-circle';
  text: string;
}

interface Props {
  visible: boolean;
  role: Role;
  /** Valor devido (member) / total da fatura a cobrar (admin), em centavos. */
  baseCentavos: number;
  /** Mês da fatura já formatado (ex.: "out/2026"), só para texto. */
  monthLabel: string;
  onClose: () => void;
}

/**
 * Pix estático (BR Code): confirma o valor antes de mostrar o QR.
 * - member: "valor total" é somente leitura (a parte dele); ele escolhe quanto pagar.
 * - admin: pode editar o total cobrado e ajustar o valor do QR.
 * Nada é persistido: o QR é montado na hora (`buildPixPayload`) com a chave do admin.
 */
export function PayModal({ visible, role, baseCentavos, monthLabel, onClose }: Props) {
  const theme = useTheme();
  const isAdmin = role === 'admin';

  const [step, setStep] = useState<Step>('amount');
  const [totalCentavos, setTotalCentavos] = useState(baseCentavos);
  const [payCentavos, setPayCentavos] = useState(baseCentavos);
  const [settings, setSettings] = useState<PixSettings>({ ...EMPTY_PIX_SETTINGS });
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) return;
    setStep('amount');
    setTotalCentavos(baseCentavos);
    setPayCentavos(baseCentavos);
    setCopied(false);
    setLoadingSettings(true);
    let alive = true;
    fetchPixSettings()
      .then((s) => {
        if (alive) setSettings(s);
      })
      .catch(() => {
        if (alive) setSettings({ ...EMPTY_PIX_SETTINGS });
      })
      .finally(() => {
        if (alive) setLoadingSettings(false);
      });
    return () => {
      alive = false;
    };
  }, [visible, baseCentavos]);

  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    [],
  );

  const configured = !loadingSettings && isPixConfigured(settings);

  const payload = useMemo(() => {
    if (step !== 'qr' || !configured) return null;
    try {
      return buildPixPayload({
        chave: settings.chave,
        nome: settings.nome,
        cidade: settings.cidade,
        valorCentavos: payCentavos,
      });
    } catch {
      return null;
    }
  }, [step, configured, settings, payCentavos]);

  const diff = payCentavos - totalCentavos;

  const feedback = useMemo<Feedback>(() => {
    if (payCentavos <= 0) {
      return { color: Status.atrasada, icon: 'alert-circle', text: 'Informe um valor maior que zero' };
    }
    if (diff < 0) {
      return { color: Status.aVencer, icon: 'alert-triangle', text: `Faltam ${formatCentsBRL(-diff)}` };
    }
    if (diff > 0) {
      return { color: Brand.teal, icon: 'arrow-up-circle', text: `${formatCentsBRL(diff)} a mais` };
    }
    return { color: Status.pago, icon: 'check-circle', text: isAdmin ? 'Valor igual ao total' : 'Valor igual à sua parte' };
  }, [payCentavos, diff, isAdmin]);

  const onCopy = useCallback(async () => {
    if (!payload) return;
    try {
      await Clipboard.setStringAsync(payload);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      Alert.alert('Não foi possível copiar.');
    }
  }, [payload]);

  const onShare = useCallback(async () => {
    if (!payload) return;
    try {
      await Share.share({ message: payload, title: `Pix ${monthLabel}` });
    } catch {
      // cancelado pelo usuário
    }
  }, [payload, monthLabel]);

  const title = isAdmin ? 'Cobrar no Pix' : 'Pagar com Pix';
  const canGenerate = configured && payCentavos > 0;
  const refLabel = isAdmin ? 'o total' : 'sua parte';

  return (
    <Modal visible={visible} presentationStyle="formSheet" animationType="slide" onRequestClose={onClose}>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <ThemedText type="title">{title}</ThemedText>
              <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Fechar">
                <Feather name="x" size={24} color={theme.textSecondary} />
              </Pressable>
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              Fatura {monthLabel}
            </ThemedText>
          </View>

          {step === 'amount' ? (
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
              <View style={styles.group}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  {isAdmin ? 'VALOR TOTAL A COBRAR' : 'VALOR TOTAL'}
                </ThemedText>
                {isAdmin ? (
                  <CurrencyInput
                    centavos={totalCentavos}
                    onChangeCentavos={(v) => {
                      setTotalCentavos(v);
                      setPayCentavos(v);
                    }}
                  />
                ) : (
                  <View style={[styles.totalCard, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
                    <ThemedText type="display">{formatCentsBRL(totalCentavos)}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      Sua parte na fatura {monthLabel}
                    </ThemedText>
                  </View>
                )}
              </View>

              <View style={styles.group}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  QUANTO QUERO PAGAR
                </ThemedText>
                <CurrencyInput centavos={payCentavos} onChangeCentavos={setPayCentavos} />
                <View style={styles.quickRow}>
                  {QUICK_ADD.map((q) => (
                    <Pressable
                      key={q.label}
                      onPress={() => setPayCentavos((v) => v + q.centavos)}
                      style={[styles.quickBtn, { borderColor: Brand.blueLight }]}>
                      <ThemedText type="smallBold">{q.label}</ThemedText>
                    </Pressable>
                  ))}
                </View>
                <View style={styles.feedbackRow}>
                  <Feather name={feedback.icon} size={16} color={feedback.color} />
                  <ThemedText type="small" style={{ color: feedback.color }}>
                    {feedback.text}
                  </ThemedText>
                </View>
              </View>

              {!loadingSettings && !configured ? (
                <View style={[styles.notice, { borderColor: Status.aVencer }]}>
                  <Feather name="alert-triangle" size={18} color={Status.aVencer} />
                  <View style={styles.noticeText}>
                    <ThemedText type="smallBold">Pix ainda não configurado</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {isAdmin
                        ? 'Cadastre a chave em Conta › Pix.'
                        : 'Peça ao administrador para cadastrar a chave em Conta › Pix.'}
                    </ThemedText>
                  </View>
                </View>
              ) : null}

              <Pressable
                style={[
                  styles.primary,
                  {
                    backgroundColor: canGenerate ? Brand.violet : theme.backgroundSelected,
                    opacity: canGenerate ? 1 : 0.7,
                  },
                ]}
                disabled={!canGenerate}
                onPress={() => setStep('qr')}
                accessibilityLabel="Gerar QR Pix">
                <ThemedText type="smallBold" style={canGenerate ? undefined : { color: theme.textSecondary }}>
                  Gerar QR Pix
                </ThemedText>
              </Pressable>
            </ScrollView>
          ) : (
            <ScrollView contentContainerStyle={styles.content}>
              <View style={styles.group}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  VALOR ESCOLHIDO
                </ThemedText>
                <ThemedText type="display">{formatCentsBRL(payCentavos)}</ThemedText>
                {diff !== 0 ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {diff > 0
                      ? `${formatCentsBRL(diff)} a mais que ${refLabel}`
                      : `${formatCentsBRL(-diff)} a menos que ${refLabel}`}
                  </ThemedText>
                ) : null}
              </View>

              <View style={styles.qrWrap}>
                {payload ? (
                  <QrCode value={payload} size={220} />
                ) : (
                  <ThemedText type="small">Não foi possível gerar o QR.</ThemedText>
                )}
                <ThemedText type="small" themeColor="textSecondary" style={styles.qrName}>
                  {settings.nome} · {settings.cidade}
                </ThemedText>
              </View>

              <View style={styles.group}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  PIX COPIA E COLA
                </ThemedText>
                <View
                  style={[styles.payloadBox, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
                  <ThemedText type="code" selectable numberOfLines={4}>
                    {payload ?? '—'}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.ioRow}>
                <Pressable onPress={onCopy} style={[styles.ioBtn, { borderColor: Brand.violet }]} accessibilityLabel="Copiar código Pix">
                  <Feather name={copied ? 'check' : 'copy'} size={16} color={theme.text} />
                  <ThemedText type="smallBold">{copied ? 'Copiado!' : 'Copiar'}</ThemedText>
                </Pressable>
                <Pressable onPress={onShare} style={[styles.ioBtn, { borderColor: theme.border }]} accessibilityLabel="Compartilhar código Pix">
                  <Feather name="share-2" size={16} color={theme.text} />
                  <ThemedText type="smallBold">Compartilhar</ThemedText>
                </Pressable>
              </View>

              <Pressable onPress={() => setStep('amount')} style={styles.backLink} accessibilityLabel="Editar valor">
                <Feather name="chevron-left" size={18} color={theme.textSecondary} />
                <ThemedText type="small" themeColor="textSecondary">
                  Editar valor
                </ThemedText>
              </Pressable>
            </ScrollView>
          )}
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingTop: Spacing.two },
  header: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.two, gap: 2 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  content: { paddingHorizontal: Spacing.three, paddingTop: Spacing.two, paddingBottom: Spacing.five, gap: Spacing.three },
  group: { gap: 8 },
  totalCard: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 4 },
  quickRow: { flexDirection: 'row', gap: 8 },
  quickBtn: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  feedbackRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  notice: { flexDirection: 'row', gap: 10, borderWidth: 1, borderRadius: 12, padding: 12, alignItems: 'flex-start' },
  noticeText: { flex: 1, gap: 2 },
  primary: { borderRadius: 10, padding: Spacing.three, alignItems: 'center' },
  qrWrap: { alignItems: 'center', gap: 8 },
  qrName: { textAlign: 'center' },
  payloadBox: { borderWidth: 1, borderRadius: 10, padding: 10 },
  ioRow: { flexDirection: 'row', gap: 8 },
  ioBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'center' },
});
