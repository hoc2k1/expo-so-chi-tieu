import { Platform, useColorScheme } from 'react-native';

/**
 * Layer 1: Primitive Design Tokens — Nature UI Minimalist (Strawberry Garden)
 * Raw palette values — never reference directly in screens/components.
 */
export const Primitives = {
  cream: {
    50: '#FFFFFF',
    100: '#FAFAF2', // Core Nature UI cream background
    200: '#F3F6EC', // Soft meadow cream surface
    300: '#E5EEDB', // Gentle leaf-tinted surface
  },
  leaf: {
    100: '#EAF4DF',
    200: '#D4E7BE',
    300: '#A8CC83', // Core Nature UI light green border
    400: '#8AB963',
    500: '#6FA34B',
    600: '#588B3A',
    700: '#426B2B',
  },
  moss: {
    950: '#151A15', // Dark mode serene forest background
    900: '#1D241D', // Dark mode surface
    850: '#242E24', // Dark mode secondary surface
    800: '#2B372B', // Dark mode elevated
    700: '#2E3B2B', // Light mode primary text (deep earthy moss)
    500: '#5D6E59', // Light mode secondary text
    400: '#869682', // Muted text
    300: '#BAC7B5', // Dark mode secondary text
    100: '#F4F6EC', // Dark mode primary text (warm cream)
  },
  berry: {
    100: '#FFE9EC',
    400: '#F28B99',
    500: '#E46A7A',
    600: '#D45466',
  },
  honey: {
    100: '#FFF6DE',
    400: '#F5C469',
    600: '#C98924',
  },
  sky: {
    100: '#E8F4FA',
    400: '#87C1E5',
    600: '#4287B5',
  },
  white: '#FFFFFF',
  black: '#000000',
} as const;

/**
 * Layer 2: Semantic Theme Tokens (Nature UI Minimalist — Light & Dark)
 * Cream #FAFAF2 + Light Leaf Border #A8CC83 + Gentle Green Shadow.
 */
export const Colors = {
  light: {
    // Surfaces & Backgrounds
    background: Primitives.cream[100],
    surface: Primitives.cream[50],
    surfaceSecondary: Primitives.cream[200],
    surfaceElevated: Primitives.cream[50],
    backgroundElement: Primitives.cream[200],
    backgroundSelected: Primitives.cream[300],

    // Hero Card (Minimalist Garden Cream with Leaf Border)
    heroBackground: '#F4F9EC',
    heroSurface: 'rgba(168, 204, 131, 0.16)',
    heroText: Primitives.moss[700],
    heroTextMuted: Primitives.moss[500],
    heroBorder: Primitives.leaf[300],

    // Text (Earthy Moss — gentle & high contrast)
    text: Primitives.moss[700],
    textSecondary: Primitives.moss[500],
    textMuted: Primitives.moss[400],
    textInverse: Primitives.white,

    // Borders & Dividers
    border: '#DCE9CD',
    borderStrong: Primitives.leaf[300],
    divider: '#ECF3E3',

    // Brand / Primary (Fresh Garden Leaf)
    primary: Primitives.leaf[500],
    primarySoft: 'rgba(111, 163, 75, 0.12)',
    primaryBorder: 'rgba(168, 204, 131, 0.55)',
    onPrimary: Primitives.white,

    // Semantic Fintech Status
    income: Primitives.leaf[600],
    incomeSoft: 'rgba(88, 139, 58, 0.12)',
    incomeBorder: 'rgba(168, 204, 131, 0.45)',

    expense: Primitives.berry[600],
    expenseSoft: 'rgba(212, 84, 102, 0.11)',
    expenseBorder: 'rgba(212, 84, 102, 0.28)',

    warning: Primitives.honey[600],
    warningSoft: 'rgba(201, 137, 36, 0.12)',
    warningBorder: 'rgba(201, 137, 36, 0.28)',

    info: Primitives.sky[600],
    infoSoft: 'rgba(66, 135, 181, 0.11)',
    infoBorder: 'rgba(66, 135, 181, 0.26)',

    // Overlays & Controls
    scrim: 'rgba(30, 42, 28, 0.42)',
    tabBarBg: Primitives.cream[50],
    tabBarInactive: Primitives.moss[400],
    switchTrackOff: '#D7E2CC',
  },
  dark: {
    // Surfaces & Backgrounds (Crisp Deep Forest — high contrast & clear elevation)
    background: '#0E1210',
    surface: '#171E1A',
    surfaceSecondary: '#1F2924',
    surfaceElevated: '#27342D',
    backgroundElement: '#1F2924',
    backgroundSelected: '#243A2C',

    // Hero Card (Deep Emerald Garden)
    heroBackground: '#16241C',
    heroSurface: 'rgba(108, 208, 112, 0.14)',
    heroText: '#F3F7F4',
    heroTextMuted: '#A8B9AE',
    heroBorder: '#3A6648',

    // Text (Crisp Off-White & Balanced Cool-Moss Neutrals)
    text: '#F3F7F4',
    textSecondary: '#B2C2B7',
    textMuted: '#7E9285',
    textInverse: '#0C120E',

    // Borders & Dividers (Clearly Defined)
    border: '#2A3830',
    borderStrong: '#3E5948',
    divider: '#222E27',

    // Brand / Primary (Vibrant Fresh Leaf Green)
    primary: '#6CD070',
    primarySoft: 'rgba(108, 208, 112, 0.16)',
    primaryBorder: 'rgba(108, 208, 112, 0.45)',
    onPrimary: '#0B140D',

    // Semantic Fintech Status (Crisp, Vivid & Legible)
    income: '#4ADE80',
    incomeSoft: 'rgba(74, 222, 128, 0.16)',
    incomeBorder: 'rgba(74, 222, 128, 0.38)',

    expense: '#FB7185',
    expenseSoft: 'rgba(251, 113, 133, 0.16)',
    expenseBorder: 'rgba(251, 113, 133, 0.38)',

    warning: '#FBBF24',
    warningSoft: 'rgba(251, 191, 36, 0.16)',
    warningBorder: 'rgba(251, 191, 36, 0.38)',

    info: '#38BDF8',
    infoSoft: 'rgba(56, 189, 248, 0.16)',
    infoBorder: 'rgba(56, 189, 248, 0.38)',

    // Overlays & Controls
    scrim: 'rgba(4, 8, 6, 0.78)',
    tabBarBg: '#141A16',
    tabBarInactive: '#7E9285',
    switchTrackOff: '#2E3D34',
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
 * Nature UI Minimalist Radius Scale (24–30px for main cards & inputs)
 */
export const Radius = {
  sm: 12,
  md: 16,
  lg: 22,
  xl: 26,
  xxl: 30,
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
 * Soft Leaf-Green Tinted Shadows (Nature UI Minimalist)
 */
export const Shadows = {
  card: Platform.select({
    ios: {
      shadowColor: '#7DA862',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
    },
    android: {
      elevation: 2,
    },
    default: {},
  }),
  hero: Platform.select({
    ios: {
      shadowColor: '#7DA862',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.14,
      shadowRadius: 16,
    },
    android: {
      elevation: 3,
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
  const isDark = scheme === 'dark';
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
