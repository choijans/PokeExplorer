import React from 'react';
import { View, ScrollView, StyleSheet, ViewStyle, StyleProp, Platform } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PokemonTheme } from '../../theme';

interface ScreenProps {
  children: React.ReactNode;
  scrollable?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

const Screen: React.FC<ScreenProps> = ({
  children,
  scrollable = false,
  style,
  contentStyle,
  testID,
  edges = ['top', 'bottom'],
}) => {
  const theme = useTheme<PokemonTheme>();
  const insets = useSafeAreaInsets();
  
  const safeAreaStyle = {
    paddingTop: edges.includes('top') ? insets.top : 0,
    paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
    paddingLeft: edges.includes('left') ? insets.left : 0,
    paddingRight: edges.includes('right') ? insets.right : 0,
  };

  const content = (
    <View style={[styles.content, { padding: theme.custom.spacing.md }, contentStyle]} testID={testID}>
      {children}
    </View>
  );

  return (
    <LinearGradient colors={theme.custom.gradients.canvas} style={[styles.container, safeAreaStyle, style]}>
      {scrollable ? (
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
});

export default Screen;
