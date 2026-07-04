import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { fetchSite } from '@/api/sites';
import { useAuth } from '@/auth/AuthContext';
import { BookTicketsButton } from '@/components/BookTicketsButton';
import { CommentSection } from '@/components/CommentSection';
import { PhotoGrid } from '@/components/PhotoGrid';
import { RatingStars } from '@/components/RatingStars';
import { SocialBar } from '@/components/SocialBar';
import { SourceBadge } from '@/components/SourceBadge';
import { copy } from '@/copy';
import { colors, spacing } from '@/theme';
import type { SiteDetail } from '@/types';

export default function SiteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { username } = useAuth();
  const [site, setSite] = useState<SiteDetail | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetchSite(Number(id))
      .then(setSite)
      .catch(() => setFailed(true));
  }, [id]);

  function requireLogin() {
    if (Platform.OS === 'web') {
      router.push('/login');
      return;
    }
    Alert.alert(copy.appName, copy.authRequired, [
      { text: 'Not now', style: 'cancel' },
      { text: copy.loginButton, onPress: () => router.push('/login') },
    ]);
  }

  if (failed) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>This old shit could not be found. Eroded, perhaps.</Text>
      </View>
    );
  }
  if (!site) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const placeLine = [site.era, [site.city, site.country].filter(Boolean).join(', ')]
    .filter(Boolean)
    .join(' · ');

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: spacing.xl * 2 }}>
      <Stack.Screen options={{ title: site.name }} />
      {site.image_url ? (
        <Image source={{ uri: site.image_url }} style={styles.hero} resizeMode="cover" />
      ) : (
        <View style={[styles.hero, styles.heroFallback]}>
          <Text style={{ fontSize: 64 }}>🏛️</Text>
        </View>
      )}
      <View style={styles.body}>
        <Text style={styles.name}>{site.name}</Text>
        {placeLine ? <Text style={styles.place}>{placeLine}</Text> : null}
        <View style={{ marginTop: spacing.sm }}>
          <SourceBadge source={site.source} />
        </View>
        <Text style={styles.description}>{site.description}</Text>
        {site.wikipedia_url ? (
          <Pressable onPress={() => Linking.openURL(site.wikipedia_url)}>
            <Text style={styles.wikiLink}>Read the full saga on Wikipedia →</Text>
          </Pressable>
        ) : null}

        <BookTicketsButton url={site.ticket_url} kind={site.ticket_url_kind} />

        <SocialBar
          siteId={site.id}
          siteName={site.name}
          shareUrl={site.share_url}
          initialVisited={site.visited_by_me}
          initialVisitCount={site.visit_count}
          loggedIn={username !== null}
          onRequireLogin={requireLogin}
        />

        {site.top_take && (
          <View style={styles.topTake}>
            <Text style={styles.topTakeTitle}>🔥 {copy.topTakeTitle}</Text>
            <Text style={styles.topTakeText}>“{site.top_take.text}”</Text>
            <Text style={styles.topTakeAuthor}>
              — {site.top_take.username}, ▲{site.top_take.upvotes}
            </Text>
          </View>
        )}

        <RatingStars
          siteId={site.id}
          userRating={site.user_rating}
          averageRating={site.average_rating}
          ratingCount={site.rating_count}
          loggedIn={username !== null}
          onRequireLogin={requireLogin}
        />

        <PhotoGrid
          siteId={site.id}
          initialPhotos={site.photos}
          loggedIn={username !== null}
          onRequireLogin={requireLogin}
        />

        <CommentSection
          siteId={site.id}
          loggedIn={username !== null}
          onRequireLogin={requireLogin}
        />
      </View>
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
  hero: { width: '100%', height: 240 },
  heroFallback: {
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: spacing.lg },
  name: { fontSize: 24, fontWeight: '800', color: colors.ink },
  place: { color: colors.faded, marginTop: 4 },
  description: { color: colors.ink, marginTop: spacing.lg, fontSize: 15, lineHeight: 23 },
  wikiLink: { color: colors.accentDark, marginTop: spacing.md, fontWeight: '600' },
  topTake: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  topTakeTitle: { fontWeight: '800', color: colors.gold, fontSize: 12 },
  topTakeText: { color: colors.ink, marginTop: spacing.xs, fontStyle: 'italic', lineHeight: 20 },
  topTakeAuthor: { color: colors.faded, marginTop: spacing.xs, fontSize: 12 },
});
