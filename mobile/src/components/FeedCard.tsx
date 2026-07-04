import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { copy } from '../copy';
import { colors, spacing } from '../theme';
import type { SiteSummary } from '../types';
import { SourceBadge } from './SourceBadge';

export function FeedCard({ site }: { site: SiteSummary }) {
  const router = useRouter();
  const placeLine = [site.era, [site.city, site.country].filter(Boolean).join(', ')]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={() => router.push(`/site/${site.id}`)}
    >
      {site.image_url ? (
        <Image source={{ uri: site.image_url }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.image, styles.imageFallback]}>
          <Text style={styles.imageFallbackText}>🏛️</Text>
        </View>
      )}
      <View style={styles.body}>
        <Text style={styles.name}>{site.name}</Text>
        {placeLine ? <Text style={styles.place}>{placeLine}</Text> : null}
        <Text style={styles.description} numberOfLines={3}>
          {site.short_description}
        </Text>
        <View style={styles.footer}>
          <Text style={styles.rating}>
            {site.average_rating !== null
              ? `★ ${site.average_rating} (${site.rating_count})`
              : '★ unrated'}
          </Text>
          <SourceBadge source={site.source} compact />
        </View>
        {site.distance_km !== null && (
          <Text style={styles.distance}>{copy.distance(site.distance_km)}</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.85 },
  image: { width: '100%', height: 160 },
  imageFallback: {
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageFallbackText: { fontSize: 48 },
  body: { padding: spacing.lg },
  name: { fontSize: 18, fontWeight: '700', color: colors.ink },
  place: { color: colors.faded, marginTop: 2, fontSize: 13 },
  description: { color: colors.ink, marginTop: spacing.sm, lineHeight: 20 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  rating: { color: colors.gold, fontWeight: '700' },
  distance: { color: colors.accent, marginTop: spacing.xs, fontSize: 13, fontWeight: '600' },
});
