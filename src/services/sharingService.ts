/**
 * Sharing Service
 * Handles sharing Pokemon details, photos, and stats to social media and messaging apps
 */

import Share from 'react-native-share';
import { Alert, Platform } from 'react-native';
import RNFS from 'react-native-fs';

interface PokemonShareData {
  id: number;
  name: string;
  types: string[];
  height: number;
  weight: number;
  abilities: string[];
  stats: Array<{ name: string; base_stat: number }>;
  imageUrl?: string;
}

interface ShareStatsData {
  totalCaught: number;
  uniqueSpecies: number;
  favoriteType?: string;
  rareFinds: string[];
}

class SharingService {
  /**
   * Share Pokemon details to social media or messaging apps
   */
  async sharePokemonDetails(pokemon: PokemonShareData): Promise<void> {
    try {
      const message = this.formatPokemonMessage(pokemon);
      
      const shareOptions = {
        title: `Check out ${this.capitalize(pokemon.name)}!`,
        message: message,
        url: pokemon.imageUrl || undefined,
        subject: `Pokémon Discovery: ${this.capitalize(pokemon.name)}`,
      };

      await Share.open(shareOptions);
    } catch (error: any) {
      if (error.message !== 'User did not share') {
        console.error('Error sharing Pokemon details:', error);
        Alert.alert('Share Failed', 'Unable to share Pokemon details. Please try again.');
      }
    }
  }

  /**
   * Share a captured Pokemon photo
   */
  async sharePhoto(imageUri: string, pokemonName?: string, caption?: string): Promise<void> {
    try {
      let shareUrl = imageUri;

      // For local file URIs, ensure proper format
      if (imageUri.startsWith('file://')) {
        shareUrl = imageUri;
      } else if (!imageUri.startsWith('http')) {
        shareUrl = `file://${imageUri}`;
      }

      const message = caption || 
        (pokemonName ? `I found ${this.capitalize(pokemonName)} in PokeExplorer! 🎮` : 
        'Check out my Pokemon discovery! 🎮');

      const shareOptions = {
        title: 'Share Pokemon Photo',
        message: message,
        url: shareUrl,
        type: 'image/jpeg',
      };

      await Share.open(shareOptions);
    } catch (error: any) {
      if (error.message !== 'User did not share') {
        console.error('Error sharing photo:', error);
        Alert.alert('Share Failed', 'Unable to share photo. Please try again.');
      }
    }
  }

  /**
   * Share user stats and achievements
   */
  async shareStats(stats: ShareStatsData, username?: string): Promise<void> {
    try {
      const message = this.formatStatsMessage(stats, username);

      const shareOptions = {
        title: 'My PokeExplorer Stats',
        message: message,
        subject: 'Check out my Pokemon journey!',
      };

      await Share.open(shareOptions);
    } catch (error: any) {
      if (error.message !== 'User did not share') {
        console.error('Error sharing stats:', error);
        Alert.alert('Share Failed', 'Unable to share stats. Please try again.');
      }
    }
  }

  /**
   * Share to specific social media platform
   */
  async shareToSocial(
    platform: 'instagram' | 'twitter' | 'whatsapp' | 'facebook',
    message: string,
    imageUrl?: string
  ): Promise<void> {
    try {
      const socialOptions: any = {
        title: 'PokeExplorer',
        message: message,
      };

      if (imageUrl) {
        socialOptions.url = imageUrl;
      }

      switch (platform) {
        case 'instagram':
          socialOptions.social = Share.Social.INSTAGRAM;
          break;
        case 'twitter':
          socialOptions.social = Share.Social.TWITTER;
          break;
        case 'whatsapp':
          socialOptions.social = Share.Social.WHATSAPP;
          break;
        case 'facebook':
          socialOptions.social = Share.Social.FACEBOOK;
          break;
      }

      await Share.shareSingle(socialOptions);
    } catch (error: any) {
      if (error.message === 'Not installed') {
        Alert.alert(
          'App Not Found',
          `${this.capitalize(platform)} is not installed on your device.`
        );
      } else if (error.message !== 'User did not share') {
        console.error(`Error sharing to ${platform}:`, error);
        Alert.alert('Share Failed', `Unable to share to ${platform}. Please try again.`);
      }
    }
  }

  /**
   * Download and share remote image
   */
  async downloadAndShare(imageUrl: string, message: string): Promise<void> {
    try {
      const fileName = `pokemon_${Date.now()}.jpg`;
      const downloadDest = `${RNFS.CachesDirectoryPath}/${fileName}`;

      // Download the image
      const downloadResult = await RNFS.downloadFile({
        fromUrl: imageUrl,
        toFile: downloadDest,
      }).promise;

      if (downloadResult.statusCode === 200) {
        await this.sharePhoto(downloadDest, undefined, message);
        
        // Clean up downloaded file after sharing
        setTimeout(() => {
          RNFS.unlink(downloadDest).catch(() => {});
        }, 5000);
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Error downloading and sharing image:', error);
      Alert.alert('Download Failed', 'Unable to download image for sharing.');
    }
  }

  /**
   * Format Pokemon data into shareable message
   */
  private formatPokemonMessage(pokemon: PokemonShareData): string {
    const name = this.capitalize(pokemon.name);
    const types = pokemon.types.map(t => this.capitalize(t)).join(', ');
    const abilities = pokemon.abilities.slice(0, 2).map(a => this.capitalize(a)).join(', ');
    
    // Convert height (decimeters to meters) and weight (hectograms to kg)
    const heightM = (pokemon.height / 10).toFixed(1);
    const weightKg = (pokemon.weight / 10).toFixed(1);

    // Get top 3 stats
    const topStats = pokemon.stats
      .slice()
      .sort((a, b) => b.base_stat - a.base_stat)
      .slice(0, 3)
      .map(s => `${this.capitalize(s.name.replace('-', ' '))}: ${s.base_stat}`)
      .join(', ');

    return `🎮 I discovered ${name} in PokeExplorer! 🎮

📊 Details:
• Type: ${types}
• Height: ${heightM}m | Weight: ${weightKg}kg
• Abilities: ${abilities}
• Top Stats: ${topStats}

#PokeExplorer #Pokemon #${name}`;
  }

  /**
   * Format user stats into shareable message
   */
  private formatStatsMessage(stats: ShareStatsData, username?: string): string {
    const userPrefix = username ? `${username}'s` : 'My';
    const rareList = stats.rareFinds.length > 0 
      ? `\n• Rare Finds: ${stats.rareFinds.join(', ')}`
      : '';

    return `🏆 ${userPrefix} PokeExplorer Stats 🏆

📈 Journey So Far:
• Total Caught: ${stats.totalCaught}
• Unique Species: ${stats.uniqueSpecies}${stats.favoriteType ? `\n• Favorite Type: ${this.capitalize(stats.favoriteType)}` : ''}${rareList}

Join me on PokeExplorer! 🎮
#PokeExplorer #PokemonGo #PokemonMaster`;
  }

  /**
   * Capitalize first letter of string
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  /**
   * Check if sharing is available
   */
  isAvailable(): boolean {
    // Sharing is available on all platforms
    return true;
  }
}

export default new SharingService();
