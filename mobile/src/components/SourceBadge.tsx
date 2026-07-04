import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { copy } from '../copy';
import { colors } from '../theme';

export function SourceBadge({
  source,
  compact = false,
}: {
  source: 'curated' | 'wikipedia';
  compact?: boolean;
}) {
  const label = compact
    ? source === 'curated'
      ? 'Curated'
      : 'Wikipedia'
    : source === 'curated'
      ? copy.badgeCurated
      : copy.badgeWikipedia;
  return (
    <View style={[styles.badge, source === 'curated' ? styles.curated : styles.wikipedia]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  curated: { backgroundColor: colors.accent },
  wikipedia: { backgroundColor: colors.stone },
  text: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
