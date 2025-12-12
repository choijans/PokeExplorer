import AsyncStorage from '@react-native-async-storage/async-storage';
import { Location } from './locationService';

export interface Gym {
  id: string;
  name: string;
  location: Location;
  team: 'red' | 'blue' | 'yellow' | null;
  level: number;
}

export interface Pokestop {
  id: string;
  name: string;
  location: Location;
  lastVisited?: number;
}

export interface Friend {
  id: string;
  username: string;
  level: number;
  location?: Location;
  lastSeen?: number;
}

export interface TradeOffer {
  id: string;
  fromUser: string;
  toUser: string;
  offeredPokemon: number;
  requestedPokemon: number;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface Raid {
  id: string;
  gymId: string;
  pokemonId: number;
  level: number;
  startTime: number;
  endTime: number;
  participants: string[];
}

class SocialService {
  private readonly GYMS_KEY = 'gyms';
  private readonly POKESTOPS_KEY = 'pokestops';
  private readonly FRIENDS_KEY = 'friends';
  private readonly TRADES_KEY = 'trades';
  private readonly RAIDS_KEY = 'raids';

  // Gyms
  async getGyms(): Promise<Gym[]> {
    try {
      const stored = await AsyncStorage.getItem(this.GYMS_KEY);
      return stored ? JSON.parse(stored) : this.generateDefaultGyms();
    } catch (error) {
      return this.generateDefaultGyms();
    }
  }

  private generateDefaultGyms(): Gym[] {
    return [
      { id: 'gym1', name: 'Central Park Gym', location: { latitude: 10.35168, longitude: 123.91317 }, team: 'blue', level: 3 },
      { id: 'gym2', name: 'Downtown Arena', location: { latitude: 10.35268, longitude: 123.91417 }, team: 'red', level: 5 },
      { id: 'gym3', name: 'Harbor Gym', location: { latitude: 10.35068, longitude: 123.91217 }, team: null, level: 1 },
    ];
  }

  async claimGym(gymId: string, team: 'red' | 'blue' | 'yellow'): Promise<void> {
    const gyms = await this.getGyms();
    const gym = gyms.find(g => g.id === gymId);
    if (gym) {
      gym.team = team;
      gym.level = 1;
      await AsyncStorage.setItem(this.GYMS_KEY, JSON.stringify(gyms));
    }
  }

  // Pokestops
  async getPokestops(): Promise<Pokestop[]> {
    try {
      const stored = await AsyncStorage.getItem(this.POKESTOPS_KEY);
      return stored ? JSON.parse(stored) : this.generateDefaultPokestops();
    } catch (error) {
      return this.generateDefaultPokestops();
    }
  }

  private generateDefaultPokestops(): Pokestop[] {
    return [
      { id: 'stop1', name: 'Historic Monument', location: { latitude: 10.35100, longitude: 123.91250 } },
      { id: 'stop2', name: 'City Fountain', location: { latitude: 10.35200, longitude: 123.91350 } },
      { id: 'stop3', name: 'Art Sculpture', location: { latitude: 10.35150, longitude: 123.91400 } },
      { id: 'stop4', name: 'Community Center', location: { latitude: 10.35250, longitude: 123.91300 } },
    ];
  }

  async visitPokestop(stopId: string): Promise<{ items: string[], xp: number }> {
    const stops = await this.getPokestops();
    const stop = stops.find(s => s.id === stopId);
    if (stop) {
      const now = Date.now();
      if (stop.lastVisited && now - stop.lastVisited < 300000) {
        throw new Error('Pokestop on cooldown');
      }
      stop.lastVisited = now;
      await AsyncStorage.setItem(this.POKESTOPS_KEY, JSON.stringify(stops));
      return {
        items: ['Pokeball', 'Potion', 'Revive'],
        xp: 50,
      };
    }
    throw new Error('Pokestop not found');
  }

  // Friends
  async getFriends(): Promise<Friend[]> {
    try {
      const stored = await AsyncStorage.getItem(this.FRIENDS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      return [];
    }
  }

  async addFriend(friend: Friend): Promise<void> {
    const friends = await this.getFriends();
    if (!friends.find(f => f.id === friend.id)) {
      friends.push(friend);
      await AsyncStorage.setItem(this.FRIENDS_KEY, JSON.stringify(friends));
    }
  }

  async removeFriend(friendId: string): Promise<void> {
    const friends = await this.getFriends();
    const filtered = friends.filter(f => f.id !== friendId);
    await AsyncStorage.setItem(this.FRIENDS_KEY, JSON.stringify(filtered));
  }

  // Trading
  async getTrades(): Promise<TradeOffer[]> {
    try {
      const stored = await AsyncStorage.getItem(this.TRADES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      return [];
    }
  }

  async createTrade(fromUser: string, toUser: string, offeredPokemon: number, requestedPokemon: number): Promise<void> {
    const trades = await this.getTrades();
    const newTrade: TradeOffer = {
      id: Date.now().toString(),
      fromUser,
      toUser,
      offeredPokemon,
      requestedPokemon,
      status: 'pending',
    };
    trades.push(newTrade);
    await AsyncStorage.setItem(this.TRADES_KEY, JSON.stringify(trades));
  }

  async acceptTrade(tradeId: string): Promise<void> {
    const trades = await this.getTrades();
    const trade = trades.find(t => t.id === tradeId);
    if (trade) {
      trade.status = 'accepted';
      await AsyncStorage.setItem(this.TRADES_KEY, JSON.stringify(trades));
    }
  }

  async rejectTrade(tradeId: string): Promise<void> {
    const trades = await this.getTrades();
    const trade = trades.find(t => t.id === tradeId);
    if (trade) {
      trade.status = 'rejected';
      await AsyncStorage.setItem(this.TRADES_KEY, JSON.stringify(trades));
    }
  }

  // Raids
  async getRaids(): Promise<Raid[]> {
    try {
      const stored = await AsyncStorage.getItem(this.RAIDS_KEY);
      const raids: Raid[] = stored ? JSON.parse(stored) : [];
      const now = Date.now();
      return raids.filter(r => r.endTime > now);
    } catch (error) {
      return [];
    }
  }

  async createRaid(gymId: string, pokemonId: number, level: number): Promise<void> {
    const raids = await this.getRaids();
    const now = Date.now();
    const newRaid: Raid = {
      id: Date.now().toString(),
      gymId,
      pokemonId,
      level,
      startTime: now,
      endTime: now + 3600000, // 1 hour
      participants: [],
    };
    raids.push(newRaid);
    await AsyncStorage.setItem(this.RAIDS_KEY, JSON.stringify(raids));
  }

  async joinRaid(raidId: string, userId: string): Promise<void> {
    const raids = await this.getRaids();
    const raid = raids.find(r => r.id === raidId);
    if (raid && !raid.participants.includes(userId)) {
      raid.participants.push(userId);
      await AsyncStorage.setItem(this.RAIDS_KEY, JSON.stringify(raids));
    }
  }

  async leaveRaid(raidId: string, userId: string): Promise<void> {
    const raids = await this.getRaids();
    const raid = raids.find(r => r.id === raidId);
    if (raid) {
      raid.participants = raid.participants.filter(p => p !== userId);
      await AsyncStorage.setItem(this.RAIDS_KEY, JSON.stringify(raids));
    }
  }
}

export const socialService = new SocialService();
