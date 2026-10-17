import { formatCentsBRL, formatInvoiceMonth } from '@/lib/format';
import { supabase } from '@/lib/supabase';

export interface CloseMember {
  memberId: string;
  nome: string;
  totalCentavos: number;
}

export interface CloseSummary {
  mes: string;
  totalCentavos: number;
  byMember: CloseMember[];
}

export async function closeBillingMonth(mes: string): Promise<CloseSummary> {
  const { data, error } = await supabase.rpc('close_billing', { p_mes: mes });
  if (error) throw new Error(error.message);
  return data as CloseSummary;
}

export interface PushMessage {
  to: string;
  title: string;
  body: string;
}

/** Push por membro com SÓ o valor dele (isolamento). Admin não recebe (foi ele que fechou). */
export function buildClosePushMessages(summary: CloseSummary, tokens: Map<string, string>): PushMessage[] {
  const out: PushMessage[] = [];
  for (const m of summary.byMember) {
    const to = tokens.get(m.memberId);
    if (!to) continue;
    out.push({
      to,
      title: `Fatura ${formatInvoiceMonth(summary.mes)} paga`,
      body: `Sua parte ${formatCentsBRL(m.totalCentavos)} quitada.`,
    });
  }
  return out;
}

export async function sendPushMessages(msgs: PushMessage[]): Promise<void> {
  if (msgs.length === 0) return;
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(msgs),
  });
}

export async function fetchMemberTokens(): Promise<Map<string, string>> {
  const { data, error } = await supabase.from('push_tokens').select('user_id,token');
  if (error) throw new Error(error.message);
  const map = new Map<string, string>();
  for (const r of (data ?? []) as Array<{ user_id: string; token: string }>) map.set(r.user_id, r.token);
  return map;
}
