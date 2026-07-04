import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { apiErrorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { copy } from '@/copy';
import { colors, spacing } from '@/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await login(username.trim(), password);
      router.back();
    } catch (err) {
      setError(apiErrorMessage(err, 'Login failed. The archives reject you.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>{copy.loginSubtitle}</Text>
      <TextInput
        style={styles.input}
        placeholder="Username"
        placeholderTextColor={colors.faded}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={colors.faded}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.button} onPress={submit} disabled={busy}>
        <Text style={styles.buttonText}>{busy ? '…' : copy.loginButton}</Text>
      </Pressable>
      <Link href="/register" replace style={styles.link}>
        No account? {copy.registerButton}
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.xl },
  subtitle: { color: colors.faded, marginBottom: spacing.lg },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.card,
    padding: spacing.lg,
    fontSize: 16,
    color: colors.ink,
    marginBottom: spacing.md,
  },
  error: { color: colors.danger, marginBottom: spacing.md },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  link: {
    color: colors.accentDark,
    textAlign: 'center',
    marginTop: spacing.xl,
    fontWeight: '600',
  },
});
