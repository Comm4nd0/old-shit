import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { fetchAll, fetchNearby } from '@/api/sites';
import { useAuth } from '@/auth/AuthContext';
import { EmptyState } from '@/components/EmptyState';
import { FeedCard } from '@/components/FeedCard';
import { copy } from '@/copy';
import { useLocation } from '@/hooks/useLocation';
import { colors, spacing } from '@/theme';
import type { SiteSummary } from '@/types';

type FeedMode = 'nearby' | 'global';

export default function FeedScreen() {
  const router = useRouter();
  const { username, logout } = useAuth();
  const { location, refresh: refreshLocation } = useLocation();

  const [mode, setMode] = useState<FeedMode>('nearby');
  const [sites, setSites] = useState<SiteSummary[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);
  const loadingMoreRef = useRef(false);

  const loadPage = useCallback(
    async (page: number) => {
      if (mode === 'global') return fetchAll(page);
      if (location.status !== 'granted') return null;
      return fetchNearby(location.lat, location.lng, 25, page);
    },
    [mode, location]
  );

  const loadFirstPage = useCallback(async () => {
    pageRef.current = 1;
    hasMoreRef.current = true;
    try {
      const result = await loadPage(1);
      if (result) {
        setSites(result.results);
        hasMoreRef.current = result.next !== null;
      }
    } catch {
      setSites([]);
    }
  }, [loadPage]);

  useEffect(() => {
    if (mode === 'global' || location.status === 'granted') {
      setSites(null);
      loadFirstPage();
    }
  }, [mode, location.status, loadFirstPage]);

  async function onRefresh() {
    setRefreshing(true);
    await loadFirstPage();
    setRefreshing(false);
  }

  async function onEndReached() {
    if (!hasMoreRef.current || loadingMoreRef.current || sites === null) return;
    loadingMoreRef.current = true;
    try {
      const nextPage = pageRef.current + 1;
      const result = await loadPage(nextPage);
      if (result) {
        pageRef.current = nextPage;
        hasMoreRef.current = result.next !== null;
        setSites((current) => [...(current ?? []), ...result.results]);
      }
    } catch {
      hasMoreRef.current = false;
    } finally {
      loadingMoreRef.current = false;
    }
  }

  const showLocationFallback =
    mode === 'nearby' && (location.status === 'denied' || location.status === 'error');
  const loading =
    !showLocationFallback && (location.status === 'loading' || sites === null) && !refreshing;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{copy.feedTitle}</Text>
          <Text style={styles.subtitle}>{copy.feedSubtitle}</Text>
        </View>
        <Pressable style={styles.headerButton} onPress={() => router.push('/search')}>
          <Text style={styles.headerButtonText}>🔍</Text>
        </Pressable>
        {username ? (
          <Pressable style={styles.headerButton} onPress={logout}>
            <Text style={styles.headerAuthText}>{username} ✕</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.headerButton} onPress={() => router.push('/login')}>
            <Text style={styles.headerAuthText}>Log in</Text>
          </Pressable>
        )}
      </View>

      {showLocationFallback ? (
        <View style={styles.fallback}>
          <EmptyState
            emoji="🗺️"
            title={copy.locationDeniedTitle}
            body={location.status === 'denied' ? copy.locationDeniedBody : copy.locationErrorBody}
          />
          <Pressable style={styles.fallbackButton} onPress={() => router.push('/search')}>
            <Text style={styles.fallbackButtonText}>🔍 {copy.searchTitle}</Text>
          </Pressable>
          <Pressable
            style={[styles.fallbackButton, styles.fallbackSecondary]}
            onPress={() => setMode('global')}
          >
            <Text style={styles.fallbackButtonText}>🏛️ {copy.greatestHitsButton}</Text>
          </Pressable>
          <Pressable onPress={refreshLocation}>
            <Text style={styles.retryText}>…or let us use your location after all</Text>
          </Pressable>
        </View>
      ) : loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>{copy.feedLoading}</Text>
        </View>
      ) : (
        <FlatList
          data={sites ?? []}
          keyExtractor={(site) => String(site.id)}
          renderItem={({ item }) => <FeedCard site={item} />}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          contentContainerStyle={{ paddingVertical: spacing.lg }}
          ListEmptyComponent={<EmptyState emoji="🦖" body={copy.feedEmpty} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.ink },
  subtitle: { color: colors.faded, fontSize: 12, marginTop: 2 },
  headerButton: { padding: spacing.sm, marginLeft: spacing.xs },
  headerButtonText: { fontSize: 20 },
  headerAuthText: { color: colors.accent, fontWeight: '700' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: colors.faded, marginTop: spacing.md },
  fallback: { paddingHorizontal: spacing.xl },
  fallbackButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  fallbackSecondary: { backgroundColor: colors.stone },
  fallbackButtonText: { color: '#fff', fontWeight: '800' },
  retryText: {
    color: colors.faded,
    textAlign: 'center',
    marginTop: spacing.lg,
    textDecorationLine: 'underline',
  },
});
