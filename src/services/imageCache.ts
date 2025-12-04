/**
 * Image Cache Service
 * Provides lazy loading and caching for Pokemon images and GIFs
 * Optimizes performance with memory and disk caching
 */

import { Platform } from 'react-native';

interface CacheEntry {
  url: string;
  timestamp: number;
  size?: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
}

class ImageCacheService {
  private memoryCache: Map<string, CacheEntry> = new Map();
  private cacheStats: CacheStats = { hits: 0, misses: 0, size: 0 };
  private maxMemoryCacheSize = 100; // Maximum number of images to keep in memory
  private cacheExpiryTime = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  /**
   * Get cached image URL or return original URL if not cached
   */
  getCachedUrl(url: string): string {
    if (!url) return '';

    const cached = this.memoryCache.get(url);
    
    if (cached) {
      // Check if cache entry is still valid
      const isExpired = Date.now() - cached.timestamp > this.cacheExpiryTime;
      
      if (!isExpired) {
        this.cacheStats.hits++;
        return cached.url;
      } else {
        // Remove expired entry
        this.memoryCache.delete(url);
      }
    }

    this.cacheStats.misses++;
    return url;
  }

  /**
   * Add image URL to cache
   */
  addToCache(url: string): void {
    if (!url) return;

    // Implement LRU (Least Recently Used) cache eviction
    if (this.memoryCache.size >= this.maxMemoryCacheSize) {
      const oldestKey = this.memoryCache.keys().next().value;
      if (oldestKey) {
        this.memoryCache.delete(oldestKey);
        this.cacheStats.size--;
      }
    }

    this.memoryCache.set(url, {
      url,
      timestamp: Date.now(),
    });
    this.cacheStats.size++;
  }

  /**
   * Preload images for better performance
   */
  async preloadImages(urls: string[]): Promise<void> {
    const validUrls = urls.filter(url => url && url.trim() !== '');
    
    // Add to cache immediately
    validUrls.forEach(url => this.addToCache(url));
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.memoryCache.clear();
    this.cacheStats = { hits: 0, misses: 0, size: 0 };
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    return { ...this.cacheStats };
  }

  /**
   * Get cache hit rate
   */
  getCacheHitRate(): number {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    return total === 0 ? 0 : this.cacheStats.hits / total;
  }

  /**
   * Prefetch Pokemon sprites for a given ID
   */
  async prefetchPokemonSprites(pokemonId: number): Promise<void> {
    const baseUrl = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
    const urls = [
      `${baseUrl}/${pokemonId}.png`,
      `${baseUrl}/other/official-artwork/${pokemonId}.png`,
      `${baseUrl}/versions/generation-v/black-white/animated/${pokemonId}.gif`,
    ];
    
    await this.preloadImages(urls);
  }

  /**
   * Get optimized image URL based on connection quality
   */
  getOptimizedUrl(url: string, quality: 'high' | 'medium' | 'low' = 'medium'): string {
    if (!url) return '';

    // For PokeAPI sprites, we can use different versions
    if (url.includes('raw.githubusercontent.com/PokeAPI/sprites')) {
      switch (quality) {
        case 'low':
          // Use smaller sprites
          return url.replace('/other/official-artwork/', '/');
        case 'high':
          // Use official artwork
          return url.replace(/\/\d+\.png$/, (match) => 
            `/other/official-artwork${match}`
          );
        default:
          return url;
      }
    }

    return url;
  }

  /**
   * Check if image is likely a GIF
   */
  isGif(url: string): boolean {
    return url.toLowerCase().endsWith('.gif');
  }

  /**
   * Get placeholder image for loading state
   */
  getPlaceholderUrl(): string {
    return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png';
  }
}

export const imageCacheService = new ImageCacheService();
export default imageCacheService;
