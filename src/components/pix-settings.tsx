import { Feather } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { QrCode } from '@/components/qr-code';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Spacing, Status } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { buildPixPayload } from '@/lib/pix';
import {
  EMPTY_PIX_SETTINGS,
  fetchPixSettings,
  isPixConfigured,
  savePixSettings,
  type PixSettings as PixSettingsData,
} from '@/lib/settings';
import { useAuth } from '@/stores/auth';

const MAX_NOME = 25;
const MAX_CIDADE = 15;

interface Props {
  visible: boolean;
  onClose: () => void;
}

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  maxLength: number;
  hint?: string;
  counter?: boolean;
}

function Field({ label, value, onChangeText, placeholder, maxLength, hint, counter }: FieldProps) {
  const theme = useTheme();
  return (
    <View style={styles.group}>
      <View style={styles.labelRow}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          {label}
        </ThemedText>
        {counter ? (
          <ThemedText type="small" themeColor="textSecondary">
            {value.length}/{maxLength}
          </ThemedText>
        ) : null}
      </View>
      <TextInput
        style={[styles.input, { borderColor: theme.border, color: theme.text }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        maxLength={maxLength}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {hint ? (
        <ThemedText type="small" themeColor="textSecondary">
          {hint}
        </ThemedText>
      ) : null}
    </View>
  );
}

/** Config da chave Pix de recebimento (admin). Fica em Conta › Pix. */
export function PixSettingsModal({ visible, onClose }: Props) {
  const theme = useTheme();
  const profile = useAuth((s) => s.profile);
  const [form, setForm] = useState<PixSettingsData>({ ...EMPTY_PIX_SETTINGS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    setSaved(false);
    setLoading(true);
    let alive = true;
    fetchPixSettings()
      .then((s) => {
        if (alive) setForm(s);
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : 'Falha ao carregar.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [visible]);

  const set = (patch: Partial<PixSettingsData>) => {
    setForm((f) => ({ ...f, ...patch }));
    setSaved(false);
  };

  // Prévia do QR (sem valor: o pagador digita quanto quer pagar).
  const preview = useMemo(() => {
    if (!isPixConfigured(form)) return null;
    try {
      return buildPixPayload({ chave: form.chave, nome: form.nome, cidade: form.cidade });
    } catch {
      return null;
    }
  }, [form]);

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await savePixSettings(profile.role, form);
      setSaved(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Falha ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const missing = form.chave.trim() === '' || form.nome.trim() === '' || form.cidade.trim() === '';

  return (
    <Modal visible={visible} presentationStyle="formSheet" animationType="slide" onRequestClose={onClose}>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.headerRow}>
            <ThemedText type="title">Pix</ThemedText>
            <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Fechar">
              <Feather name="x" size={24} color={theme.textSecondary} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <ThemedText type="small" themeColor="textSecondary">
              Chave única da família. O QR é montado no aparelho de quem paga, com o valor escolhido.
            </ThemedText>

            <Field
              label="CHAVE PIX"
              value={form.chave}
              onChangeText={(v) => set({ chave: v })}
              placeholder="CPF, e-mail, telefone ou aleatória"
              maxLength={77}
              hint="A chave cadastrada no seu banco."
            />
            <Field
              label="NOME DO RECEBEDOR"
              value={form.nome}
              onChangeText={(v) => set({ nome: v })}
              placeholder="Como aparece no banco"
              maxLength={MAX_NOME}
              counter
            />
            <Field
              label="CIDADE"
              value={form.cidade}
              onChangeText={(v) => set({ cidade: v })}
              placeholder="Ex.: Caxias do Sul"
              maxLength={MAX_CIDADE}
              counter
            />

            {preview ? (
              <View style={styles.previewWrap}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  PRÉVIA DO QR
                </ThemedText>
                <QrCode value={preview} size={160} />
                <ThemedText type="small" themeColor="textSecondary">
                  {form.nome} · {form.cidade}
                </ThemedText>
              </View>
            ) : null}

            {error ? (
              <View style={[styles.notice, { borderColor: Status.atrasada }]}>
                <Feather name="alert-circle" size={18} color={Status.atrasada} />
                <ThemedText type="small" style={styles.noticeText}>
                  {error}
                </ThemedText>
              </View>
            ) : null}

            {saved && !error ? (
              <View style={[styles.notice, { borderColor: Status.pago }]}>
                <Feather name="check-circle" size={18} color={Status.pago} />
                <ThemedText type="small" style={styles.noticeText}>
                  Chave salva.
                </ThemedText>
              </View>
            ) : null}

            <Pressable
              style={[styles.primary, { backgroundColor: saving ? theme.backgroundSelected : Brand.violet }]}
              onPress={save}
              disabled={saving}
              accessibilityLabel="Salvar chave Pix">
              <ThemedText type="smallBold" style={{ color: saving ? theme.textSecondary : '#F5F7FA' }}>
                {saving ? 'Salvando…' : 'Salvar'}
              </ThemedText>
            </Pressable>

            {missing ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.hintCenter}>
                Preencha chave, nome e cidade para habilitar o QR.
              </ThemedText>
            ) : null}

            {loading ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.hintCenter}>
                Carregando…
              </ThemedText>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingTop: Spacing.two },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  content: { paddingHorizontal: Spacing.three, paddingTop: Spacing.two, paddingBottom: Spacing.five, gap: Spacing.three },
  group: { gap: 6 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  input: { borderWidth: 1, borderRadius: 10, padding: Spacing.two },
  previewWrap: { alignItems: 'center', gap: 8 },
  notice: { flexDirection: 'row', gap: 10, borderWidth: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  noticeText: { flex: 1 },
  primary: { borderRadius: 10, padding: Spacing.three, alignItems: 'center' },
  hintCenter: { textAlign: 'center' },
});
