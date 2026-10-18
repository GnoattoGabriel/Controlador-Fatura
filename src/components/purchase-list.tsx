import { Feather } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PurchaseCard } from '@/components/purchase-card';
import { MemberDropdown } from '@/components/member-dropdown';
import { PayModal } from '@/components/pay-modal';
import { PurchaseForm } from '@/components/purchase-form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useInvoiceData, type InvoiceItem } from '@/hooks/use-invoice';
import { playExpand, useReduceMotion } from '@/lib/reduce-motion';
import type { MonthStatus } from '@/hooks/use-invoice';
import { addInvoiceMonths, summarizeInvoice } from '@/lib/billing';
import {
  buildClosePushMessages,
  closeBillingMonth,
  fetchMemberTokens,
  sendPushMessages,
} from '@/lib/closure';
import { deletePurchase, setInstallmentPaid } from '@/lib/mutations';
import { exportExcel, exportPdf } from '@/lib/export';
import { currentInvoiceMonth } from '@/lib/queries';
import { formatCentsBRL, formatInvoiceMonth } from '@/lib/format';
import type { Role } from '@/stores/auth';

type ChipItem = { key: string; kind: 'more-back' } | { key: string; kind: 'month'; mes: string } | { key: string; kind: 'more-fwd' };

function monthWindow(center: string, start: number, end: number): ChipItem[] {
  const out: ChipItem[] = [{ key: 'more-back', kind: 'more-back' }];
  for (let k = start; k <= end; k++) {
    const mes = addInvoiceMonths(center, k);
    out.push({ key: mes, kind: 'month', mes });
  }
  out.push({ key: 'more-fwd', kind: 'more-fwd' });
  return out;
}

interface Props {
  userId: string;
  role: Role;
  title: string;
  ownName?: string;
}

export function PurchaseList({ userId, role, title, ownName }: Props) {
  const editable = role === 'admin';
  const center = useMemo(() => currentInvoiceMonth(), []);
  const [startOffset, setStartOffset] = useState(-3);
  const [endOffset, setEndOffset] = useState(3);
  const chips = useMemo(() => monthWindow(center, startOffset, endOffset), [center, startOffset, endOffset]);
  const chipsRef = useRef<FlatList>(null);
  const centeredRef = useRef(false);

  const centerCurrent = useCallback(() => {
    const list = chipsRef.current;
    if (!list) return;
    const index = chips.findIndex((c) => c.kind === 'month' && c.mes === center);
    if (index < 0) return;
    try {
      list.scrollToIndex({ index, viewPosition: 0.5, animated: false });
    } catch {
      setTimeout(() => {
        try {
          list.scrollToIndex({ index, viewPosition: 0.5, animated: false });
        } catch {
          // mantém no início
        }
      }, 300);
    }
  }, [chips, center]);

  useEffect(() => {
    if (!centeredRef.current) {
      centeredRef.current = true;
      centerCurrent();
    }
  }, [centerCurrent]);
  const [mes, setMes] = useState(center);
  const { items, loading, error, refresh } = useInvoiceData(mes, userId, role, ownName);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<InvoiceItem | null>(null);
  const [memberFilter, setMemberFilter] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<MonthStatus | null>(null);
  const [closing, setClosing] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [payBase, setPayBase] = useState(0);
  const [sharing, setSharing] = useState(false);
  const reducedMotion = useReduceMotion();
  const theme = useTheme();

  const summary = useMemo(() => summarizeInvoice(items), [items]);
  // Base da cobrança do admin: total geral, ou o total do membro filtrado.
  const chargeBase = useMemo(() => {
    if (!memberFilter) return summary.totalCentavos;
    return summary.byMember.find((m) => m.memberId === memberFilter)?.totalCentavos ?? summary.totalCentavos;
  }, [memberFilter, summary]);
  const visibleItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (i) =>
        (!editable || !memberFilter || i.memberId === memberFilter) &&
        (!statusFilter || i.status === statusFilter) &&
        (!q || i.loja.toLowerCase().includes(q)),
    );
  }, [items, memberFilter, editable, query, statusFilter]);

  const onJumpToday = useCallback(() => {
    setStartOffset(-3);
    setEndOffset(3);
    setMes(center);
    setExpandedId(null);
    const fresh = monthWindow(center, -3, 3);
    const index = fresh.findIndex((c) => c.kind === 'month' && c.mes === center);
    requestAnimationFrame(() => {
      try {
        chipsRef.current?.scrollToIndex({ index, viewPosition: 0.5, animated: true });
      } catch {
        // mantém posição
      }
    });
  }, [center]);

  const onToggle = useCallback(
    (id: string) => {
      playExpand(reducedMotion);
      setExpandedId((prev) => (prev === id ? null : id));
    },
    [reducedMotion],
  );

  const onEdit = useCallback((item: InvoiceItem) => {
    setEditing(item);
    setFormOpen(true);
  }, []);

  const onDelete = useCallback(
    (id: string) => {
      Alert.alert('Excluir compra?', 'As parcelas junto vão sumir.', [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            deletePurchase(role, id)
              .then(() => refresh())
              .catch(() => Alert.alert('Falha ao excluir.'));
          },
        },
      ]);
    },
    [role, refresh],
  );

  const onTogglePaid = useCallback(
    (installmentId: string, pago: boolean) => {
      setInstallmentPaid(role, installmentId, pago)
        .then(() => refresh())
        .catch(() => Alert.alert('Falha ao marcar.'));
    },
    [role, refresh],
  );

  const onCloseMonth = useCallback(() => {
    setConfirmClose(true);
  }, []);

  const onExportPdf = useCallback(() => {
    setSharing(true);
    exportPdf(mes, items, summary.byMember, summary.totalCentavos)
      .catch((e: unknown) => Alert.alert('Falha ao exportar PDF.', e instanceof Error ? e.message : 'Tente de novo.'))
      .finally(() => setSharing(false));
  }, [mes, items, summary]);

  const ownerNameOf = useCallback(
    (memberId: string) =>
      summary.byMember.find((m) => m.memberId === memberId)?.nome ?? memberId.slice(0, 8),
    [summary],
  );

  const onExportXml = useCallback(() => {
    setSharing(true);
    exportExcel(mes, items, ownerNameOf, summary.totalCentavos)
      .catch((e: unknown) => Alert.alert('Falha ao exportar Excel.', e instanceof Error ? e.message : 'Tente de novo.'))
      .finally(() => setSharing(false));
  }, [mes, items, ownerNameOf, summary]);

  const doCloseMonth = useCallback(() => {
    setConfirmClose(false);
    setClosing(true);
    closeBillingMonth(mes)
      .then(async (summary) => {
        const tokens = await fetchMemberTokens().catch(() => new Map<string, string>());
        await sendPushMessages(buildClosePushMessages(summary, tokens)).catch(() => {});
        await refresh();
        Alert.alert(`Fatura ${formatInvoiceMonth(summary.mes)} paga`, `Total ${formatCentsBRL(summary.totalCentavos)} quitado.`);
      })
      .catch((e: unknown) => Alert.alert('Falha ao fechar.', e instanceof Error ? e.message : 'Tente de novo.'))
      .finally(() => setClosing(false));
  }, [mes, refresh]);

  const renderItem = useCallback(
    ({ item }: { item: InvoiceItem }) => (
      <PurchaseCard
        item={item}
        mes={mes}
        expanded={expandedId === item.id}
        editable={editable}
        onToggle={onToggle}
        onEdit={onEdit}
        onDelete={onDelete}
        onTogglePaid={onTogglePaid}
      />
    ),
    [mes, expandedId, editable, onToggle, onEdit, onDelete, onTogglePaid],
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <ThemedText type="title">{title}</ThemedText>
        <TextInput
          style={[styles.search, { borderColor: theme.border, color: theme.text }]}
          placeholder="Buscar loja"
          placeholderTextColor={theme.textSecondary}
          value={query}
          onChangeText={setQuery}
        />
        <View style={styles.statusRow}>
          {(
            [
              { value: null, label: 'Todas' },
              { value: 'paga', label: 'Pagas' },
              { value: 'a_vencer', label: 'A vencer' },
              { value: 'atrasada', label: 'Atrasadas' },
            ] as Array<{ value: MonthStatus | null; label: string }>
          ).map((s) => (
            <Pressable
              key={s.label}
              onPress={() => setStatusFilter(statusFilter === s.value ? null : s.value)}
              style={[
                styles.chip,
                { borderColor: theme.border },
                statusFilter === s.value ? { borderColor: Brand.violet, backgroundColor: theme.backgroundSelected } : null,
              ]}>
              <ThemedText type="small">{s.label}</ThemedText>
            </Pressable>
          ))}
        </View>
        <View style={styles.carouselRow}>
          <Pressable onPress={onJumpToday} style={[styles.chip, { borderColor: theme.border }]}>
            <View style={styles.dot} />
            <ThemedText type="smallBold">Hoje</ThemedText>
          </Pressable>
          <View style={styles.carouselList}>
          <FlatList
            horizontal
            ref={chipsRef}
            data={chips}
            keyExtractor={(c) => c.key}
            showsHorizontalScrollIndicator={false}
            onLayout={centerCurrent}
            contentContainerStyle={styles.chips}
            renderItem={({ item: c }) => {
              if (c.kind === 'more-back') {
                return (
                  <Pressable onPress={() => setStartOffset((s) => s - 3)} style={[styles.chip, { borderColor: theme.border }]}>
                    <ThemedText type="smallBold">«</ThemedText>
                  </Pressable>
                );
              }
              if (c.kind === 'more-fwd') {
                return (
                  <Pressable onPress={() => setEndOffset((e) => e + 3)} style={[styles.chip, { borderColor: theme.border }]}>
                    <ThemedText type="smallBold">»</ThemedText>
                  </Pressable>
                );
              }
              return (
                <Pressable
                  onPress={() => {
                    setMes(c.mes);
                    setExpandedId(null);
                  }}
                  style={[
                    styles.chip,
                    { borderColor: theme.border },
                    c.mes === mes ? { borderColor: Brand.violet, backgroundColor: theme.backgroundSelected } : null,
                  ]}>
                  {c.mes === center ? <View style={styles.dot} /> : null}
                  <ThemedText type="small">{formatInvoiceMonth(c.mes)}</ThemedText>
                </Pressable>
              );
            }}
          />
          </View>
        </View>
        {loading ? <ThemedText type="default">Carregando…</ThemedText> : null}
        {error ? <ThemedText type="default">{error}</ThemedText> : null}
        {!loading && !error ? (
          <>
            {editable ? (
              <View style={[styles.totalCard, { backgroundColor: theme.backgroundElement }]}>
                <View style={styles.totalRow}>
                  <ThemedText type="small">Total da fatura</ThemedText>
                  <ThemedText type="display">{formatCentsBRL(summary.totalCentavos)}</ThemedText>
                </View>
                <MemberDropdown members={summary.byMember} selected={memberFilter} onSelect={setMemberFilter} />
                <View style={styles.ioRow}>
                  <Pressable
                    onPress={() => {
                      setPayBase(chargeBase);
                      setPayOpen(true);
                    }}
                    style={[styles.ioBtn, { borderColor: Brand.violet }]}>
                    <ThemedText type="small">Cobrar no Pix</ThemedText>
                  </Pressable>
                </View>
              </View>
            ) : (
              <>
                <ThemedText type="small">Sua parte</ThemedText>
                <ThemedText type="display">{formatCentsBRL(summary.totalCentavos)}</ThemedText>
                <View style={styles.ioRow}>
                  <Pressable onPress={onExportPdf} disabled={sharing} style={[styles.ioBtn, { borderColor: theme.border }]}>
                    <ThemedText type="small">PDF</ThemedText>
                  </Pressable>
                  <Pressable onPress={onExportXml} disabled={sharing} style={[styles.ioBtn, { borderColor: theme.border }]}>
                    <ThemedText type="small">Excel</ThemedText>
                  </Pressable>
                </View>
              </>
            )}
            <FlatList
              data={visibleItems}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.list}
              onRefresh={refresh}
              refreshing={loading}
              ListEmptyComponent={<ThemedText type="default">Nada nesta fatura.</ThemedText>}
            />
          </>
        ) : null}
        {editable ? (
          <View style={styles.fabs}>
            <Pressable style={styles.fabClose} onPress={onCloseMonth} disabled={closing}>
              <Feather name="check" size={22} color="#F5F7FA" />
            </Pressable>
            <Pressable
              style={styles.fab}
              onPress={() => {
                setEditing(null);
                setFormOpen(true);
              }}>
              <ThemedText type="title">+</ThemedText>
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={styles.fabMember}
            onPress={() => {
              setPayBase(summary.totalCentavos);
              setPayOpen(true);
            }}>
            <Feather name="dollar-sign" size={24} color="#F5F7FA" />
          </Pressable>
        )}
        <PurchaseForm
          visible={formOpen}
          editing={editing}
          userId={userId}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onSaved={() => refresh()}
        />
        <PayModal
          visible={payOpen}
          role={role}
          baseCentavos={payBase}
          monthLabel={formatInvoiceMonth(mes)}
          onClose={() => setPayOpen(false)}
        />
        <Modal visible={confirmClose} transparent animationType="fade" onRequestClose={() => setConfirmClose(false)}>
          <Pressable style={styles.backdrop} onPress={() => setConfirmClose(false)}>
            <View style={[styles.confirmCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <ThemedText type="smallBold">Fechar {formatInvoiceMonth(mes)}?</ThemedText>
              <ThemedText type="display">Total {formatCentsBRL(summary.totalCentavos)}</ThemedText>
              <ThemedText type="small">Dá baixa nas parcelas do mês.</ThemedText>
              <View style={styles.confirmRow}>
                <Pressable
                  onPress={() => setConfirmClose(false)}
                  style={[styles.confirmBtn, { borderColor: theme.border }]}>
                  <ThemedText type="smallBold">CANCELAR</ThemedText>
                </Pressable>
                <Pressable onPress={doCloseMonth} disabled={closing} style={styles.confirmGo}>
                  <ThemedText type="smallBold">SIM</ThemedText>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: Spacing.three, gap: Spacing.two, paddingTop: Spacing.two },
  search: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  statusRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chips: { gap: 8, paddingVertical: 4 },
  carouselRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  carouselList: { flex: 1 },
  chip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Brand.violet },
  totalCard: { borderRadius: 12, padding: 14, gap: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  closeBtn: { borderWidth: 1, borderRadius: 10, padding: 10, alignItems: 'center' },
  ioRow: { flexDirection: 'row', gap: 8 },
  ioBtn: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 8, alignItems: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: Spacing.four },
  confirmCard: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 10 },
  confirmRow: { flexDirection: 'row', gap: 10, paddingTop: 4 },
  confirmBtn: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 12, alignItems: 'center' },
  confirmGo: { flex: 1, borderRadius: 10, padding: 12, alignItems: 'center', backgroundColor: Brand.teal },
  list: { gap: 10, paddingBottom: Spacing.four },
  fabs: {
    position: 'absolute',
    right: Spacing.three,
    bottom: Spacing.four,
    gap: 12,
    alignItems: 'center',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Brand.violet,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabClose: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Brand.teal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabMember: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: Spacing.four,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Brand.violet,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
