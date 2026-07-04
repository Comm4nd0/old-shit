import { Stack } from 'expo-router';
import React from 'react';

import { AuthProvider } from '@/auth/AuthContext';
import { copy } from '@/copy';
import { colors } from '@/theme';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.ink,
          headerTitleStyle: { fontWeight: '800' },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ title: copy.appName }} />
        <Stack.Screen name="search" options={{ title: copy.searchTitle }} />
        <Stack.Screen name="community" options={{ title: copy.communityTitle }} />
        <Stack.Screen name="login" options={{ title: copy.loginTitle, presentation: 'modal' }} />
        <Stack.Screen
          name="register"
          options={{ title: copy.registerTitle, presentation: 'modal' }}
        />
        <Stack.Screen name="site/[id]" options={{ title: '' }} />
        <Stack.Screen name="user/[username]" options={{ title: '' }} />
      </Stack>
    </AuthProvider>
  );
}
