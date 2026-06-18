export const colors = {
  primary: '#041E42',
  primarySoft: '#0A2B5E',
  secondary: '#706F6F',
  white: '#FFFFFF',
  background: '#FFFFFF',
  surface: '#F7F8FA',
  border: '#E5E7EB',
  text: '#041E42',
  textMuted: '#706F6F',
  danger: '#DC2626',
  success: '#16A34A',
  warning: '#D97706',
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
  sm: 6,
  md: 12,
  lg: 20,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 32, fontWeight: '700' as const, letterSpacing: -0.5 },
  h1: { fontSize: 24, fontWeight: '700' as const },
  h2: { fontSize: 20, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  bodyStrong: { fontSize: 16, fontWeight: '600' as const },
  caption: { fontSize: 13, fontWeight: '400' as const },
  overline: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 2 },
} as const;
