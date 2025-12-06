import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import BottomTabNavigator from './BottomTabNavigator';
import PokemonDetail from '../components/PokemonDetail';
import { Pokemon } from '../services/pokeApi';

export type RootStackParamList = {
  Main: undefined;
  Login: undefined;
  PokedexDetail: { pokemon: Pokemon };
  ARCapture: { pokemon: Pokemon; biome: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  return (
    <Stack.Navigator>
      {user ? (
        <>
          <Stack.Screen name="Main" component={BottomTabNavigator} options={{ headerShown: false }} />
          <Stack.Screen
            name="PokedexDetail"
            component={PokemonDetail}
            options={({ route }) => ({
              title: route.params?.pokemon?.name
                ? route.params.pokemon.name.charAt(0).toUpperCase() + route.params.pokemon.name.slice(1)
                : 'Pokemon Detail',
              headerStyle: { backgroundColor: '#FF0000' },
              headerTintColor: '#fff',
            })}
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

export default AppNavigator;