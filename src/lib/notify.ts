import { NativeModules } from 'react-native';
import type * as Notifications from 'expo-notifications';

let cached: typeof Notifications | null | undefined;

// Sonda o nativo ANTES de avaliar o pacote: no Expo Go antigo o módulo
// ExpoTopicSubscriptionModule não existe e só importar já derruba o Metro.
function runtimeSupported(): boolean {
  try {
    return (NativeModules as Record<string, unknown>).ExpoTopicSubscriptionModule != null;
  } catch {
    return false;
  }
}

export async function loadNotifications(): Promise<typeof Notifications | null> {
  if (cached !== undefined) return cached;
  if (!runtimeSupported()) {
    cached = null;
    return cached;
  }
  try {
    const mod = await import('expo-notifications');
    cached = typeof mod?.setNotificationHandler === 'function' ? mod : null;
  } catch {
    cached = null;
  }
  return cached;
}

export function hasNotifications(
  N: typeof Notifications | null,
): N is typeof Notifications & {
  requestPermissionsAsync: (...args: never[]) => Promise<{ status: string }>;
  getExpoPushTokenAsync: (...args: never[]) => Promise<{ data: string }>;
  getAllScheduledNotificationsAsync: () => Promise<Array<{ identifier: string }>>;
  scheduleNotificationAsync: (...args: never[]) => Promise<string>;
} {
  return (
    !!N &&
    typeof N.requestPermissionsAsync === 'function' &&
    typeof N.getExpoPushTokenAsync === 'function' &&
    typeof N.getAllScheduledNotificationsAsync === 'function' &&
    typeof N.scheduleNotificationAsync === 'function'
  );
}
