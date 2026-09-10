export const colors = {
  primary: '#041E42',
  primarySoft: '#0A2B5E',
  primaryTint: '#F0F4FA',
  secondary: '#706F6F',
  white: '#FFFFFF',
  background: '#FAFAFB',
  surface: '#F4F5F7',
  surfaceAlt: '#FFFFFF',
  border: '#E5E7EB',
  borderSoft: '#EFF1F4',
  text: '#0F172A',
  textMuted: '#64748B',
  textSubtle: '#94A3B8',
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
  success: '#0F9E5A',
  successSoft: '#DCFCE7',
  warning: '#D97706',
  warningSoft: '#FED7AA',
  accent: '#7C5CFF',
} as const;

export const brand = {
  name: 'Aural',
  tagline: 'Conéctate a tu vida',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 22,
  pill: 999,
} as const;

export const shadow = {
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 6,
  },
} as const;

/** Gotham, la tipografía de marca. Los nombres coinciden con las claves
 *  que registra useFonts en App.tsx. */
export const fonts = {
  regular: 'Gotham-Book',
  medium: 'Gotham-Medium',
  semibold: 'Gotham-Medium',
  bold: 'Gotham-Bold',
  extraBold: 'Gotham-Black',
  light: 'Gotham-Light',
} as const;

export const typography = {
  display: { fontSize: 30, fontFamily: fonts.extraBold, fontWeight: '800' as const, letterSpacing: -0.5, lineHeight: 36 },
  h1: { fontSize: 24, fontFamily: fonts.bold, fontWeight: '700' as const, letterSpacing: -0.3, lineHeight: 30 },
  h2: { fontSize: 19, fontFamily: fonts.bold, fontWeight: '700' as const, letterSpacing: -0.2, lineHeight: 25 },
  h3: { fontSize: 16, fontFamily: fonts.semibold, fontWeight: '600' as const, letterSpacing: -0.1, lineHeight: 22 },
  body: { fontSize: 15, fontFamily: fonts.regular, fontWeight: '400' as const, lineHeight: 22 },
  bodyStrong: { fontSize: 15, fontFamily: fonts.semibold, fontWeight: '600' as const, lineHeight: 22 },
  caption: { fontSize: 12, fontFamily: fonts.medium, fontWeight: '500' as const, lineHeight: 16 },
  overline: { fontSize: 11, fontFamily: fonts.bold, fontWeight: '700' as const, letterSpacing: 1.6, lineHeight: 14 },
} as const;
