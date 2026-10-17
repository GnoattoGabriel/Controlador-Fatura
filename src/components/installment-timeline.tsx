import { Feather } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatCentsBRL, formatInvoiceMonth } from '@/lib/format';
import type { TimelineEntry } from '@/hooks/use-invoice';

interface RowProps extends TimelineEntry {
  highlight: boolean;
  editable: boolean;
  onTogglePaid: (id: string, pago: boolean) => void;
}

function TimelineRow({ id, mes, valorCentavos, pago, highlight, editable, onTogglePaid }: RowProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.row,
        { borderColor: highlight ? Brand.violet : 'transparent', backgroundColor: highlight ? theme.backgroundSelected : 'transparent' },
      ]}>
      <ThemedText type="small" style={styles.colMes}>
        {formatInvoiceMonth(mes)}
      </ThemedText>
      <ThemedText type="small" style={styles.colValor}>
        {formatCentsBRL(valorCentavos)}
      </ThemedText>
      <View style={styles.colPago}>
        <Feather
          name={pago ? 'check' : 'minus'}
          size={16}
          color={pago ? '#22C55E' : '#8A91A6'}
        />
      </View>
      <View style={styles.colCheck}>
        {editable && id ? (
          <Pressable onPress={() => onTogglePaid(id, !pago)} hitSlop={8}>
            <Feather name={pago ? 'check-square' : 'square'} size={16} color={pago ? '#22C55E' : '#8A91A6'} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const MemoRow = memo(TimelineRow);

interface Props {
  entries: TimelineEntry[];
  mes: string;
  editable: boolean;
  onTogglePaid: (id: string, pago: boolean) => void;
}

export const InstallmentTimeline = memo(function InstallmentTimeline({ entries, mes, editable, onTogglePaid }: Props) {
  return (
    <View style={styles.container}>
      {entries.map((e) => (
        <MemoRow
          key={e.id ?? e.mes}
          id={e.id}
          mes={e.mes}
          valorCentavos={e.valorCentavos}
          pago={e.pago}
          highlight={e.mes === mes}
          editable={editable}
          onTogglePaid={onTogglePaid}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: 6, paddingTop: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  colMes: { flex: 1 },
  colValor: { minWidth: 104, textAlign: 'right' },
  colPago: { minWidth: 82, alignItems: 'flex-end' },
  colCheck: { width: 24, alignItems: 'center' },
});
