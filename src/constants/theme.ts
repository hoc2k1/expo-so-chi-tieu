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
    // Surfaces & Backgrounds (Serene Night Garden — gentle on the eyes)
    background: Primitives.moss[950],
    surface: Primitives.moss[900],
    surfaceSecondary: Primitives.moss[850],
    surfaceElevated: Primitives.moss[800],
    backgroundElement: Primitives.moss[850],
    backgroundSelected: '#314031',

    // Hero Card (Night Meadow)
    heroBackground: '#202B20',
    heroSurface: 'rgba(168, 204, 131, 0.12)',
    heroText: Primitives.moss[100],
    heroTextMuted: Primitives.moss[300],
    heroBorder: 'rgba(168, 204, 131, 0.36)',

    // Text (Warm Cream)
    text: Primitives.moss[100],
    textSecondary: Primitives.moss[300],
    textMuted: Primitives.moss[400],
    textInverse: Primitives.moss[950],

    // Borders & Dividers
    border: 'rgba(168, 204, 131, 0.18)',
    borderStrong: 'rgba(168, 204, 131, 0.42)',
    divider: 'rgba(168, 204, 131, 0.10)',

    // Brand / Primary (Soft Sprout Green)
    primary: Primitives.leaf[300],
    primarySoft: 'rgba(168, 204, 131, 0.16)',
    primaryBorder: 'rgba(168, 204, 131, 0.38)',
    onPrimary: Primitives.moss[950],

    // Semantic Fintech Status
    income: '#8FD07C',
    incomeSoft: 'rgba(143, 208, 124, 0.15)',
    incomeBorder: 'rgba(143, 208, 124, 0.32)',

    expense: Primitives.berry[400],
    expenseSoft: 'rgba(242, 139, 153, 0.15)',
    expenseBorder: 'rgba(242, 139, 153, 0.30)',

    warning: Primitives.honey[400],
    warningSoft: 'rgba(245, 196, 105, 0.15)',
    warningBorder: 'rgba(245, 196, 105, 0.32)',

    info: Primitives.sky[400],
    infoSoft: 'rgba(135, 193, 229, 0.14)',
    infoBorder: 'rgba(135, 193, 229, 0.28)',

    // Overlays & Controls
    scrim: 'rgba(10, 14, 10, 0.76)',
    tabBarBg: Primitives.moss[900],
    tabBarInactive: Primitives.moss[400],
    switchTrackOff: '#364436',
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
