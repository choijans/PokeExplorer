import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HuntScreen from '../screens/HuntScreen';
import PokedexScreen from '../screens/PokedexScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import { Text } from 'react-native';

export type TabParamList = {
  Hunt: undefined;
  Pokedex: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

const BottomTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#FF0000',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#ddd',
          height: 60,
          paddingBottom: 8,
        },
      }}
    >
      <Tab.Screen
        name="Hunt"
        component={HuntScreen}
        options={{
          tabBarLabel: 'Hunt',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>🗺️</Text>,
          headerTitle: 'Hunt Mode',
        }}
      />
      <Tab.Screen
        name="Pokedex"
        component={PokedexScreen}
        options={{
          tabBarLabel: 'Pokedex',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>📖</Text>,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={UserProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>👤</Text>,
        }}
      />
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;
