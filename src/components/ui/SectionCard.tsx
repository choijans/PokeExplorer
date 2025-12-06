import React from 'react';
import { StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import { Surface, Text, useTheme } from 'react-native-paper';
import type { PokemonTheme } from '../../theme';

interface SectionCardProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}

const SectionCard: React.FC<SectionCardProps> = ({
  title,
  subtitle,
  actions,
  children,
  style,
  contentStyle,
}) => {
  const theme = useTheme<PokemonTheme>();

  return (
    <Surface style={[styles.surface, { borderRadius: theme.custom.radius.lg }, style]} elevation={2}>
      {(title || actions) && (
        <View style={styles.header}>
          <View style={styles.headerText}>
            {title && (
              <Text
                variant="titleMedium"
                style={{ color: theme.colors.onSurface, flexShrink: 1 }}
              >
                {title}
              </Text>
            )}
            {subtitle && (
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant, flexShrink: 1 }}
              >
                {subtitle}
              </Text>
            )}
          </View>
          {actions && <View style={styles.actions}>{actions}</View>}
        </View>
      )}
      <View style={[styles.content, { padding: theme.custom.spacing.md }, contentStyle]}>
        {children}
      </View>
    </Surface>
  );
};

const styles = StyleSheet.create({
  surface: {
    overflow: 'hidden',
    marginBottom: 16,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    rowGap: 8,
  },
  headerText: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  actions: {
    marginLeft: 12,
    flexShrink: 0,
  },
  content: {
    width: '100%',
  },
});

export default SectionCard;
