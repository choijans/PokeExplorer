import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image } from 'react-native';
import { Card, Chip, Searchbar } from 'react-native-paper';
import { catchHistoryService, CatchHistoryEntry } from '../services/catchHistoryService';
import { firebaseCatchHistoryService } from '../services/firebaseCatchHistoryService';
import { useAuth } from '../contexts/AuthContext';

export default function CatchHistoryScreen() {
  const { user } = useAuth();
  const [history, setHistory] = useState<CatchHistoryEntry[]>([]);
  const [stats, setStats] = useState({ caught: 0, fled: 0, total: 0, byRarity: { common: 0, uncommon: 0, rare: 0, legendary: 0 } });
  const [filter, setFilter] = useState<'all' | 'caught' | 'fled'>('all');

  useEffect(() => {
    if (user) {
      const unsubscribe = firebaseCatchHistoryService.subscribeToHistory(user.uid, setHistory);
      loadStats();
      return unsubscribe;
    } else {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    const h = await catchHistoryService.getHistory();
    const s = await catchHistoryService.getStats();
    setHistory(h);
    setStats(s);
  };
  
  const loadStats = async () => {
    if (user) {
      const s = await firebaseCatchHistoryService.getStats(user.uid);
      setStats(s);
    }
  };

  const filteredHistory = history.filter(e => filter === 'all' || e.result === filter);

  const getRarityColor = (rarity: string) => {
    const colors = { common: '#9E9E9E', uncommon: '#4CAF50', rare: '#2196F3', legendary: '#FFD700' };
    return colors[rarity as keyof typeof colors] || '#9E9E9E';
  };

  return (
    <View style={styles.container}>
      <Card style={styles.statsCard}>
        <Card.Title title="Catch Statistics" />
        <Card.Content>
          <View style={styles.statsRow}>
            <Chip icon="check-circle" style={styles.statChip}>{stats.caught} Caught</Chip>
            <Chip icon="close-circle" style={styles.statChip}>{stats.fled} Fled</Chip>
            <Chip icon="pokeball" style={styles.statChip}>{stats.total} Total</Chip>
          </View>
          <View style={styles.statsRow}>
            <Chip style={{ backgroundColor: getRarityColor('common') }}>{stats.byRarity.common} Common</Chip>
            <Chip style={{ backgroundColor: getRarityColor('uncommon') }}>{stats.byRarity.uncommon} Uncommon</Chip>
            <Chip style={{ backgroundColor: getRarityColor('rare') }}>{stats.byRarity.rare} Rare</Chip>
            <Chip style={{ backgroundColor: getRarityColor('legendary') }}>{stats.byRarity.legendary} Legendary</Chip>
          </View>
        </Card.Content>
      </Card>

      <View style={styles.filterRow}>
        <Chip selected={filter === 'all'} onPress={() => setFilter('all')}>All</Chip>
        <Chip selected={filter === 'caught'} onPress={() => setFilter('caught')}>Caught</Chip>
        <Chip selected={filter === 'fled'} onPress={() => setFilter('fled')}>Fled</Chip>
      </View>

      <FlatList
        data={filteredHistory}
        keyExtractor={(item, index) => `${item.pokemonId}-${item.timestamp}-${index}`}
        renderItem={({ item }) => (
          <Card style={styles.historyCard}>
            <Card.Content style={styles.historyContent}>
              <Image
                source={{ uri: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${item.pokemonId}.png` }}
                style={styles.sprite}
              />
              <View style={styles.historyInfo}>
                <Text style={styles.pokemonName}>#{item.pokemonId} {item.pokemonName}</Text>
                <View style={styles.chipRow}>
                  <Chip compact style={{ backgroundColor: getRarityColor(item.rarity) }}>{item.rarity}</Chip>
                  <Chip compact icon={item.result === 'caught' ? 'check' : 'close'} 
                    style={{ backgroundColor: item.result === 'caught' ? '#4CAF50' : '#F44336' }}>
                    {item.result}
                  </Chip>
                  <Chip compact>{item.biome}</Chip>
                </View>
                {item.result === 'caught' && (
                  <Text style={styles.rewards}>+{item.xpGained} XP • +{item.candyGained} Candy</Text>
                )}
                <Text style={styles.timestamp}>{new Date(item.timestamp).toLocaleString()}</Text>
              </View>
            </Card.Content>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 10 },
  statsCard: { marginBottom: 10 },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  statChip: { marginBottom: 4 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  historyCard: { marginBottom: 8 },
  historyContent: { flexDirection: 'row', alignItems: 'center' },
  sprite: { width: 60, height: 60, marginRight: 12 },
  historyInfo: { flex: 1 },
  pokemonName: { fontSize: 16, fontWeight: 'bold', textTransform: 'capitalize' },
  chipRow: { flexDirection: 'row', gap: 4, marginTop: 4, flexWrap: 'wrap' },
  rewards: { fontSize: 12, color: '#666', marginTop: 4 },
  timestamp: { fontSize: 11, color: '#999', marginTop: 4 },
});
