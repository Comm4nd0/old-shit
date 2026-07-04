import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { fetchActivity, fetchLeaderboard } from '@/api/sites';
import { EmptyState } from '@/components/EmptyState';
import { copy } from '@/copy';
import { colors, spacing } from '@/theme';
import type { ActivityEvent, LeaderboardEntry } from '@/types';

const MEDALS = ['🥇', '🥈', '🥉'];

function eventLine(event: ActivityEvent): string {
  switch (event.type) {
    case 'visit':
      return 'saw this old shit in person';
    case 'comment':
      return `had a take: “${event.text ?? ''}”`;
    case 'photo':
      return event.caption ? `posted a photo: “${event.caption}”` : 'posted a photo';
  }
}

export default function CommunityScreen() {
  const router = useRouter();
  const [activity, setActivity] = useState<ActivityEvent[] | null>(null);
  const [leaders, setLeaders] = useState<LeaderboardEntry[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [activityPage, leaderboard] = await Promise.all([
        fetchActivity(),
        fetchLeaderboard(),
      ]);
      setActivity(activityPage.results);
      setLeaders(leaderboard.results);
    } catch {
      setActivity([]);
      setLeaders([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (activity === null || leaders === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: spacing.lg }}
      refreshControl={undefined}
      onScrollEndDrag={async () => {
        if (!refreshing) {
          setRefreshing(true);
          await load();
          setRefreshing(false);
        }
      }}
    >
      <Text style={styles.sectionTitle}>🏆 {copy.leaderboardTitle}</Text>
      {leaders.length === 0 ? (
        <Text style={styles.empty}>{copy.leaderboardEmpty}</Text>
      ) : (
        <View style={styles.card}>
          {leaders.map((entry, index) => (
            <Pressable
              key={entry.username}
              style={styles.leaderRow}
              onPress={() => router.push(`/user/${entry.username}`)}
            >
              <Text style={styles.leaderRank}>{MEDALS[index] ?? `${index + 1}.`}</Text>
              <Text style={styles.leaderName}>{entry.username}</Text>
              <Text style={styles.leaderCount}>
                {entry.visit_count} site{entry.visit_count === 1 ? '' : 's'}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>
        🧭 {copy.activityTitle}
      </Text>
      {activity.length === 0 ? (
        <EmptyState emoji="🦗" body={copy.activityEmpty} />
      ) : (
        activity.map((event, index) => (
          <View key={`${event.type}-${event.created_at}-${index}`} style={styles.eventCard}>
            <Text style={styles.eventText}>
              <Text
                style={styles.eventUser}
                onPress={() => router.push(`/user/${event.username}`)}
              >
                {event.username}
              </Text>
              {' '}
              {eventLine(event)}
              {' at '}
              <Text
                style={styles.eventSite}
                onPress={() => router.push(`/site/${event.site_id}`)}
              >
                {event.site_name}
              </Text>
            </Text>
          </View>
        ))
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
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.ink, marginBottom: spacing.md },
  empty: { color: colors.faded, fontStyle: 'italic' },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs,
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  leaderRank: { width: 36, fontSize: 16 },
  leaderName: { flex: 1, fontWeight: '700', color: colors.accentDark },
  leaderCount: { color: colors.faded, fontSize: 13 },
  eventCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  eventText: { color: colors.ink, lineHeight: 20 },
  eventUser: { fontWeight: '700', color: colors.accentDark },
  eventSite: { fontWeight: '700', color: colors.accent },
});
