import React, { useState, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { locationService } from '../services/locationService';

export default function MapScreen() {
  const [location, setLocation] = useState(null);
  const [pokemon, setPokemon] = useState([]);

  useEffect(() => {
    locationService.requestLocationPermission().then(granted => {
      if (granted) {
        locationService.getCurrentLocation().then(loc => {
          setLocation(loc);
          setPokemon(locationService.generatePokemonEncounters(loc));
        });

        const watcher = locationService.watchLocation(loc => {
          setLocation(loc);
        });

        return () => watcher.remove();
      }
    });
  }, []);

  if (!location) return <View style={styles.container} />;

  return (
    <MapView
      provider={PROVIDER_GOOGLE}
      style={styles.map}
      region={{
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }}
      showsUserLocation
      followsUserLocation
    >
      {pokemon.map((p, i) => (
        <Marker
          key={i}
          coordinate={p.location}
          title={`Pokemon #${p.id}`}
          description={p.biome}
        />
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  map: { flex: 1 },
});
