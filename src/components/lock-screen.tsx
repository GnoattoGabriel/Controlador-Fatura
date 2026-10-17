import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { authenticateBiometric, biometricAvailable, checkPin, hasPin, setPin } from '@/lib/lock';
import { useAuth } from '@/stores/auth';

export function LockScreen() {
  const unlock = useAuth((s) => s.unlock);
  const signOut = useAuth((s) => s.signOut);
  const theme = useTheme();
  const [mode, setMode] = useState<'check' | 'setup' | 'pin'>('check');
  const [pin, setPinValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!(await hasPin())) {
        setMode('setup');
        return;
      }
      if (await biometricAvailable()) {
        if (await authenticateBiometric()) unlock();
      }
      setMode('pin');
    })();
  }, [unlock]);

  const submit = async () => {
    setError(null);
    if (pin.length < 4) {
      setError('PIN com 4 dígitos.');
      return;
    }
    if (mode === 'setup') {
      await setPin(pin);
      unlock();
      return;
    }
    if (await checkPin(pin)) unlock();
    else setError('PIN incorreto.');
  };

  if (mode === 'check') {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="default">Desbloqueando…</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <ThemedText type="title">{mode === 'setup' ? 'Crie seu PIN' : 'Digite seu PIN'}</ThemedText>
        <TextInput
          style={[styles.input, { borderColor: theme.border, color: theme.text }]}
          placeholder="PIN de 4 dígitos"
          placeholderTextColor={theme.textSecondary}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={6}
          value={pin}
          onChangeText={setPinValue}
        />
        {error ? <ThemedText type="default">{error}</ThemedText> : null}
        <Pressable style={styles.primary} onPress={submit}>
          <ThemedText type="smallBold">Desbloquear</ThemedText>
        </Pressable>
        <Pressable onPress={signOut}>
          <ThemedText type="small">Trocar de conta</ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center' },
  safe: { paddingHorizontal: Spacing.three, gap: Spacing.two },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: Spacing.two,
  },
  primary: { backgroundColor: Brand.teal, borderRadius: 10, padding: Spacing.two, alignItems: 'center' },
});
