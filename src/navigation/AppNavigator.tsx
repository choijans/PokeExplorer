import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import BottomTabNavigator from './BottomTabNavigator';
import PokemonDetail from '../components/PokemonDetail';
import { Pokemon } from '../services/pokeApi';
import { ActivityIndicator, useTheme } from 'react-native-paper';
import { View, StyleSheet } from 'react-native';
import type { PokemonTheme } from '../theme';

export type RootStackParamList = {
  Main: undefined;
  Login: undefined;
  PokedexDetail: { pokemon: Pokemon };
  ARCapture: { pokemon: Pokemon; biome: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  const { user, loading } = useAuth();
  const theme = useTheme<PokemonTheme>();

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator animating size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTitleStyle: {
          color: theme.colors.onSurface,
          fontWeight: '700',
        },
        headerTintColor: theme.colors.onSurface,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      {user ? (
        <>
          <Stack.Screen name="Main" component={BottomTabNavigator} options={{ headerShown: false }} />
          <Stack.Screen
            name="PokedexDetail"
            component={PokemonDetail}
            options={{
              headerTitle: '',
              headerStyle: { backgroundColor: theme.colors.background },
              headerShadowVisible: false,
              headerBackTitleVisible: false,
              headerTintColor: theme.colors.onSurface,
            }}
          />
          <Stack.Screen
            name="ARCapture"
            component={require('../screens/ARCaptureScreen').default}
            options={{ headerShown: false }}
          />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AppNavigator;