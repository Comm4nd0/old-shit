import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../theme';

export function EmptyState({ emoji, title, body }: { emoji: string; title?: string; body: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{emoji}</Text>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: spacing.xl, marginTop: spacing.xl },
  emoji: { fontSize: 44 },
  title: { fontSize: 17, fontWeight: '700', color: colors.ink, marginTop: spacing.md },
  body: {
    color: colors.faded,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
});
