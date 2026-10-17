import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

import { formatCentsBRL, formatInvoiceMonth } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/stores/auth';

interface LatestClosure {
  mes: string;
  ownCentavos: number | null;
  totalCentavos: number | null;
}

async function latestClosureFor(profile: Profile): Promise<LatestClosure | null> {
  if (profile.role === 'admin') {
    const { data, error } = await supabase
      .from('closures')
      .select('mes,total_centavos')
      .order('pago_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    const row = data as unknown as { mes: string; total_centavos: number };
    return { mes: row.mes, ownCentavos: null, totalCentavos: row.total_centavos };
  }
  const { data, error } = await supabase
    .from('closure_items')
    .select('valor_centavos,closures!inner(mes,pago_at)')
    .eq('member_id', profile.id)
    .order('pago_at', { referencedTable: 'closures', ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as unknown as { valor_centavos: number; closures: { mes: string } };
  return { mes: row.closures.mes, ownCentavos: row.valor_centavos, totalCentavos: null };
}

/** Popup 1x no próximo open após fechar (member: só a parte dele). */
export async function showClosurePopupOnce(profile: Profile): Promise<void> {
  const latest = await latestClosureFor(profile).catch(() => null);
  if (!latest) return;
  const key = `seen-closure:${profile.id}`;
  if ((await AsyncStorage.getItem(key)) === latest.mes) return;
  if (profile.role === 'admin') {
    Alert.alert(`Fatura ${formatInvoiceMonth(latest.mes)} paga`, `Total ${formatCentsBRL(latest.totalCentavos ?? 0)} quitado.`);
  } else {
    Alert.alert(
      `Fatura ${formatInvoiceMonth(latest.mes)} paga`,
      `Sua parte ${formatCentsBRL(latest.ownCentavos ?? 0)} quitada.`,
    );
  }
  await AsyncStorage.setItem(key, latest.mes);
}
