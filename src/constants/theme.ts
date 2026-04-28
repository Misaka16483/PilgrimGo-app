/**
 * PilgrimGo 全局主题配置
 */
export const Colors = {
  primary: '#FF6B6B',
  primaryDark: '#E55A5A',
  primaryLight: '#FF8E8E',
  secondary: '#4ECDC4',
  secondaryDark: '#3DBDB5',
  accent: '#FFE66D',
  background: '#FFFFFF',
  surface: '#F8F9FA',
  card: '#FFFFFF',
  text: '#2D3436',
  textSecondary: '#636E72',
  textLight: '#B2BEC3',
  border: '#E9ECEF',
  error: '#FF4757',
  success: '#2ED573',
  warning: '#FFA502',
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0, 0, 0, 0.5)',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const FontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 22,
  xxxl: 28,
  title: 32,
} as const;

export const BorderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
} as const;
