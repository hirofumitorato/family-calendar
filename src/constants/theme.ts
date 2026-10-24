export const Colors = {
  light: {
    text: '#1C1C1E',
    textSecondary: '#6B6F76',
    textMuted: '#B4B7BD',
    background: '#FFFFFF',
    backgroundElement: '#F2F3F5',
    border: '#E4E5E9',
    accent: '#F97316',
    today: '#FFF1E6',
    selected: '#FFE0C7',
    sunday: '#E5484D',
    saturday: '#2F6FEB',
    sundayBg: '#FFF0F0',
    saturdayBg: '#EEF4FF',
  },
  dark: {
    text: '#F2F2F4',
    textSecondary: '#A0A4AB',
    textMuted: '#5A5E66',
    background: '#111113',
    backgroundElement: '#1F2023',
    border: '#2C2E33',
    accent: '#FB923C',
    today: '#2A1E14',
    selected: '#3D2817',
    sunday: '#FF6B6F',
    saturday: '#6A9BFF',
    sundayBg: '#2A1517',
    saturdayBg: '#141E30',
  },
} as const;

export type ThemeColors = { [K in keyof typeof Colors.light]: string };

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
} as const;
