import React from 'react';
import { View, ScrollView, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from 'react-native-paper';
import type { PokemonTheme } from '../../theme';

interface ScreenProps {
  children: React.ReactNode;
  scrollable?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

const Screen: React.FC<ScreenProps> = ({
  children,
  scrollable = false,
  style,
  contentStyle,
  testID,
}) => {
  const theme = useTheme<PokemonTheme>();

  const content = (
    <View style={[styles.content, { padding: theme.custom.spacing.md }, contentStyle]} testID={testID}>
      {children}
    </View>
  );

  return (
    <LinearGradient colors={theme.custom.gradients.canvas} style={[styles.container, style]}>
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
