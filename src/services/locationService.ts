import { Platform, PermissionsAndroid } from 'react-native';
import Geolocation from '@react-native-community/geolocation';

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
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  spawnTime: number;
}

class LocationService {
  private currentLocation: Location | null = null;

  async requestLocationPermission(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      return true;
    }
    
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      return false;
    }
  }

  async getCurrentLocation(): Promise<Location> {
    return new Promise((resolve) => {
      const fallback = { latitude: 10.35168, longitude: 123.91317 };
      
      Geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          console.log('Location:', location, 'Accuracy:', position.coords.accuracy + 'm');
          this.currentLocation = location;
          resolve(location);
        },
        (error) => {
          console.log('Location error, using fallback:', error.message);
          const loc = this.currentLocation || fallback;
          resolve(loc);
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
      );
    });
  }

  async watchLocation(callback: (location: Location) => void): Promise<any> {
    const watchId = Geolocation.watchPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        const accuracy = position.coords.accuracy;
        if (accuracy < 200) {
          console.log('Location update:', location, 'Accuracy:', accuracy + 'm');
          this.currentLocation = location;
          callback(location);
        }
      },
      (error) => console.error('Location watch error:', error),
      { enableHighAccuracy: false, distanceFilter: 10, interval: 5000, maximumAge: 10000 }
    );
    
    return { remove: () => Geolocation.clearWatch(watchId) };
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
    const encounterCount = Math.floor(Math.random() * 3) + 3;
    const now = Date.now();
    
    for (let i = 0; i < encounterCount; i++) {
      const rarity = this.getRandomRarity();
      const pokemonId = this.getPokemonIdForBiome(biome, rarity);
      const encounterLocation = this.generateNearbyLocation(location);
      
      encounters.push({
        id: pokemonId,
        name: `pokemon-${pokemonId}`,
        location: encounterLocation,
        biome,
        discovered: false,
        rarity,
        spawnTime: now,
      });
    }
    
    return encounters;
  }

  private getRandomRarity(): 'common' | 'uncommon' | 'rare' | 'legendary' {
    const rand = Math.random();
    if (rand < 0.7) return 'common';
    if (rand < 0.9) return 'uncommon';
    if (rand < 0.98) return 'rare';
    return 'legendary';
  }

  private getPokemonIdForBiome(biome: string, rarity: string): number {
    const roll = Math.random();
    let maxId;
    
    if (rarity === 'legendary') {
      const legendaries = [150, 151, 144, 145, 146, 243, 244, 245, 249, 250, 251, 377, 378, 379, 380, 381, 382, 383, 384, 385, 386];
      return legendaries[Math.floor(Math.random() * legendaries.length)];
    }
    
    if (roll < 0.6) maxId = 151;
    else if (roll < 0.85) maxId = 251;
    else maxId = 386;
    
    return Math.floor(Math.random() * maxId) + 1;
  }

  private generateNearbyLocation(center: Location): Location {
    // Generate location within ~500m radius for wider spawn range
    const radiusInDegrees = 0.005; // Approximately 500m
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