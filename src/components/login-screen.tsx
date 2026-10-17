import { useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/stores/auth';

export function LoginScreen({ magicRedirectTo }: { magicRedirectTo: string }) {
  const signInEmail = useAuth((s) => s.signInEmail);
  const sendMagicLink = useAuth((s) => s.sendMagicLink);
  const authError = useAuth((s) => s.authError);
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  const onLogin = async () => {
    if (!email || !password) return;
    setBusy(true);
    try {
      await signInEmail(email.trim(), password);
    } finally {
      setBusy(false);
    }
  };

  const onMagic = async () => {
    if (!email) return;
    setBusy(true);
    try {
      const ok = await sendMagicLink(email.trim(), magicRedirectTo);
      setMagicSent(ok);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <ThemedText type="title">Fatura Familiar</ThemedText>
        <ThemedText type="default">Entre para ver sua parte da fatura.</ThemedText>

        <TextInput
          style={[styles.input, { borderColor: theme.border, color: theme.text }]}
          placeholder="Email"
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={[styles.input, { borderColor: theme.border, color: theme.text }]}
          placeholder="Senha (admin)"
          placeholderTextColor={theme.textSecondary}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {authError ? <ThemedText type="default">{authError}</ThemedText> : null}
        {magicSent ? <ThemedText type="default">Link enviado. Abra o email no celular.</ThemedText> : null}

        <Pressable style={styles.primary} onPress={onLogin} disabled={busy}>
          <ThemedText type="smallBold">Entrar</ThemedText>
        </Pressable>
        <Pressable style={styles.secondary} onPress={onMagic} disabled={busy}>
          <ThemedText type="smallBold">Receber link de acesso</ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: Spacing.three, gap: Spacing.two, justifyContent: 'center' },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: Spacing.two,
  },
  primary: { backgroundColor: Brand.violet, borderRadius: 10, padding: Spacing.two, alignItems: 'center' },
  secondary: { borderWidth: 1, borderColor: Brand.violet, borderRadius: 10, padding: Spacing.two, alignItems: 'center' },
});
