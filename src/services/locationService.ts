import Geolocation from 'react-native-geolocation-service';
import { PermissionsAndroid, Platform, Alert } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

export interface Location {
  latitude: number;
  longitude: number;
}

export interface PokemonEncounter {
  id: number;
  name: string;
  location: Location;
  biome: string;
  discovered: boolean;
}

class LocationService {
  private currentLocation: Location | null = null;

  async requestLocationPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        const result = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
        return result === RESULTS.GRANTED;
      } else {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'PokeExplorer needs access to your location to find Pokemon nearby.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    } catch (error) {
      console.error('Permission request error:', error);
      return false;
    }
  }

  async getCurrentLocation(): Promise<Location> {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          this.currentLocation = location;
          resolve(location);
        },
        (error) => {
          console.error('Location error:', error);
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    });
  }

  getBiomeFromLocation(location: Location): string {
    // Simple biome logic based on coordinates
    const { latitude, longitude } = location;
    
    // Near water (simplified logic)
    if (Math.abs(latitude % 1) < 0.1 || Math.abs(longitude % 1) < 0.1) {
      return 'water';
    }
    
    // Urban areas (simplified)
    if (Math.abs(latitude) > 40 && Math.abs(longitude) > 70) {
      return 'urban';
    }
    
    // Forest/grass areas
    if (latitude > 0) {
      return 'grass';
    }
    
    return 'normal';
  }

  generatePokemonEncounters(location: Location): PokemonEncounter[] {
    const biome = this.getBiomeFromLocation(location);
    const encounters: PokemonEncounter[] = [];
    
    // Generate 3-5 random encounters within 1km radius
    const encounterCount = Math.floor(Math.random() * 3) + 3;
    
    for (let i = 0; i < encounterCount; i++) {
      const pokemonId = this.getPokemonIdForBiome(biome);
      const encounterLocation = this.generateNearbyLocation(location);
      
      encounters.push({
        id: pokemonId,
        name: `pokemon-${pokemonId}`, // Will be resolved later
        location: encounterLocation,
        biome,
        discovered: false,
      });
    }
    
    return encounters;
  }

  private getPokemonIdForBiome(biome: string): number {
    const biomePokemons: { [key: string]: number[] } = {
      water: [7, 8, 9, 54, 55, 72, 73, 90, 91, 98, 99, 116, 117, 118, 119, 120, 121, 129, 130, 131, 134],
      grass: [1, 2, 3, 25, 43, 44, 45, 46, 47, 69, 70, 71, 102, 103, 114, 123, 127],
      urban: [19, 20, 52, 53, 74, 75, 76, 81, 82, 100, 101, 109, 110, 132],
      normal: [4, 5, 6, 10, 11, 12, 13, 14, 15, 16, 17, 18, 21, 22, 23, 24],
    };
    
    const pokemonList = biomePokemons[biome] || biomePokemons.normal;
    return pokemonList[Math.floor(Math.random() * pokemonList.length)];
  }

  private generateNearbyLocation(center: Location): Location {
    // Generate location within ~1km radius
    const radiusInDegrees = 0.009; // Approximately 1km
    const randomAngle = Math.random() * 2 * Math.PI;
    const randomRadius = Math.random() * radiusInDegrees;
    
    return {
      latitude: center.latitude + randomRadius * Math.cos(randomAngle),
      longitude: center.longitude + randomRadius * Math.sin(randomAngle),
    };
  }

  calculateDistance(loc1: Location, loc2: Location): number {
    const R = 6371; // Earth's radius in km
    const dLat = (loc2.latitude - loc1.latitude) * Math.PI / 180;
    const dLon = (loc2.longitude - loc1.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(loc1.latitude * Math.PI / 180) * Math.cos(loc2.latitude * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c * 1000; // Distance in meters
  }
}

export const locationService = new LocationService();