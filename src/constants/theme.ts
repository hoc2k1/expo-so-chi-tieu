import { Platform, useColorScheme } from 'react-native';

/**
 * Layer 1: Primitive Design Tokens
 * Raw palette values — never reference directly in screens/components.
 */
export const Primitives = {
  slate: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    950: '#020617',
  },
  indigo: {
    50: '#EEF2FF',
    100: '#E0E7FF',
    400: '#818CF8',
    500: '#6366F1',
    600: '#4F46E5',
    700: '#4338CA',
    900: '#1E1B4B',
  },
  emerald: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    400: '#34D399',
    500: '#10B981',
    600: '#059669',
    950: '#022C22',
  },
  rose: {
    50: '#FFF1F2',
    100: '#FFE4E6',
    400: '#FB7185',
    500: '#F43F5E',
    600: '#E11D48',
    950: '#4C0519',
  },
  amber: {
    50: '#FFFBEB',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    950: '#451A03',
  },
  sky: {
    400: '#38BDF8',
    500: '#0EA5E9',
    600: '#0284C7',
  },
  oled: {
    bg: '#090D16',
    surface: '#111827',
    surfaceSecondary: '#1A2234',
    surfaceElevated: '#1E293B',
    heroBg: '#131C31',
  },
  white: '#FFFFFF',
  black: '#000000',
} as const;

/**
 * Layer 2: Semantic Theme Tokens (Light & OLED-friendly Dark Mode)
 * Designed for Personal Finance / Fintech clarity and >=4.5:1 contrast.
 */
export const Colors = {
  light: {
    // Surfaces & Backgrounds
    background: Primitives.slate[50],
    surface: Primitives.white,
    surfaceSecondary: Primitives.slate[100],
    surfaceElevated: Primitives.white,
    backgroundElement: Primitives.slate[100],
    backgroundSelected: Primitives.slate[200],

    // Hero Card (Trust Navy / Deep Slate)
    heroBackground: Primitives.slate[800],
    heroSurface: 'rgba(255, 255, 255, 0.08)',
    heroText: Primitives.slate[50],
    heroTextMuted: Primitives.slate[300],
    heroBorder: 'rgba(255, 255, 255, 0.14)',

    // Text
    text: Primitives.slate[900],
    textSecondary: Primitives.slate[600],
    textMuted: Primitives.slate[500],
    textInverse: Primitives.white,

    // Borders & Dividers
    border: Primitives.slate[200],
    borderStrong: Primitives.slate[300],
    divider: Primitives.slate[100],

    // Brand / Primary
    primary: Primitives.indigo[600],
    primarySoft: 'rgba(79, 70, 229, 0.10)',
    primaryBorder: 'rgba(79, 70, 229, 0.24)',
    onPrimary: Primitives.white,

    // Semantic Fintech Status
    income: Primitives.emerald[600],
    incomeSoft: 'rgba(5, 150, 105, 0.10)',
    incomeBorder: 'rgba(5, 150, 105, 0.24)',

    expense: Primitives.rose[600],
    expenseSoft: 'rgba(225, 29, 72, 0.10)',
    expenseBorder: 'rgba(225, 29, 72, 0.24)',

    warning: Primitives.amber[600],
    warningSoft: 'rgba(217, 119, 6, 0.12)',
    warningBorder: 'rgba(217, 119, 6, 0.28)',

    info: Primitives.sky[600],
    infoSoft: 'rgba(2, 132, 199, 0.10)',
    infoBorder: 'rgba(2, 132, 199, 0.24)',

    // Overlays & Controls
    scrim: 'rgba(15, 23, 42, 0.55)',
    tabBarBg: Primitives.white,
    tabBarInactive: Primitives.slate[500],
    switchTrackOff: Primitives.slate[300],
  },
  dark: {
    // Surfaces & Backgrounds (OLED-friendly Deep Slate)
    background: Primitives.oled.bg,
    surface: Primitives.oled.surface,
    surfaceSecondary: Primitives.oled.surfaceSecondary,
    surfaceElevated: Primitives.oled.surfaceElevated,
    backgroundElement: Primitives.oled.surfaceSecondary,
    backgroundSelected: Primitives.slate[700],

    // Hero Card
    heroBackground: Primitives.oled.heroBg,
    heroSurface: 'rgba(255, 255, 255, 0.06)',
    heroText: Primitives.slate[50],
    heroTextMuted: Primitives.slate[400],
    heroBorder: 'rgba(148, 163, 184, 0.18)',

    // Text
    text: Primitives.slate[50],
    textSecondary: Primitives.slate[400],
    textMuted: Primitives.slate[500],
    textInverse: Primitives.slate[900],

    // Borders & Dividers (subtle)
    border: 'rgba(148, 163, 184, 0.14)',
    borderStrong: 'rgba(148, 163, 184, 0.26)',
    divider: 'rgba(148, 163, 184, 0.10)',

    // Brand / Primary
    primary: Primitives.indigo[500],
    primarySoft: 'rgba(99, 102, 241, 0.16)',
    primaryBorder: 'rgba(99, 102, 241, 0.32)',
    onPrimary: Primitives.white,

    // Semantic Fintech Status
    income: Primitives.emerald[500],
    incomeSoft: 'rgba(16, 185, 129, 0.15)',
    incomeBorder: 'rgba(16, 185, 129, 0.30)',

    expense: Primitives.rose[500],
    expenseSoft: 'rgba(244, 63, 94, 0.15)',
    expenseBorder: 'rgba(244, 63, 94, 0.30)',

    warning: Primitives.amber[500],
    warningSoft: 'rgba(245, 158, 11, 0.15)',
    warningBorder: 'rgba(245, 158, 11, 0.32)',

    info: Primitives.sky[400],
    infoSoft: 'rgba(56, 189, 248, 0.14)',
    infoBorder: 'rgba(56, 189, 248, 0.28)',

    // Overlays & Controls
    scrim: 'rgba(2, 6, 23, 0.78)',
    tabBarBg: Primitives.oled.bg,
    tabBarInactive: Primitives.slate[500],
    switchTrackOff: Primitives.slate[700],
  },
} as const;

export type ThemeColors = (typeof Colors)['light'] | (typeof Colors)['dark'];
export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
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

/**
 * 8-pt Grid Spacing Scale
 */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  // Legacy aliases
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/**
 * Border Radius Scale (Cards: 16px - 20px)
 */
export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 9999,
} as const;

/**
 * Typography Hierarchy with Tabular Numerals for Financial Figures
 */
export const Typography = {
  heroAmount: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'] as ('tabular-nums')[],
  },
  display: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800' as const,
    letterSpacing: -0.3,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700' as const,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as const,
  },
  bodyMedium: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600' as const,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500' as const,
  },
  overline: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700' as const,
    letterSpacing: 0.6,
  },
  amountLg: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800' as const,
    fontVariant: ['tabular-nums'] as ('tabular-nums')[],
  },
  amountMd: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700' as const,
    fontVariant: ['tabular-nums'] as ('tabular-nums')[],
  },
} as const;

/**
 * Minimum Touch Target & HitSlop Standards (44x44pt)
 */
export const TouchTarget = {
  minSize: 44,
  hitSlop: { top: 8, bottom: 8, left: 8, right: 8 },
} as const;

/**
 * Elevation / Shadow Presets
 */
export const Shadows = {
  card: Platform.select({
    ios: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
    },
    android: {
      elevation: 2,
    },
    default: {},
  }),
  hero: Platform.select({
    ios: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.18,
      shadowRadius: 16,
    },
    android: {
      elevation: 6,
    },
    default: {},
  }),
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

/**
 * Hook to access current theme tokens based on system Light/Dark preference.
 */
export function useTheme() {
  const scheme = useColorScheme();
  const isDark = scheme !== 'light';
  const colors = isDark ? Colors.dark : Colors.light;
  return {
    colorScheme: isDark ? ('dark' as const) : ('light' as const),
    isDark,
    colors,
    spacing: Spacing,
    radius: Radius,
    typography: Typography,
    touchTarget: TouchTarget,
    shadows: Shadows,
  };
}
