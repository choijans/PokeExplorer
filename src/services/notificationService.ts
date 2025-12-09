import messaging from '@react-native-firebase/messaging';
import { Platform, PermissionsAndroid } from 'react-native';
import notifee, { AndroidImportance } from '@notifee/react-native';

class NotificationService {
  async requestPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          return false;
        }
      }

      const authStatus = await messaging().requestPermission();
      return authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
             authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    } catch (error) {
      console.error('[NOTIFICATION] Permission error:', error);
      return false;
    }
  }

  async showLocalNotification(title: string, body: string, data?: any) {
    try {
      const channelId = await notifee.createChannel({
        id: 'default',
        name: 'Default Channel',
        importance: AndroidImportance.HIGH,
      });

      await notifee.displayNotification({
        title,
        body,
        data,
        android: {
          channelId,
          importance: AndroidImportance.HIGH,
          pressAction: {
            id: 'default',
          },
        },
        ios: {
          sound: 'default',
        },
      });
    } catch (error) {
      console.error('[NOTIFICATION] Display error:', error);
    }
  }

  async scheduleShopRefreshNotification(delayMs: number) {
    // Skip scheduled notifications, just use immediate notifications
    console.log('[NOTIFICATION] Shop refresh scheduled for', delayMs, 'ms');
  }

  async showRarePokemonNotification(pokemonName: string, distance: number) {
    await this.showLocalNotification(
      'Rare Pokemon Nearby!',
      `A wild ${pokemonName} appeared ${Math.round(distance)}m away!`,
      { type: 'rare_pokemon', pokemonName }
    );
  }

  async showShopRefreshNotification() {
    await this.showLocalNotification(
      'Shop Refreshed!',
      'New items are now available. Visit the shop to see what\'s new!',
      { type: 'shop_refresh' }
    );
  }
}

export const notificationService = new NotificationService();
