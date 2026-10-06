export const colors = {
  accent: '#7C5CFF',
  success: '#C6F432',
  dark: {
    bg: '#0B0B0F',
    surface: '#111116',
    elevated: '#17171D',
    border: '#26262E',
    text: '#F5F5F0',
    secondary: '#A1A1AA',
    muted: '#71717A',
  },
  light: {
    bg: '#F7F6F2',
    surface: '#FFFFFF',
    elevated: '#FFFFFF',
    border: '#E4E2DC',
    text: '#111113',
    secondary: '#52525B',
    muted: '#71717A',
  },
}

export const typography = {
  display: '"Space Grotesk", "Sora", Inter, system-ui, sans-serif',
  body: 'Inter, system-ui, sans-serif',
}

export const spacing = {
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
}

export const radius = {
  sm: '0.5rem',
  md: '0.75rem',
  lg: '1rem',
  xl: '1.25rem',
  full: '999px',
}

export const shadows = {
  focus: '0 0 0 4px rgba(124, 92, 255, 0.22)',
  card: '0 18px 50px rgba(0, 0, 0, 0.22)',
}

export const motion = {
  fast: '160ms ease',
  base: '220ms ease',
  slow: '360ms cubic-bezier(0.16, 1, 0.3, 1)',
}

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
}

export const tokens = {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  motion,
  breakpoints,
}

export default tokens
