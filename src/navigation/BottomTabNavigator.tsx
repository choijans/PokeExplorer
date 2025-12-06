import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import PokedexScreen from '../screens/PokedexScreen';
import HuntScreen from '../screens/HuntScreen';
import CollectionScreen from '../screens/CollectionScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import SocialScreen from '../screens/SocialScreen';
import { Text } from 'react-native';

export type TabParamList = {
  Pokedex: undefined;
  Hunt: undefined;
  Collection: undefined;
  Social: undefined;
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
        name="Pokedex"
        component={PokedexScreen}
        options={{
          tabBarLabel: 'Pokedex',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>📖</Text>,
        }}
      />
      <Tab.Screen
        name="Hunt"
        component={HuntScreen}
        options={{
          tabBarLabel: 'Hunt',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>🗺️</Text>,
        }}
      />
      <Tab.Screen
        name="Collection"
        component={CollectionScreen}
        options={{
          tabBarLabel: 'Collection',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>🏆</Text>,
        }}
      />
      <Tab.Screen
        name="Social"
        component={SocialScreen}
        options={{
          tabBarLabel: 'Social',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>👥</Text>,
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
