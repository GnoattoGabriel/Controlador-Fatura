import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const PIN_KEY = 'fatura-familiar-pin';

export async function hasPin(): Promise<boolean> {
  return (await SecureStore.getItemAsync(PIN_KEY)) !== null;
}

export async function setPin(pin: string): Promise<void> {
  await SecureStore.setItemAsync(PIN_KEY, pin, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK });
}

export async function checkPin(pin: string): Promise<boolean> {
  return (await SecureStore.getItemAsync(PIN_KEY)) === pin;
}

export async function biometricAvailable(): Promise<boolean> {
  const [hardware, enrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);
  return hardware && enrolled;
}

export async function authenticateBiometric(): Promise<boolean> {
  const res = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Desbloquear Fatura Familiar',
    cancelLabel: 'Usar PIN',
    disableDeviceFallback: true,
  });
  return res.success;
}
