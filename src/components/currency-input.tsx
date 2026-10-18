import { useMemo } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { centsFromDigits, formatCentsInput } from '@/lib/billing';

interface Props {
  /** Valor em centavos (fonte da verdade). */
  centavos: number;
  onChangeCentavos: (centavos: number) => void;
  editable?: boolean;
  autoFocus?: boolean;
  /** Chamado ao confirmar (tecla "ok" do teclado). */
  onSubmit?: () => void;
}

/**
 * Campo de moeda com máscara centavos-primeiro: cada dígito digitado entra nos
 * centavos — `500` → R$ 5,00 (não R$ 500). Foco seleciona tudo, então digitar
 * por cima substitui o valor de uma vez.
 */
export function CurrencyInput({ centavos, onChangeCentavos, editable = true, autoFocus, onSubmit }: Props) {
  const theme = useTheme();
  const display = useMemo(() => formatCentsInput(centavos), [centavos]);

  return (
    <View
      style={[
        styles.box,
        {
          borderColor: editable ? Brand.violet : theme.border,
          backgroundColor: editable ? theme.backgroundSelected : theme.backgroundElement,
        },
      ]}>
      <ThemedText type="small" themeColor="textSecondary">
        R$
      </ThemedText>
      <TextInput
        style={[styles.input, { color: editable ? theme.text : theme.textSecondary }]}
        editable={editable}
        value={display}
        onChangeText={(t) => onChangeCentavos(centsFromDigits(t))}
        keyboardType="number-pad"
        inputMode="numeric"
        placeholder="0,00"
        placeholderTextColor={theme.textSecondary}
        autoFocus={autoFocus}
        selectTextOnFocus
        returnKeyType="done"
        onSubmitEditing={onSubmit}
        accessibilityLabel="Valor em reais"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  input: { flex: 1, paddingVertical: Spacing.two, fontSize: 18, fontWeight: '600', textAlign: 'right' },
});
