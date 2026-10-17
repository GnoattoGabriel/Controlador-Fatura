import { addInvoiceMonths, splitInstallments, type TipoCompra } from '@/lib/billing';
import { supabase } from '@/lib/supabase';
import type { Role } from '@/stores/auth';

// Escrita é SÓ admin. O servidor impõe via RLS; aqui vai a defesa no cliente.
function requireAdmin(role: Role): void {
  if (role !== 'admin') throw new Error('Somente admin pode alterar.');
}

export interface NewPurchase {
  memberId: string;
  loja: string;
  tipo: TipoCompra;
  totalCentavos: number;
  qtdParcelas: number;
  mesInicio: string;
}

/** Cria compra + materializa as installment rows (vista: 1 row; parcelada: n rows; fixa: row do mês inicial). */
export async function createPurchase(role: Role, input: NewPurchase): Promise<string> {
  requireAdmin(role);
  const loja = input.loja.trim();
  if (!loja) throw new Error('Loja obrigatória.');
  if (!input.memberId) throw new Error('Dono obrigatório.');
  const foraCartao = input.tipo === 'fixa';
  const qtd = input.tipo === 'parcelada' ? input.qtdParcelas : 1;
  const parts = splitInstallments(input.totalCentavos, qtd);

  const { data, error } = await supabase
    .from('purchases')
    .insert({
      member_id: input.memberId,
      loja,
      tipo: input.tipo,
      valor_total_centavos: input.totalCentavos,
      qtd_parcelas: qtd,
      valor_parcela_centavos: parts[0],
      mes_inicio: input.mesInicio,
      fora_cartao: foraCartao,
      ativa: true,
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);

  const rows = parts.map((valor, i) => ({
    purchase_id: (data as { id: string }).id,
    mes: addInvoiceMonths(input.mesInicio, i),
    valor_centavos: valor,
    pago: false,
  }));
  // Fixa materializa só o mês inicial; próximos meses o fechamento gera (Sprint 7).
  const toInsert = input.tipo === 'fixa' ? rows.slice(0, 1) : rows;
  const { error: iErr } = await supabase.from('installments').insert(toInsert);
  if (iErr) throw new Error(iErr.message);
  return (data as { id: string }).id;
}

export interface EditPurchase {
  loja: string;
  ativa: boolean;
}

/** Edição limitada (Sprint 6): loja, categoria, pausar/retomar. Total/parcelas não mudam. */
export async function updatePurchase(role: Role, id: string, input: EditPurchase): Promise<void> {
  requireAdmin(role);
  if (!input.loja.trim()) throw new Error('Loja obrigatória.');
  const { error } = await supabase
    .from('purchases')
    .update({ loja: input.loja.trim(), ativa: input.ativa })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deletePurchase(role: Role, id: string): Promise<void> {
  requireAdmin(role);
  const { error } = await supabase.from('purchases').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/** Baixa avulsa por parcela (pago híbrido, Sprint 0). */
export async function setInstallmentPaid(role: Role, installmentId: string, pago: boolean): Promise<void> {
  requireAdmin(role);
  const { error } = await supabase
    .from('installments')
    .update({ pago, pago_at: pago ? new Date().toISOString() : null })
    .eq('id', installmentId);
  if (error) throw new Error(error.message);
}

export async function listMembers(): Promise<Array<{ id: string; nome: string }>> {
  const { data, error } = await supabase.from('profiles').select('id,nome').order('nome');
  if (error) throw new Error(error.message);
  return (data ?? []) as Array<{ id: string; nome: string }>;
}
