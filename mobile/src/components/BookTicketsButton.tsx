import React from 'react';
import { Linking, Pressable, StyleSheet, Text } from 'react-native';

import { copy } from '../copy';
import { colors, spacing } from '../theme';

export function BookTicketsButton({
  url,
  kind,
}: {
  url: string;
  kind: 'official' | 'search';
}) {
  if (!url) return null;
  const official = kind === 'official';
  return (
    <Pressable
      style={[styles.button, official ? styles.official : styles.search]}
      onPress={() => Linking.openURL(url)}
    >
      <Text style={styles.text}>
        {official ? `🎟️ ${copy.ticketOfficial}` : `🧭 ${copy.ticketSearch}`}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  official: { backgroundColor: colors.accent },
  search: { backgroundColor: colors.stone },
  text: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
