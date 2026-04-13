/**
 * TrimCity Design System — Theme & Tokens
 * Navigation: RED (#D32F2F) as primary brand color
 */

export const Colors = {
  // ── Navigation & Brand ──────────────────────────────────────────
  navigationRed: '#D32F2F',
  navigationRedLight: '#EF5350',
  navigationRedDark: '#B71C1C',
  navigationRedSurface: '#FFEBEE',

  // ── Semantic ─────────────────────────────────────────────────────
  primary: '#D32F2F',
  primaryLight: '#EF5350',
  primaryDark: '#B71C1C',
  primarySurface: '#FFEBEE',

  // ── Availability Status ──────────────────────────────────────────
  available: '#2E7D32',
  availableLight: '#4CAF50',
  availableSurface: '#E8F5E9',
  busy: '#E65100',
  busyLight: '#FF9800',
  busySurface: '#FFF3E0',
  full: '#C62828',
  fullLight: '#EF5350',
  fullSurface: '#FFEBEE',
  livePulse: '#43A047',

  // ── Neutrals ─────────────────────────────────────────────────────
  white: '#FFFFFF',
  background: '#F5F5F5',
  surfaceElevated: '#FFFFFF',
  surfaceMuted: '#FAFAFA',
  border: '#E0E0E0',
  borderLight: '#EEEEEE',
  divider: '#F0F0F0',

  // ── Text ─────────────────────────────────────────────────────────
  textPrimary: '#212121',
  textSecondary: '#616161',
  textTertiary: '#9E9E9E',
  textInverse: '#FFFFFF',
  textDisabled: '#BDBDBD',
  textLink: '#D32F2F',

  // ── Status ───────────────────────────────────────────────────────
  success: '#2E7D32',
  successLight: '#4CAF50',
  warning: '#E65100',
  warningLight: '#FF9800',
  error: '#C62828',
  errorLight: '#EF5350',
  info: '#1565C0',
  infoLight: '#42A5F5',

  // ── Rating ───────────────────────────────────────────────────────
  star: '#F9A825',

  // ── Overlay ──────────────────────────────────────────────────────
  overlay: 'rgba(0,0,0,0.5)',
  overlayLight: 'rgba(0,0,0,0.15)',
  shimmer: '#E0E0E0',
  shimmerHighlight: '#F5F5F5',

  // ── Map marker ───────────────────────────────────────────────────
  mapMarker: '#D32F2F',
  mapCircle: 'rgba(211,47,47,0.15)',
} as const;

export const Typography = {
  // Font sizes
  xs: 11,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
  '5xl': 40,

  // Font weights (as strings for RN StyleSheet)
  thin: '100' as const,
  light: '300' as const,
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
  black: '900' as const,

  // Line heights
  tight: 1.2,
  snug: 1.375,
  normal: 1.5,
  relaxed: 1.625,
  loose: 2,
} as const;

export const Spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
} as const;

export const Radius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
} as const;

export const Shadow = {
  none: {},
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 12,
  },
} as const;

export const NavigationTheme = {
  tabBar: {
    activeTintColor: Colors.navigationRed,
    inactiveTintColor: Colors.textTertiary,
    backgroundColor: Colors.white,
    borderTopColor: Colors.borderLight,
    borderTopWidth: 1,
  },
  header: {
    backgroundColor: Colors.navigationRed,
    titleColor: Colors.white,
    tintColor: Colors.white,
  },
} as const;

// Breakpoints for responsive design
export const Breakpoints = {
  sm: 375,
  md: 768,
  lg: 1024,
} as const;

export const ZIndex = {
  base: 0,
  card: 10,
  modal: 100,
  toast: 200,
  overlay: 50,
} as const;
