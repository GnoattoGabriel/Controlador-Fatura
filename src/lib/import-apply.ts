import { supabase } from '@/lib/supabase';
import { createPurchase, listMembers, setInstallmentPaid } from '@/lib/mutations';
import type { ImportRow } from '@/lib/import';

export interface ApplyResult {
  imported: number;
  skippedDup: number;
  failed: Array<{ loja: string; error: string }>;
}

async function isDuplicate(memberId: string, row: ImportRow): Promise<boolean> {
  const { data, error } = await supabase
    .from('purchases')
    .select('id')
    .eq('member_id', memberId)
    .eq('loja', row.loja)
    .eq('valor_total_centavos', row.totalCentavos)
    .eq('mes_inicio', row.mesInicio)
    .limit(1);
  if (error) throw new Error(error.message);
  return (data ?? []).length > 0;
}

/** Aplica linhas validadas: resolve dono por nome, pula duplicadas, preserva pagos do XML. */
export async function applyImport(rows: ImportRow[]): Promise<ApplyResult> {
  const result: ApplyResult = { imported: 0, skippedDup: 0, failed: [] };
  const members = await listMembers();
  const byName = new Map(members.map((m) => [m.nome.trim().toLowerCase(), m.id]));

  for (const row of rows) {
    try {
      const memberId = byName.get(row.dono.trim().toLowerCase());
      if (!memberId) throw new Error(`Dono não cadastrado: ${row.dono}`);
      if (await isDuplicate(memberId, row)) {
        result.skippedDup += 1;
        continue;
      }
      const id = await createPurchase('admin', {
        memberId,
        loja: row.loja,
        tipo: row.tipo,
        totalCentavos: row.totalCentavos,
        qtdParcelas: row.qtdParcelas,
        mesInicio: row.mesInicio,
      });
      const flagged = row.parcelas.filter((p) => p.pago);
      if (flagged.length > 0) {
        const { data, error } = await supabase.from('installments').select('id,mes').eq('purchase_id', id);
        if (error) throw new Error(error.message);
        const byMes = new Map(((data ?? []) as Array<{ id: string; mes: string }>).map((r) => [r.mes, r.id]));
        for (const p of flagged) {
          const instId = byMes.get(p.mes);
          if (instId) await setInstallmentPaid('admin', instId, true);
        }
      }
      result.imported += 1;
    } catch (e: unknown) {
      result.failed.push({ loja: row.loja, error: e instanceof Error ? e.message : 'Falha.' });
    }
  }
  return result;
}
