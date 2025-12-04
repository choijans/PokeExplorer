/**
 * Lazy Image Component
 * Provides lazy loading with fade-in animation and caching
 */

import React, { useState, useEffect } from 'react';
import {
  Image,
  ImageProps,
  View,
  ActivityIndicator,
  StyleSheet,
  Animated,
  ImageSourcePropType,
} from 'react-native';
import { imageCacheService } from '../services/imageCache';

interface LazyImageProps extends Omit<ImageProps, 'source'> {
  source: { uri: string } | ImageSourcePropType;
  placeholderSource?: ImageSourcePropType;
  showLoading?: boolean;
  loadingSize?: 'small' | 'large';
  loadingColor?: string;
  fadeInDuration?: number;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onError?: () => void;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  source,
  placeholderSource,
  showLoading = true,
  loadingSize = 'small',
  loadingColor = '#FF0000',
  fadeInDuration = 300,
  onLoadStart,
  onLoadEnd,
  onError,
  style,
  ...props
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [opacity] = useState(new Animated.Value(0));
  const [imageSource, setImageSource] = useState<ImageSourcePropType | null>(null);

  useEffect(() => {
    if (source && typeof source === 'object' && 'uri' in source) {
      const uri = source.uri;
      
      if (uri) {
        // Get cached or optimized URL
        const cachedUrl = imageCacheService.getCachedUrl(uri);
        
        setImageSource({ uri: cachedUrl });
        
        // Add to cache
        imageCacheService.addToCache(uri);
      }
    } else {
      setImageSource(source);
    }
  }, [source]);

  const handleLoadStart = () => {
    setLoading(true);
    setError(false);
    onLoadStart?.();
  };

  const handleLoadEnd = () => {
    setLoading(false);
    onLoadEnd?.();
    
    // Fade in animation
    Animated.timing(opacity, {
      toValue: 1,
      duration: fadeInDuration,
      useNativeDriver: true,
    }).start();
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
    onError?.();
  };

  if (!imageSource) {
    return (
      <View style={[styles.container, style]}>
        {showLoading && <ActivityIndicator size={loadingSize} color={loadingColor} />}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Placeholder/Loading state */}
      {loading && (
        <View style={styles.loadingContainer}>
          {placeholderSource && (
            <Image
              source={placeholderSource}
              style={[StyleSheet.absoluteFillObject, { opacity: 0.3 }]}
              resizeMode="contain"
            />
          )}
          {showLoading && (
            <ActivityIndicator size={loadingSize} color={loadingColor} />
          )}
        </View>
      )}

      {/* Error state */}
      {error && (
        <View style={styles.errorContainer}>
          <Image
            source={{ uri: imageCacheService.getPlaceholderUrl() }}
            style={[StyleSheet.absoluteFillObject]}
            resizeMode="contain"
          />
        </View>
      )}

      {/* Actual image */}
      {!error && (
        <Animated.Image
          {...props}
          source={imageSource}
          style={[style, { opacity }]}
          onLoadStart={handleLoadStart}
          onLoadEnd={handleLoadEnd}
          onError={handleError}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    opacity: 0.5,
  },
});

export default LazyImage;
