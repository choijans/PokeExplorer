import { MD3LightTheme, MD3Theme, configureFonts } from 'react-native-paper';

const baseFont = {
  fontFamily: 'System',
  letterSpacing: 0,
};

const fontConfig = {
  displayLarge: {
    ...baseFont,
    fontSize: 44,
    lineHeight: 52,
    fontWeight: '700' as const,
  },
  displayMedium: {
    ...baseFont,
    fontSize: 38,
    lineHeight: 46,
    fontWeight: '700' as const,
  },
  displaySmall: {
    ...baseFont,
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700' as const,
  },
  headlineLarge: {
    ...baseFont,
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700' as const,
  },
  headlineMedium: {
    ...baseFont,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '600' as const,
  },
  headlineSmall: {
    ...baseFont,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600' as const,
  },
  titleLarge: {
    ...baseFont,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600' as const,
  },
  titleMedium: {
    ...baseFont,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600' as const,
  },
  titleSmall: {
    ...baseFont,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600' as const,
  },
  bodyLarge: {
    ...baseFont,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500' as const,
  },
  bodyMedium: {
    ...baseFont,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500' as const,
  },
  bodySmall: {
    ...baseFont,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500' as const,
  },
  labelLarge: {
    ...baseFont,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600' as const,
  },
  labelMedium: {
    ...baseFont,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600' as const,
  },
  labelSmall: {
    ...baseFont,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600' as const,
  },
};

export type PokemonTheme = MD3Theme & {
  custom: {
    gradients: {
      canvas: string[];
      card: string[];
      accent: string[];
    };
    spacing: {
      xs: number;
      sm: number;
      md: number;
      lg: number;
      xl: number;
    };
    radius: {
      sm: number;
      md: number;
      lg: number;
      xl: number;
    };
  };
};

export const pokemonTheme: PokemonTheme = {
  ...MD3LightTheme,
  fonts: configureFonts({ config: fontConfig }),
  roundness: 4,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#2C5AA0',
    primaryContainer: '#D9E8FF',
    secondary: '#63A4FF',
    secondaryContainer: '#E6F4FF',
    tertiary: '#5BC0F8',
    background: '#F4F8FF',
    surface: '#FFFFFF',
    surfaceVariant: '#F0F5FF',
    outline: '#B5C7F2',
    outlineVariant: '#D2E0FF',
    onPrimary: '#FFFFFF',
    onSecondary: '#103F78',
    onSurface: '#142950',
    onSurfaceVariant: '#3B5175',
    inverseOnSurface: '#E8F1FF',
    inverseSurface: '#1A2F57',
  },
  custom: {
    gradients: {
      canvas: ['#F4F8FF', '#FFFFFF'],
      card: ['#FFFFFF', '#E8F1FF'],
      accent: ['#63A4FF', '#83EAF1'],
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
    },
    radius: {
      sm: 4,
      md: 8,
      lg: 12,
      xl: 16,
    },
  },
};

export const gradients = pokemonTheme.custom.gradients;
export const spacing = pokemonTheme.custom.spacing;
export const radius = pokemonTheme.custom.radius;