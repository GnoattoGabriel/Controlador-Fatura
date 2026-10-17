import { invoiceMonthForDate } from '@/lib/billing';
import { supabase } from '@/lib/supabase';
import type { Role } from '@/stores/auth';

// Defesa no cliente (o servidor impõe via RLS): member sempre filtra pelo próprio id.
// Usa o mês da FATURA (YYYY-MM), já com o corte dia 5 aplicado na gravação.
export async function countMyPurchasesInMonth(params: {
  userId: string;
  role: Role;
  mes: string;
}): Promise<{ count: number; totalCentavos: number }> {
  let query = supabase.from('purchases').select('valor_total_centavos').eq('mes_inicio', params.mes);
  if (params.role !== 'admin') query = query.eq('member_id', params.userId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Array<{ valor_total_centavos: number }>;
  return {
    count: rows.length,
    totalCentavos: rows.reduce((sum, r) => sum + r.valor_total_centavos, 0),
  };
}

export function currentInvoiceMonth(now = new Date()): string {
  // Corte dia 5 (Sprint 0): fatura MM = dia 5/MM a 4/MM+1.
  return invoiceMonthForDate(now);
}
