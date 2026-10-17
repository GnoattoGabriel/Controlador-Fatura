import { useCallback, useEffect, useRef, useState } from 'react';

import { currentInvoiceMonth } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import type { Role } from '@/stores/auth';

export type MonthStatus = 'paga' | 'a_vencer' | 'atrasada';

export interface TimelineEntry {
  id: string | null;
  mes: string;
  valorCentavos: number;
  pago: boolean;
}

export interface InvoiceItem {
  id: string;
  memberId: string;
  loja: string;
  tipo: 'vista' | 'parcelada' | 'fixa';
  foraCartao: boolean;
  qtdParcelas: number;
  valorTotalCentavos: number;
  valorParcelaCentavos: number;
  mesInicio: string;
  ownerName: string | null;
  installments: TimelineEntry[];
  paidCount: number;
  totalCount: number;
  monthValorCentavos: number;
  status: MonthStatus;
}

interface PurchaseRow {
  id: string;
  member_id: string;
  loja: string;
  tipo: 'vista' | 'parcelada' | 'fixa';
  valor_total_centavos: number;
  valor_parcela_centavos: number;
  mes_inicio: string;
  fora_cartao: boolean;
  ativa: boolean;
  qtd_parcelas: number;
}

interface InstallmentRow {
  id: string;
  purchase_id: string;
  mes: string;
  valor_centavos: number;
  pago: boolean;
}

const STATUS_ORDER: Record<MonthStatus, number> = { atrasada: 0, a_vencer: 1, paga: 2 };

// Vistas e parceladas nascem com as installment rows criadas (Sprint 6).
// Fixas materializam 1 row por mês ativo. Fallback abaixo cobre dados legados.
function monthEntryFor(p: PurchaseRow, rows: InstallmentRow[], mes: string): TimelineEntry | null {
  const found = rows.find((r) => r.mes === mes);
  if (found) return { id: found.id, mes: found.mes, valorCentavos: found.valor_centavos, pago: found.pago };
  if (p.tipo === 'vista' && p.mes_inicio === mes) {
    return { id: null, mes, valorCentavos: p.valor_total_centavos, pago: false };
  }
  if (p.tipo === 'fixa' && p.ativa && p.mes_inicio <= mes) {
    return { id: null, mes, valorCentavos: p.valor_total_centavos, pago: false };
  }
  return null;
}

export function useInvoiceData(mes: string, userId: string, role: Role, ownName?: string) {
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let pq = supabase
        .from('purchases')
        .select(
          'id,member_id,loja,tipo,valor_total_centavos,valor_parcela_centavos,mes_inicio,fora_cartao,ativa,qtd_parcelas',
        )
        .limit(1000);
      if (role !== 'admin') pq = pq.eq('member_id', userId);
      const { data: purchases, error: pErr } = await pq;
      if (pErr) throw new Error(pErr.message);
      const rows = (purchases ?? []) as PurchaseRow[];

      const ids = rows.map((r) => r.id);
      let inst: InstallmentRow[] = [];
      if (ids.length > 0) {
        const { data, error: iErr } = await supabase
          .from('installments')
          .select('id,purchase_id,mes,valor_centavos,pago')
          .in('purchase_id', ids);
        if (iErr) throw new Error(iErr.message);
        inst = (data ?? []) as InstallmentRow[];
      }

      const names = new Map<string, string>();
      if (role === 'admin') {
        const { data } = await supabase.from('profiles').select('id,nome');
        for (const p of (data ?? []) as Array<{ id: string; nome: string }>) names.set(p.id, p.nome);
      }

      const byPurchase = new Map<string, InstallmentRow[]>();
      for (const r of inst) {
        const list = byPurchase.get(r.purchase_id) ?? [];
        list.push(r);
        byPurchase.set(r.purchase_id, list);
      }

      const current = currentInvoiceMonth();
      const out: InvoiceItem[] = [];
      for (const p of rows) {
        // Defesa no cliente (servidor impõe via RLS): member nunca monta item de outro.
        if (role !== 'admin' && p.member_id !== userId) continue;
        const entries: TimelineEntry[] = (byPurchase.get(p.id) ?? [])
          .map((r) => ({ id: r.id, mes: r.mes, valorCentavos: r.valor_centavos, pago: r.pago }))
          .sort((a, b) => (a.mes < b.mes ? -1 : 1));
        const entry = monthEntryFor(p, (byPurchase.get(p.id) ?? []).slice(), mes);
        if (!entry) continue;
        const status: MonthStatus = entry.pago ? 'paga' : mes < current ? 'atrasada' : 'a_vencer';
        const paidCount = entries.filter((e) => e.pago).length;
        out.push({
          id: p.id,
          memberId: p.member_id,
          loja: p.loja,
          tipo: p.tipo,
          foraCartao: p.fora_cartao,
          qtdParcelas: p.qtd_parcelas,
          valorTotalCentavos: p.valor_total_centavos,
          valorParcelaCentavos: p.valor_parcela_centavos,
          mesInicio: p.mes_inicio,
          ownerName: role === 'admin' ? (names.get(p.member_id) ?? null) : (ownName ?? null),
          installments: entries.length > 0 ? entries : [entry],
          paidCount,
          totalCount: entries.length > 0 ? entries.length : p.tipo === 'parcelada' ? p.qtd_parcelas : 1,
          monthValorCentavos: entry.valorCentavos,
          status,
        });
      }
      out.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.loja.localeCompare(b.loja));
      setItems(out);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar.');
    } finally {
      setLoading(false);
    }
  }, [mes, userId, role]);

  useEffect(() => {
    void load();
  }, [load]);

  // Realtime: baixa paga/atualiza na hora, sem pull-to-refresh.
  // channel() reutiliza por tópico: se já inscrito (StrictMode/HMR), reaproveita.
  const loadRef = useRef(load);
  loadRef.current = load;
  useEffect(() => {
    const topic = `realtime:invoice-${userId}`;
    const existing = supabase.getChannels().find((c) => c.topic === topic);
    if (existing && (existing.state === 'joined' || existing.state === 'joining')) return;
    if (existing) {
      void supabase.removeChannel(existing).catch(() => {});
    }
    const channel = supabase
      .channel(`invoice-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchases' }, () => void loadRef.current())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'installments' }, () => void loadRef.current())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel).catch(() => {});
    };
  }, [userId]);

  return { items, loading, error, refresh: load };
}
