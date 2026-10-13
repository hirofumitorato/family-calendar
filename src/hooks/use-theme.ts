import { Colors, type ThemeColors } from '@/constants/theme';
import { useThemePreference } from '@/state/theme';

export function useTheme(): ThemeColors {
  const { scheme } = useThemePreference();
  return scheme === 'dark' ? Colors.dark : Colors.light;
}
