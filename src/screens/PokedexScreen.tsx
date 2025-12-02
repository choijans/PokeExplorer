import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const PokedexScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Pokedex Screen</Text>
      <Text style={styles.subtitle}>Coming soon...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
});

export default PokedexScreen;
