/**
 * PokeExplorer App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { PaperProvider, adaptNavigationTheme } from 'react-native-paper';
import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { pokemonTheme } from './src/theme';

const { LightTheme: adaptedNavigationTheme } = adaptNavigationTheme({ reactNavigationLight: DefaultTheme });

const navigationTheme = {
  ...adaptedNavigationTheme,
  colors: {
    ...adaptedNavigationTheme.colors,
    primary: pokemonTheme.colors.primary,
    background: pokemonTheme.colors.background,
    card: pokemonTheme.colors.surface,
    text: pokemonTheme.colors.onSurface,
    border: pokemonTheme.colors.outline,
    notification: pokemonTheme.colors.secondary,
  },
};

function App() {
  return (
    <PaperProvider theme={pokemonTheme}>
      <SafeAreaProvider>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={pokemonTheme.colors.background}
        />
        <NavigationContainer theme={navigationTheme}>
          <AuthProvider>
            <AppNavigator />
          </AuthProvider>
        </NavigationContainer>
      </SafeAreaProvider>
    </PaperProvider>
  );
}

export default App;
