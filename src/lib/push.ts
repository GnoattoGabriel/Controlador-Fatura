import { hasNotifications, loadNotifications } from '@/lib/notify';
import { supabase } from '@/lib/supabase';

export async function registerPushToken(userId: string): Promise<void> {
  try {
    const N = await loadNotifications();
    if (!hasNotifications(N)) return;
    const { status } = await N.requestPermissionsAsync();
    if (status !== 'granted') return;
    const { data: token } = await N.getExpoPushTokenAsync();
    const { error } = await supabase
      .from('push_tokens')
      .upsert({ user_id: userId, token, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    if (error) throw new Error(error.message);
  } catch {
    // Sem suporte a notificações neste runtime: segue sem token.
  }
}

/** Lembrete dia 1 de cada mês ao meio-dia (Sprint 0): a fatura fecha dia 5. */
export async function scheduleMonthlyReminder(): Promise<void> {
  try {
    const N = await loadNotifications();
    if (!hasNotifications(N)) return;
    const scheduled = await N.getAllScheduledNotificationsAsync();
    if (scheduled.some((s) => s.identifier === 'fatura-reminder')) return;
    await N.scheduleNotificationAsync({
      identifier: 'fatura-reminder',
      content: { title: 'Fatura Familiar', body: 'A fatura fecha dia 5. Confira sua parte.' },
      trigger: { type: N.SchedulableTriggerInputTypes.CALENDAR, day: 1, hour: 12, minute: 0, repeats: true },
    });
  } catch {
    // Sem suporte: segue sem lembrete local.
  }
}
