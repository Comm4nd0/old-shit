import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TextInput, View } from 'react-native';

import { searchSites } from '@/api/sites';
import { EmptyState } from '@/components/EmptyState';
import { FeedCard } from '@/components/FeedCard';
import { copy } from '@/copy';
import { colors, spacing } from '@/theme';
import type { SiteSummary } from '@/types';

const DEBOUNCE_MS = 400;

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SiteSummary[] | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults(null);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const page = await searchSites(trimmed);
        setResults(page.results);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder={copy.searchPlaceholder}
        placeholderTextColor={colors.faded}
        value={query}
        onChangeText={setQuery}
        autoFocus
        autoCorrect={false}
      />
      {searching ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} />
      ) : results === null ? (
        <EmptyState emoji="🏺" body={copy.searchHint} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(site) => String(site.id)}
          renderItem={({ item }) => <FeedCard site={item} />}
          contentContainerStyle={{ paddingVertical: spacing.lg }}
          ListEmptyComponent={<EmptyState emoji="🕳️" body={copy.searchEmpty} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  input: {
    margin: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.card,
    padding: spacing.lg,
    fontSize: 16,
    color: colors.ink,
  },
});
