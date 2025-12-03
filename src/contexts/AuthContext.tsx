import React, { createContext, useContext, useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut } from '@react-native-firebase/auth';

interface AuthContextType {
  user: any;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const subscriber = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return subscriber;
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const auth = getAuth();
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Error in signInWithEmail:', error);
      if (error && (error as any).code) {
        console.error('Error code:', (error as any).code);
      }
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    try {
      const auth = getAuth();
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Error in signUpWithEmail:', error);
      if (error && (error as any).code) {
        console.error('Error code:', (error as any).code);
      }
      throw error;
    }
  };


  const signOut = async () => {
    try {
      const auth = getAuth();
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Error in signOut:', error);
      if (error && (error as any).code) {
        console.error('Error code:', (error as any).code);
      }
      throw error;
    }
  };

  const value = {
    user,
    loading,
    signInWithEmail,
    signUpWithEmail,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};