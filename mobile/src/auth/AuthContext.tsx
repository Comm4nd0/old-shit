import * as SecureStore from 'expo-secure-store';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import * as authApi from '../api/auth';
import { setAuthToken } from '../api/client';

const TOKEN_KEY = 'oldshit.token';
const USERNAME_KEY = 'oldshit.username';

// SecureStore doesn't exist on web; fall back to localStorage there so the
// web smoke build still works.
const tokenStorage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return localStorage.getItem(key);
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async remove(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

interface AuthState {
  username: string | null;
  ready: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  username: null,
  ready: false,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [username, setUsername] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [token, storedUsername] = await Promise.all([
          tokenStorage.get(TOKEN_KEY),
          tokenStorage.get(USERNAME_KEY),
        ]);
        if (token) {
          setAuthToken(token);
          setUsername(storedUsername);
        }
      } finally {
        setReady(true);
      }
    })();
  }, []);

  async function storeSession(token: string, name: string) {
    setAuthToken(token);
    setUsername(name);
    await Promise.all([
      tokenStorage.set(TOKEN_KEY, token),
      tokenStorage.set(USERNAME_KEY, name),
    ]);
  }

  const value: AuthState = {
    username,
    ready,
    login: async (name, password) => {
      const result = await authApi.login(name, password);
      await storeSession(result.token, result.username);
    },
    register: async (name, email, password) => {
      const result = await authApi.register(name, email, password);
      await storeSession(result.token, result.username);
    },
    logout: async () => {
      setAuthToken(null);
      setUsername(null);
      await Promise.all([tokenStorage.remove(TOKEN_KEY), tokenStorage.remove(USERNAME_KEY)]);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
