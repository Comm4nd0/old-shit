import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { fetchProfile } from '@/api/sites';
import { useAuth } from '@/auth/AuthContext';
import { copy } from '@/copy';
import { colors, spacing } from '@/theme';
import type { UserProfile } from '@/types';

export default function ProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();
  const { username: me, logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetchProfile(String(username))
      .then(setProfile)
      .catch(() => setFailed(true));
  }, [username]);

  if (failed) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          This ruin enjoyer could not be found. Possibly mythological.
        </Text>
      </View>
    );
  }
  if (!profile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const stats: [string, number][] = [
    ['Sites seen', profile.visit_count],
    ['Hot takes', profile.comment_count],
    ['Photos', profile.photo_count],
    ['Ratings', profile.rating_count],
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      <Stack.Screen options={{ title: profile.username }} />
      <Text style={styles.name}>{profile.username}</Text>
      <Text style={styles.joined}>Enjoying ruins since {profile.joined}</Text>

      <View style={styles.yearsCard}>
        <Text style={styles.yearsText}>
          {profile.years_of_old_shit !== null
            ? `🏛️ ${copy.profileYears(profile.years_of_old_shit)}`
            : `🏛️ ${copy.profileNoYears}`}
        </Text>
      </View>

      <View style={styles.statsRow}>
        {stats.map(([label, value]) => (
          <View key={label} style={styles.statBox}>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>{copy.profileVisitsTitle}</Text>
      {profile.recent_visits.length === 0 ? (
        <Text style={styles.empty}>{copy.profileEmpty}</Text>
      ) : (
        profile.recent_visits.map((visit) => (
          <Pressable
            key={`${visit.site_id}-${visit.visited_at}`}
            style={styles.visitRow}
            onPress={() => router.push(`/site/${visit.site_id}`)}
          >
            <Text style={styles.visitName}>📍 {visit.site_name}</Text>
          </Pressable>
        ))
      )}

      {me === profile.username && (
        <Pressable
          style={styles.logoutButton}
          onPress={async () => {
            await logout();
            router.back();
          }}
        >
          <Text style={styles.logoutText}>{copy.logoutButton}</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  errorText: { color: colors.faded, padding: spacing.xl, textAlign: 'center' },
  name: { fontSize: 26, fontWeight: '800', color: colors.ink },
  joined: { color: colors.faded, marginTop: 2 },
  yearsCard: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  yearsText: { color: '#fff', fontWeight: '800', fontSize: 15, textAlign: 'center' },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  statBox: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
  },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.accentDark },
  statLabel: { fontSize: 11, color: colors.faded, marginTop: 2 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  empty: { color: colors.faded, fontStyle: 'italic' },
  visitRow: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  visitName: { color: colors.ink, fontWeight: '600' },
  logoutButton: {
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
  },
  logoutText: { color: colors.danger, fontWeight: '700' },
});
