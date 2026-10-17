/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0E1015',
    background: '#F5F7FA',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E4E7EF',
    textSecondary: '#5B6172',
    border: '#D8DCE6',
  },
  dark: {
    // AMOLED: fundo preto puro (pixel apagado), superfícies bem rebaixadas.
    text: '#F5F7FA',
    background: '#000000',
    backgroundElement: '#10141F',
    backgroundSelected: '#1B2133',
    textSecondary: '#8A91A6',
    border: '#232B40',
  },
} as const;

export const Brand = {
  magenta: '#D946EF',
  violet: '#6D28FF',
  blue: '#2F80FF',
  blueLight: '#2EC5FF',
  teal: '#3EDDD0',
} as const;

export const Status = {
  pago: '#22C55E',
  aVencer: '#FACC15',
  atrasada: '#EF4444',
  critico: '#FB923C',
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
