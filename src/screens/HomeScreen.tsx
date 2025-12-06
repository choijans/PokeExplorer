import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Button, Text, useTheme } from 'react-native-paper';
import Screen from '../components/ui/Screen';
import SectionCard from '../components/ui/SectionCard';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { PokemonTheme } from '../theme';
import type { TabParamList } from '../navigation/BottomTabNavigator';

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const theme = useTheme<PokemonTheme>();

  return (
    <Screen>
      <View style={styles.container}>
        <SectionCard>
          <View style={styles.hero}>
            <Text variant="headlineMedium" style={{ color: theme.colors.onSurface }}>
              Welcome to PokeExplorer
            </Text>
            <Text
              variant="bodyLarge"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              Chart your Pokémon discoveries, hunt in the real world, and share adventures with Trainers everywhere.
            </Text>
            <Button
              mode="contained"
              icon="account-circle"
              onPress={() =>
                navigation
                  .getParent<BottomTabNavigationProp<TabParamList>>()
                  ?.navigate('Profile')
              }
              style={styles.button}
            >
              View Trainer Profile
            </Button>
          </View>
        </SectionCard>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  hero: {
    gap: 16,
  },
  button: {
    alignSelf: 'flex-start',
  },
});

export default HomeScreen;