import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { LockScreen } from '@/components/lock-screen';
import { LoginScreen } from '@/components/login-screen';
import { MemberHome } from '@/components/member-home';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { showClosurePopupOnce } from '@/lib/closure-popup';
import { loadNotifications } from '@/lib/notify';
import { registerPushToken, scheduleMonthlyReminder } from '@/lib/push';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/stores/auth';

SplashScreen.preventAutoHideAsync();

function setupNotificationHandler(): void {
  void loadNotifications().then((N) => {
    if (!N || typeof N.setNotificationHandler !== 'function') return;
    N.setNotificationHandler({
      handleNotification: () =>
        Promise.resolve({ shouldPlaySound: false, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }),
    });
  });
}

async function exchangeCodeFromUrl(url: string | null) {
  if (!url) return;
  const parsed = Linking.parse(url);
  const code = parsed.queryParams?.code;
  if (typeof code === 'string' && code.length > 0) {
    await supabase.auth.exchangeCodeForSession(code);
  }
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const status = useAuth((s) => s.status);
  const profile = useAuth((s) => s.profile);
  const init = useAuth((s) => s.init);
  const postLoginRef = useRef<string | null>(null);

  useEffect(() => {
    setupNotificationHandler();
    let unsubAuth = () => {};
    let unsubLink: { remove: () => void } | undefined;
    (async () => {
      unsubAuth = await init();
      await exchangeCodeFromUrl(await Linking.getInitialURL());
      unsubLink = Linking.addEventListener('url', ({ url }) => {
        void exchangeCodeFromUrl(url);
      });
      await SplashScreen.hideAsync();
    })();
    return () => {
      unsubAuth();
      unsubLink?.remove();
    };
  }, [init]);

  useEffect(() => {
    if (status !== 'ready' || !profile || postLoginRef.current === profile.id) return;
    postLoginRef.current = profile.id;
    registerPushToken(profile.id).catch(() => {});
    scheduleMonthlyReminder().catch(() => {});
    void showClosurePopupOnce(profile);
  }, [status, profile]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      {status === 'loading' ? (
        <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ThemedText type="default">Carregando…</ThemedText>
        </ThemedView>
      ) : status === 'signed-out' ? (
        <LoginScreen magicRedirectTo={Linking.createURL('/')} />
      ) : status === 'locked' ? (
        <LockScreen />
      ) : profile?.role === 'member' ? (
        <MemberHome />
      ) : (
        <AppTabs />
      )}
    </ThemeProvider>
  );
}
