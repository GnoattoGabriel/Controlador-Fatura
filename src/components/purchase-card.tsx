import { Feather } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { InstallmentTimeline } from '@/components/installment-timeline';
import { ThemedText } from '@/components/themed-text';
import { Brand, Status } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatCentsBRL, formatInvoiceMonth } from '@/lib/format';
import type { InvoiceItem, MonthStatus } from '@/hooks/use-invoice';

const STATUS_COLOR: Record<MonthStatus, string> = {
  paga: Status.pago,
  a_vencer: Status.aVencer,
  atrasada: Status.atrasada,
};

const STATUS_LABEL: Record<MonthStatus, string> = {
  paga: 'paga',
  a_vencer: 'a vencer',
  atrasada: 'atrasada',
};

function StatusIcon({ status }: { status: MonthStatus }) {
  const color = STATUS_COLOR[status];
  if (status === 'paga') return <Feather name="check-circle" size={16} color={color} />;
  if (status === 'atrasada') return <Feather name="alert-circle" size={16} color={color} />;
  return <Feather name="clock" size={16} color={color} />;
}

interface Props {
  item: InvoiceItem;
  mes: string;
  expanded: boolean;
  editable: boolean;
  onToggle: (id: string) => void;
  onEdit: (item: InvoiceItem) => void;
  onDelete: (id: string) => void;
  onTogglePaid: (installmentId: string, pago: boolean) => void;
}

export const PurchaseCard = memo(function PurchaseCard({
  item,
  mes,
  expanded,
  editable,
  onToggle,
  onEdit,
  onDelete,
  onTogglePaid,
}: Props) {
  const theme = useTheme();
  const progress = item.totalCount > 0 ? item.paidCount / item.totalCount : 0;
  const paidSum = item.installments.reduce((sum, e) => sum + (e.pago ? e.valorCentavos : 0), 0);
  const remaining = item.tipo === 'fixa' ? null : item.valorTotalCentavos - paidSum;

  return (
    <Pressable onPress={() => onToggle(item.id)} style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <View style={[styles.edge, { backgroundColor: STATUS_COLOR[item.status] }]} />
      <View style={styles.topRow}>
        <Feather name="shopping-bag" size={18} color={Brand.blueLight} />
        <View style={styles.titleWrap}>
          <ThemedText type="smallBold">{item.loja}</ThemedText>
          <ThemedText type="small">{formatInvoiceMonth(item.mesInicio)}</ThemedText>
        </View>
        <StatusIcon status={item.status} />
      </View>

      <View style={styles.valuesRow}>
        <ThemedText type="default">{formatCentsBRL(item.valorTotalCentavos)}</ThemedText>
        <ThemedText type="small">
          {item.tipo === 'vista'
            ? 'à vista'
            : `${formatCentsBRL(item.monthValorCentavos)} · ${item.paidCount}/${item.totalCount} pagas`}
        </ThemedText>
      </View>
      {remaining !== null ? (
        <ThemedText type="small">{remaining === 0 ? 'Quitado' : `Faltam ${formatCentsBRL(remaining)}`}</ThemedText>
      ) : null}

      <View style={[styles.progressTrack, { backgroundColor: theme.backgroundSelected }]}>
        <View style={[styles.progressFill, { flex: progress }]} />
        <View style={{ flex: 1 - progress }} />
      </View>

      <View style={styles.badgeRow}>
        <ThemedText type="small">
          {item.tipo === 'parcelada' ? 'parcelada' : item.tipo === 'fixa' ? 'fixa mensal' : 'à vista'}
        </ThemedText>
        {item.foraCartao ? <ThemedText type="small">fora cartão</ThemedText> : null}
        <ThemedText type="small">{STATUS_LABEL[item.status]}</ThemedText>
      </View>

      {item.ownerName ? (
        <View style={styles.ownerRow}>
          <Feather name="user" size={14} color={theme.textSecondary} />
          <ThemedText type="small">{item.ownerName}</ThemedText>
        </View>
      ) : null}

      {item.tipo === 'fixa' ? (
        <View style={styles.ownerRow}>
          <Feather name="repeat" size={14} color={Brand.teal} />
          <ThemedText type="small">repete todo mês até pausar</ThemedText>
        </View>
      ) : null}

      {expanded ? (
        <>
          <InstallmentTimeline entries={item.installments} mes={mes} editable={editable} onTogglePaid={onTogglePaid} />
          {editable ? (
            <View style={styles.adminRow}>
              <Pressable onPress={() => onEdit(item)}>
                <ThemedText type="small">Editar</ThemedText>
              </Pressable>
              <Pressable onPress={() => onDelete(item.id)}>
                <ThemedText type="small">Excluir</ThemedText>
              </Pressable>
            </View>
          ) : null}
        </>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: { borderRadius: 12, padding: 14, gap: 8, paddingLeft: 20 },
  edge: { position: 'absolute', left: 6, top: 12, bottom: 12, width: 3, borderRadius: 2 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  titleWrap: { flex: 1, gap: 2 },
  valuesRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  progressTrack: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { backgroundColor: Brand.teal, borderRadius: 3 },
  badgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  ownerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  adminRow: { flexDirection: 'row', gap: 16, paddingTop: 4 },
});
