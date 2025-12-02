import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import BottomTabNavigator from './BottomTabNavigator';

export type RootStackParamList = {
  Main: undefined;
  Login: undefined;
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
        <Stack.Screen name="Main" component={BottomTabNavigator} options={{ headerShown: false }} />
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;