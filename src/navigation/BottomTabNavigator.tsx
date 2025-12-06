import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import PokedexScreen from '../screens/PokedexScreen';
import HuntScreen from '../screens/HuntScreen';
import CollectionScreen from '../screens/CollectionScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import CommunityFeedScreen from '../screens/CommunityFeedScreen';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from 'react-native-paper';
import type { PokemonTheme } from '../theme';

export type TabParamList = {
  Pokedex: undefined;
  Hunt: undefined;
  Collection: undefined;
  Community: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

const BottomTabNavigator: React.FC = () => {
  const theme = useTheme<PokemonTheme>();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: theme.colors.outlineVariant,
          height: 64,
          paddingBottom: theme.custom.spacing.sm,
          paddingTop: theme.custom.spacing.xs,
        },
        tabBarLabelStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Pokedex"
        component={PokedexScreen}
        options={{
          tabBarLabel: 'Pokedex',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="book-open-page-variant" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Hunt"
        component={HuntScreen}
        options={{
          tabBarLabel: 'Hunt',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="map-search" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Collection"
        component={CollectionScreen}
        options={{
          tabBarLabel: 'Collection',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="trophy" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Community"
        component={CommunityFeedScreen}
        options={{
          tabBarLabel: 'Community',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-group" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={UserProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-circle" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;
