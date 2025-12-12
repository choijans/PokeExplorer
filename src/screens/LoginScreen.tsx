import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import Screen from '../components/ui/Screen';
import SectionCard from '../components/ui/SectionCard';
import {
  Button,
  HelperText,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import type { PokemonTheme } from '../theme';

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signInWithEmail, signUpWithEmail } = useAuth();
  const theme = useTheme<PokemonTheme>();

  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmail(email, password);
    } catch (error: any) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignUp = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      await signUpWithEmail(email, password);
    } catch (error: any) {
      Alert.alert('Sign Up Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={styles.container}>
        <Text variant="headlineMedium" style={{ color: theme.colors.onSurface }}>
          PokeExplorer
        </Text>
        <Text
          variant="bodyLarge"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          Sign in to sync your hunts, Pokémon collection, and community posts.
        </Text>

        <SectionCard>
          <View style={styles.form}>
            <TextInput
              mode="outlined"
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <TextInput
              mode="outlined"
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <HelperText
              type="info"
              visible
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              Tip: Make sure to use the same account across devices to keep your
              Pokédex in sync.
            </HelperText>
            <Button
              mode="contained"
              onPress={handleEmailLogin}
              loading={loading}
              style={styles.button}
            >
              Login
            </Button>
            <Button
              mode="outlined"
              onPress={handleEmailSignUp}
              loading={loading}
            >
              Create an Account
            </Button>
          </View>
        </SectionCard>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
  },
  form: {
    gap: 12,
  },
  button: {
    marginTop: 8,
  },
});

export default LoginScreen;