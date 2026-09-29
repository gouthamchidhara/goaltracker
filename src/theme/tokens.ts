/**
 * Design tokens — single source of truth.
 * §14 from build spec. Dark theme primary, light theme secondary.
 * Extend to 12 goal accents; each needs on-accent text color and lighter "as text" variant.
 */

export const color = {
  bg:        '#0E0F13',
  surface:   '#17191F',
  surface2:  '#1F222A',
  track:     '#262933',
  border:    '#3A3E4A',
  text:      '#F2F1EE',
  textSoft:  '#C9CBD2',
  textMuted: '#9A9DA8',
  slip:      '#E4E2DC',
  missed:    '#5A5E6B',

  // --- goal accents (12) ---
  amber:     '#F5A524',  // quit / recovery
  violet:    '#8B7CFF',  // education
  teal:      '#2EC4A5',  // reading / success
  blue:      '#5B9DFF',  // fitness
  calm:      '#8CC4FF',  // urge toolkit primary
  rose:      '#FF6B8A',  // personal
  emerald:   '#34D399',  // finance
  coral:     '#FF8A65',  // fitness alt
  lavender:  '#C084FC',  // career
  sky:       '#38BDF8',  // habit
  peach:     '#FBBF24',  // custom
  mint:      '#6EE7B7',  // milestone
} as const;

/** On-accent text colors (for text rendered directly on accent backgrounds) */
export const onAccent = {
  amber:   '#1A1405',
  violet:  '#120D2B',
  teal:    '#071F1A',
  blue:    '#0B1628',
  calm:    '#0B1E33',
  rose:    '#2B0A12',
  emerald: '#071F13',
  coral:   '#2B140B',
  lavender:'#1B0D2B',
  sky:     '#0B1E33',
  peach:   '#2B1A05',
  mint:    '#071F15',
} as const;

/** Lighter accent variants for use as text on dark surfaces (meets 4.5:1 on surface) */
export const accentText = {
  amber:   '#F5C96B',
  violet:  '#A89DFF',
  teal:    '#5FD9BD',
  blue:    '#8DBBFF',
  calm:    '#B0D8FF',
  rose:    '#FF9DB3',
  emerald: '#6EE7B7',
  coral:   '#FFB09A',
  lavender:'#D8B4FE',
  sky:     '#7DD3FC',
  peach:   '#FCD34D',
  mint:    '#A7F3D0',
} as const;

export type AccentName = keyof typeof color;
export const ACCENT_NAMES: AccentName[] = [
  'amber','violet','teal','blue','calm','rose',
  'emerald','coral','lavender','sky','peach','mint',
];

/** Default accent per goal category */
export const categoryAccent: Record<string, AccentName> = {
  education:  'violet',
  health:     'teal',
  fitness:    'blue',
  finance:    'emerald',
  career:     'lavender',
  recovery:   'amber',
  personal:   'rose',
  custom:     'peach',
};

/** Font families — load via expo-font / @expo-google-fonts */
export const font = {
  display: 'SpaceGrotesk_600',
  displayBold: 'SpaceGrotesk_700',
  body:    'Manrope_500',
  bodySemiBold: 'Manrope_600',
  bodyBold: 'Manrope_700',
  bodyExtraBold: 'Manrope_800',
} as const;

/** Font sizes */
export const fontSize = {
  hero:  96,    // giant counter
  ring:  64,    // ring center
  h1:    28,
  h2:    20,
  h3:    17,
  body:  15,
  label: 13,
  caption: 12,
  eyebrow: 11,
  widgetLarge: 40,
  widgetMedium: 26,
} as const;

/** Spacing on 4-pt grid */
export const spacing = (n: number) => n * 4;
spacing.xs = 4;
spacing.sm = 8;
spacing.md = 12;
spacing.lg = 16;
spacing.xl = 20;
spacing.xxl = 24;
spacing.xxxl = 32;

/** Border radii */
export const radius = {
  xs: 8,
  sm: 14,
  md: 18,
  lg: 22,
  xl: 28,
  full: 9999,   // pills, circular
} as const;

/** Ring stroke widths */
export const ring = {
  mini: 9,
  hero: 16,
} as const;

/** Motion durations (ms) */
export const motion = {
  instant: 80,
  fast:    150,
  normal:  300,
  slow:    500,
  celebration: 1200,
} as const;

/** Spring configs for react-native-reanimated */
export const spring = {
  gentle:  { damping: 15, stiffness: 120, mass: 1 },
  bouncy:  { damping: 10, stiffness: 180, mass: 0.8 },
  stiff:   { damping: 20, stiffness: 200, mass: 1 },
} as const;

/** Light theme overrides (future) */
export const lightColor = {
  bg:       '#F5F5F7',
  surface:  '#FFFFFF',
  surface2: '#F0F0F2',
  track:    '#E5E5EA',
  border:   '#D1D1D6',
  text:     '#1C1C1E',
  textSoft: '#636366',
  textMuted:'#8E8E93',
} as const;