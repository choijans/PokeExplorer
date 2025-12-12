import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Card, Button, TextInput, Chip, SegmentedButtons, IconButton, Text } from 'react-native-paper';
import { socialService, Friend, TradeOffer, Raid } from '../services/socialService';

export default function SocialScreen() {
  const [activeTab, setActiveTab] = useState<'friends' | 'trades' | 'raids'>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [trades, setTrades] = useState<TradeOffer[]>([]);
  const [raids, setRaids] = useState<Raid[]>([]);
  const [newFriendId, setNewFriendId] = useState('');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setFriends(await socialService.getFriends());
    setTrades(await socialService.getTrades());
    setRaids(await socialService.getRaids());
  };

  const handleAddFriend = async () => {
    if (newFriendId.trim()) {
      await socialService.addFriend({
        id: newFriendId,
        username: newFriendId,
        level: Math.floor(Math.random() * 40) + 1,
      });
      setNewFriendId('');
      loadData();
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    Alert.alert('Remove Friend', 'Are you sure?', [
      { text: 'Cancel' },
      { text: 'Remove', onPress: async () => {
        await socialService.removeFriend(friendId);
        loadData();
      }},
    ]);
  };

  const handleCreateTrade = async (friendId: string) => {
    await socialService.createTrade('me', friendId, 25, 4);
    Alert.alert('Trade Sent', 'Trade offer sent to ' + friendId);
    loadData();
  };

  const handleAcceptTrade = async (tradeId: string) => {
    await socialService.acceptTrade(tradeId);
    Alert.alert('Trade Complete', 'Pokemon traded successfully!');
    loadData();
  };

  const handleJoinRaid = async (raidId: string) => {
    await socialService.joinRaid(raidId, 'me');
    Alert.alert('Joined Raid', 'You joined the raid!');
    loadData();
  };

  return (
    <View style={styles.container}>
      <SegmentedButtons
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as any)}
        buttons={[
          { value: 'friends', label: 'Friends', icon: 'account-group' },
          { value: 'trades', label: 'Trades', icon: 'swap-horizontal' },
          { value: 'raids', label: 'Raids', icon: 'sword-cross' },
        ]}
        style={styles.tabs}
      />

      <ScrollView style={styles.content}>
        {activeTab === 'friends' && (
          <View>
            <View style={styles.addFriendContainer}>
              <TextInput
                mode="outlined"
                label="Friend Code"
                value={newFriendId}
                onChangeText={setNewFriendId}
                style={styles.input}
              />
              <Button mode="contained" onPress={handleAddFriend} icon="plus">
                Add
              </Button>
            </View>
            {friends.map(friend => (
              <Card key={friend.id} style={styles.card}>
                <Card.Title 
                  title={friend.username} 
                  subtitle={`Level ${friend.level}`}
                  right={(props) => (
                    <View style={styles.cardActions}>
                      <IconButton {...props} icon="swap-horizontal" onPress={() => handleCreateTrade(friend.id)} />
                      <IconButton {...props} icon="delete" onPress={() => handleRemoveFriend(friend.id)} />
                    </View>
                  )}
                />
              </Card>
            ))}
            {friends.length === 0 && (
              <Text style={styles.emptyText}>No friends yet. Add friends to trade and battle!</Text>
            )}
          </View>
        )}

        {activeTab === 'trades' && (
          <View>
            {trades.filter(t => t.status === 'pending').map(trade => (
              <Card key={trade.id} style={styles.card}>
                <Card.Title 
                  title={`Trade from ${trade.fromUser}`}
                  subtitle={`Offering: #${trade.offeredPokemon} for #${trade.requestedPokemon}`}
                  right={(props) => (
                    <View style={styles.cardActions}>
                      <IconButton {...props} icon="check" onPress={() => handleAcceptTrade(trade.id)} />
                      <IconButton {...props} icon="close" onPress={() => socialService.rejectTrade(trade.id).then(loadData)} />
                    </View>
                  )}
                />
              </Card>
            ))}
            {trades.filter(t => t.status === 'pending').length === 0 && (
              <Text style={styles.emptyText}>No pending trades</Text>
            )}
          </View>
        )}

        {activeTab === 'raids' && (
          <View>
            {raids.map(raid => {
              const timeLeft = Math.floor((raid.endTime - Date.now()) / 60000);
              return (
                <Card key={raid.id} style={styles.card}>
                  <Card.Title 
                    title={`Raid Boss: #${raid.pokemonId}`}
                    subtitle={`Level ${raid.level}`}
                  />
                  <Card.Content>
                    <Chip icon="timer">{timeLeft}m left</Chip>
                    <Chip icon="account-group">{raid.participants.length} trainers</Chip>
                  </Card.Content>
                  <Card.Actions>
                    <Button mode="contained" onPress={() => handleJoinRaid(raid.id)}>Join</Button>
                  </Card.Actions>
                </Card>
              );
            })}
            {raids.length === 0 && (
              <Text style={styles.emptyText}>No active raids nearby</Text>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  tabs: {
    marginTop: 50,
    marginHorizontal: 15,
    marginBottom: 10,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  addFriendContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    gap: 10,
    alignItems: 'center',
  },
  input: {
    flex: 1,
  },
  card: {
    marginBottom: 10,
    marginHorizontal: 15,
  },
  cardActions: {
    flexDirection: 'row',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    color: '#666',
  },
});
